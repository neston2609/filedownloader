'use client'
import { useState, useEffect, useCallback } from 'react'
import { Folder, FileText, ChevronRight, Home, Loader2, AlertCircle, X, CornerUpLeft, Check } from 'lucide-react'

interface Entry { name: string; isDirectory: boolean; size?: number }

interface FolderPickerProps {
  protocol: 'smb' | 'ftp' | 'ftps' | 'scp'
  serverId: string
  serverName: string
  initialPath?: string
  onSelect: (path: string) => void
  onClose: () => void
}

const PROTOCOL_LABEL: Record<FolderPickerProps['protocol'], string> = {
  smb: 'SMB',
  ftp: 'FTP',
  ftps: 'FTPS',
  scp: 'SCP / SFTP',
}

export function FolderPicker({ protocol, serverId, serverName, initialPath, onSelect, onClose }: FolderPickerProps) {
  const isSmb = protocol === 'smb'
  const sep = isSmb ? '\\' : '/'
  const root = isSmb ? '' : '/'

  const [path, setPath] = useState(initialPath ?? root)
  const [editingPath, setEditingPath] = useState(initialPath ?? root)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/file-services/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, serverId, path: p }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to list (${res.status})`)
      }
      setEntries((data.entries ?? []).sort((a: Entry, b: Entry) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      }))
      setPath(data.path ?? p)
      setEditingPath(data.path ?? p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [protocol, serverId])

  useEffect(() => {
    if (!isSmb || initialPath) {
      load(path)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function navigateInto(folderName: string) {
    const newPath = path && path !== sep
      ? `${path.replace(/[\\/]+$/, '')}${sep}${folderName}`
      : `${sep}${folderName}`.replace(/^[\\/]+/, sep)
    load(newPath)
  }

  function navigateUp() {
    if (!path || path === sep || path === '') return
    const cleaned = path.replace(/[\\/]+$/, '')
    const parts = cleaned.split(/[\\/]+/).filter(Boolean)
    parts.pop()
    if (parts.length === 0) {
      load(isSmb ? '' : '/')
    } else {
      load(isSmb ? `\\${parts.join('\\')}` : `/${parts.join('/')}`)
    }
  }

  function goToPath() {
    load(editingPath)
  }

  // Breadcrumb parts
  const cleaned = path.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
  const parts = cleaned ? cleaned.split(/[\\/]+/).filter(Boolean) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 truncate">Browse {PROTOCOL_LABEL[protocol]} — {serverName}</h2>
            <p className="text-xs text-slate-400">Click a folder to drill in, then choose &quot;Use This Path&quot;.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path bar */}
        <div className="px-5 py-3 border-b border-slate-700 bg-slate-900/40">
          <div className="flex gap-2">
            <input
              type="text"
              value={editingPath}
              onChange={(e) => setEditingPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToPath() }}
              placeholder={isSmb ? '\\share or \\share\\folder' : '/path/to/folder'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={goToPath}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium px-4 rounded-lg transition-colors"
            >
              Go
            </button>
          </div>

          {isSmb && !path && (
            <p className="mt-2 text-xs text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              SMB needs a share name first — try <code className="bg-slate-900 px-1 rounded">\share</code> or <code className="bg-slate-900 px-1 rounded">\files</code>
            </p>
          )}

          {/* Breadcrumb */}
          {parts.length > 0 && (
            <nav className="flex items-center gap-0.5 mt-2 text-xs text-slate-400 flex-wrap">
              <button onClick={() => load(isSmb ? '' : '/')} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                <Home className="w-3 h-3" />
                Root
              </button>
              {parts.map((p, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <ChevronRight className="w-3 h-3 opacity-50" />
                  <button
                    onClick={() => load((isSmb ? '\\' : '/') + parts.slice(0, i + 1).join(sep))}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {p}
                  </button>
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Listing */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : error ? (
            <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-mono break-all">{error}</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Folder className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">
                {!path && isSmb ? 'Type a share name above to start browsing.' : 'This folder is empty.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {parts.length > 0 && (
                <button
                  onClick={navigateUp}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-slate-700/40 transition-colors text-left"
                >
                  <CornerUpLeft className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-400 font-mono">..</span>
                </button>
              )}
              {entries.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3 px-5 py-2.5">
                  {entry.isDirectory ? (
                    <button
                      onClick={() => navigateInto(entry.name)}
                      className="flex items-center gap-3 flex-1 text-left hover:text-blue-400 transition-colors"
                    >
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-slate-200 truncate">{entry.name}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 flex-1 opacity-50">
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm text-slate-400 truncate">{entry.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-5 py-3 flex items-center gap-3 bg-slate-900/40">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase text-slate-500 tracking-wider">Selected</p>
            <p className="text-sm font-mono text-slate-200 truncate">{path || (isSmb ? '(none)' : '/')}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-700/50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSelect(path)}
            disabled={!path && isSmb}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Use This Path
          </button>
        </div>
      </div>
    </div>
  )
}
