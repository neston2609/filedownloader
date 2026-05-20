import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, months, priceThb, active, sortOrder } = await req.json()

  let monthsNum: number | undefined
  if (months !== undefined) {
    monthsNum = Number(months)
    if (Number.isNaN(monthsNum) || monthsNum < 1) return NextResponse.json({ error: 'months must be >= 1' }, { status: 400 })
  }
  let priceNum: number | undefined
  if (priceThb !== undefined) {
    priceNum = Number(priceThb)
    if (Number.isNaN(priceNum) || priceNum < 0) return NextResponse.json({ error: 'priceThb must be >= 0' }, { status: 400 })
  }

  const plan = await prisma.membershipPlan.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(monthsNum !== undefined && { months: monthsNum }),
      ...(priceNum !== undefined && { priceThb: priceNum }),
      ...(active !== undefined && { active: !!active }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
    },
  })
  return NextResponse.json(plan)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.membershipPlan.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
