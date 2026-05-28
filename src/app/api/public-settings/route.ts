import { NextResponse } from 'next/server'
import { getPublicSiteSettings } from '@/lib/settings'

// Force dynamic so settings changes (e.g. guestEnabled) are read from DB
// on every request instead of being frozen at build time.
export const dynamic = 'force-dynamic'

// Public, unauthenticated — only branding strings, no secrets.
export async function GET() {
  try {
    const settings = await getPublicSiteSettings()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({
      siteTitle: 'SecureFiles',
      heroHeading: 'Download anything, from anywhere',
      heroSubheading: 'Secure, members-only file downloads.',
      cardFooterNote: '',
      memberOnlyNotice: 'สำหรับสมาชิกเท่านั้น ศึกษารายละเอียดได้ที่หน้า Subscription',
    })
  }
}
