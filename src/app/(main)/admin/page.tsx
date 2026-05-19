import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Server, FolderOpen, Link2, TrendingDown, UserCheck } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/download')

  const [userCount, pendingCount, serverCount, categoryCount, downloadCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: false } }),
    prisma.smbServer.count(),
    prisma.category.count(),
    prisma.downloadLog.count(),
  ])

  const cards = [
    { title: 'Total Members', value: userCount, icon: Users, color: 'blue', href: '/admin/users' },
    { title: 'Pending Approval', value: pendingCount, icon: UserCheck, color: 'amber', href: '/admin/users' },
    { title: 'SMB Servers', value: serverCount, icon: Server, color: 'green', href: '/admin/smb' },
    { title: 'Categories', value: categoryCount, icon: FolderOpen, color: 'purple', href: '/admin/categories' },
    { title: 'Total Downloads', value: downloadCount, icon: TrendingDown, color: 'slate', href: '/admin' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map(card => (
          <Link key={card.title} href={card.href}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${colorMap[card.color]}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/users', label: 'Manage Users & Permissions', icon: Users },
              { href: '/admin/smb', label: 'Configure SMB Servers', icon: Server },
              { href: '/admin/categories', label: 'Manage Categories & Paths', icon: FolderOpen },
              { href: '/admin/affiliate', label: 'Affiliate Link Settings', icon: Link2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700 hover:text-blue-600"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Action Required
            </h2>
            <p className="text-amber-800 text-sm mb-3">
              {pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting account activation.
            </p>
            <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
              Review pending users →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
