import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { isActive, paymentStatus, notes, role, membershipStart, membershipMonths } = body

  // Membership: membershipStart may be an ISO string or null; membershipMonths
  // is an int or null (unlimited).
  let startVal: Date | null | undefined
  if (membershipStart !== undefined) {
    startVal = membershipStart ? new Date(membershipStart) : null
    if (startVal && Number.isNaN(startVal.getTime())) {
      return NextResponse.json({ error: 'Invalid membershipStart date' }, { status: 400 })
    }
  }
  let monthsVal: number | null | undefined
  if (membershipMonths !== undefined) {
    if (membershipMonths === null || membershipMonths === '') {
      monthsVal = null
    } else {
      monthsVal = Number(membershipMonths)
      if (Number.isNaN(monthsVal) || monthsVal < 0) {
        return NextResponse.json({ error: 'membershipMonths must be a positive number' }, { status: 400 })
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(notes !== undefined && { notes }),
      ...(role !== undefined && { role }),
      ...(startVal !== undefined && { membershipStart: startVal }),
      ...(monthsVal !== undefined && { membershipMonths: monthsVal }),
    },
    select: {
      id: true, email: true, username: true, role: true, isActive: true,
      paymentStatus: true, notes: true, membershipStart: true, membershipMonths: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
