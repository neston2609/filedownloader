import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendMail, verifyEmailHtml } from '@/lib/mailer'
import { getSiteSettings } from '@/lib/settings'
import { getBaseUrl } from '@/lib/url'

// Resend the email-confirmation link. Always responds with a generic success
// (never reveals whether the account exists or is already verified).
export async function POST(req: NextRequest) {
  const { identifier } = await req.json().catch(() => ({ identifier: '' }))
  const id = typeof identifier === 'string' ? identifier.trim() : ''

  const generic = NextResponse.json({
    ok: true,
    message: 'If your account needs confirmation, a new link has been sent to your email.',
  })

  if (!id) return generic

  const looksLikeEmail = id.includes('@')
  const user = await prisma.user.findFirst({
    where: looksLikeEmail
      ? { email: { equals: id, mode: 'insensitive' } }
      : { username: id },
    select: { id: true, email: true, username: true, emailVerified: true },
  })

  // Unknown or already verified — say nothing specific
  if (!user || user.emailVerified) return generic

  const verifyToken = crypto.randomBytes(32).toString('hex')
  await prisma.user.update({ where: { id: user.id }, data: { verifyToken } })

  try {
    const settings = await getSiteSettings()
    if (settings.smtpEnabled) {
      const verifyUrl = `${getBaseUrl(req)}/api/auth/verify?token=${verifyToken}`
      await sendMail(
        user.email,
        `Confirm your email — ${settings.siteTitle}`,
        verifyEmailHtml({ username: user.username, siteTitle: settings.siteTitle, verifyUrl })
      )
    }
  } catch (err) {
    console.error('Resend confirmation failed:', err)
  }

  return generic
}
