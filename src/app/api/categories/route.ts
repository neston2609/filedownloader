import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { smbPaths: { include: { smbServer: { select: { id: true, name: true, host: true } } } } },
  })

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, affiliateLinkOverride, sortOrder } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const category = await prisma.category.create({
    data: { name, description: description ?? '', affiliateLinkOverride: affiliateLinkOverride || null, sortOrder: sortOrder ?? 0 },
  })

  return NextResponse.json(category, { status: 201 })
}
