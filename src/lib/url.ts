import { NextRequest } from 'next/server'

// Resolve the PUBLIC base URL for building absolute links (email links,
// redirects). Behind a reverse proxy, req.nextUrl.origin is the internal
// address (e.g. localhost:8000), so prefer the configured NEXTAUTH_URL or the
// X-Forwarded-* headers the proxy sets.
export function getBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL
  if (envUrl) return envUrl.replace(/\/+$/, '')

  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    || req.headers.get('host')
  if (host) return `${proto || 'https'}://${host}`

  return req.nextUrl.origin
}
