import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const servers = await prisma.smbServer.findMany({
    select: { id: true, name: true, host: true, port: true, username: true, domain: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(servers)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, host, port, username, password, domain } = await req.json()
  if (!name || !host || !username || !password) {
    return NextResponse.json({ error: 'name, host, username, password required' }, { status: 400 })
  }

  const server = await prisma.smbServer.create({
    data: { name, host, port: port ?? 445, username, password, domain: domain ?? '' },
    select: { id: true, name: true, host: true, port: true, username: true, domain: true },
  })

  return NextResponse.json(server, { status: 201 })
}
