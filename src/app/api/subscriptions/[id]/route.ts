import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { applyExtension, membershipExpiry } from '@/lib/membership'

// GET single request (member: own; admin: any)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.subscriptionRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, username: true, email: true } } },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin && request.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(request)
}

// PATCH: admin changes status. Setting 'paid' applies the new expiry to the
// member's membership. Members may 'cancel' their own pending request.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = session.user.role === 'ADMIN'

  const { status } = await req.json()
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const request = await prisma.subscriptionRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Members can only cancel their own request
  if (!isAdmin) {
    if (request.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (status !== 'cancelled') return NextResponse.json({ error: 'Members can only cancel' }, { status: 403 })
    const updated = await prisma.subscriptionRequest.update({
      where: { id: params.id }, data: { status: 'cancelled' },
    })
    return NextResponse.json(updated)
  }

  // Admin path
  if (!['paid', 'failed', 'wait_payment', 'wait_confirm'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  if (status === 'paid' && request.status !== 'paid') {
    // Apply the extension to the member's membership window
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { membershipStart: true, membershipMonths: true },
    })
    if (!user) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const ext = applyExtension(user, request.months)
    const finalExpiry = membershipExpiry(ext)

    // If the plan was tied to a category group, find all categories in that
    // group so we can grant access to each one.
    const groupCategories = request.groupId
      ? await prisma.category.findMany({ where: { groupId: request.groupId }, select: { id: true } })
      : []

    await prisma.$transaction([
      prisma.subscriptionRequest.update({
        where: { id: params.id },
        data: { status: 'paid', paidAt: new Date(), newExpiry: finalExpiry },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: {
          membershipStart: ext.membershipStart,
          membershipMonths: ext.membershipMonths,
          // Re-activate in case they had been deactivated on expiry
          isActive: true,
          paymentStatus: 'paid',
        },
      }),
      // Grant access to every category in the plan's group. createMany +
      // skipDuplicates is idempotent against the @@unique(userId, categoryId).
      ...(groupCategories.length > 0
        ? [prisma.userCategoryAccess.createMany({
            data: groupCategories.map((c) => ({
              userId: request.userId,
              categoryId: c.id,
              grantedBy: 'subscription',
            })),
            skipDuplicates: true,
          })]
        : []),
    ])

    const updated = await prisma.subscriptionRequest.findUnique({ where: { id: params.id } })
    return NextResponse.json(updated)
  }

  const updated = await prisma.subscriptionRequest.update({
    where: { id: params.id },
    data: { status },
  })
  return NextResponse.json(updated)
}
