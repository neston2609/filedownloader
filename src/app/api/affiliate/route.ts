import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET: return global affiliate settings (admin only)
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let settings = await prisma.affiliateSettings.findFirst()
  if (!settings) {
    settings = await prisma.affiliateSettings.create({ data: { globalLink: '' } })
  }
  return NextResponse.json(settings)
}

// PATCH: update global affiliate link
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { globalLink } = await req.json()

  let settings = await prisma.affiliateSettings.findFirst()
  if (settings) {
    settings = await prisma.affiliateSettings.update({ where: { id: settings.id }, data: { globalLink } })
  } else {
    settings = await prisma.affiliateSettings.create({ data: { globalLink } })
  }

  return NextResponse.json(settings)
}
