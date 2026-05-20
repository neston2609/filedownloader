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
    heroHeading: s.heroHeading,
    heroSubheading: s.heroSubheading,
    cardFooterNote: s.cardFooterNote,
  }
}
