import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSiteSettings } from '@/lib/settings'
import { verifySmtp, sendMail } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to } = await req.json().catch(() => ({}))
  const settings = await getSiteSettings()

  // First verify the connection
  const verify = await verifySmtp(settings)
  if (!verify.ok) {
    return NextResponse.json({ ok: false, message: `Connection failed: ${verify.message}` }, { status: 200 })
  }

  // If a recipient is given, also send a real test message
  if (to) {
    const result = await sendMail(
      to,
      `${settings.siteTitle} — SMTP test`,
      `<div style="font-family:system-ui,sans-serif"><h2>SMTP test successful</h2><p>This is a test email from <strong>${settings.siteTitle}</strong>. Your SMTP settings are working.</p></div>`
    )
    return NextResponse.json(result)
  }

  return NextResponse.json({ ok: true, message: 'SMTP connection verified. Add a recipient to send a test email.' })
}
