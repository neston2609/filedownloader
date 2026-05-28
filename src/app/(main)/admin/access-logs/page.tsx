'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Trash2, LogIn, Eye, Play, UserCheck, ChevronLeft, ChevronRight, Monitor } from 'lucide-react'

interface AccessLogEntry {
  id: string
  type: string
  ip: string
  userId: string | null
  userEmail: string | null
  username: string | null
  categoryId: string | null
  categoryName: string | null
  filePath: string | null
  userAgent: string | null
  createdAt: string
}

interface LogsResponse {
  logs: AccessLogEntry[]
  total: number
  page: number
  pages: number
  pageSize: number
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  LOGIN: {
    label: 'Login',
    color: 'bg-retro-sky text-ink border-ink',
    icon: <LogIn className="w-3 h-3" />,
  },
  GUEST_BROWSE: {
    label: 'Guest Browse',
    color: 'bg-retro-lemon text-ink border-ink',
    icon: <Eye className="w-3 h-3" />,
  },
  GUEST_PLAY: {
    label: 'Guest Play',
    color: 'bg-retro-coral text-ink border-ink',
    icon: <Play className="w-3 h-3" />,
  },
  MEMBER_PLAY: {
    label: 'Member Play',
    color: 'bg-retro-mint text-ink border-ink',
    icon: <UserCheck className="w-3 h-3" />,
  },
}

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { label: type, color: 'bg-bg2 text-ink border-ink', icon: <Monitor className="w-3 h-3" /> }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border-[1.5px] whitespace-nowrap ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString('th-TH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

const FILTER_TABS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'GUEST_BROWSE', label: 'Guest Browse' },
  { value: 'GUEST_PLAY', label: 'Guest Play' },
  { value: 'MEMBER_PLAY', label: 'Member Play' },
]

export default function AccessLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [clearing, setClearing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchLogs = useCallback(async (p: number, t: string, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (t) params.set('type', t)
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/access-logs?${params}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(page, type, search)
  }, [page, type, search, fetchLogs])

  // Auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(page, type, search), 15_000)
    return () => clearInterval(id)
  }, [autoRefresh, page, type, search, fetchLogs])

  function handleTypeChange(t: string) {
    setType(t)
    setPage(1)
  }

  function handleSearch(q: string) {
    setSearch(q)
    setPage(1)
  }

  async function handleClearOld() {
    if (!confirm('ลบ log ที่เก่ากว่า 30 วัน?')) return
    setClearing(true)
    try {
      await fetch('/api/admin/access-logs?olderThanDays=30', { method: 'DELETE' })
      fetchLogs(1, type, search)
      setPage(1)
    } finally {
      setClearing(false)
    }
  }

  const total = data?.total ?? 0

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-extrabold text-ink">Access Log</h1>
          <p className="text-ink2 text-sm mt-1">Login, Guest Browse และ Play events ทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            title={autoRefresh ? 'ปิด Auto-refresh' : 'เปิด Auto-refresh (15s)'}
            className={`btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-ink transition-colors ${autoRefresh ? 'bg-retro-mint text-ink' : 'bg-bg2 text-ink2'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Refresh'}
          </button>
          <button
            onClick={() => fetchLogs(page, type, search)}
            className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-ink bg-bg2 text-ink"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearOld}
            disabled={clearing}
            className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] border-ink bg-bg2 text-retro-coral disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ลบ &gt;30 วัน
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { type: 'LOGIN', label: 'Logins', color: 'bg-retro-sky/30' },
          { type: 'GUEST_BROWSE', label: 'Guest Browses', color: 'bg-retro-lemon/30' },
          { type: 'GUEST_PLAY', label: 'Guest Plays', color: 'bg-retro-coral/30' },
          { type: 'MEMBER_PLAY', label: 'Member Plays', color: 'bg-retro-mint/30' },
        ].map(({ type: t, label, color }) => (
          <button
            key={t}
            onClick={() => handleTypeChange(type === t ? '' : t)}
            className={`${color} border-[1.5px] border-ink rounded-retro p-3 text-left shadow-hard-sm hover:shadow-hard transition-all ${type === t ? 'ring-2 ring-ink' : ''}`}
          >
            <TypeBadge type={t} />
            <p className="text-xs text-ink2 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-paper border-[1.5px] border-ink rounded-2xl overflow-hidden shadow-hard mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
          {FILTER_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleTypeChange(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border-[1.5px] transition-colors ${
                type === value
                  ? 'bg-ink text-retro-lime border-ink'
                  : 'bg-bg2 text-ink2 border-line hover:border-ink hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink2 pointer-events-none" />
              <input
                type="text"
                placeholder="IP, username, email…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-full text-xs border-[1.5px] border-ink bg-bg text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-ink w-48"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg2 border-b border-line text-xs text-ink2 font-mono uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-left">IP</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Category / File</th>
                <th className="px-4 py-2 text-left">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-mute text-sm">กำลังโหลด…</td>
                </tr>
              ) : !data?.logs.length ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-mute text-sm">ไม่มี log ในช่วงนี้</td>
                </tr>
              ) : data.logs.map((log) => (
                <tr key={log.id} className="hover:bg-bg2/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <TypeBadge type={log.type} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-ink bg-bg2 border border-line px-2 py-0.5 rounded-full">
                      {log.ip || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {log.username || log.userEmail ? (
                      <div>
                        {log.username && <p className="text-sm font-semibold text-ink">{log.username}</p>}
                        {log.userEmail && <p className="text-xs text-ink2">{log.userEmail}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-mute italic">Guest</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-[260px]">
                    {log.categoryName && (
                      <p className="text-xs font-semibold text-ink truncate">{log.categoryName}</p>
                    )}
                    {log.filePath && (
                      <p className="text-[11px] text-ink2 font-mono truncate" title={log.filePath}>
                        {log.filePath.split(/[\\/]/).pop()}
                      </p>
                    )}
                    {!log.categoryName && !log.filePath && (
                      <span className="text-xs text-mute">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span title={formatAbsolute(log.createdAt)} className="text-xs text-ink2 cursor-default">
                      {timeAgo(log.createdAt)}
                    </span>
                    <p className="text-[10px] text-mute">{formatAbsolute(log.createdAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-bg2 text-xs text-ink2">
            <span>แสดง {Math.min((page - 1) * data.pageSize + 1, total)}–{Math.min(page * data.pageSize, total)} จาก {total.toLocaleString()} รายการ</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:bg-paper transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-ink">หน้า {page} / {data.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:bg-paper transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-mute text-center font-mono">
        แสดง {data?.pageSize ?? 50} รายการ/หน้า · ลบอัตโนมัติเมื่อกดปุ่ม &ldquo;ลบ &gt;30 วัน&rdquo;
      </p>
    </div>
  )
}
