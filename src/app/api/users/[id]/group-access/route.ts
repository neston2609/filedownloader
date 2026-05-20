import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

// Upsert a group-level access/visibility override for this user.
// Body: { groupId, granted?, hidden? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { groupId, granted, hidden } = await req.json()
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const row = await prisma.userGroupAccess.upsert({
    where: { userId_groupId: { userId: params.id, groupId } },
    update: {
      ...(granted !== undefined && { granted: !!granted }),
      ...(hidden !== undefined && { hidden: !!hidden }),
    },
    create: {
      userId: params.id,
      groupId,
      granted: granted === undefined ? true : !!granted,
      hidden: hidden === undefined ? false : !!hidden,
      grantedBy: 'admin',
    },
  })
  return NextResponse.json(row)
}

// Remove the group-level override (revert to per-category settings).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { groupId } = await req.json()
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  await prisma.userGroupAccess.deleteMany({ where: { userId: params.id, groupId } })
  return NextResponse.json({ success: true })
}
