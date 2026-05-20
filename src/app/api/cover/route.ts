import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { streamSmbFile } from '@/lib/smb'
import { streamFtpFile } from '@/lib/ftp'
import { streamScpFile } from '@/lib/scp'
import { checkCategoryBrowse } from '@/lib/access'
import path from 'path'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
}

// Streams a folder-cover image (e.g. folder.jpg) inline. Used as a thumbnail
// in the browser. Requires browse access (not full download access). Returns
// 404 when the file is missing so the client falls back to the folder icon.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse(null, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathId = searchParams.get('pathId')
  const filePath = searchParams.get('filePath') ?? ''
  if (!categoryId || !pathId || !filePath) return new NextResponse(null, { status: 400 })

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_BY_EXT[ext]
  if (!contentType) return new NextResponse(null, { status: 400 })

  const normalized = path.posix.normalize(filePath.replace(/\\/g, '/')).replace(/^(\.\.(\/|$))+/, '')
  if (normalized.includes('..')) return new NextResponse(null, { status: 400 })

  const isAdmin = session.user.role === 'ADMIN'
  const access = await checkCategoryBrowse(session.user.id, categoryId, isAdmin)
  if (!access.allowed) return new NextResponse(null, { status: 403 })

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=3600',
  })

  function toWebStream(s: NodeJS.ReadableStream): ReadableStream {
    return new ReadableStream({
      start(controller) {
        s.on('data', (c: Buffer) => { try { controller.enqueue(c) } catch {} })
        s.on('end', () => { try { controller.close() } catch {} })
        s.on('error', () => { try { controller.error(new Error('cover stream error')) } catch {} })
      },
    })
  }

  const smbPath = await prisma.categorySmbPath.findFirst({ where: { id: pathId, categoryId }, include: { smbServer: true } })
  if (smbPath) {
    try {
      const s = await streamSmbFile(
        smbPath.smbServer.host, smbPath.smbServer.port, smbPath.smbServer.username,
        smbPath.smbServer.password, smbPath.smbServer.domain, smbPath.path, filePath
      )
      return new NextResponse(toWebStream(s), { headers })
    } catch { return new NextResponse(null, { status: 404 }) }
  }

  const ftpPath = await prisma.categoryFtpPath.findFirst({ where: { id: pathId, categoryId }, include: { ftpServer: true } })
  if (ftpPath) {
    try {
      const s = await streamFtpFile(
        ftpPath.ftpServer.host, ftpPath.ftpServer.port, ftpPath.ftpServer.username,
        ftpPath.ftpServer.password, ftpPath.ftpServer.secure, ftpPath.path, filePath
      )
      return new NextResponse(toWebStream(s), { headers })
    } catch { return new NextResponse(null, { status: 404 }) }
  }

  const scpPath = await prisma.categoryScpPath.findFirst({ where: { id: pathId, categoryId }, include: { scpServer: true } })
  if (scpPath) {
    try {
      const s = await streamScpFile(
        {
          host: scpPath.scpServer.host, port: scpPath.scpServer.port, username: scpPath.scpServer.username,
          password: scpPath.scpServer.password, privateKey: scpPath.scpServer.privateKey, passphrase: scpPath.scpServer.passphrase,
        },
        scpPath.path, filePath
      )
      return new NextResponse(toWebStream(s), { headers })
    } catch { return new NextResponse(null, { status: 404 }) }
  }

  return new NextResponse(null, { status: 404 })
}
