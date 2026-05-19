import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Server, FolderOpen, Link2, TrendingDown, UserCheck } from 'lucide-react'

export default async function AdminDashboard() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/download')

  const [userCount, pendingCount, smbCount, ftpCount, scpCount, categoryCount, downloadCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: false } }),
    prisma.smbServer.count(),
    prisma.ftpServer.count(),
    prisma.scpServer.count(),
    prisma.category.count(),
    prisma.downloadLog.count(),
  ])

  const fileServerTotal = smbCount + ftpCount + scpCount

  const cards = [
    { title: 'Total Members', value: userCount, icon: Users, color: 'blue', href: '/admin/users' },
    { title: 'Pending Approval', value: pendingCount, icon: UserCheck, color: 'amber', href: '/admin/users' },
    { title: 'File Servers', value: fileServerTotal, icon: Server, color: 'green', href: '/admin/smb' },
    { title: 'Categories', value: categoryCount, icon: FolderOpen, color: 'purple', href: '/admin/categories' },
    { title: 'Total Downloads', value: downloadCount, icon: TrendingDown, color: 'slate', href: '/admin' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-300',
    amber: 'bg-amber-500/20 text-amber-300',
    green: 'bg-green-500/20 text-green-300',
    purple: 'bg-purple-500/20 text-purple-300',
    slate: 'bg-slate-700 text-slate-200',
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map(card => (
          <Link key={card.title} href={card.href}
            className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-sm hover:shadow-md hover:border-blue-500 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.title}</p>
                <p className="text-3xl font-bold text-slate-100 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${colorMap[card.color]}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-100 mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/users', label: 'Manage Users & Permissions', icon: Users },
              { href: '/admin/smb', label: 'SMB Servers', icon: Server },
              { href: '/admin/ftp', label: 'FTP / FTPS Servers', icon: Server },
              { href: '/admin/scp', label: 'SCP / SFTP Servers', icon: Server },
              { href: '/admin/categories', label: 'Manage Categories & Paths', icon: FolderOpen },
              { href: '/admin/affiliate', label: 'Affiliate Link Settings', icon: Link2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors text-sm text-slate-200 hover:text-blue-400"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <h2 className="font-semibold text-amber-200 mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Action Required
            </h2>
            <p className="text-amber-200 text-sm mb-3">
              {pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting account activation.
            </p>
            <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200 transition-colors">
              Review pending users →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
