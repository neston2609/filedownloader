import { NextResponse } from 'next/server'
import { getPublicSiteSettings } from '@/lib/settings'

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
    })
  }
}
