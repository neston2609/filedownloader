'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal, Save, Mail, Globe, Loader2, CheckCircle, XCircle, Send } from 'lucide-react'

interface Settings {
  siteTitle: string
  heroHeading: string
  heroSubheading: string
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
  smtpFromEmail: string
  smtpFromName: string
  hasSmtpPassword?: boolean
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data) => {
      setS({ ...data, smtpPassword: '' })
    }).finally(() => setLoading(false))
  }, [])

  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function save() {
    if (!s) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setS({ ...data, smtpPassword: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so the test uses current values
      await save()
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail || undefined }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  if (loading || !s) return <div className="text-center py-16 text-mute">Loading settings…</div>

  const inputCls = 'w-full bg-bg2 border-[1.5px] border-ink rounded-lg px-3 py-2 text-sm text-ink placeholder-mute focus:outline-none focus:ring-2 focus:ring-retro-sky'
  const labelCls = 'block text-xs font-mono font-semibold uppercase tracking-wider text-ink2 mb-1.5'

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl font-extrabold text-ink mb-1 flex items-center gap-2">
        <SlidersHorizontal className="w-7 h-7" /> Site Settings
      </h1>
      <p className="text-mute mb-8">Configure branding and email delivery.</p>

      {/* Branding */}
      <section className="bg-paper border-[1.5px] border-ink rounded-retro p-6 mb-6 shadow-hard">
        <h2 className="font-display text-2xl font-bold text-ink mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-retro-sky" /> Branding & First Page
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Site Title</label>
            <input className={inputCls} value={s.siteTitle} onChange={e => field('siteTitle', e.target.value)} placeholder="SecureFiles" />
            <p className="text-xs text-mute mt-1">Shown in the navbar and on the login page.</p>
          </div>
          <div>
            <label className={labelCls}>First-Page Header</label>
            <input className={inputCls} value={s.heroHeading} onChange={e => field('heroHeading', e.target.value)} placeholder="Download anything, from anywhere" />
          </div>
          <div>
            <label className={labelCls}>First-Page Subheading</label>
            <input className={inputCls} value={s.heroSubheading} onChange={e => field('heroSubheading', e.target.value)} placeholder="Secure, members-only file downloads." />
          </div>
        </div>
      </section>

      {/* SMTP */}
      <section className="bg-paper border-[1.5px] border-ink rounded-retro p-6 mb-6 shadow-hard">
        <h2 className="font-display text-2xl font-bold text-ink mb-1 flex items-center gap-2">
          <Mail className="w-5 h-5 text-retro-coral" /> Email (SMTP)
        </h2>
        <p className="text-sm text-mute mb-4">Used to email members when they register. Works with Gmail (use an App Password).</p>

        <label className="flex items-center gap-2 text-sm font-medium text-ink mb-4 cursor-pointer">
          <input type="checkbox" checked={s.smtpEnabled} onChange={e => field('smtpEnabled', e.target.checked)} className="w-4 h-4 accent-ink" />
          Enable email sending
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>SMTP Host</label>
            <input className={inputCls} value={s.smtpHost} onChange={e => field('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label className={labelCls}>Port</label>
            <input type="number" className={inputCls} value={s.smtpPort} onChange={e => field('smtpPort', Number(e.target.value) || 587)} placeholder="587" />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input className={inputCls} value={s.smtpUser} onChange={e => field('smtpUser', e.target.value)} placeholder="you@gmail.com" />
          </div>
          <div>
            <label className={labelCls}>Password {s.hasSmtpPassword && <span className="text-mute normal-case">(set — leave blank to keep)</span>}</label>
            <input type="password" className={inputCls} value={s.smtpPassword} onChange={e => field('smtpPassword', e.target.value)} placeholder={s.hasSmtpPassword ? '••••••••' : 'App password'} />
          </div>
          <div>
            <label className={labelCls}>From Email</label>
            <input className={inputCls} value={s.smtpFromEmail} onChange={e => field('smtpFromEmail', e.target.value)} placeholder="you@gmail.com" />
          </div>
          <div>
            <label className={labelCls}>From Name</label>
            <input className={inputCls} value={s.smtpFromName} onChange={e => field('smtpFromName', e.target.value)} placeholder="SecureFiles" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink mt-4 cursor-pointer">
          <input type="checkbox" checked={s.smtpSecure} onChange={e => field('smtpSecure', e.target.checked)} className="w-4 h-4 accent-ink" />
          Use SSL/TLS (port 465). Leave off for STARTTLS (port 587, Gmail default).
        </label>

        {/* Test email */}
        <div className="mt-5 p-4 bg-bg2 border-[1.5px] border-ink rounded-lg">
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-ink2 mb-2">Test Connection</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-[200px] bg-paper border-[1.5px] border-ink rounded-lg px-3 py-2 text-sm text-ink placeholder-mute focus:outline-none focus:ring-2 focus:ring-retro-sky"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="recipient@example.com (optional)"
            />
            <button
              onClick={sendTest}
              disabled={testing}
              className="btn-retro inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-ink font-semibold px-4 py-2 rounded-full text-sm"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {testing ? 'Testing…' : 'Verify & Send Test'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 flex items-start gap-2 text-sm ${testResult.ok ? 'text-ink' : 'text-retro-coral'}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span className="font-mono break-all">{testResult.message}</span>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-retro-coral/20 border border-retro-coral rounded-lg p-3 text-retro-coral text-sm">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="btn-retro inline-flex items-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-6 py-3 rounded-full"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
