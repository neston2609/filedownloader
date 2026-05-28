import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { streamSmbFile } from '@/lib/smb'
import { streamFtpFile } from '@/lib/ftp'
import { streamScpFile } from '@/lib/scp'
import { videoMimeType, isNativeBrowserVideo } from '@/lib/media'
import { transcodeToMp4 } from '@/lib/transcode'
import { checkCategoryAccess, accessDenyResponse } from '@/lib/access'
import { getHideRules, isHidden } from '@/lib/hide'
import { getSiteSettings } from '@/lib/settings'
import { getClientIp, todayUtc, getGuestPlayCount, incrementGuestPlay, memberPlayKey } from '@/lib/guest'
import path from 'path'

export async function GET(req: NextRequest) {
  const session = await auth()
  const isGuest = !session?.user?.id

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathId = searchParams.get('pathId')
  const filePath = searchParams.get('filePath') ?? ''

  if (!categoryId || !pathId || !filePath) {
    return NextResponse.json({ error: 'categoryId, pathId and filePath required' }, { status: 400 })
  }

  // Path-traversal guard
  const normalized = path.posix.normalize(filePath.replace(/\\/g, '/')).replace(/^(\.\.(\/|$))+/, '')
  if (normalized.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  if (isGuest) {
    // Guest: check feature flag + daily quota before streaming
    const settings = await getSiteSettings()
    if (!settings.guestEnabled) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ip = getClientIp(req)
    const date = todayUtc()
    const used = await getGuestPlayCount(ip, date)
    if (used >= settings.guestDailyLimit) {
      return NextResponse.json(
        { error: 'Daily guest limit reached', used, limit: settings.guestDailyLimit },
        { status: 429 }
      )
    }
    // Increment before streaming so fast repeated requests can't bypass the check
    await incrementGuestPlay(ip, date)
  } else {
    const isAdmin = session!.user.role === 'ADMIN'
    const access = await checkCategoryAccess(session!.user.id, categoryId, isAdmin)

    if (!access.allowed) {
      // Inactive accounts or hidden categories are fully blocked.
      if (access.reason === 'inactive' || access.reason === 'hidden') {
        const deny = accessDenyResponse(access.reason)
        return NextResponse.json(deny.body, { status: deny.status })
      }
      // no-access / expired → limited preview: same daily quota as guest, keyed by userId.
      const settings = await getSiteSettings()
      const key = memberPlayKey(session!.user.id)
      const date = todayUtc()
      const used = await getGuestPlayCount(key, date)
      if (used >= settings.guestDailyLimit) {
        return NextResponse.json(
          { error: 'Daily preview limit reached', used, limit: settings.guestDailyLimit },
          { status: 429 }
        )
      }
      await incrementGuestPlay(key, date)
    }
    // If access.allowed === true: no quota — fall through to stream normally.
  }

  // Block streaming a hidden file (or one inside a hidden folder)
  const hideRules = await getHideRules(categoryId)
  const segments = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  if (isHidden(segments[segments.length - 1] ?? '', false, hideRules) ||
      segments.slice(0, -1).some((s) => isHidden(s, true, hideRules))) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const filename = path.basename(filePath)
  const native = isNativeBrowserVideo(filename)

  // Always serve as video/mp4 when transcoding; otherwise keep original MIME.
  const contentType = native ? videoMimeType(filename) : 'video/mp4'
  const headers = new Headers({
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    'Cache-Control': 'no-store',
    // No Range support — neither raw streams nor on-the-fly ffmpeg output
    // can serve byte ranges meaningfully.
    'Accept-Ranges': 'none',
  })

  // Wrap a Node Readable into a Web ReadableStream and forward cancel signals
  // (e.g. when the user closes the tab) so we can tear down ffmpeg + the
  // upstream SMB/FTP/SCP connection.
  function toWebStream(s: NodeJS.ReadableStream, onCancel?: () => void): ReadableStream {
    return new ReadableStream({
      start(controller) {
        s.on('data', (chunk: Buffer) => {
          try { controller.enqueue(chunk) } catch { /* controller already closed */ }
        })
        s.on('end', () => {
          try { controller.close() } catch {}
        })
        s.on('error', (err: Error) => {
          try { controller.error(err) } catch {}
        })
      },
      cancel() { onCancel?.() },
    })
  }

  // Helper that picks the right pipeline: raw passthrough for native formats,
  // transcoded MP4 for everything else.
  function pipeline(source: NodeJS.ReadableStream): ReadableStream {
    if (native) {
      return toWebStream(source, () => {
        try { (source as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.() } catch {}
      })
    }
    const { out, kill } = transcodeToMp4(source)
    return toWebStream(out, kill)
  }

  // SMB
  const smbPath = await prisma.categorySmbPath.findFirst({
    where: { id: pathId, categoryId },
    include: { smbServer: true },
  })
  if (smbPath) {
    try {
      const source = await streamSmbFile(
        smbPath.smbServer.host, smbPath.smbServer.port,
        smbPath.smbServer.username, smbPath.smbServer.password,
        smbPath.smbServer.domain, smbPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers })
    } catch (err) {
      console.error('SMB stream error:', err)
      return NextResponse.json({ error: 'SMB stream failed' }, { status: 500 })
    }
  }

  // FTP / FTPS
  const ftpPath = await prisma.categoryFtpPath.findFirst({
    where: { id: pathId, categoryId },
    include: { ftpServer: true },
  })
  if (ftpPath) {
    try {
      const source = await streamFtpFile(
        ftpPath.ftpServer.host, ftpPath.ftpServer.port,
        ftpPath.ftpServer.username, ftpPath.ftpServer.password,
        ftpPath.ftpServer.secure, ftpPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers })
    } catch (err) {
      console.error('FTP stream error:', err)
      return NextResponse.json({ error: 'FTP stream failed' }, { status: 500 })
    }
  }

  // SCP / SFTP
  const scpPath = await prisma.categoryScpPath.findFirst({
    where: { id: pathId, categoryId },
    include: { scpServer: true },
  })
  if (scpPath) {
    try {
      const source = await streamScpFile(
        {
          host: scpPath.scpServer.host, port: scpPath.scpServer.port,
          username: scpPath.scpServer.username, password: scpPath.scpServer.password,
          privateKey: scpPath.scpServer.privateKey, passphrase: scpPath.scpServer.passphrase,
        },
        scpPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers })
    } catch (err) {
      console.error('SCP stream error:', err)
      return NextResponse.json({ error: 'SCP stream failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Path not found' }, { status: 404 })
}
