'use client'
import { useState, useEffect } from 'react'
import { Mail, Loader2, CheckCircle, XCircle, Send } from 'lucide-react'
import { SettingsShell, patchSettings, inputCls, labelCls } from '@/components/SettingsShell'

interface EmailFields {
  smtpEnabled: boolean; smtpHost: string; smtpPort: number; smtpSecure: boolean
  smtpUser: string; smtpPassword: string; smtpFromEmail: string; smtpFromName: string
  hasSmtpPassword?: boolean
}

export default function EmailSettingsPage() {
  const [s, setS] = useState<EmailFields | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => setS({
      smtpEnabled: data.smtpEnabled ?? false,
      smtpHost: data.smtpHost ?? '',
      smtpPort: data.smtpPort ?? 587,
      smtpSecure: data.smtpSecure ?? false,
      smtpUser: data.smtpUser ?? '',
      smtpPassword: '',
      smtpFromEmail: data.smtpFromEmail ?? '',
      smtpFromName: data.smtpFromName ?? '',
      hasSmtpPassword: data.hasSmtpPassword,
    }))
  }, [])

  function field<K extends keyof EmailFields>(key: K, value: EmailFields[K]) {
    setS(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!s) return
    await patchSettings({
      smtpEnabled: s.smtpEnabled, smtpHost: s.smtpHost, smtpPort: s.smtpPort,
      smtpSecure: s.smtpSecure, smtpUser: s.smtpUser,
      ...(s.smtpPassword ? { smtpPassword: s.smtpPassword } : {}),
      smtpFromEmail: s.smtpFromEmail, smtpFromName: s.smtpFromName,
    })
  }

  async function sendTest() {
    setTesting(true); setTestResult(null)
    try {
      await handleSave()
      const res = await fetch('/api/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail || undefined }),
      })
      setTestResult(await res.json())
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Test failed' })
    } finally { setTesting(false) }
  }

  if (!s) return <div className="text-center py-16 text-mute">Loading…</div>

  return (
    <SettingsShell
      title="Email (SMTP)"
      description="Used to email members when they register. Works with Gmail (use an App Password)."
      icon={<Mail className="w-5 h-5" />}
      onSave={handleSave}
    >
      <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
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
          <input type="number" className={inputCls} value={s.smtpPort} onChange={e => field('smtpPort', Number(e.target.value) || 587)} />
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

      <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
        <input type="checkbox" checked={s.smtpSecure} onChange={e => field('smtpSecure', e.target.checked)} className="w-4 h-4 accent-ink" />
        Use SSL/TLS (port 465). Leave off for STARTTLS (port 587, Gmail default).
      </label>

      <div className="p-4 bg-bg2 border-[1.5px] border-ink rounded-lg">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-ink2 mb-2">Test Connection</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[200px] bg-paper border-[1.5px] border-ink rounded-lg px-3 py-2 text-sm text-ink placeholder-mute focus:outline-none focus:ring-2 focus:ring-retro-sky"
            value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="recipient@example.com (optional)"
          />
          <button onClick={sendTest} disabled={testing}
            className="btn-retro inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-ink font-semibold px-4 py-2 rounded-full text-sm">
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
    </SettingsShell>
  )
}
