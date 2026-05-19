'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Folder, FileText, Download, ChevronRight, Home, Loader2, AlertCircle, ArrowLeft, Server, HardDrive } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: string
}

interface BrowserPath {
  id: string
  protocol: 'smb' | 'ftp'
  serverName: string
  path: string
}

interface FileBrowserProps {
  category: { id: string; name: string; description: string }
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

  async function handleDownload(file: SmbEntry) {
    if (!pathId) return
    const sep = activePath?.protocol === 'ftp' ? '/' : '\\'
    const filePath = folderParts.length > 0
      ? `${folderParts.join(sep)}${sep}${file.name}`
      : file.name

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/download" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          {category.description && <p className="text-slate-500 text-sm">{category.description}</p>}
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800 text-sm">
          No SMB or FTP paths are linked to this category yet.
        </div>
      ) : (
        <>
          {paths.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {paths.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPath(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    pathId === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {p.protocol === 'ftp' ? <Server className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                  <span className="uppercase text-[10px] opacity-75 font-bold">{p.protocol}</span>
                  {p.serverName}: {p.path}
                </button>
              ))}
            </div>
          )}

          <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-wrap">
            <button onClick={() => navigateTo('')} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
              <span>Root</span>
            </button>
            {folderParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5" />
                <button
                  onClick={() => navigateTo(folderParts.slice(0, i + 1).join('/'))}
                  className="hover:text-blue-600 transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </nav>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading files...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-16 text-red-500">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Folder className="w-12 h-12 mb-3 opacity-30" />
                <p>This folder is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {subPath && (
                  <button onClick={navigateUp} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                    <Folder className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <span className="text-slate-500 text-sm font-mono">..</span>
                  </button>
                )}
                {entries.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                    {entry.isDirectory ? (
                      <Folder className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {entry.isDirectory ? (
                        <button onClick={() => navigateInto(entry.name)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors truncate block w-full text-left">
                          {entry.name}
                        </button>
                      ) : (
                        <span className="text-sm text-slate-700 truncate block">{entry.name}</span>
                      )}
                      {!entry.isDirectory && entry.size > 0 && (
                        <span className="text-xs text-slate-400">{formatBytes(entry.size)}</span>
                      )}
                    </div>

                    {!entry.isDirectory && (
                      <button
                        onClick={() => handleDownload(entry)}
                        disabled={downloadingFile === entry.name}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        {downloadingFile === entry.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {affiliateUrl && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Downloads open a partner link in a new tab. Your download starts immediately after.
            </p>
          )}
        </>
      )}
    </div>
  )
}
