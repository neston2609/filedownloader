'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { Download, Settings, Users, Server, Link2, LogOut, FolderOpen, HardDrive, Terminal, Lock, ChevronDown, SlidersHorizontal, CreditCard, LogIn, UserPlus, ActivitySquare, Globe, Mail, EyeOff, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavBarProps {
  user: { name: string; role: string } | null
  siteTitle?: string
  siteTagline?: string
  logoUrl?: string
  logoSize?: number
  homeUrl?: string
}

export function NavBar({ user, siteTitle = 'SecureFiles', siteTagline = '', logoUrl = '', logoSize = 36, homeUrl = '' }: NavBarProps) {
  // NavBar height grows with the logo (min 64px, logo + 16px padding on each side)
  const navH = Math.max(64, logoSize + 32)
  const pathname = usePathname()
  const isAdmin = user?.role === 'ADMIN'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setSettingsOpen(false)
  }, [pathname])

  // Everything an admin configures lives under one Settings dropdown.
  const settingsSections = [
    {
      title: 'Members',
      items: [
        { href: '/admin/users', label: 'Users', desc: 'Accounts, access & membership', icon: Users, swatch: 'bg-retro-sky' },
        { href: '/admin/subscriptions', label: 'Subscriptions', desc: 'Payment requests & approval', icon: CreditCard, swatch: 'bg-retro-mint' },
      ],
    },
    {
      title: 'Content',
      items: [
        { href: '/admin/categories', label: 'Categories', desc: 'Categories, groups & paths', icon: FolderOpen, swatch: 'bg-retro-lemon' },
        { href: '/admin/affiliate', label: 'Affiliate', desc: 'Global affiliate link', icon: Link2, swatch: 'bg-retro-coral' },
        { href: '/admin/settings/banners', label: 'Banners', desc: 'Ad banners on all pages', icon: ActivitySquare, swatch: 'bg-retro-sky' },
        { href: '/admin/settings/hide-rules', label: 'Hide Rules', desc: 'Hidden files & folders', icon: EyeOff, swatch: 'bg-retro-grape' },
      ],
    },
    {
      title: 'File Services',
      items: [
        { href: '/admin/smb', label: 'SMB', desc: 'Windows / Samba shares', icon: HardDrive, swatch: 'bg-retro-sky' },
        { href: '/admin/ftp?type=ftp', label: 'FTP', desc: 'File Transfer Protocol', icon: Server, swatch: 'bg-retro-lemon' },
        { href: '/admin/ftp?type=ftps', label: 'FTPS', desc: 'FTP over TLS', icon: Lock, swatch: 'bg-retro-mint' },
        { href: '/admin/scp', label: 'SCP / SFTP', desc: 'SSH file transfer', icon: Terminal, swatch: 'bg-retro-grape' },
      ],
    },
    {
      title: 'System',
      items: [
        { href: '/admin/settings/branding', label: 'Branding', desc: 'Logo, site title & hero text', icon: Globe, swatch: 'bg-retro-lemon' },
        { href: '/admin/settings/guest', label: 'Guest Access', desc: 'Guest play rules & quota', icon: Users, swatch: 'bg-retro-sky' },
        { href: '/admin/settings/browser', label: 'File Browser', desc: 'Items per page & display', icon: SlidersHorizontal, swatch: 'bg-retro-mint' },
        { href: '/admin/settings/payment', label: 'Payment & Plans', desc: 'Bank details, QR & plans', icon: CreditCard, swatch: 'bg-retro-coral' },
        { href: '/admin/settings/email', label: 'Email (SMTP)', desc: 'Outgoing email settings', icon: Mail, swatch: 'bg-retro-grape' },
        { href: '/admin/access-logs', label: 'Access Log', desc: 'Login, guest browse & play events', icon: ActivitySquare, swatch: 'bg-retro-coral' },
      ],
    },
  ]

  // The Settings dropdown is "active" on any /admin/* page except the dashboard.
  const settingsActive = pathname.startsWith('/admin/')

  const navItems = [
    { href: '/download', label: 'Downloads', icon: Download },
    ...(user
      ? isAdmin
        ? [{ href: '/admin', label: 'Dashboard', icon: Settings }]
        : [{ href: '/subscribe', label: 'Subscribe', icon: CreditCard }]
      : []),
  ]

  const linkClass = (active: boolean) => cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border-[1.5px]',
    active
      ? 'bg-ink text-retro-lime border-ink'
      : 'border-transparent text-ink2 hover:border-ink hover:bg-paper hover:text-ink'
  )

  return (
    <nav className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4" style={{ height: navH }}>
          {/* Logo + primary nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/download" className="flex items-center gap-2.5 flex-shrink-0">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api${logoUrl}`}
                  alt={siteTitle}
                  style={{ width: logoSize, height: logoSize }}
                  className="rounded-xl object-contain shadow-hard-sm border-[1.5px] border-ink bg-paper flex-shrink-0"
                />
              ) : (
                <span
                  style={{ width: logoSize, height: logoSize }}
                  className="rounded-xl bg-ink grid place-items-center shadow-hard-sm shadow-retro-coral flex-shrink-0"
                >
                  <span className="font-mono font-bold text-retro-lime leading-none" style={{ fontSize: Math.max(10, logoSize * 0.45) }}>SF</span>
                </span>
              )}
              <span className="hidden sm:block leading-tight">
                <span className="font-display font-extrabold text-xl text-ink tracking-tight block">{siteTitle}</span>
                {siteTagline && <span className="text-[11px] text-ink2 font-medium tracking-wide block">{siteTagline}</span>}
              </span>
            </Link>

            <div className="flex items-center gap-1 flex-wrap">
              {/* Home button — first, shown only when homeUrl is configured */}
              {homeUrl && (
                homeUrl.startsWith('http') ? (
                  <a href={homeUrl} target="_blank" rel="noopener noreferrer" className={linkClass(false)}>
                    <Home className="w-4 h-4" />
                    <span className="hidden md:block">Home</span>
                  </a>
                ) : (
                  <Link href={homeUrl} className={linkClass(pathname === homeUrl)}>
                    <Home className="w-4 h-4" />
                    <span className="hidden md:block">Home</span>
                  </Link>
                )
              )}

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
                    onClick={() => setSettingsOpen(o => !o)}
                    className={linkClass(settingsActive)}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden md:block">Settings</span>
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', settingsOpen && 'rotate-180')} />
                  </button>

                  {settingsOpen && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-paper rounded-2xl border-[1.5px] border-ink shadow-hard-lg overflow-hidden z-50 max-h-[80vh] overflow-y-auto">
                      {settingsSections.map((section) => (
                        <div key={section.title}>
                          <div className="px-4 py-2 bg-bg2 border-b border-ink">
                            <p className="text-[11px] uppercase font-mono font-semibold text-ink2 tracking-wider">{section.title}</p>
                          </div>
                          {section.items.map(({ href, label, desc, icon: Icon, swatch }) => {
                            const cleanHref = href.split('?')[0]
                            const active = pathname === cleanHref || pathname.startsWith(cleanHref + '/')
                            return (
                              <Link
                                key={href}
                                href={href}
                                className={cn(
                                  'flex items-start gap-3 px-4 py-2.5 hover:bg-bg transition-colors border-l-4 border-b border-line',
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side — account info or guest login/register */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
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
              </>
            ) : (
              <>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-mute bg-bg2 border-[1.5px] border-ink px-2.5 py-1 rounded-full">
                  Guest
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border-[1.5px] border-transparent text-ink2 hover:border-ink hover:bg-paper hover:text-ink transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:block">Login</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border-[1.5px] border-ink bg-ink text-retro-lime transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:block">Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
