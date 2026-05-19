/* eslint-disable @typescript-eslint/no-explicit-any */
import SMB2 from '@marsaud/smb2'

export interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: Date
}

function buildSmbConfig(host: string, port: number, username: string, password: string, domain: string, sharePath: string) {
  const normalizedPath = sharePath.replace(/\//g, '\\').replace(/^\\+/, '')
  const parts = normalizedPath.split('\\')
  const shareName = parts[0] || 'files'
  const subPath = parts.slice(1).join('\\')

  return {
    smb2Config: {
      share: `\\\\${host}\\${shareName}`,
      domain: domain || 'WORKGROUP',
      username,
      password,
      port,
      autoCloseTimeout: 0,
    },
    subPath,
  }
}

export async function listSmbDirectory(
  host: string,
  port: number,
  username: string,
  password: string,
  domain: string,
  basePath: string,
  subPath = ''
): Promise<SmbEntry[]> {
  const { smb2Config, subPath: configSubPath } = buildSmbConfig(host, port, username, password, domain, basePath)
  const client = new SMB2(smb2Config)
  const browsePath = [configSubPath, subPath].filter(Boolean).join('\\')

  return new Promise((resolve, reject) => {
    const c = client as any
    c.readdir(browsePath || '.', (err?: Error, files?: string[]) => {
      c.close()
      if (err) return reject(err)
      const entries: SmbEntry[] = (files || [])
        .filter((f: string) => !f.startsWith('.'))
        .map((name: string) => ({ name, isDirectory: !name.includes('.'), size: 0, lastModified: new Date() }))
      resolve(entries)
    })
  })
}

export async function streamSmbFile(
  host: string,
  port: number,
  username: string,
  password: string,
  domain: string,
  basePath: string,
  filePath: string
): Promise<NodeJS.ReadableStream> {
  const { smb2Config, subPath: configSubPath } = buildSmbConfig(host, port, username, password, domain, basePath)
  const client = new SMB2(smb2Config)
  const fullPath = [configSubPath, filePath].filter(Boolean).join('\\')

  return new Promise((resolve, reject) => {
    const c = client as any
    c.createReadStream(fullPath, (err?: Error, stream?: NodeJS.ReadableStream) => {
      if (err || !stream) {
        c.close()
        return reject(err ?? new Error('No stream returned'))
      }
      stream.on('end', () => c.close())
      stream.on('error', () => c.close())
      resolve(stream)
    })
  })
}

export async function testSmbConnection(
  host: string,
  port: number,
  username: string,
  password: string,
  domain: string,
  share: string
): Promise<boolean> {
  const { smb2Config } = buildSmbConfig(host, port, username, password, domain, share)
  const client = new SMB2(smb2Config)

  return new Promise((resolve) => {
    const c = client as any
    c.readdir('.', (err?: Error) => {
      c.close()
      resolve(!err)
    })
  })
}
