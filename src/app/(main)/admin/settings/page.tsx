'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal, Save, Mail, Globe, Loader2, CheckCircle, XCircle, Send, CreditCard, Plus, Trash2, Banknote, QrCode, Phone } from 'lucide-react'

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
  contactEmail: string
  bankAccount: string
  paymentQrUrl: string | null
  cardFooterNote: string
  memberOnlyNotice: string
  hasSmtpPassword?: boolean
}

interface Plan {
  id: string
  name: string
  months: number
  priceThb: number
  active: boolean
  sortOrder: number
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

  const [plans, setPlans] = useState<Plan[]>([])
  const [newPlan, setNewPlan] = useState({ name: '', months: 1, priceThb: 0 })
  const [qrUploading, setQrUploading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/plans').then(r => r.json()),
    ]).then(([data, planData]) => {
      setS({ ...data, smtpPassword: '' })
      setPlans(Array.isArray(planData) ? planData : [])
    }).finally(() => setLoading(false))
  }, [])

  async function addPlan() {
    if (!newPlan.name || newPlan.months < 1) return
    const res = await fetch('/api/plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPlan),
    })
    if (res.ok) {
      const created = await res.json()
      setPlans(p => [...p, created])
      setNewPlan({ name: '', months: 1, priceThb: 0 })
    }
  }

  async function updatePlan(id: string, patch: Partial<Plan>) {
    const res = await fetch(`/api/plans/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlans(p => p.map(pl => pl.id === id ? updated : pl))
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return
    await fetch(`/api/plans/${id}`, { method: 'DELETE' })
    setPlans(p => p.filter(pl => pl.id !== id))
  }

  async function uploadQr(file: File) {
    setQrUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/settings/payment-qr', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) field('paymentQrUrl', data.paymentQrUrl)
    } finally {
      setQrUploading(false)
    }
  }

  async function removeQr() {
    await fetch('/api/settings/payment-qr', { method: 'DELETE' })
    field('paymentQrUrl', null)
  }

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
          <div>
            <label className={labelCls}>Contact Email (shown to members)</label>
            <input className={inputCls} value={s.contactEmail} onChange={e => field('contactEmail', e.target.value)} placeholder="support@yoursite.com" />
            <p className="text-xs text-mute mt-1">Members use this to contact you. Payment-slip notifications are also sent here.</p>
          </div>
          <div>
            <label className={labelCls}>Membership Card — Footer Note</label>
            <input className={inputCls} value={s.cardFooterNote} onChange={e => field('cardFooterNote', e.target.value)} placeholder="เก็บบัตรนี้ไว้เป็นความลับ" />
            <p className="text-xs text-mute mt-1">หมายเหตุที่แสดงล่างสุดของบัตรสมาชิก (ตามด้วยวันที่ออกบัตรอัตโนมัติ)</p>
          </div>
          <div>
            <label className={labelCls}>Members-Only Notice (ปุ่ม Download/Play ที่ถูกล็อก)</label>
            <input className={inputCls} value={s.memberOnlyNotice} onChange={e => field('memberOnlyNotice', e.target.value)} placeholder="สำหรับสมาชิกเท่านั้น ศึกษารายละเอียดได้ที่หน้า Subscription" />
            <p className="text-xs text-mute mt-1">ข้อความที่แสดงเมื่อผู้ใช้ที่ยังไม่มีสิทธิ์เอาเมาส์ชี้/กดปุ่ม Download หรือ Play</p>
          </div>
        </div>
      </section>

      {/* Payment & subscription plans */}
      <section className="bg-paper border-[1.5px] border-ink rounded-retro p-6 mb-6 shadow-hard">
        <h2 className="font-display text-2xl font-bold text-ink mb-1 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-retro-mint" /> Payment & Plans
        </h2>
        <p className="text-sm text-mute mb-4">Configure bank details, payment QR, and the subscription plans members can buy.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}><Banknote className="w-3 h-3 inline mr-1" />Bank Account Details</label>
            <textarea
              className={inputCls + ' min-h-[120px] resize-y'}
              value={s.bankAccount}
              onChange={e => field('bankAccount', e.target.value)}
              placeholder={'Bank: Kasikorn\nAccount: 123-4-56789-0\nName: Your Name'}
            />
            <p className="text-xs text-mute mt-1">Shown to members on the subscription page.</p>
          </div>
          <div>
            <label className={labelCls}><QrCode className="w-3 h-3 inline mr-1" />Payment QR Code</label>
            <div className="flex items-start gap-3">
              <div className="w-44 h-44 rounded-lg border-[1.5px] border-ink bg-bg2 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
                {s.paymentQrUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={s.paymentQrUrl} alt="Payment QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-10 h-10 text-mute" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-retro inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-ink font-semibold px-3 py-1.5 rounded-full text-xs cursor-pointer">
                  {qrUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  {s.paymentQrUrl ? 'Replace' : 'Upload QR'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { uploadQr(f); e.target.value = '' } }} />
                </label>
                {s.paymentQrUrl && (
                  <button onClick={removeQr} className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-retro-coral border-[1.5px] border-ink px-3 py-1.5 rounded-full">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <h3 className="font-display text-lg font-bold text-ink mt-6 mb-2">Subscription Plans</h3>
        <div className="space-y-2 mb-3">
          {plans.length === 0 && <p className="text-sm text-mute">No plans yet. Add one below.</p>}
          {plans.map(plan => (
            <div key={plan.id} className="flex flex-wrap items-center gap-2 bg-bg2 border-[1.5px] border-ink rounded-lg p-2">
              <input
                className="flex-1 min-w-[120px] bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                defaultValue={plan.name}
                onBlur={e => e.target.value !== plan.name && updatePlan(plan.id, { name: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <input
                  type="number" min={1}
                  className="w-16 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                  defaultValue={plan.months}
                  onBlur={e => Number(e.target.value) !== plan.months && updatePlan(plan.id, { months: Number(e.target.value) })}
                />
                <span className="text-xs text-mute">mo</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-mute">฿</span>
                <input
                  type="number" min={0}
                  className="w-24 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                  defaultValue={plan.priceThb}
                  onBlur={e => Number(e.target.value) !== plan.priceThb && updatePlan(plan.id, { priceThb: Number(e.target.value) })}
                />
              </div>
              <button
                onClick={() => updatePlan(plan.id, { active: !plan.active })}
                className={`text-xs px-2 py-1 rounded-full font-medium border-[1.5px] border-ink ${plan.active ? 'bg-retro-mint text-ink' : 'bg-bg text-mute'}`}
              >
                {plan.active ? 'Active' : 'Hidden'}
              </button>
              <button onClick={() => deletePlan(plan.id)} className="text-mute hover:text-retro-coral p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-bg2/50 border-[1.5px] border-dashed border-ink rounded-lg p-2">
          <input
            className="flex-1 min-w-[120px] bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
            placeholder="Plan name (e.g. 3 Months)"
            value={newPlan.name}
            onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
          />
          <div className="flex items-center gap-1">
            <input type="number" min={1} className="w-16 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
              value={newPlan.months} onChange={e => setNewPlan(p => ({ ...p, months: Number(e.target.value) || 1 }))} />
            <span className="text-xs text-mute">mo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-mute">฿</span>
            <input type="number" min={0} className="w-24 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
              value={newPlan.priceThb} onChange={e => setNewPlan(p => ({ ...p, priceThb: Number(e.target.value) || 0 }))} />
          </div>
          <button onClick={addPlan} className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
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
