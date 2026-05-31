import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { FileBrowser } from '@/components/FileBrowser'
import { checkCategoryAccess, checkCategoryBrowse } from '@/lib/access'
import { getPublicSiteSettings } from '@/lib/settings'
import type { Metadata } from 'next'

interface Props {
  params: { categoryId: string }
  searchParams: { pathId?: string; path?: string }
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const category = await prisma.category
    .findUnique({
      where: { id: params.categoryId },
      select: { name: true, description: true, imageUrl: true },
    })
    .catch(() => null)

  if (!category) {
    return {
      title: 'Content Not Found',
      robots: { index: false, follow: false },
    }
  }

  const description =
    category.description ||
    `Preview ${category.name} and sign in for member download access through Japan Toy Shop.`
  const imageUrl = category.imageUrl?.startsWith('/uploads/') ? `/api${category.imageUrl}` : category.imageUrl || undefined

  return {
    title: category.name,
    description,
    alternates: {
      canonical: `/download/${params.categoryId}`,
    },
    openGraph: {
      title: `${category.name} | Japan Toy Shop`,
      description,
      url: `/download/${params.categoryId}`,
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: `${category.name} | Japan Toy Shop`,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  }
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

  // canDownload: full access (subscribed member / admin)
  // canPlay: subscribed members + unsubscribed active members (limited quota) + guests
  //   Only truly blocked for inactive accounts.
  let canDownload = false
  let canPlay = isGuest  // guests handled separately via isGuest prop
  if (!isGuest && userId) {
    const access = await checkCategoryAccess(userId, params.categoryId, isAdmin)
    canDownload = access.allowed
    canPlay = access.allowed || (access.reason !== 'inactive' && access.reason !== 'hidden')
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
      canPlay={canPlay}
      isGuest={isGuest}
      guestDailyLimit={settings.guestDailyLimit}
      memberOnlyNotice={settings.memberOnlyNotice}
      pageSize={settings.fileBrowserPageSize ?? 20}
    />
  )
}
