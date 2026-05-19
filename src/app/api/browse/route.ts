import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { listSmbDirectory } from '@/lib/smb'
import { listFtpDirectory } from '@/lib/ftp'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathId = searchParams.get('pathId')
  const subPath = searchParams.get('subPath') ?? ''

  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  // Access check
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin) {
    const hasAccess = await prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId: session.user.id, categoryId } },
    })
    if (!hasAccess) return NextResponse.json({ error: 'Access denied to this category' }, { status: 403 })
  }

  // Try SMB first
  const smbPath = pathId
    ? await prisma.categorySmbPath.findFirst({
        where: { id: pathId, categoryId },
        include: { smbServer: true },
      })
    : await prisma.categorySmbPath.findFirst({
        where: { categoryId },
        include: { smbServer: true },
      })

  if (smbPath) {
    try {
      const entries = await listSmbDirectory(
        smbPath.smbServer.host, smbPath.smbServer.port,
        smbPath.smbServer.username, smbPath.smbServer.password,
        smbPath.smbServer.domain, smbPath.path, subPath
      )
      return NextResponse.json({ entries, pathId: smbPath.id, protocol: 'smb' })
    } catch (err) {
      console.error('SMB browse error:', err)
      return NextResponse.json({ error: (err as Error).message ?? 'SMB browse failed' }, { status: 500 })
    }
  }

  // Try FTP
  const ftpPath = pathId
    ? await prisma.categoryFtpPath.findFirst({
        where: { id: pathId, categoryId },
        include: { ftpServer: true },
      })
    : await prisma.categoryFtpPath.findFirst({
        where: { categoryId },
        include: { ftpServer: true },
      })

  if (ftpPath) {
    try {
      const entries = await listFtpDirectory(
        ftpPath.ftpServer.host, ftpPath.ftpServer.port,
        ftpPath.ftpServer.username, ftpPath.ftpServer.password,
        ftpPath.ftpServer.secure, ftpPath.path, subPath
      )
      return NextResponse.json({ entries, pathId: ftpPath.id, protocol: 'ftp' })
    } catch (err) {
      console.error('FTP browse error:', err)
      return NextResponse.json({ error: (err as Error).message ?? 'FTP browse failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ entries: [], pathId: null, protocol: null })
}
