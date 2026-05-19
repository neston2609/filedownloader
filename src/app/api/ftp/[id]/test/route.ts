import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testFtpConnection } from '@/lib/ftp'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const server = await prisma.ftpServer.findUnique({ where: { id: params.id } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  let share = '/'
  try {
    const body = await req.json()
    if (body?.share) share = body.share
  } catch {}

  const result = await testFtpConnection(
    server.host, server.port, server.username, server.password, server.secure, share
  )

  return NextResponse.json(result)
}
