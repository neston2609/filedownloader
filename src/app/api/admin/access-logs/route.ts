import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 50
  const type = searchParams.get('type') ?? ''           // filter by event type
  const search = searchParams.get('search')?.trim() ?? '' // filter by ip / username / email

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (search) {
    where.OR = [
      { ip: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { userEmail: { contains: search, mode: 'insensitive' } },
      { categoryName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.accessLog.count({ where }),
    prisma.accessLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        ip: true,
        userId: true,
        userEmail: true,
        username: true,
        categoryId: true,
        categoryName: true,
        filePath: true,
        userAgent: true,
        createdAt: true,
      },
    }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  })
}

// DELETE — purge all logs (admin only, useful for cleanup)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const olderThanDays = parseInt(searchParams.get('olderThanDays') ?? '0', 10)

  if (olderThanDays > 0) {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000)
    const { count } = await prisma.accessLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
    return NextResponse.json({ deleted: count })
  }

  const { count } = await prisma.accessLog.deleteMany()
  return NextResponse.json({ deleted: count })
}
