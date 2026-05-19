import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testScpConnection } from '@/lib/scp'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const server = await prisma.scpServer.findUnique({ where: { id: params.id } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  let share = '/'
  try {
    const body = await req.json()
    if (body?.share) share = body.share
  } catch {}

  const result = await testScpConnection(
    {
      host: server.host, port: server.port, username: server.username,
      password: server.password, privateKey: server.privateKey, passphrase: server.passphrase,
    },
    share
  )

  return NextResponse.json(result)
}
