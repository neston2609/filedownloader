import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const servers = await prisma.ftpServer.findMany({
    select: { id: true, name: true, host: true, port: true, username: true, secure: true, passive: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(servers)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, host, port, username, password, secure, passive } = await req.json()
  if (!name || !host || !username) {
    return NextResponse.json({ error: 'name, host, username required' }, { status: 400 })
  }

  const portNum = port === undefined || port === '' ? 21 : Number(port)
  if (Number.isNaN(portNum)) {
    return NextResponse.json({ error: 'port must be a number' }, { status: 400 })
  }

  const server = await prisma.ftpServer.create({
    data: {
      name, host, port: portNum, username,
      password: password ?? '',
      secure: !!secure,
      passive: passive === undefined ? true : !!passive,
    },
    select: { id: true, name: true, host: true, port: true, username: true, secure: true, passive: true },
  })

  return NextResponse.json(server, { status: 201 })
}
