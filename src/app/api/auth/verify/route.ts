import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/verify?token=xxx — confirm email, activate login, redirect.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const origin = req.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(`${origin}/login?verify=invalid`)
  }

  const user = await prisma.user.findUnique({ where: { verifyToken: token } })
  if (!user) {
    // Token already used or never existed
    return NextResponse.redirect(`${origin}/login?verify=invalid`)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      isActive: true, // verified accounts can log in (categories still locked until granted)
      verifyToken: null,
    },
  })

  return NextResponse.redirect(`${origin}/login?verify=success`)
}
