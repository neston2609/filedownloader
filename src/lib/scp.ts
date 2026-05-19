import SftpClient from 'ssh2-sftp-client'
import { PassThrough } from 'stream'

export interface ScpEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: Date
}

export interface ScpTestResult {
  success: boolean
  message: string
  share: string
  details?: { code?: string | number; stack?: string }
}

interface ScpConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  passphrase?: string
}

function buildConnectOptions(cfg: ScpConfig) {
  const opts: SftpClient.ConnectOptions = {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    readyTimeout: 30000,
  }
  if (cfg.privateKey && cfg.privateKey.trim()) {
    opts.privateKey = cfg.privateKey
    if (cfg.passphrase) opts.passphrase = cfg.passphrase
  } else if (cfg.password) {
    opts.password = cfg.password
  }
  return opts
}

function normalizePath(p: string): string {
  if (!p) return '/'
  // Trim whitespace, normalize separators, collapse repeated slashes,
  // strip trailing slash (except for root). Preserves spaces & special
  // chars inside path components — only edges are cleaned.
  let s = p.trim().replace(/\\/g, '/').replace(/\/+/g, '/')
  if (s.length > 1) s = s.replace(/\/+$/, '')
  return s.startsWith('/') ? s : `/${s}`
}

function joinPath(base: string, sub: string): string {
  const b = base.trim()
  const s = sub.trim()
  if (!s) return normalizePath(b)
  return normalizePath(`${b.replace(/[\\/]+$/, '')}/${s.replace(/^[\\/]+/, '')}`)
}

async function withClient<T>(cfg: ScpConfig, fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
  const sftp = new SftpClient()
  try {
    await sftp.connect(buildConnectOptions(cfg))
    return await fn(sftp)
  } finally {
    try { await sftp.end() } catch {}
  }
}

export async function listScpDirectory(
  cfg: ScpConfig,
  basePath: string,
  subPath = ''
): Promise<ScpEntry[]> {
  const full = joinPath(basePath, subPath)

  return withClient(cfg, async (sftp) => {
    const list = await sftp.list(full)
    const filtered = list
      .filter((f) => f.name !== '.' && f.name !== '..')
      .map((f) => ({
        name: f.name,
        isDirectory: f.type === 'd',
        size: f.size,
        lastModified: new Date(f.modifyTime),
      }))

    if (filtered.length === 0) {
      console.warn(`[SCP] sftp.list("${full}") returned 0 entries (basePath="${basePath}", subPath="${subPath}")`)
    } else {
      console.log(`[SCP] listed ${filtered.length} entries in ${full}`)
    }
    return filtered
  })
}

export async function streamScpFile(
  cfg: ScpConfig,
  basePath: string,
  filePath: string
): Promise<NodeJS.ReadableStream> {
  const full = joinPath(basePath, filePath)
  const pass = new PassThrough()

  ;(async () => {
    const sftp = new SftpClient()
    try {
      await sftp.connect(buildConnectOptions(cfg))
      await sftp.get(full, pass)
    } catch (err) {
      pass.destroy(err instanceof Error ? err : new Error('SCP download failed'))
    } finally {
      try { await sftp.end() } catch {}
      pass.end()
    }
  })()

  return pass
}

export async function testScpConnection(
  cfg: ScpConfig,
  basePath: string
): Promise<ScpTestResult> {
  const probe = normalizePath(basePath || '/')
  const label = `sftp://${cfg.username}@${cfg.host}:${cfg.port}${probe}`

  try {
    const list = await withClient(cfg, (sftp) => sftp.list(probe))
    return {
      success: true,
      message: `Connected. Listed ${list.length} entries in ${probe}`,
      share: label,
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string | number }
    return {
      success: false,
      message: `${e.message || 'Unknown SCP/SFTP error'} (${label})`,
      share: label,
      details: { code: e.code, stack: e.stack },
    }
  }
}
