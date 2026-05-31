import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://download.japantoyshop.com')
  .replace(/\/+$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const categories = await prisma.category
    .findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true },
    })
    .catch(() => [])

  return [
    {
      url: `${siteUrl}/download`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    ...categories.map((category) => ({
      url: `${siteUrl}/download/${category.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
