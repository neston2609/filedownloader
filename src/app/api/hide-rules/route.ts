import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

// GET ?categoryId=xxx -> rules for that category; ?scope=global -> global only;
// no param -> all rules.
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const categoryId = req.nextUrl.searchParams.get('categoryId')
  const scope = req.nextUrl.searchParams.get('scope')

  const where = scope === 'global'
    ? { categoryId: null }
    : categoryId
      ? { categoryId }
      : {}

  const rules = await prisma.hideRule.findMany({ where, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { categoryId, pattern, target } = await req.json()
  if (!pattern || !pattern.trim()) return NextResponse.json({ error: 'pattern required' }, { status: 400 })

  const t = ['file', 'folder', 'both'].includes(target) ? target : 'both'

  const rule = await prisma.hideRule.create({
    data: { categoryId: categoryId || null, pattern: pattern.trim(), target: t },
  })
  return NextResponse.json(rule, { status: 201 })
}
