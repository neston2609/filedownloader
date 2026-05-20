'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Folder, FileText, Download, ChevronRight, Home, Loader2, AlertCircle, ArrowLeft, Server, HardDrive, Lock, Terminal, Play } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { isVideo } from '@/lib/media'

interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: string
}

interface BrowserPath {
  id: string
  protocol: 'smb' | 'ftp' | 'ftps' | 'scp'
  serverName: string
  path: string
}

interface FileBrowserProps {
  category: { id: string; name: string; description: string; imageUrl: string | null }
  paths: BrowserPath[]
  initialPathId: string | null
  initialSubPath: string
  affiliateUrl: string | null
}

export function FileBrowser({ category, paths, initialPathId, initialSubPath, affiliateUrl }: FileBrowserProps) {
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pathId, setPathId] = useState<string | null>(initialPathId)
  const [subPath, setSubPath] = useState(initialSubPath)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  const activePath = paths.find((p) => p.id === pathId) ?? null

  const loadDirectory = useCallback(async (pid: string, sp: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/browse?categoryId=${encodeURIComponent(category.id)}&pathId=${encodeURIComponent(pid)}&subPath=${encodeURIComponent(sp)}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to load directory')
      }
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [category.id])

  useEffect(() => {
    if (pathId) loadDirectory(pathId, subPath)
    else setLoading(false)
  }, [pathId, subPath, loadDirectory])

  const folderParts = subPath ? subPath.split('/').filter(Boolean) : []

  function selectPath(newPathId: string) {
    setPathId(newPathId)
    setSubPath('')
    window.history.replaceState(null, '', `?pathId=${newPathId}`)
  }

  function navigateTo(sp: string) {
    setSubPath(sp)
    const params = new URLSearchParams()
    if (pathId) params.set('pathId', pathId)
    if (sp) params.set('path', sp)
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  function navigateInto(folderName: string) {
    navigateTo(subPath ? `${subPath}/${folderName}` : folderName)
  }

  function navigateUp() {
    navigateTo(folderParts.slice(0, -1).join('/'))
  }

  function buildFilePath(file: SmbEntry): string {
    const sep = activePath?.protocol === 'smb' ? '\\' : '/'
    return folderParts.length > 0 ? `${folderParts.join(sep)}${sep}${file.name}` : file.name
  }

  async function handleDownload(file: SmbEntry) {
    if (!pathId) return
    const filePath = buildFilePath(file)

    setDownloadingFile(file.name)

    if (affiliateUrl) {
      window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
    }

    await new Promise((r) => setTimeout(r, 300))

    const downloadUrl = `/api/download?categoryId=${encodeURIComponent(category.id)}&pathId=${encodeURIComponent(pathId)}&filePath=${encodeURIComponent(filePath)}`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => setDownloadingFile(null), 2000)
  }

  function handlePlay(file: SmbEntry) {
    if (!pathId) return
    const filePath = buildFilePath(file)
    const playUrl = `/play/${encodeURIComponent(category.id)}?pathId=${encodeURIComponent(pathId)}&filePath=${encodeURIComponent(filePath)}`

    // Browsers enforce "one popup per click" — so we use the one allowance
    // for the affiliate URL (which MUST be a new tab), then navigate this
    // tab to the player. Navigation isn't subject to popup blockers, so the
    // player always opens; the affiliate gets the popup token, so it opens
    // too. Result: affiliate in new tab + player in current tab.
    if (affiliateUrl) {
      window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
    }
    window.location.href = playUrl
  }

  return (
    <div>
      <Link href="/download" className="inline-flex items-center gap-1.5 text-mute hover:text-ink transition-colors mb-4 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>

      {/* Category banner: picture + title + larger description */}
      <div className="bg-paper border-[1.5px] border-ink rounded-retro overflow-hidden shadow-hard mb-6">
        <div className="flex flex-col sm:flex-row">
          {category.imageUrl && (
            <div className="sm:w-64 flex-shrink-0 bg-bg2 relative aspect-video sm:aspect-auto border-b-[1.5px] sm:border-b-0 sm:border-r-[1.5px] border-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6 flex flex-col justify-center">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-ink2 text-lg leading-relaxed mt-3">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="bg-retro-lemon/30 border border-ink/40 rounded-xl p-5 text-ink text-sm">
          No SMB or FTP paths are linked to this category yet.
        </div>
      ) : (
        <>
          {paths.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {paths.map((p) => {
                const Icon = p.protocol === 'smb' ? HardDrive
                  : p.protocol === 'ftps' ? Lock
                  : p.protocol === 'scp' ? Terminal
                  : Server
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPath(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      pathId === p.id
                        ? 'bg-ink text-white'
                        : 'bg-bg2 text-ink2 hover:bg-line'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="uppercase text-[10px] opacity-75 font-bold">{p.protocol}</span>
                    {p.serverName}: {p.path}
                  </button>
                )
              })}
            </div>
          )}

          <nav className="flex items-center gap-1 text-sm text-mute mb-4 bg-paper border border-ink rounded-lg px-3 py-2 flex-wrap">
            <button onClick={() => navigateTo('')} className="flex items-center gap-1 hover:text-ink transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Root</span>
            </button>
            {folderParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5" />
                <button
                  onClick={() => navigateTo(folderParts.slice(0, i + 1).join('/'))}
                  className="hover:text-ink transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </nav>

          <div className="bg-paper border-[1.5px] border-ink rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-mute">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading files...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-16 text-retro-coral">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-mute">
                <Folder className="w-12 h-12 mb-3 opacity-30" />
                <p>This folder is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {subPath && (
                  <button onClick={navigateUp} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg2/50 transition-colors text-left">
                    <Folder className="w-5 h-5 text-ink flex-shrink-0" />
                    <span className="text-mute text-sm font-mono">..</span>
                  </button>
                )}
                {entries.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3 px-4 py-3 hover:bg-bg2/50 transition-colors group">
                    {entry.isDirectory ? (
                      <Folder className="w-5 h-5 text-ink flex-shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-ink flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {entry.isDirectory ? (
                        <button onClick={() => navigateInto(entry.name)} className="text-sm font-medium text-ink hover:text-ink transition-colors truncate block w-full text-left">
                          {entry.name}
                        </button>
                      ) : (
                        <span className="text-sm text-ink truncate block">{entry.name}</span>
                      )}
                      {!entry.isDirectory && entry.size > 0 && (
                        <span className="text-xs text-mute">{formatBytes(entry.size)}</span>
                      )}
                    </div>

                    {!entry.isDirectory && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        {isVideo(entry.name) && (
                          <button
                            onClick={() => handlePlay(entry)}
                            title="Play in browser"
                            className="btn-retro flex items-center gap-1.5 bg-retro-coral hover:bg-retro-coral text-ink border-[1.5px] border-ink text-xs font-semibold px-3 py-1.5 rounded-full"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Play
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(entry)}
                          disabled={downloadingFile === entry.name}
                          className="btn-retro flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded-full"
                        >
                          {downloadingFile === entry.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {affiliateUrl && (
            <p className="text-xs text-mute mt-3 text-center">
              Downloads open a partner link in a new tab. Your download starts immediately after.
            </p>
          )}
        </>
      )}
    </div>
  )
}
