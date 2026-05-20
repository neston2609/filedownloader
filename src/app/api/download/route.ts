import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { streamSmbFile } from '@/lib/smb'
import { streamFtpFile } from '@/lib/ftp'
import { streamScpFile } from '@/lib/scp'
import { checkCategoryAccess, accessDenyResponse } from '@/lib/access'
import { getHideRules, isHidden } from '@/lib/hide'
import path from 'path'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathId = searchParams.get('pathId')
  const filePath = searchParams.get('filePath') ?? ''

  if (!categoryId || !pathId || !filePath) {
    return NextResponse.json({ error: 'categoryId, pathId and filePath required' }, { status: 400 })
  }

  // Prevent path traversal
  const normalized = path.posix.normalize(filePath.replace(/\\/g, '/')).replace(/^(\.\.(\/|$))+/, '')
  if (normalized.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  // Access check (active + not expired + not hidden + granted)
  const isAdmin = session.user.role === 'ADMIN'
  const access = await checkCategoryAccess(session.user.id, categoryId, isAdmin)
  if (!access.allowed) {
    const deny = accessDenyResponse(access.reason!)
    return NextResponse.json(deny.body, { status: deny.status })
  }

  // Block downloading a hidden file (or one inside a hidden folder)
  const hideRules = await getHideRules(categoryId)
  const segments = filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  const basename = segments[segments.length - 1] ?? ''
  const dirSegments = segments.slice(0, -1)
  if (isHidden(basename, false, hideRules) || dirSegments.some((s) => isHidden(s, true, hideRules))) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Log
  await prisma.downloadLog.create({
    data: { userId: session.user.id, categoryId, filePath },
  }).catch(() => {})

  const filename = path.basename(filePath)
  const headers = new Headers({
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'no-store',
  })

  // SMB path?
  const smbPath = await prisma.categorySmbPath.findFirst({
    where: { id: pathId, categoryId },
    include: { smbServer: true },
  })

  if (smbPath) {
    try {
      const stream = await streamSmbFile(
        smbPath.smbServer.host, smbPath.smbServer.port,
        smbPath.smbServer.username, smbPath.smbServer.password,
        smbPath.smbServer.domain, smbPath.path, filePath
      )
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', (err: Error) => controller.error(err))
        },
      })
      return new NextResponse(webStream, { headers })
    } catch (err) {
      console.error('SMB download error:', err)
      return NextResponse.json({ error: 'SMB download failed' }, { status: 500 })
    }
  }

  // FTP path?
  const ftpPath = await prisma.categoryFtpPath.findFirst({
    where: { id: pathId, categoryId },
    include: { ftpServer: true },
  })

  if (ftpPath) {
    try {
      const stream = await streamFtpFile(
        ftpPath.ftpServer.host, ftpPath.ftpServer.port,
        ftpPath.ftpServer.username, ftpPath.ftpServer.password,
        ftpPath.ftpServer.secure, ftpPath.path, filePath
      )
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', (err: Error) => controller.error(err))
        },
      })
      return new NextResponse(webStream, { headers })
    } catch (err) {
      console.error('FTP download error:', err)
      return NextResponse.json({ error: 'FTP download failed' }, { status: 500 })
    }
  }

  // SCP path?
  const scpPath = await prisma.categoryScpPath.findFirst({
    where: { id: pathId, categoryId },
    include: { scpServer: true },
  })

  if (scpPath) {
    try {
      const stream = await streamScpFile(
        {
          host: scpPath.scpServer.host, port: scpPath.scpServer.port,
          username: scpPath.scpServer.username, password: scpPath.scpServer.password,
          privateKey: scpPath.scpServer.privateKey, passphrase: scpPath.scpServer.passphrase,
        },
        scpPath.path, filePath
      )
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', (err: Error) => controller.error(err))
        },
      })
      return new NextResponse(webStream, { headers })
    } catch (err) {
      console.error('SCP download error:', err)
      return NextResponse.json({ error: 'SCP download failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Path not found' }, { status: 404 })
}
