'use client'
import { useState } from 'react'
import { Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

export const inputCls = 'w-full bg-bg2 border-[1.5px] border-ink rounded-lg px-3 py-2 text-sm text-ink placeholder-mute focus:outline-none focus:ring-2 focus:ring-retro-sky'
export const labelCls = 'block text-xs font-mono font-semibold uppercase tracking-wider text-ink2 mb-1.5'

interface SettingsShellProps {
  title: string
  description?: string
  icon: React.ReactNode
  children: React.ReactNode
  onSave: () => Promise<void>
}

export function SettingsShell({ title, description, icon, children, onSave }: SettingsShellProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await onSave()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ink grid place-items-center flex-shrink-0 shadow-hard-sm">
          <span className="text-retro-lime">{icon}</span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
          {description && <p className="text-mute text-sm mt-0.5">{description}</p>}
        </div>
      </div>

      <div className="bg-paper border-[1.5px] border-ink rounded-retro p-6 shadow-hard space-y-5">
        {children}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 bg-retro-coral/20 border border-retro-coral rounded-lg p-3 text-retro-coral text-sm">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-5 btn-retro inline-flex items-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-6 py-3 rounded-full"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  )
}

/** Thin wrapper: each sub-page calls patchSettings({field: value}) to save only its own keys. */
export async function patchSettings(patch: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Save failed')
}
