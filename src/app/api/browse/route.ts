import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { listSmbDirectory } from '@/lib/smb'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const subPath = searchParams.get('subPath') ?? ''

  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  // Check access
  const hasAccess = await prisma.userCategoryAccess.findUnique({
    where: { userId_categoryId: { userId: session.user.id, categoryId } },
  })

  const isAdmin = session.user.role === 'ADMIN'
  if (!hasAccess && !isAdmin) {
    return NextResponse.json({ error: 'Access denied to this category' }, { status: 403 })
  }

  // Get SMB paths for this category
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { smbPaths: { include: { smbServer: true } } },
  })

  if (!category || category.smbPaths.length === 0) {
    return NextResponse.json({ entries: [], paths: [] })
  }

  // If specific path requested, use first SMB config for that path
  // Decode subPath: format is "pathIndex/subfolder/..."
  const pathIndexMatch = subPath.match(/^(\d+)\/(.*)$/)
  const pathIndex = pathIndexMatch ? parseInt(pathIndexMatch[1]) : 0
  const relativePath = pathIndexMatch ? pathIndexMatch[2] : subPath

  const smbPathConfig = category.smbPaths[pathIndex] ?? category.smbPaths[0]
  const { smbServer } = smbPathConfig

  try {
    const entries = await listSmbDirectory(
      smbServer.host,
      smbServer.port,
      smbServer.username,
      smbServer.password,
      smbServer.domain,
      smbPathConfig.path,
      relativePath
    )

    return NextResponse.json({
      entries,
      currentPath: subPath,
      pathIndex: smbPathConfig ? category.smbPaths.indexOf(smbPathConfig) : 0,
    })
  } catch (err) {
    console.error('SMB browse error:', err)
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 })
  }
}
