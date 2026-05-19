'use client'
import { useState, useEffect } from 'react'
import { Link2, Save, Info, CheckCircle } from 'lucide-react'

export default function AffiliatePage() {
  const [globalLink, setGlobalLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/affiliate').then(r => r.json()).then(d => {
      setGlobalLink(d.globalLink ?? '')
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/affiliate', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ globalLink }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-2">Affiliate Settings</h1>
      <p className="text-slate-500 mb-8">Configure the affiliate redirect that opens when members download files.</p>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">How affiliate links work</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-300">
            <li>Member clicks a download button</li>
            <li>Affiliate URL opens in a new browser tab (category-specific URL takes priority over this global one)</li>
            <li>File download begins automatically</li>
          </ol>
          <p className="mt-2">You can override this global link per-category in the <a href="/admin/categories" className="underline font-medium">Categories</a> editor.</p>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
        <label className="block font-medium text-slate-200 mb-1.5 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-500" />
          Global Default Affiliate URL
        </label>
        <p className="text-sm text-slate-500 mb-3">Used when no category-specific link is set. Leave blank to disable affiliate redirects entirely.</p>
        <input
          type="url"
          value={globalLink}
          onChange={e => setGlobalLink(e.target.value)}
          placeholder="https://youraffiliatesite.com/ref/your-id"
          className="w-full border border-slate-700 rounded-lg px-4 py-2.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-6">
        <p className="text-sm text-amber-200 font-medium mb-1">Browser Popup Note</p>
        <p className="text-sm text-amber-300">
          The affiliate link opens via <code className="bg-amber-500/20 px-1 rounded text-xs">window.open(..., &apos;_blank&apos;)</code> triggered directly by the user&apos;s click, so popup blockers should not interfere. Members see a brief note explaining the new tab before their download starts.
        </p>
      </div>
    </div>
  )
}
