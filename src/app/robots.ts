import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://download.japantoyshop.com')
  .replace(/\/+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/download', '/download/'],
        disallow: ['/admin', '/api', '/account', '/subscribe', '/play'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
