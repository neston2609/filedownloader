import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSmbFileSize, streamSmbFile } from '@/lib/smb'
import { getFtpFileSize, streamFtpFile } from '@/lib/ftp'
import { getScpFileSize, streamScpFile } from '@/lib/scp'
import { videoMimeType, isNativeBrowserVideo } from '@/lib/media'
import { transcodeToMp4 } from '@/lib/transcode'
import { checkCategoryAccess, accessDenyResponse } from '@/lib/access'
import { getHideRules, isHidden } from '@/lib/hide'
import { getSiteSettings } from '@/lib/settings'
import { getClientIp, todayUtc, getGuestPlayCount, incrementGuestPlay, memberPlayKey } from '@/lib/guest'
import { logAccess } from '@/lib/access-log'
import path from 'path'

interface ByteRange {
  start: number
  end: number
}

const countedLimitedPlays = new Map<string, number>()
const COUNTED_PLAY_TTL_MS = 12 * 60 * 60 * 1000

function countedPlayKey(subjectKey: string, date: string, categoryId: string, filePath: string) {
  return `${subjectKey}:${date}:${categoryId}:${filePath}`
}

function wasRecentlyCounted(key: string) {
  const expiresAt = countedLimitedPlays.get(key)
  if (!expiresAt) return false
  if (expiresAt <= Date.now()) {
    countedLimitedPlays.delete(key)
    return false
  }
  return true
}

function rememberCountedPlay(key: string) {
  const now = Date.now()
  if (countedLimitedPlays.size > 10000) {
    for (const [k, expiresAt] of countedLimitedPlays) {
      if (expiresAt <= now) countedLimitedPlays.delete(k)
    }
  }
  countedLimitedPlays.set(key, now + COUNTED_PLAY_TTL_MS)
}

function parseRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match) return null

  const [, rawStart, rawEnd] = match
  if (!rawStart && !rawEnd) return null

  if (!rawStart) {
    const suffixLength = Number(rawEnd)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    }
  }

  const start = Number(rawStart)
  const end = rawEnd ? Number(rawEnd) : size - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

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
    const playKey = countedPlayKey(ip, date, categoryId, filePath)
    const alreadyCounted = wasRecentlyCounted(playKey)
    const used = await getGuestPlayCount(ip, date)
    if (!alreadyCounted && used >= settings.guestDailyLimit) {
      return NextResponse.json(
        { error: 'Daily guest limit reached', used, limit: settings.guestDailyLimit },
        { status: 429 }
      )
    }
    if (!alreadyCounted) {
      // Count one play per clip, not one play per mobile byte-range request.
      await incrementGuestPlay(ip, date)
      rememberCountedPlay(playKey)
      // Log guest play (fire-and-forget)
      const catGuest = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }).catch(() => null)
      logAccess({
        type: 'GUEST_PLAY',
        ip,
        categoryId,
        categoryName: catGuest?.name ?? undefined,
        filePath,
        userAgent: req.headers.get('user-agent') ?? undefined,
      })
    }
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
      const playKey = countedPlayKey(key, date, categoryId, filePath)
      const alreadyCounted = wasRecentlyCounted(playKey)
      const used = await getGuestPlayCount(key, date)
      if (!alreadyCounted && used >= settings.guestDailyLimit) {
        return NextResponse.json(
          { error: 'Daily preview limit reached', used, limit: settings.guestDailyLimit },
          { status: 429 }
        )
      }
      if (!alreadyCounted) {
        await incrementGuestPlay(key, date)
        rememberCountedPlay(playKey)
        // Log limited-member play (fire-and-forget)
        const catMember = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }).catch(() => null)
        logAccess({
          type: 'MEMBER_PLAY',
          ip: getClientIp(req),
          userId: session!.user.id,
          categoryId,
          categoryName: catMember?.name ?? undefined,
          filePath,
          userAgent: req.headers.get('user-agent') ?? undefined,
        })
      }
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
  const baseHeaders = {
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    'Cache-Control': 'no-store',
  }

  // Wrap a Node Readable into a Web ReadableStream and forward cancel signals
  // (e.g. when the user closes the tab) so we can tear down ffmpeg + the
  // upstream SMB/FTP/SCP connection.
  function toWebStream(s: NodeJS.ReadableStream, onCancel?: () => void, maxBytes?: number): ReadableStream {
    let sent = 0
    let closed = false
    const cleanup = () => {
      try { (s as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.() } catch {}
      onCancel?.()
    }

    return new ReadableStream({
      start(controller) {
        s.on('data', (chunk: Buffer) => {
          if (closed) return
          try {
            if (maxBytes === undefined) {
              controller.enqueue(chunk)
              return
            }

            const remaining = maxBytes - sent
            if (remaining <= 0) {
              closed = true
              controller.close()
              cleanup()
              return
            }

            const nextChunk = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
            sent += nextChunk.length
            controller.enqueue(nextChunk)
            if (sent >= maxBytes) {
              closed = true
              controller.close()
              cleanup()
            }
          } catch {
            closed = true
            cleanup()
          }
        })
        s.on('end', () => {
          if (!closed) {
            closed = true
            try { controller.close() } catch {}
          }
        })
        s.on('error', (err: Error) => {
          if (!closed) {
            closed = true
            try { controller.error(err) } catch {}
          }
        })
      },
      cancel() {
        closed = true
        cleanup()
      },
    })
  }

  function nativeVideoResponse(source: NodeJS.ReadableStream, size: number, range: ByteRange | null) {
    const headers = new Headers({
      ...baseHeaders,
      'Accept-Ranges': 'bytes',
    })

    if (!range) {
      headers.set('Content-Length', String(size))
      return new NextResponse(toWebStream(source), { status: 200, headers })
    }

    const contentLength = range.end - range.start + 1
    headers.set('Content-Length', String(contentLength))
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    return new NextResponse(toWebStream(source, undefined, contentLength), { status: 206, headers })
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

  const unsupportedRangeResponse = (size: number) => new NextResponse(null, {
    status: 416,
    headers: {
      'Content-Range': `bytes */${size}`,
      'Accept-Ranges': 'bytes',
    },
  })

  // SMB
  const smbPath = await prisma.categorySmbPath.findFirst({
    where: { id: pathId, categoryId },
    include: { smbServer: true },
  })
  if (smbPath) {
    try {
      if (native) {
        const size = await getSmbFileSize(
          smbPath.smbServer.host, smbPath.smbServer.port,
          smbPath.smbServer.username, smbPath.smbServer.password,
          smbPath.smbServer.domain, smbPath.path, filePath
        )
        const range = parseRange(req.headers.get('range'), size)
        if (req.headers.has('range') && !range) return unsupportedRangeResponse(size)
        const source = await streamSmbFile(
          smbPath.smbServer.host, smbPath.smbServer.port,
          smbPath.smbServer.username, smbPath.smbServer.password,
          smbPath.smbServer.domain, smbPath.path, filePath, range ?? undefined
        )
        return nativeVideoResponse(source, size, range)
      }

      const source = await streamSmbFile(
        smbPath.smbServer.host, smbPath.smbServer.port,
        smbPath.smbServer.username, smbPath.smbServer.password,
        smbPath.smbServer.domain, smbPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers: { ...baseHeaders, 'Accept-Ranges': 'none' } })
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
      if (native) {
        const size = await getFtpFileSize(
          ftpPath.ftpServer.host, ftpPath.ftpServer.port,
          ftpPath.ftpServer.username, ftpPath.ftpServer.password,
          ftpPath.ftpServer.secure, ftpPath.path, filePath
        )
        const range = parseRange(req.headers.get('range'), size)
        if (req.headers.has('range') && !range) return unsupportedRangeResponse(size)
        const source = await streamFtpFile(
          ftpPath.ftpServer.host, ftpPath.ftpServer.port,
          ftpPath.ftpServer.username, ftpPath.ftpServer.password,
          ftpPath.ftpServer.secure, ftpPath.path, filePath, range ? { start: range.start } : undefined
        )
        return nativeVideoResponse(source, size, range)
      }

      const source = await streamFtpFile(
        ftpPath.ftpServer.host, ftpPath.ftpServer.port,
        ftpPath.ftpServer.username, ftpPath.ftpServer.password,
        ftpPath.ftpServer.secure, ftpPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers: { ...baseHeaders, 'Accept-Ranges': 'none' } })
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
      const cfg = {
        host: scpPath.scpServer.host, port: scpPath.scpServer.port,
        username: scpPath.scpServer.username, password: scpPath.scpServer.password,
        privateKey: scpPath.scpServer.privateKey, passphrase: scpPath.scpServer.passphrase,
      }

      if (native) {
        const size = await getScpFileSize(cfg, scpPath.path, filePath)
        const range = parseRange(req.headers.get('range'), size)
        if (req.headers.has('range') && !range) return unsupportedRangeResponse(size)
        const source = await streamScpFile(cfg, scpPath.path, filePath, range ?? undefined)
        return nativeVideoResponse(source, size, range)
      }

      const source = await streamScpFile(
        cfg,
        scpPath.path, filePath
      )
      return new NextResponse(pipeline(source), { headers: { ...baseHeaders, 'Accept-Ranges': 'none' } })
    } catch (err) {
      console.error('SCP stream error:', err)
      return NextResponse.json({ error: 'SCP stream failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Path not found' }, { status: 404 })
}
