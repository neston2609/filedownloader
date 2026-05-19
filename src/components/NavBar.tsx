'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Download, Settings, Users, Server, Link2, LogOut, FolderOpen, Shield, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavBarProps {
  user: { name: string; role: string }
}

export function NavBar({ user }: NavBarProps) {
  const pathname = usePathname()
  const isAdmin = user.role === 'ADMIN'

  const navItems = [
    { href: '/download', label: 'Downloads', icon: Download },
    ...(isAdmin ? [
      { href: '/admin', label: 'Dashboard', icon: Settings },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/smb', label: 'SMB Servers', icon: HardDrive },
      { href: '/admin/ftp', label: 'FTP Servers', icon: Server },
      { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
      { href: '/admin/affiliate', label: 'Affiliate', icon: Link2 },
    ] : []),
  ]

  return (
    <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/download" className="flex items-center gap-2 text-white font-bold text-lg">
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="hidden sm:block">SecureFiles</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === href || (href !== '/download' && pathname.startsWith(href))
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.name}
              {isAdmin && <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Admin</span>}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
