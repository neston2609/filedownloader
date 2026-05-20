import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { applyExtension, membershipExpiry, addMonths } from '@/lib/membership'

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
    const now = new Date()

    // Groups not tied to ANY package are hidden by default once a member pays.
    const [groupsNoPlan, existingGroupAccess] = await Promise.all([
      prisma.categoryGroup.findMany({ where: { plans: { none: {} } }, select: { id: true } }),
      prisma.userGroupAccess.findMany({ where: { userId: request.userId }, select: { groupId: true } }),
    ])
    const existingGroups = new Set(existingGroupAccess.map((g) => g.groupId))
    const hideGroups = groupsNoPlan.filter((g) => g.id !== request.groupId && !existingGroups.has(g.id))

    const ops: Prisma.PrismaPromise<unknown>[] = []

    // Re-activate the account; mark paid. (Account stays active; per-package
    // access is gated by each group's own expiry, not the global window.)
    ops.push(prisma.user.update({
      where: { id: request.userId },
      data: { isActive: true, paymentStatus: 'paid' },
    }))

    let finalExpiry: Date | null = null

    if (request.groupId) {
      // Per-package expiry: extend from the group's current (non-expired)
      // expiry, otherwise from today. Independent of every other package.
      const cur = await prisma.userGroupAccess.findUnique({
        where: { userId_groupId: { userId: request.userId, groupId: request.groupId } },
      })
      const base = cur?.granted && cur.expiresAt && cur.expiresAt.getTime() > now.getTime() ? cur.expiresAt : now
      finalExpiry = addMonths(base, request.months)

      ops.push(prisma.userGroupAccess.upsert({
        where: { userId_groupId: { userId: request.userId, groupId: request.groupId } },
        update: { granted: true, hidden: false, expiresAt: finalExpiry },
        create: { userId: request.userId, groupId: request.groupId, granted: true, hidden: false, expiresAt: finalExpiry, grantedBy: 'subscription' },
      }))
    } else {
      // Legacy / no-group plan: extend the global membership window.
      const user = await prisma.user.findUnique({
        where: { id: request.userId }, select: { membershipStart: true, membershipMonths: true },
      })
      if (user) {
        const ext = applyExtension(user, request.months)
        finalExpiry = membershipExpiry(ext)
        ops.push(prisma.user.update({
          where: { id: request.userId },
          data: { membershipStart: ext.membershipStart, membershipMonths: ext.membershipMonths },
        }))
      }
    }

    ops.push(prisma.subscriptionRequest.update({
      where: { id: params.id },
      data: { status: 'paid', paidAt: now, newExpiry: finalExpiry },
    }))

    if (hideGroups.length > 0) {
      ops.push(prisma.userGroupAccess.createMany({
        data: hideGroups.map((g) => ({
          userId: request.userId, groupId: g.id, granted: false, hidden: true, grantedBy: 'system',
        })),
        skipDuplicates: true,
      }))
    }

    await prisma.$transaction(ops)

    const updated = await prisma.subscriptionRequest.findUnique({ where: { id: params.id } })
    return NextResponse.json(updated)
  }

  const updated = await prisma.subscriptionRequest.update({
    where: { id: params.id },
    data: { status },
  })
  return NextResponse.json(updated)
}
