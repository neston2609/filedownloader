import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, affiliateLinkOverride, sortOrder } = await req.json()

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(affiliateLinkOverride !== undefined && { affiliateLinkOverride: affiliateLinkOverride || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
    include: {
      smbPaths: { include: { smbServer: { select: { id: true, name: true, host: true } } } },
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, host: true } } } },
    },
  })

  return NextResponse.json(category)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.category.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
