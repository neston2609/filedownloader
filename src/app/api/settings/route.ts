import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const s = await getSiteSettings()
  // Never return the SMTP password to the client — send a placeholder flag.
  return NextResponse.json({
    ...s,
    smtpPassword: '',
    hasSmtpPassword: !!s.smtpPassword,
  })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const current = await getSiteSettings()

  const portNum = body.smtpPort !== undefined && body.smtpPort !== ''
    ? Number(body.smtpPort)
    : undefined
  if (portNum !== undefined && Number.isNaN(portNum)) {
    return NextResponse.json({ error: 'smtpPort must be a number' }, { status: 400 })
  }

  const updated = await prisma.siteSettings.update({
    where: { id: current.id },
    data: {
      ...(body.siteTitle !== undefined && { siteTitle: body.siteTitle }),
      ...(body.heroHeading !== undefined && { heroHeading: body.heroHeading }),
      ...(body.heroSubheading !== undefined && { heroSubheading: body.heroSubheading }),
      ...(body.smtpEnabled !== undefined && { smtpEnabled: !!body.smtpEnabled }),
      ...(body.smtpHost !== undefined && { smtpHost: body.smtpHost }),
      ...(portNum !== undefined && { smtpPort: portNum }),
      ...(body.smtpSecure !== undefined && { smtpSecure: !!body.smtpSecure }),
      ...(body.smtpUser !== undefined && { smtpUser: body.smtpUser }),
      // Only overwrite password when a non-empty value is supplied
      ...(body.smtpPassword ? { smtpPassword: body.smtpPassword } : {}),
      ...(body.smtpFromEmail !== undefined && { smtpFromEmail: body.smtpFromEmail }),
      ...(body.smtpFromName !== undefined && { smtpFromName: body.smtpFromName }),
      ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
      ...(body.bankAccount !== undefined && { bankAccount: body.bankAccount }),
      ...(body.cardFooterNote !== undefined && { cardFooterNote: body.cardFooterNote }),
      ...(body.memberOnlyNotice !== undefined && { memberOnlyNotice: body.memberOnlyNotice }),
      ...(body.loginUnverifiedNotice !== undefined && { loginUnverifiedNotice: body.loginUnverifiedNotice }),
      ...(body.guestEnabled !== undefined && { guestEnabled: !!body.guestEnabled }),
      ...(body.guestDailyLimit !== undefined && { guestDailyLimit: Math.max(1, Number(body.guestDailyLimit) || 5) }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.logoSize !== undefined && { logoSize: Math.max(24, Math.min(120, Number(body.logoSize) || 36)) }),
      ...(body.homeUrl !== undefined && { homeUrl: body.homeUrl }),
      ...(body.siteTagline !== undefined && { siteTagline: body.siteTagline }),
      ...(body.fileBrowserPageSize !== undefined && { fileBrowserPageSize: Math.max(5, Math.min(200, Number(body.fileBrowserPageSize) || 20)) }),
    },
  })

  return NextResponse.json({ ...updated, smtpPassword: '', hasSmtpPassword: !!updated.smtpPassword })
}
