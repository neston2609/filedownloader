import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { scpServerId, path } = await req.json()
  if (!scpServerId || !path) return NextResponse.json({ error: 'scpServerId and path required' }, { status: 400 })

  const entry = await prisma.categoryScpPath.create({
    data: { categoryId: params.id, scpServerId, path },
    include: { scpServer: { select: { name: true, host: true } } },
  })

  return NextResponse.json(entry, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pathId } = await req.json()
  await prisma.categoryScpPath.delete({ where: { id: pathId, categoryId: params.id } })
  return NextResponse.json({ success: true })
}
