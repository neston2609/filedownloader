import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testScpConnection } from '@/lib/scp'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, host, port, username, password, privateKey, passphrase, share } = body

  if (!host || !username) {
    return NextResponse.json({ success: false, message: 'host and username required', share: '' }, { status: 400 })
  }

  // If editing and creds are blank, pull stored ones
  let resolvedPassword = password
  let resolvedKey = privateKey
  let resolvedPassphrase = passphrase
  if (id && (!resolvedPassword && !resolvedKey)) {
    const existing = await prisma.scpServer.findUnique({ where: { id } })
    if (existing) {
      resolvedPassword = existing.password
      resolvedKey = existing.privateKey
      resolvedPassphrase = existing.passphrase
    }
  }

  const portNum = Number(port) || 22

  const result = await testScpConnection(
    { host, port: portNum, username, password: resolvedPassword, privateKey: resolvedKey, passphrase: resolvedPassphrase },
    share || '/'
  )

  return NextResponse.json(result)
}
