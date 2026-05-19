import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, host, port, username, password, domain } = body

  const server = await prisma.smbServer.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(host !== undefined && { host }),
      ...(port !== undefined && { port }),
      ...(username !== undefined && { username }),
      ...(password !== undefined && { password }),
      ...(domain !== undefined && { domain }),
    },
    select: { id: true, name: true, host: true, port: true, username: true, domain: true },
  })

  return NextResponse.json(server)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.smbServer.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
