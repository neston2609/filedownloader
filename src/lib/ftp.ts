import { Client, FileInfo, FileType } from 'basic-ftp'
import { PassThrough } from 'stream'

export interface FtpEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: Date
}

export interface FtpTestResult {
  success: boolean
  message: string
  share: string
  details?: { code?: string | number; stack?: string }
}

interface FtpConfig {
  host: string
  port: number
  username: string
  password: string
  secure: boolean
}

function normalizePath(p: string): string {
  if (!p) return '/'
  const s = p.replace(/\\/g, '/').replace(/\/+/g, '/')
  return s.startsWith('/') ? s : `/${s}`
}

async function withClient<T>(cfg: FtpConfig, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(15000)
  client.ftp.verbose = false
  try {
    await client.access({
      host: cfg.host,
      port: cfg.port,
      user: cfg.username,
      password: cfg.password,
      secure: cfg.secure,
      secureOptions: { rejectUnauthorized: false },
    })
    return await fn(client)
  } finally {
    client.close()
  }
}

export async function listFtpDirectory(
  host: string,
  port: number,
  username: string,
  password: string,
  secure: boolean,
  basePath: string,
  subPath = ''
): Promise<FtpEntry[]> {
  const full = normalizePath([basePath, subPath].filter(Boolean).join('/'))

  return withClient({ host, port, username, password, secure }, async (client) => {
    const list: FileInfo[] = await client.list(full)
    return list
      .filter((f) => f.name !== '.' && f.name !== '..')
      .map((f) => ({
        name: f.name,
        isDirectory: f.type === FileType.Directory,
        size: f.size,
        lastModified: f.modifiedAt ?? new Date(),
      }))
  })
}

export async function streamFtpFile(
  host: string,
  port: number,
  username: string,
  password: string,
  secure: boolean,
  basePath: string,
  filePath: string
): Promise<NodeJS.ReadableStream> {
  const full = normalizePath([basePath, filePath].filter(Boolean).join('/'))
  const pass = new PassThrough()

  // Fire-and-forget the download; pipe into the PassThrough
  ;(async () => {
    const client = new Client(15000)
    client.ftp.verbose = false
    try {
      await client.access({
        host, port, user: username, password, secure,
        secureOptions: { rejectUnauthorized: false },
      })
      await client.downloadTo(pass, full)
    } catch (err) {
      pass.destroy(err instanceof Error ? err : new Error('FTP download failed'))
    } finally {
      client.close()
      pass.end()
    }
  })()

  return pass
}

export async function testFtpConnection(
  host: string,
  port: number,
  username: string,
  password: string,
  secure: boolean,
  basePath: string
): Promise<FtpTestResult> {
  const probe = normalizePath(basePath || '/')
  const label = `${secure ? 'ftps' : 'ftp'}://${username}@${host}:${port}${probe}`

  try {
    const list = await withClient({ host, port, username, password, secure }, (c) => c.list(probe))
    return {
      success: true,
      message: `Connected. Listed ${list.length} entries in ${probe}`,
      share: label,
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string | number }
    return {
      success: false,
      message: `${e.message || 'Unknown FTP error'} (${label})`,
      share: label,
      details: { code: e.code, stack: e.stack },
    }
  }
}
