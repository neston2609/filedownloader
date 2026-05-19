'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Folder, FileText, Download, ChevronRight, Home, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

interface SmbEntry {
  name: string
  isDirectory: boolean
  size: number
  lastModified: string
}

interface Category {
  id: string
  name: string
  description: string
  smbPaths: {
    id: string
    path: string
    smbServer: { id: string; name: string }
  }[]
}

interface FileBrowserProps {
  category: Category
  currentPath: string
  affiliateUrl: string | null
}

export function FileBrowser({ category, currentPath, affiliateUrl }: FileBrowserProps) {
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [browsePath, setBrowsePath] = useState(currentPath)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/browse?categoryId=${encodeURIComponent(category.id)}&subPath=${encodeURIComponent(path)}`
      )
      if (!res.ok) {
        const data = await res.json()
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
    loadDirectory(browsePath)
  }, [browsePath, loadDirectory])

  // Breadcrumb parts from path like "0/subfolder/deep"
  const pathParts = browsePath ? browsePath.split('/').filter(Boolean) : []
  // pathParts[0] is the pathIndex, rest are folder names
  const pathIndex = pathParts[0] ? parseInt(pathParts[0]) : 0
  const folderParts = pathParts.slice(1)

  function navigateTo(path: string) {
    setBrowsePath(path)
    window.history.replaceState(null, '', `?path=${encodeURIComponent(path)}`)
  }

  function navigateInto(folderName: string) {
    const newPath = browsePath
      ? `${browsePath}/${folderName}`
      : `${pathIndex}/${folderName}`
    navigateTo(newPath)
  }

  function navigateUp() {
    if (folderParts.length > 0) {
      const parent = [pathIndex, ...folderParts.slice(0, -1)].join('/')
      navigateTo(parent)
    } else {
      navigateTo('')
    }
  }

  async function handleDownload(file: SmbEntry) {
    const filePath = folderParts.length > 0
      ? `${folderParts.join('\\')}\\${file.name}`
      : file.name

    setDownloadingFile(file.name)

    // Affiliate redirect — open in new tab immediately on click (popup-safe)
    if (affiliateUrl) {
      window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
    }

    // Small delay to let the affiliate tab open, then trigger download
    await new Promise(r => setTimeout(r, 300))

    const downloadUrl = `/api/download?categoryId=${encodeURIComponent(category.id)}&pathIndex=${pathIndex}&filePath=${encodeURIComponent(filePath)}`
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/download" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          {category.description && <p className="text-slate-500 text-sm">{category.description}</p>}
        </div>
      </div>

      {/* SMB path tabs */}
      {category.smbPaths.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {category.smbPaths.map((smbPath, i) => (
            <button
              key={smbPath.id}
              onClick={() => navigateTo(String(i))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathIndex === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {smbPath.smbServer.name}: {smbPath.path}
            </button>
          ))}
        </div>
      )}

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 mb-4 bg-white border border-slate-200 rounded-lg px-3 py-2">
        <button
          onClick={() => navigateTo('')}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Root</span>
        </button>
        {folderParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5" />
            <button
              onClick={() => navigateTo([pathIndex, ...folderParts.slice(0, i + 1)].join('/'))}
              className="hover:text-blue-600 transition-colors"
            >
              {part}
            </button>
          </span>
        ))}
      </nav>

      {/* File listing */}
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
            {browsePath && (
              <button
                onClick={navigateUp}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
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
                    <button
                      onClick={() => navigateInto(entry.name)}
                      className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors truncate block w-full text-left"
                    >
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
                    {downloadingFile === entry.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
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
    </div>
  )
}
