import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, sortOrder } = await req.json()
  const group = await prisma.categoryGroup.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
    },
    include: { _count: { select: { categories: true } } },
  })
  return NextResponse.json(group)
}

// Deleting a group leaves its categories ungrouped (groupId -> null via SetNull).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.categoryGroup.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
