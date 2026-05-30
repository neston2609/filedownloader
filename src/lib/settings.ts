import { prisma } from '@/lib/prisma'

// Fetch the singleton SiteSettings row, creating it with defaults if missing.
export async function getSiteSettings() {
  let settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: {} })
  }
  return settings
}

// Public-safe subset (no SMTP password) for client components / pages.
export async function getPublicSiteSettings() {
  const s = await getSiteSettings()
  return {
    siteTitle: s.siteTitle,
    siteTagline: s.siteTagline,
    logoUrl: s.logoUrl,
    heroHeading: s.heroHeading,
    heroSubheading: s.heroSubheading,
    cardFooterNote: s.cardFooterNote,
    memberOnlyNotice: s.memberOnlyNotice,
    loginUnverifiedNotice: s.loginUnverifiedNotice,
    guestEnabled: s.guestEnabled,
    guestDailyLimit: s.guestDailyLimit,
    fileBrowserPageSize: s.fileBrowserPageSize,
  }
}
