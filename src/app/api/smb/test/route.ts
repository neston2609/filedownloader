import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { testSmbConnection } from '@/lib/smb'

// Test a credential set WITHOUT saving — used by the New Server form
// and the Edit form when the password field is blank (uses stored pw).
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, host, port, username, password, domain, share } = body

  if (!host || !username) {
    return NextResponse.json({
      success: false,
      message: 'host and username required',
      share: '',
    }, { status: 400 })
  }

  // If editing and password is blank, fetch the stored one
  let resolvedPassword = password
  if (!resolvedPassword && id) {
    const existing = await prisma.smbServer.findUnique({ where: { id } })
    resolvedPassword = existing?.password ?? ''
  }

  const portNum = Number(port) || 445

  const result = await testSmbConnection(
    host, portNum, username, resolvedPassword, domain ?? '', share || '\\files'
  )

  return NextResponse.json(result)
}
