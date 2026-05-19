'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { Download, Settings, Users, Server, Link2, LogOut, FolderOpen, Shield, HardDrive, Terminal, Lock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavBarProps {
  user: { name: string; role: string }
}

export function NavBar({ user }: NavBarProps) {
  const pathname = usePathname()
  const isAdmin = user.role === 'ADMIN'
  const [fileServicesOpen, setFileServicesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFileServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setFileServicesOpen(false)
  }, [pathname])

  const fileServicesItems = [
    { href: '/admin/smb', label: 'SMB', desc: 'Windows / Samba shares', icon: HardDrive, color: 'text-blue-500' },
    { href: '/admin/ftp?type=ftp', label: 'FTP', desc: 'Plain File Transfer Protocol', icon: Server, color: 'text-amber-500' },
    { href: '/admin/ftp?type=ftps', label: 'FTPS', desc: 'FTP over TLS', icon: Lock, color: 'text-green-500' },
    { href: '/admin/scp', label: 'SCP / SFTP', desc: 'SSH file transfer', icon: Terminal, color: 'text-purple-500' },
  ]
  const fileServicesActive = ['/admin/smb', '/admin/ftp', '/admin/scp'].some(p => pathname.startsWith(p))

  const navItems = [
    { href: '/download', label: 'Downloads', icon: Download },
    ...(isAdmin ? [
      { href: '/admin', label: 'Dashboard', icon: Settings },
      { href: '/admin/users', label: 'Users', icon: Users },
    ] : []),
  ]

  const adminTailItems = isAdmin ? [
    { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
    { href: '/admin/affiliate', label: 'Affiliate', icon: Link2 },
  ] : []

  return (
    <nav className="bg-slate-900 shadow-lg border-b border-slate-800 relative">
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

              {isAdmin && (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setFileServicesOpen(o => !o)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      fileServicesActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Server className="w-4 h-4" />
                    <span className="hidden md:block">File Services</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', fileServicesOpen && 'rotate-180')} />
                  </button>

                  {fileServicesOpen && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
                      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700">
                        <p className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Protocols</p>
                      </div>
                      {fileServicesItems.map(({ href, label, desc, icon: Icon, color }) => {
                        const cleanHref = href.split('?')[0]
                        const active = pathname.startsWith(cleanHref)
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={cn(
                              'flex items-start gap-3 px-4 py-2.5 hover:bg-slate-700/70 transition-colors border-l-4',
                              active ? 'bg-blue-500/10 border-blue-500' : 'border-transparent'
                            )}
                          >
                            <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-100">{label}</p>
                              <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {adminTailItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === href || pathname.startsWith(href)
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
