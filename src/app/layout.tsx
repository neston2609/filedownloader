import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/SessionProvider'
import { getPublicSiteSettings } from '@/lib/settings'

const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://download.japantoyshop.com')
  .replace(/\/+$/, '')

const defaultTitle = 'Korean Variety Shows with Thai Subtitles | Japan Toy Shop'
const defaultDescription =
  'Stream and download Korean variety shows with Thai subtitles through a member portal by Japan Toy Shop.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: '%s | Japan Toy Shop',
  },
  description: defaultDescription,
  applicationName: 'Japan Toy Shop',
  authors: [{ name: 'Japan Toy Shop', url: 'https://www.japantoyshop.com/' }],
  creator: 'Japan Toy Shop',
  publisher: 'Japan Toy Shop',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: siteUrl,
    siteName: 'Japan Toy Shop',
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSiteSettings().catch(() => null)
  const siteTitle = settings?.siteTitle || 'Japan Toy Shop'
  const siteDescription = settings?.heroSubheading || defaultDescription
  const logoUrl = settings?.logoUrl ? `${siteUrl}/api${settings.logoUrl}` : undefined
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteTitle,
    url: siteUrl,
    ...(logoUrl ? { logo: logoUrl } : {}),
    sameAs: ['https://www.japantoyshop.com/'],
    description: siteDescription,
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body className="font-sans bg-bg text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
