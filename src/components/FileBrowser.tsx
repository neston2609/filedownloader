'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Folder, FileText, Download, ChevronRight, Home, Loader2, AlertCircle, ArrowLeft, Server, HardDrive, Lock, Terminal, Play, UserPlus } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { isVideo } from '@/lib/media'

const COVER_RE = /^folder\.(jpg|jpeg|png|webp)$/i

// Folder thumbnail: tries to load <folder>/folder.jpg as a cover image,
// falling back to the folder icon if it 404s.
function FolderThumb({ coverUrl }: { coverUrl: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="w-28 h-28 rounded-lg bg-bg2 border border-line flex-shrink-0 -my-2 grid place-items-center">
        <Folder className="w-10 h-10 text-ink" />
      </span>
    )
  }
  return (
    <span className="w-28 h-28 rounded-lg overflow-hidden bg-bg2 border border-line flex-shrink-0 -my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={coverUrl} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </span>
  )
}

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
  canDownload?: boolean
  canPlay?: boolean
  isGuest?: boolean
  guestDailyLimit?: number
  memberOnlyNotice?: string
}

export function FileBrowser({
  category,
  paths,
  initialPathId,
  initialSubPath,
  affiliateUrl,
  canDownload = true,
  canPlay: canPlayProp,
  isGuest = false,
  guestDailyLimit = 5,
  memberOnlyNotice = '',
}: FileBrowserProps) {
  const [entries, setEntries] = useState<SmbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pathId, setPathId] = useState<string | null>(initialPathId)
  const [subPath, setSubPath] = useState(initialSubPath)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)
  const [showNotice, setShowNotice] = useState(false)

  // canPlay: explicitly passed, or fall back to old logic
  const canPlay = canPlayProp !== undefined ? canPlayProp : (isGuest || canDownload)
  // isLimitedMember: logged-in but no subscription — can play with quota, can't download
  const isLimitedMember = !isGuest && canPlay && !canDownload

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
      setEntries((data.entries ?? []).filter((e: SmbEntry) => !(!e.isDirectory && COVER_RE.test(e.name))))
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

  function coverUrlFor(folderName: string): string {
    if (!pathId) return ''
    const sep = activePath?.protocol === 'smb' ? '\\' : '/'
    const base = folderParts.length > 0 ? `${folderParts.join(sep)}${sep}${folderName}` : folderName
    const filePath = `${base}${sep}folder.jpg`
    return `/api/cover?categoryId=${encodeURIComponent(category.id)}&pathId=${encodeURIComponent(pathId)}&filePath=${encodeURIComponent(filePath)}`
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

      {/* Category banner */}
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

      {/* Guest notice */}
      {isGuest && (
        <div className="bg-retro-sky/20 border-[1.5px] border-ink rounded-retro p-4 mb-6 shadow-hard-sm flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="font-semibold text-ink text-sm">Guest — Play เท่านั้น</p>
            <p className="text-xs text-ink2 mt-0.5">
              ดูได้สูงสุด <span className="font-bold text-ink">{guestDailyLimit} คลิป/วัน</span> — สมัครสมาชิกเพื่อ Download และเข้าถึงเนื้อหาทั้งหมด
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="btn-retro inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border-[1.5px] border-ink bg-bg2 text-ink">Login</Link>
            <Link href="/register" className="btn-retro inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border-[1.5px] border-ink bg-ink text-retro-lime">
              <UserPlus className="w-3 h-3" /> Register
            </Link>
          </div>
        </div>
      )}

      {/* Limited member notice (logged in, no subscription) */}
      {isLimitedMember && (
        <div className="bg-retro-lemon/40 border-[1.5px] border-ink rounded-retro p-4 mb-6 shadow-hard-sm flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="font-semibold text-ink text-sm">ทดลองดูได้ {guestDailyLimit} คลิป/วัน</p>
            <p className="text-xs text-ink2 mt-0.5">ซื้อ Subscription เพื่อ Download และดูได้ไม่จำกัด</p>
          </div>
          <Link href="/subscribe" className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs whitespace-nowrap">
            ดูแพ็กเกจสมาชิก
          </Link>
        </div>
      )}

      {/* Fully locked (inactive account) */}
      {!isGuest && !canPlay && !canDownload && (
        <div className="bg-retro-lemon/40 border-[1.5px] border-ink rounded-retro p-4 mb-6 shadow-hard-sm flex items-start gap-3">
          <Lock className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">{memberOnlyNotice}</p>
          </div>
        </div>
      )}

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
                      <FolderThumb coverUrl={coverUrlFor(entry.name)} />
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
                      <div className={`flex items-center gap-1.5 ${(canDownload || isGuest) ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}>
                        {/* Play button */}
                        {isVideo(entry.name) && (
                          canPlay ? (
                            <button
                              onClick={() => handlePlay(entry)}
                              title="Play in browser"
                              className="btn-retro flex items-center gap-1.5 bg-retro-coral hover:bg-retro-coral text-ink border-[1.5px] border-ink text-xs font-semibold px-3 py-1.5 rounded-full"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Play
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowNotice(true)}
                              title={memberOnlyNotice}
                              className="flex items-center gap-1.5 bg-bg2 text-mute border-[1.5px] border-line text-xs font-semibold px-3 py-1.5 rounded-full cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Play
                            </button>
                          )
                        )}

                        {/* Download button — always locked for guests */}
                        {canDownload ? (
                          <button
                            onClick={() => handleDownload(entry)}
                            disabled={downloadingFile === entry.name}
                            className="btn-retro flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink disabled:opacity-60 text-xs font-semibold px-3 py-1.5 rounded-full"
                          >
                            {downloadingFile === entry.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            Download
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowNotice(true)}
                            title={isGuest ? 'สมัครสมาชิกเพื่อ Download' : memberOnlyNotice}
                            className="flex items-center gap-1.5 bg-bg2 text-mute border-[1.5px] border-line text-xs font-semibold px-3 py-1.5 rounded-full cursor-not-allowed"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Download
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {affiliateUrl && canDownload && (
            <p className="text-xs text-mute mt-3 text-center">
              Downloads open a partner link in a new tab. Your download starts immediately after.
            </p>
          )}
        </>
      )}

      {/* Notice modal */}
      {showNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm" onClick={() => setShowNotice(false)}>
          <div className="bg-paper border-[1.5px] border-ink rounded-retro shadow-hard-lg max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-retro-lemon border-[1.5px] border-ink shadow-hard-sm mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            {isGuest ? (
              <>
                <p className="text-ink font-medium mb-2">สมัครสมาชิกเพื่อ Download ไฟล์</p>
                <p className="text-ink2 text-sm mb-5">Guest สามารถดูคลิปได้เท่านั้น ({guestDailyLimit} คลิป/วัน)</p>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/register" className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-5 py-2.5 rounded-full text-sm">
                    <UserPlus className="w-4 h-4" /> สมัครสมาชิก
                  </Link>
                  <button onClick={() => setShowNotice(false)} className="text-ink2 px-4 py-2.5 rounded-full text-sm hover:bg-bg2 transition-colors">ปิด</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-ink font-medium mb-5">{memberOnlyNotice}</p>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/subscribe" className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-5 py-2.5 rounded-full text-sm">
                    ดูแพ็กเกจสมาชิก
                  </Link>
                  <button onClick={() => setShowNotice(false)} className="text-ink2 px-4 py-2.5 rounded-full text-sm hover:bg-bg2 transition-colors">ปิด</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
