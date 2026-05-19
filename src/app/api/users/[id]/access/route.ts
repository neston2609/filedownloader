import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

// Grant category access
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId } = await req.json()

  const access = await prisma.userCategoryAccess.upsert({
    where: { userId_categoryId: { userId: params.id, categoryId } },
    create: { userId: params.id, categoryId, grantedBy: session.user?.id },
    update: { grantedAt: new Date(), grantedBy: session.user?.id },
  })

  return NextResponse.json(access)
}

// Revoke category access
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId } = await req.json()

  await prisma.userCategoryAccess.deleteMany({
    where: { userId: params.id, categoryId },
  })

  return NextResponse.json({ success: true })
}
