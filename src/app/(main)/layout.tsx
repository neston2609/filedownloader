import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { NavBar } from '@/components/NavBar'
import { getPublicSiteSettings } from '@/lib/settings'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getPublicSiteSettings()

  return (
    <div className="min-h-screen bg-bg">
      <NavBar
        user={{ name: session.user?.name ?? '', role: session.user?.role ?? 'MEMBER' }}
        siteTitle={settings.siteTitle}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
