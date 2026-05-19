import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const servers = await prisma.scpServer.findMany({
    select: { id: true, name: true, host: true, port: true, username: true,
              privateKey: true },
    orderBy: { name: 'asc' },
  })
  // Reveal only whether a key is set (boolean), not the content
  return NextResponse.json(servers.map(s => ({
    id: s.id, name: s.name, host: s.host, port: s.port, username: s.username,
    hasPrivateKey: !!(s.privateKey && s.privateKey.trim()),
  })))
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, host, port, username, password, privateKey, passphrase } = await req.json()
  if (!name || !host || !username) {
    return NextResponse.json({ error: 'name, host, username required' }, { status: 400 })
  }

  const portNum = port === undefined || port === '' ? 22 : Number(port)
  if (Number.isNaN(portNum)) {
    return NextResponse.json({ error: 'port must be a number' }, { status: 400 })
  }

  if (!password && !privateKey) {
    return NextResponse.json({ error: 'either password or privateKey is required' }, { status: 400 })
  }

  const server = await prisma.scpServer.create({
    data: {
      name, host, port: portNum, username,
      password: password ?? '',
      privateKey: privateKey ?? '',
      passphrase: passphrase ?? '',
    },
    select: { id: true, name: true, host: true, port: true, username: true, privateKey: true },
  })

  return NextResponse.json({
    id: server.id, name: server.name, host: server.host, port: server.port, username: server.username,
    hasPrivateKey: !!(server.privateKey && server.privateKey.trim()),
  }, { status: 201 })
}
