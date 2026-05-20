import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { listSmbDirectory } from '@/lib/smb'
import { listFtpDirectory } from '@/lib/ftp'
import { listScpDirectory } from '@/lib/scp'
import { checkCategoryBrowse, accessDenyResponse } from '@/lib/access'
import { getHideRules, isHidden } from '@/lib/hide'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const pathId = searchParams.get('pathId')
  const subPath = searchParams.get('subPath') ?? ''

  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  // Browse check — members can list files in any non-hidden category.
  // Download/Play are gated separately (see /api/download, /api/stream).
  const isAdmin = session.user.role === 'ADMIN'
  const access = await checkCategoryBrowse(session.user.id, categoryId, isAdmin)
  if (!access.allowed) {
    const deny = accessDenyResponse(access.reason!)
    return NextResponse.json(deny.body, { status: deny.status })
  }

  // Hide rules (global + this category) — applied to listings for everyone.
  const hideRules = await getHideRules(categoryId)
  const applyHide = <T extends { name: string; isDirectory: boolean }>(items: T[]) =>
    items.filter((e) => !isHidden(e.name, e.isDirectory, hideRules))

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
      return NextResponse.json({ entries: applyHide(entries), pathId: smbPath.id, protocol: 'smb' })
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
      return NextResponse.json({ entries: applyHide(entries), pathId: ftpPath.id, protocol: 'ftp' })
    } catch (err) {
      console.error('FTP browse error:', err)
      return NextResponse.json({ error: (err as Error).message ?? 'FTP browse failed' }, { status: 500 })
    }
  }

  // Try SCP
  const scpPath = pathId
    ? await prisma.categoryScpPath.findFirst({
        where: { id: pathId, categoryId },
        include: { scpServer: true },
      })
    : await prisma.categoryScpPath.findFirst({
        where: { categoryId },
        include: { scpServer: true },
      })

  if (scpPath) {
    try {
      const entries = await listScpDirectory(
        {
          host: scpPath.scpServer.host, port: scpPath.scpServer.port,
          username: scpPath.scpServer.username, password: scpPath.scpServer.password,
          privateKey: scpPath.scpServer.privateKey, passphrase: scpPath.scpServer.passphrase,
        },
        scpPath.path, subPath
      )
      return NextResponse.json({
        entries: applyHide(entries), pathId: scpPath.id, protocol: 'scp',
        debug: { basePath: scpPath.path, subPath, host: scpPath.scpServer.host },
      })
    } catch (err) {
      console.error('SCP browse error:', err)
      return NextResponse.json({
        error: (err as Error).message ?? 'SCP browse failed',
        debug: { basePath: scpPath.path, subPath, host: scpPath.scpServer.host },
      }, { status: 500 })
    }
  }

  return NextResponse.json({ entries: [], pathId: null, protocol: null })
}
