import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { isActive, paymentStatus, notes, role } = body

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(notes !== undefined && { notes }),
      ...(role !== undefined && { role }),
    },
    select: { id: true, email: true, username: true, role: true, isActive: true, paymentStatus: true, notes: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
