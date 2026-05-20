'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { Download, Settings, Users, Server, Link2, LogOut, FolderOpen, HardDrive, Terminal, Lock, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavBarProps {
  user: { name: string; role: string }
  siteTitle?: string
}

export function NavBar({ user, siteTitle = 'SecureFiles' }: NavBarProps) {
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
    { href: '/admin/smb', label: 'SMB', desc: 'Windows / Samba shares', icon: HardDrive, swatch: 'bg-retro-sky' },
    { href: '/admin/ftp?type=ftp', label: 'FTP', desc: 'Plain File Transfer Protocol', icon: Server, swatch: 'bg-retro-lemon' },
    { href: '/admin/ftp?type=ftps', label: 'FTPS', desc: 'FTP over TLS', icon: Lock, swatch: 'bg-retro-mint' },
    { href: '/admin/scp', label: 'SCP / SFTP', desc: 'SSH file transfer', icon: Terminal, swatch: 'bg-retro-grape' },
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
    { href: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
  ] : []

  const linkClass = (active: boolean) => cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-[1.5px]',
    active
      ? 'bg-ink text-retro-lime border-ink'
      : 'border-transparent text-ink2 hover:border-ink hover:bg-paper hover:text-ink'
  )

  return (
    <nav className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px] gap-4">
          {/* Logo + primary nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/download" className="flex items-center gap-2.5 flex-shrink-0">
              <span className="w-9 h-9 rounded-xl bg-ink grid place-items-center shadow-hard-sm shadow-retro-coral">
                <span className="font-mono font-bold text-retro-lime text-lg leading-none">SF</span>
              </span>
              <span className="hidden sm:block font-display font-extrabold text-xl text-ink tracking-tight">{siteTitle}</span>
            </Link>

            <div className="flex items-center gap-1 flex-wrap">
              {navItems.map(({ href, label, icon: Icon }) => {
                const exactOnly = href === '/download' || href === '/admin'
                const active = exactOnly ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
                return (
                  <Link key={href} href={href} className={linkClass(active)}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:block">{label}</span>
                  </Link>
                )
              })}

              {isAdmin && (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setFileServicesOpen(o => !o)}
                    className={linkClass(fileServicesActive)}
                  >
                    <Server className="w-4 h-4" />
                    <span className="hidden md:block">File Services</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', fileServicesOpen && 'rotate-180')} />
                  </button>

                  {fileServicesOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-paper rounded-2xl border-[1.5px] border-ink shadow-hard-lg overflow-hidden z-50">
                      <div className="px-4 py-2 bg-bg2 border-b border-ink">
                        <p className="text-[11px] uppercase font-mono font-semibold text-ink2 tracking-wider">Protocols</p>
                      </div>
                      {fileServicesItems.map(({ href, label, desc, icon: Icon, swatch }) => {
                        const cleanHref = href.split('?')[0]
                        const active = pathname.startsWith(cleanHref)
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={cn(
                              'flex items-start gap-3 px-4 py-3 hover:bg-bg transition-colors border-l-4 border-b border-line last:border-b-0',
                              active ? 'border-l-ink bg-bg2/60' : 'border-l-transparent'
                            )}
                          >
                            <span className={cn('w-9 h-9 rounded-xl grid place-items-center border-[1.5px] border-ink flex-shrink-0', swatch)}>
                              <Icon className="w-4 h-4 text-ink" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink">{label}</p>
                              <p className="text-xs text-ink2">{desc}</p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {adminTailItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={href} href={href} className={linkClass(active)}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:block">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Account + sign-out */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/account"
              className={cn(
                'hidden sm:flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border-[1.5px] transition-all',
                pathname === '/account'
                  ? 'bg-ink text-retro-lime border-ink'
                  : 'border-transparent text-ink2 hover:border-ink hover:bg-paper hover:text-ink'
              )}
            >
              {user.name}
              {isAdmin && <span className="text-[10px] font-mono font-bold bg-retro-coral text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">Admin</span>}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-ink2 hover:text-retro-coral transition-colors text-sm font-medium"
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
