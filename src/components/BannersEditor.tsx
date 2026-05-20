'use client'
import { useState, useEffect } from 'react'
import { ImagePlus, Trash2, Loader2, ExternalLink, Eye, EyeOff, Save, Check } from 'lucide-react'

interface Banner {
  id: string
  imageUrl: string
  linkUrl: string
  active: boolean
  sortOrder: number
}

export function BannersEditor() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Controlled edit values + "saved" flash, keyed by banner id
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/banners').then(r => r.json()).then(d => {
      const arr: Banner[] = Array.isArray(d) ? d : []
      setBanners(arr)
      setEdits(Object.fromEntries(arr.map(b => [b.id, b.linkUrl])))
    }).finally(() => setLoading(false))
  }, [])

  async function saveLink(id: string) {
    const value = (edits[id] ?? '').trim()
    const banner = banners.find(b => b.id === id)
    if (!banner || value === banner.linkUrl) return
    await patch(id, { linkUrl: value })
    setSavedId(id)
    setTimeout(() => setSavedId(s => (s === id ? null : s)), 2000)
  }

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('linkUrl', linkUrl.trim())
      const res = await fetch('/api/banners', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setBanners(b => [...b, data])
      setEdits(e => ({ ...e, [data.id]: data.linkUrl }))
      setLinkUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function patch(id: string, body: Partial<Banner>) {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) { const u = await res.json(); setBanners(b => b.map(x => x.id === id ? u : x)) }
  }

  async function remove(id: string) {
    if (!confirm('ลบ banner นี้?')) return
    await fetch(`/api/banners/${id}`, { method: 'DELETE' })
    setBanners(b => b.filter(x => x.id !== id))
  }

  if (loading) return <p className="text-sm text-mute">Loading…</p>

  return (
    <div>
      {/* Existing banners */}
      <div className="space-y-2 mb-4">
        {banners.length === 0 && <p className="text-sm text-mute">ยังไม่มี banner</p>}
        {banners.map(b => (
          <div key={b.id} className={`flex items-center gap-3 bg-bg2 border-[1.5px] border-ink rounded-lg p-2 ${b.active ? '' : 'opacity-60'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt="" className="h-12 w-auto max-w-[120px] object-contain rounded border border-line bg-paper flex-shrink-0" />
            <input
              value={edits[b.id] ?? ''}
              onChange={e => setEdits(ed => ({ ...ed, [b.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') saveLink(b.id) }}
              onBlur={() => saveLink(b.id)}
              placeholder="https://link-when-clicked.com"
              className="flex-1 min-w-0 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink placeholder-mute font-mono"
            />
            <button
              onClick={() => saveLink(b.id)}
              title="บันทึกลิงก์"
              className="px-2 py-1.5 rounded text-ink hover:bg-paper"
            >
              {savedId === b.id ? <Check className="w-4 h-4 text-green-600" /> : <Save className="w-4 h-4" />}
            </button>
            {b.linkUrl && (
              <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="text-mute hover:text-ink" title="เปิดลิงก์">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => patch(b.id, { active: !b.active })}
              title={b.active ? 'กำลังแสดง — คลิกเพื่อซ่อน' : 'ซ่อนอยู่ — คลิกเพื่อแสดง'}
              className={`px-2 py-1.5 rounded ${b.active ? 'text-ink' : 'text-mute'}`}
            >
              {b.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={() => remove(b.id)} className="text-mute hover:text-retro-coral p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {/* Upload new */}
      <div className="bg-bg2/50 border-[1.5px] border-dashed border-ink rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="ลิงก์ปลายทาง (เปิดแท็บใหม่เมื่อกด banner) — ไม่ใส่ก็ได้"
            className="flex-1 min-w-[200px] bg-paper border-[1.5px] border-ink rounded px-3 py-1.5 text-sm text-ink placeholder-mute font-mono"
          />
          <label className={`btn-retro inline-flex items-center gap-1.5 border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs cursor-pointer ${uploading ? 'bg-bg2 text-mute' : 'bg-ink text-retro-lime'}`}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? 'กำลังอัปโหลด…' : 'อัปโหลด Banner'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value = '' } }} />
          </label>
        </div>
        {error && <p className="text-xs text-retro-coral mt-2">{error}</p>}
        <p className="text-[11px] text-mute mt-2">รูปภาพ JPG/PNG/WebP/GIF สูงสุด 5MB — แสดงด้านล่างของทุกหน้า</p>
      </div>
    </div>
  )
}
