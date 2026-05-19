import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { smbServerId, path } = await req.json()
  if (!smbServerId || !path) return NextResponse.json({ error: 'smbServerId and path required' }, { status: 400 })

  const entry = await prisma.categorySmbPath.create({
    data: { categoryId: params.id, smbServerId, path },
    include: { smbServer: { select: { name: true, host: true } } },
  })

  return NextResponse.json(entry, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pathId } = await req.json()
  await prisma.categorySmbPath.delete({ where: { id: pathId, categoryId: params.id } })
  return NextResponse.json({ success: true })
}
