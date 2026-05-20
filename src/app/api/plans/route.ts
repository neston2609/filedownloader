import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

// Members see only active plans; admins see all.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = session.user.role === 'ADMIN'

  const plans = await prisma.membershipPlan.findMany({
    where: isAdmin ? {} : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { months: 'asc' }],
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, months, priceThb, active, sortOrder, groupId } = await req.json()
  if (!name || months === undefined || priceThb === undefined) {
    return NextResponse.json({ error: 'name, months, priceThb required' }, { status: 400 })
  }
  const monthsNum = Number(months)
  const priceNum = Number(priceThb)
  if (Number.isNaN(monthsNum) || monthsNum < 1) return NextResponse.json({ error: 'months must be >= 1' }, { status: 400 })
  if (Number.isNaN(priceNum) || priceNum < 0) return NextResponse.json({ error: 'priceThb must be >= 0' }, { status: 400 })

  const plan = await prisma.membershipPlan.create({
    data: {
      name, months: monthsNum, priceThb: priceNum,
      active: active === undefined ? true : !!active,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      groupId: groupId || null,
    },
  })
  return NextResponse.json(plan, { status: 201 })
}
