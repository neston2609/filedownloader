import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { FileBrowser } from '@/components/FileBrowser'

interface Props {
  params: { categoryId: string }
  searchParams: { pathId?: string; path?: string }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true } } } },
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, secure: true } } } },
      scpPaths: { include: { scpServer: { select: { id: true, name: true } } } },
    },
  })

  if (!category) notFound()

  if (!isAdmin) {
    const access = await prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId, categoryId: params.categoryId } },
    })
    if (!access) redirect('/download')
  }

  // Merge SMB + FTP paths into a unified list
  const paths = [
    ...category.smbPaths.map((p) => ({
      id: p.id,
      protocol: 'smb' as const,
      serverName: p.smbServer.name,
      path: p.path,
    })),
    ...category.ftpPaths.map((p) => ({
      id: p.id,
      protocol: (p.ftpServer.secure ? 'ftps' : 'ftp') as 'ftp' | 'ftps',
      serverName: p.ftpServer.name,
      path: p.path,
    })),
    ...category.scpPaths.map((p) => ({
      id: p.id,
      protocol: 'scp' as const,
      serverName: p.scpServer.name,
      path: p.path,
    })),
  ]

  // Resolve affiliate URL
  let affiliateUrl: string | null = category.affiliateLinkOverride
  if (!affiliateUrl) {
    const settings = await prisma.affiliateSettings.findFirst()
    affiliateUrl = settings?.globalLink ?? null
  }

  return (
    <FileBrowser
      category={{ id: category.id, name: category.name, description: category.description }}
      paths={paths}
      initialPathId={searchParams.pathId ?? paths[0]?.id ?? null}
      initialSubPath={searchParams.path ?? ''}
      affiliateUrl={affiliateUrl || null}
    />
  )
}
