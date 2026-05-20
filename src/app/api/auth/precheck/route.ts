import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'

// Pre-login check: given an identifier (email or username), report whether the
// account needs email confirmation or admin approval — so the login page can
// show a helpful message instead of NextAuth's generic "Configuration" error.
// Does NOT check the password (avoids duplicating auth) and never reveals
// whether an account exists (unknown -> status 'ok').
export async function POST(req: NextRequest) {
  const { identifier } = await req.json().catch(() => ({ identifier: '' }))
  const id = typeof identifier === 'string' ? identifier.trim() : ''
  if (!id) return NextResponse.json({ status: 'ok' })

  const looksLikeEmail = id.includes('@')
  const user = await prisma.user.findFirst({
    where: looksLikeEmail
      ? { email: { equals: id, mode: 'insensitive' } }
      : { username: id },
    select: { emailVerified: true, isActive: true },
  })

  // Unknown account → let signIn handle it (generic invalid credentials)
  if (!user) return NextResponse.json({ status: 'ok' })

  if (!user.emailVerified) {
    const settings = await getSiteSettings()
    return NextResponse.json({ status: 'unverified', message: settings.loginUnverifiedNotice })
  }
  if (!user.isActive) {
    return NextResponse.json({ status: 'pending', message: 'Your account is awaiting admin approval.' })
  }
  return NextResponse.json({ status: 'ok' })
}
