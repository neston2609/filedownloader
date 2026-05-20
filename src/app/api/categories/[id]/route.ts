import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description, affiliateLinkOverride, sortOrder, groupId } = await req.json()

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(affiliateLinkOverride !== undefined && { affiliateLinkOverride: affiliateLinkOverride || null }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(groupId !== undefined && { groupId: groupId || null }),
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
    // Interactive transaction so all deletes run in one DB session. The path
    // tables already cascade via schema, but we delete them explicitly to
    // stay correct on installs that haven't run `prisma db push` yet.
    //
    // DownloadLog wipe happens TWICE — once early, once immediately before
    // category.delete — to shrink the race window where a new download log
    // gets inserted mid-transaction. The schema cascade (add via
    // `prisma db push`) is the real long-term fix.
    await prisma.$transaction(async (tx) => {
      await tx.downloadLog.deleteMany({ where: { categoryId: params.id } })
      await tx.userCategoryAccess.deleteMany({ where: { categoryId: params.id } })
      await tx.categorySmbPath.deleteMany({ where: { categoryId: params.id } })
      await tx.categoryFtpPath.deleteMany({ where: { categoryId: params.id } })
      await tx.categoryScpPath.deleteMany({ where: { categoryId: params.id } })
      // Final sweep just before the parent delete
      await tx.downloadLog.deleteMany({ where: { categoryId: params.id } })
      await tx.category.delete({ where: { id: params.id } })
    }, { timeout: 15000 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Category delete failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete category'
    const hint = message.includes('Foreign key')
      ? ' — run `npx prisma db push` on the server to enable schema-level cascade.'
      : ''
    return NextResponse.json({ error: message + hint }, { status: 500 })
  }
}
