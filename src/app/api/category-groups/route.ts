import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await prisma.categoryGroup.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { categories: true } } },
  })
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, sortOrder } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const group = await prisma.categoryGroup.create({
    data: { name, sortOrder: sortOrder ? Number(sortOrder) : 0 },
    include: { _count: { select: { categories: true } } },
  })
  return NextResponse.json(group, { status: 201 })
}
