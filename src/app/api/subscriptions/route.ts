import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { membershipExpiry, computeExtendedExpiry } from '@/lib/membership'

// GET: members see their own requests; admins see all.
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = session.user.role === 'ADMIN'

  const requests = await prisma.subscriptionRequest.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: isAdmin
      ? { user: { select: { id: true, username: true, email: true } } }
      : undefined,
  })
  return NextResponse.json(requests)
}

// POST: member creates a subscription request for a plan.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json()
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.active) return NextResponse.json({ error: 'Plan not available' }, { status: 404 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { membershipStart: true, membershipMonths: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Prevent stacking many open requests
  const openCount = await prisma.subscriptionRequest.count({
    where: { userId: session.user.id, status: { in: ['wait_payment', 'wait_confirm'] } },
  })
  if (openCount >= 3) {
    return NextResponse.json({ error: 'You already have pending requests. Please complete or cancel them first.' }, { status: 400 })
  }

  const previousExpiry = membershipExpiry(user)
  const newExpiry = computeExtendedExpiry(user, plan.months)

  const request = await prisma.subscriptionRequest.create({
    data: {
      userId: session.user.id,
      planId: plan.id,
      planName: plan.name,
      months: plan.months,
      priceThb: plan.priceThb,
      status: 'wait_payment',
      previousExpiry,
      newExpiry,
    },
  })

  return NextResponse.json(request, { status: 201 })
}
