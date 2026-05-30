import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Root always redirects to /download (both guests and logged-in users)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/download', req.url))
  }

  const publicPaths = ['/login', '/register']
  if (publicPaths.includes(pathname)) {
    if (isAuthenticated) return NextResponse.redirect(new URL('/download', req.url))
    return NextResponse.next()
  }

  // Guest-accessible routes — no auth required.
  // The individual pages and API routes enforce guest rules (play-only, daily quota).
  const guestPaths = ['/download', '/play']
  if (guestPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin-only routes
  const adminPaths = ['/admin']
  if (adminPaths.some((p) => pathname.startsWith(p))) {
    if (req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/download', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
