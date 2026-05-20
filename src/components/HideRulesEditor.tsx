'use client'
import { useState, useEffect, useCallback } from 'react'
import { EyeOff, Plus, Trash2, Folder, FileText, Files } from 'lucide-react'

interface Rule { id: string; categoryId: string | null; pattern: string; target: string }

const TARGETS = [
  { key: 'both', label: 'ทั้งสอง', icon: Files },
  { key: 'file', label: 'ไฟล์', icon: FileText },
  { key: 'folder', label: 'โฟลเดอร์', icon: Folder },
]

// categoryId undefined => global rules
export function HideRulesEditor({ categoryId }: { categoryId?: string }) {
  const [rules, setRules] = useState<Rule[]>([])
  const [pattern, setPattern] = useState('')
  const [target, setTarget] = useState('both')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const fetchUrl = categoryId
    ? `/api/hide-rules?categoryId=${encodeURIComponent(categoryId)}`
    : '/api/hide-rules?scope=global'

  const load = useCallback(() => {
    fetch(fetchUrl).then(r => r.json()).then(d => setRules(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [fetchUrl])

  useEffect(() => { load() }, [load])

  async function addRule() {
    if (!pattern.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/hide-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: categoryId ?? null, pattern: pattern.trim(), target }),
      })
      if (res.ok) {
        const created = await res.json()
        setRules(r => [...r, created])
        setPattern('')
      }
    } finally {
      setAdding(false)
    }
  }

  async function removeRule(id: string) {
    await fetch(`/api/hide-rules/${id}`, { method: 'DELETE' })
    setRules(r => r.filter(x => x.id !== id))
  }

  function targetMeta(t: string) {
    return TARGETS.find(x => x.key === t) ?? TARGETS[0]
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {loading ? (
          <span className="text-sm text-mute">Loading…</span>
        ) : rules.length === 0 ? (
          <span className="text-sm text-mute">ยังไม่มีกฎซ่อน</span>
        ) : (
          rules.map(r => {
            const m = targetMeta(r.target)
            const Icon = m.icon
            return (
              <span key={r.id} className="inline-flex items-center gap-1.5 bg-bg2 border-[1.5px] border-ink rounded-full pl-2.5 pr-1.5 py-1 text-xs">
                <Icon className="w-3.5 h-3.5 text-mute" />
                <span className="font-mono text-ink">{r.pattern}</span>
                <span className="text-[10px] text-mute">({m.label})</span>
                <button onClick={() => removeRule(r.id)} className="text-mute hover:text-retro-coral"><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            )
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addRule() }}
          placeholder="เช่น *.jpg, Thumbs.db, .DS_Store, temp*"
          className="flex-1 min-w-[180px] bg-bg2 border-[1.5px] border-ink rounded-lg px-3 py-1.5 text-sm font-mono text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="bg-bg2 border-[1.5px] border-ink rounded-lg px-2 py-1.5 text-sm text-ink"
        >
          {TARGETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <button
          onClick={addRule}
          disabled={adding || !pattern.trim()}
          className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" /> เพิ่ม
        </button>
      </div>
      <p className="text-[11px] text-mute mt-1.5 flex items-center gap-1">
        <EyeOff className="w-3 h-3" />
        ใช้ * และ ? เป็น wildcard ได้ — เช่น <span className="font-mono">*.jpg</span> ซ่อนทุกไฟล์ .jpg
      </p>
    </div>
  )
}
