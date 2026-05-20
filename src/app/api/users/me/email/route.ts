import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  const trimmed = typeof email === 'string' ? email.trim() : ''

  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }

  // Reject if another user already uses this email (case-insensitive)
  const existing = await prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: 'insensitive' }, NOT: { id: session.user.id } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { email: trimmed },
    select: { email: true },
  })

  return NextResponse.json({ success: true, email: updated.email })
}
