import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { linkUrl, active, sortOrder } = await req.json()
  const banner = await prisma.banner.update({
    where: { id: params.id },
    data: {
      ...(linkUrl !== undefined && { linkUrl: String(linkUrl).trim() }),
      ...(active !== undefined && { active: !!active }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
    },
  })
  return NextResponse.json(banner)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const banner = await prisma.banner.findUnique({ where: { id: params.id } })
  if (banner?.imageUrl) {
    const filename = path.basename(banner.imageUrl)
    if (filename) await unlink(path.join(process.cwd(), 'storage', 'uploads', 'banners', filename)).catch(() => {})
  }
  await prisma.banner.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
