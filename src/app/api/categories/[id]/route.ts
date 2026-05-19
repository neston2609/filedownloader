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
      ftpPaths: { include: { ftpServer: { select: { id: true, name: true, host: true, secure: true } } } },
      scpPaths: { include: { scpServer: { select: { id: true, name: true, host: true } } } },
    },
  })

  return NextResponse.json(category)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Explicit cascade for DownloadLog (no FK cascade until next prisma db push).
    // The Category*Path and UserCategoryAccess tables already cascade via the schema,
    // but wiping them inside the same transaction makes this resilient to schema drift.
    await prisma.$transaction([
      prisma.downloadLog.deleteMany({ where: { categoryId: params.id } }),
      prisma.userCategoryAccess.deleteMany({ where: { categoryId: params.id } }),
      prisma.categorySmbPath.deleteMany({ where: { categoryId: params.id } }),
      prisma.categoryFtpPath.deleteMany({ where: { categoryId: params.id } }),
      prisma.categoryScpPath.deleteMany({ where: { categoryId: params.id } }),
      prisma.category.delete({ where: { id: params.id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Category delete failed:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to delete category',
    }, { status: 500 })
  }
}
