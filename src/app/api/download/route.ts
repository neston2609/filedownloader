import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { streamSmbFile } from '@/lib/smb'
import path from 'path'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathIndex = parseInt(searchParams.get('pathIndex') ?? '0')
  const filePath = searchParams.get('filePath') ?? ''

  if (!categoryId || !filePath) {
    return NextResponse.json({ error: 'categoryId and filePath required' }, { status: 400 })
  }

  // Validate no path traversal
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
  if (normalized !== filePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  // Check user has category access
  const hasAccess = await prisma.userCategoryAccess.findUnique({
    where: { userId_categoryId: { userId: session.user.id, categoryId } },
  })
  const isAdmin = session.user.role === 'ADMIN'
  if (!hasAccess && !isAdmin) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { smbPaths: { include: { smbServer: true } } },
  })

  if (!category || !category.smbPaths[pathIndex]) {
    return NextResponse.json({ error: 'Category or SMB path not found' }, { status: 404 })
  }

  const smbPathConfig = category.smbPaths[pathIndex]
  const { smbServer } = smbPathConfig

  // Log the download
  await prisma.downloadLog.create({
    data: { userId: session.user.id, categoryId, filePath },
  }).catch(() => {}) // Non-blocking log

  try {
    const stream = await streamSmbFile(
      smbServer.host, smbServer.port, smbServer.username, smbServer.password,
      smbServer.domain, smbPathConfig.path, filePath
    )

    const filename = path.basename(filePath)
    const headers = new Headers({
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
    })

    // Convert Node.js stream to Web ReadableStream
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
    return NextResponse.json({ error: 'File download failed' }, { status: 500 })
  }
}
