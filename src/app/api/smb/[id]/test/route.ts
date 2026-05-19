import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testSmbConnection } from '@/lib/smb'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const server = await prisma.smbServer.findUnique({ where: { id: params.id } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  const ok = await testSmbConnection(server.host, server.port, server.username, server.password, server.domain, '\\files')

  return NextResponse.json({ success: ok, message: ok ? 'Connection successful' : 'Connection failed' })
}
