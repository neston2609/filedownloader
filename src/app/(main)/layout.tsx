import { auth } from '@/auth'
import { NavBar } from '@/components/NavBar'
import { BannerStrip } from '@/components/BannerStrip'
import { getPublicSiteSettings } from '@/lib/settings'
import { prisma } from '@/lib/prisma'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  // Note: /download and /play are guest-accessible — middleware no longer
  // redirects unauthenticated users for those routes. Pages that still need
  // a session (account, subscribe, admin) guard themselves.

  const [settings, banners] = await Promise.all([
    getPublicSiteSettings(),
    prisma.banner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, imageUrl: true, linkUrl: true },
    }),
  ])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <NavBar
        user={session ? { name: session.user?.name ?? '', role: session.user?.role ?? 'MEMBER' } : null}
        siteTitle={settings.siteTitle}
        siteTagline={settings.siteTagline}
        logoUrl={settings.logoUrl && settings.logoUrl.startsWith('/uploads/') ? settings.logoUrl : ''}
        logoSize={settings.logoSize ?? 36}
      />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {children}
      </main>
      <BannerStrip banners={banners} />
    </div>
  )
}
