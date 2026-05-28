import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { FileBrowser } from '@/components/FileBrowser'
import { checkCategoryAccess, checkCategoryBrowse } from '@/lib/access'
import { getPublicSiteSettings } from '@/lib/settings'

interface Props {
  params: { categoryId: string }
  searchParams: { pathId?: string; path?: string }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const session = await auth()
  const isGuest = !session?.user?.id

  // Guest access guard
  if (isGuest) {
    const settings = await getPublicSiteSettings()
    if (!settings.guestEnabled) redirect('/login')
  }

  const userId = session?.user?.id ?? null
  const isAdmin = session?.user?.role === 'ADMIN'

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true } } } },
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, secure: true } } } },
      scpPaths: { include: { scpServer: { select: { id: true, name: true } } } },
    },
  })

  if (!category) notFound()

  // Authenticated members: check browse permission (hidden categories block entry).
  // Guests: always allow (no per-user hidden rules apply to guests).
  if (!isGuest && userId) {
    const browse = await checkCategoryBrowse(userId, params.categoryId, isAdmin)
    if (!browse.allowed) redirect('/download')
  }

  // canDownload: guests can never download; authenticated users depend on access check
  let canDownload = false
  if (!isGuest && userId) {
    const access = await checkCategoryAccess(userId, params.categoryId, isAdmin)
    canDownload = access.allowed
  }

  const settings = await getPublicSiteSettings()

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
    const aff = await prisma.affiliateSettings.findFirst()
    affiliateUrl = aff?.globalLink ?? null
  }

  const imageUrl = category.imageUrl && category.imageUrl.startsWith('/uploads/')
    ? `/api${category.imageUrl}`
    : category.imageUrl

  return (
    <FileBrowser
      category={{ id: category.id, name: category.name, description: category.description, imageUrl: imageUrl ?? null }}
      paths={paths}
      initialPathId={searchParams.pathId ?? paths[0]?.id ?? null}
      initialSubPath={searchParams.path ?? ''}
      affiliateUrl={affiliateUrl || null}
      canDownload={canDownload}
      isGuest={isGuest}
      guestDailyLimit={settings.guestDailyLimit}
      memberOnlyNotice={settings.memberOnlyNotice}
    />
  )
}
