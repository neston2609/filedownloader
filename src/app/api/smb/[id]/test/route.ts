import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testSmbConnection } from '@/lib/smb'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const server = await prisma.smbServer.findUnique({ where: { id: params.id } })
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  // Optional: caller may pass a sharePath in the body to probe a specific share
  let share = '\\files'
  try {
    const body = await req.json()
    if (body?.share) share = body.share
  } catch {}

  const result = await testSmbConnection(
    server.host, server.port, server.username, server.password, server.domain, share
  )

  return NextResponse.json(result)
}
