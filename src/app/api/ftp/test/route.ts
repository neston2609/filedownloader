import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testFtpConnection } from '@/lib/ftp'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, host, port, username, password, secure, share } = body

  if (!host || !username) {
    return NextResponse.json({ success: false, message: 'host and username required', share: '' }, { status: 400 })
  }

  let resolvedPassword = password
  if (!resolvedPassword && id) {
    const existing = await prisma.ftpServer.findUnique({ where: { id } })
    resolvedPassword = existing?.password ?? ''
  }

  const portNum = Number(port) || 21

  const result = await testFtpConnection(
    host, portNum, username, resolvedPassword, !!secure, share || '/'
  )

  return NextResponse.json(result)
}
