import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { streamSmbFile } from '@/lib/smb'
import { streamFtpFile } from '@/lib/ftp'
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

  // Access check
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin) {
    const hasAccess = await prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId: session.user.id, categoryId } },
    })
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

  return NextResponse.json({ error: 'Path not found' }, { status: 404 })
}
