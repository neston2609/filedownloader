import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  const publicPaths = ['/login', '/register']
  if (publicPaths.includes(pathname)) {
    if (isAuthenticated) return NextResponse.redirect(new URL('/download', req.url))
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
