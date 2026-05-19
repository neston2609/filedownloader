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
  const { name, host, port, username, password, secure, passive } = body

  let portNum: number | undefined
  if (port !== undefined && port !== '') {
    portNum = Number(port)
    if (Number.isNaN(portNum)) {
      return NextResponse.json({ error: 'port must be a number' }, { status: 400 })
    }
  }

  const server = await prisma.ftpServer.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(host !== undefined && { host }),
      ...(portNum !== undefined && { port: portNum }),
      ...(username !== undefined && { username }),
      ...(password && { password }),
      ...(secure !== undefined && { secure: !!secure }),
      ...(passive !== undefined && { passive: !!passive }),
    },
    select: { id: true, name: true, host: true, port: true, username: true, secure: true, passive: true },
  })

  return NextResponse.json(server)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.ftpServer.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
