import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Returns the affiliate URL to use for a given category (or the global default)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categoryId = req.nextUrl.searchParams.get('categoryId')

  let affiliateUrl: string | null = null

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { affiliateLinkOverride: true },
    })
    affiliateUrl = category?.affiliateLinkOverride ?? null
  }

  if (!affiliateUrl) {
    const settings = await prisma.affiliateSettings.findFirst()
    affiliateUrl = settings?.globalLink ?? null
  }

  return NextResponse.json({ affiliateUrl: affiliateUrl || null })
}
