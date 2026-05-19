import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { FileBrowser } from '@/components/FileBrowser'

interface Props {
  params: { categoryId: string }
  searchParams: { path?: string }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const session = await auth()
  const userId = session!.user!.id
  const isAdmin = session!.user!.role === 'ADMIN'

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true } } } },
    },
  })

  if (!category) notFound()

  // Access check
  if (!isAdmin) {
    const access = await prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId, categoryId: params.categoryId } },
    })
    if (!access) redirect('/download')
  }

  // Resolve affiliate URL
  let affiliateUrl: string | null = category.affiliateLinkOverride
  if (!affiliateUrl) {
    const settings = await prisma.affiliateSettings.findFirst()
    affiliateUrl = settings?.globalLink ?? null
  }

  return (
    <FileBrowser
      category={category}
      currentPath={searchParams.path ?? ''}
      affiliateUrl={affiliateUrl || null}
    />
  )
}
