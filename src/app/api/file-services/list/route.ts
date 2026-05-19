import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { listSmbDirectory } from '@/lib/smb'
import { listFtpDirectory } from '@/lib/ftp'
import { listScpDirectory } from '@/lib/scp'

interface Entry { name: string; isDirectory: boolean; size?: number }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { protocol, serverId, path } = await req.json()
  if (!protocol || !serverId) {
    return NextResponse.json({ error: 'protocol and serverId required' }, { status: 400 })
  }

  try {
    let entries: Entry[] = []

    if (protocol === 'smb') {
      const server = await prisma.smbServer.findUnique({ where: { id: serverId } })
      if (!server) return NextResponse.json({ error: 'SMB server not found' }, { status: 404 })
      if (!path) {
        return NextResponse.json({
          error: 'Type a share name to start (e.g. \\share or \\share\\folder)',
          requiresShareInput: true,
        }, { status: 400 })
      }
      entries = await listSmbDirectory(
        server.host, server.port, server.username, server.password, server.domain,
        path, ''
      )
    } else if (protocol === 'ftp' || protocol === 'ftps') {
      const server = await prisma.ftpServer.findUnique({ where: { id: serverId } })
      if (!server) return NextResponse.json({ error: 'FTP server not found' }, { status: 404 })
      entries = await listFtpDirectory(
        server.host, server.port, server.username, server.password, server.secure,
        path || '/', ''
      )
    } else if (protocol === 'scp') {
      const server = await prisma.scpServer.findUnique({ where: { id: serverId } })
      if (!server) return NextResponse.json({ error: 'SCP server not found' }, { status: 404 })
      entries = await listScpDirectory(
        {
          host: server.host, port: server.port, username: server.username,
          password: server.password, privateKey: server.privateKey, passphrase: server.passphrase,
        },
        path || '/', ''
      )
    } else {
      return NextResponse.json({ error: 'unknown protocol' }, { status: 400 })
    }

    return NextResponse.json({ entries, path: path || (protocol === 'smb' ? '\\' : '/') })
  } catch (err) {
    return NextResponse.json({
      error: (err as Error).message ?? 'List failed',
    }, { status: 500 })
  }
}
