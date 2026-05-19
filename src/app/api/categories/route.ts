import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true, host: true } } } },
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, host: true, secure: true } } } },
      scpPaths: { include: { scpServer: { select: { id: true, name: true, host: true } } } },
    },
  })

  // Rewrite legacy /uploads/* URLs to the new /api/uploads/* route.
  // Old images saved to public/uploads/ get served via the legacy root in
  // the [...path] route handler.
  const normalized = categories.map((c) => ({
    ...c,
    imageUrl: c.imageUrl && c.imageUrl.startsWith('/uploads/')
      ? `/api${c.imageUrl}`
      : c.imageUrl,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, affiliateLinkOverride, sortOrder } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const category = await prisma.category.create({
    data: { name, description: description ?? '', affiliateLinkOverride: affiliateLinkOverride || null, sortOrder: sortOrder ?? 0 },
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true, host: true } } } },
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, host: true, secure: true } } } },
      scpPaths: { include: { scpServer: { select: { id: true, name: true, host: true } } } },
    },
  })

  return NextResponse.json(category, { status: 201 })
}
