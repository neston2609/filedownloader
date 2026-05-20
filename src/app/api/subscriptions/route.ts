import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { membershipExpiry, computeExtendedExpiry, addMonths } from '@/lib/membership'

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

  // Expiry is per-package (per-group) and independent. If the plan is tied to
  // a group, count from that group's current (non-expired) expiry; otherwise
  // fall back to the global membership window (legacy / no-group plans).
  const now = new Date()
  let previousExpiry: Date | null
  let newExpiry: Date
  if (plan.groupId) {
    const gs = await prisma.userGroupAccess.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: plan.groupId } },
    })
    const active = gs?.granted && gs.expiresAt && gs.expiresAt.getTime() > now.getTime()
    previousExpiry = active ? gs!.expiresAt : null
    newExpiry = addMonths(previousExpiry ?? now, plan.months)
  } else {
    previousExpiry = membershipExpiry(user)
    newExpiry = computeExtendedExpiry(user, plan.months)
  }

  const request = await prisma.subscriptionRequest.create({
    data: {
      userId: session.user.id,
      planId: plan.id,
      planName: plan.name,
      months: plan.months,
      priceThb: plan.priceThb,
      groupId: plan.groupId,
      status: 'wait_payment',
      previousExpiry,
      newExpiry,
    },
  })

  return NextResponse.json(request, { status: 201 })
}
