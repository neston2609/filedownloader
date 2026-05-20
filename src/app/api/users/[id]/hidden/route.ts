import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

// Hide a category from this member
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId } = await req.json()
  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  await prisma.userHiddenCategory.upsert({
    where: { userId_categoryId: { userId: params.id, categoryId } },
    update: {},
    create: { userId: params.id, categoryId },
  })
  return NextResponse.json({ success: true, hidden: true })
}

// Un-hide (make visible again)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId } = await req.json()
  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })

  await prisma.userHiddenCategory.deleteMany({
    where: { userId: params.id, categoryId },
  })
  return NextResponse.json({ success: true, hidden: false })
}
