import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    return null
  }
  return session
}

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  isActive: true,
  paymentStatus: true,
  notes: true,
  createdAt: true,
  membershipStart: true,
  membershipMonths: true,
  categoryAccess: { select: { categoryId: true } },
  hiddenCategories: { select: { categoryId: true } },
  groupAccess: { select: { groupId: true, granted: true, hidden: true } },
} as const

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, username, password, role, isActive, paymentStatus, notes } = await req.json()

  if (!email || !username || !password) {
    return NextResponse.json({ error: 'email, username, and password are required' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      isActive: isActive === undefined ? true : !!isActive,
      paymentStatus: paymentStatus ?? 'pending',
      notes: notes ?? '',
    },
    select: USER_SELECT,
  })

  return NextResponse.json(user, { status: 201 })
}
