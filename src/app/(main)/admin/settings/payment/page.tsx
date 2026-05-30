'use client'
import { useState, useEffect } from 'react'
import { CreditCard, QrCode, Banknote, Plus, Trash2, Loader2 } from 'lucide-react'
import { SettingsShell, patchSettings, inputCls, labelCls } from '@/components/SettingsShell'

interface Plan {
  id: string; name: string; months: number; priceThb: number; active: boolean; sortOrder: number; groupId: string | null
}
interface CategoryGroup { id: string; name: string }

export default function PaymentSettingsPage() {
  const [bankAccount, setBankAccount] = useState('')
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [newPlan, setNewPlan] = useState({ name: '', months: 1, priceThb: 0, groupId: '' })
  const [catGroups, setCatGroups] = useState<CategoryGroup[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/plans').then(r => r.json()),
      fetch('/api/category-groups').then(r => r.json()),
    ]).then(([data, planData, groupData]) => {
      setBankAccount(data.bankAccount ?? '')
      setPaymentQrUrl(data.paymentQrUrl ?? null)
      setPlans(Array.isArray(planData) ? planData : [])
      setCatGroups(Array.isArray(groupData) ? groupData : [])
      setLoaded(true)
    })
  }, [])

  async function uploadQr(file: File) {
    setQrUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/settings/payment-qr', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setPaymentQrUrl(data.paymentQrUrl)
    } finally { setQrUploading(false) }
  }

  async function removeQr() {
    await fetch('/api/settings/payment-qr', { method: 'DELETE' })
    setPaymentQrUrl(null)
  }

  async function addPlan() {
    if (!newPlan.name || newPlan.months < 1) return
    const res = await fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPlan) })
    if (res.ok) { const created = await res.json(); setPlans(p => [...p, created]); setNewPlan({ name: '', months: 1, priceThb: 0, groupId: '' }) }
  }

  async function updatePlan(id: string, patch: Partial<Plan>) {
    const res = await fetch(`/api/plans/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) { const updated = await res.json(); setPlans(p => p.map(pl => pl.id === id ? updated : pl)) }
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return
    await fetch(`/api/plans/${id}`, { method: 'DELETE' })
    setPlans(p => p.filter(pl => pl.id !== id))
  }

  if (!loaded) return <div className="text-center py-16 text-mute">Loading…</div>

  return (
    <SettingsShell
      title="Payment & Plans"
      description="Bank details, payment QR, and subscription plans."
      icon={<CreditCard className="w-5 h-5" />}
      onSave={() => patchSettings({ bankAccount })}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}><Banknote className="w-3 h-3 inline mr-1" />Bank Account Details</label>
          <textarea
            className={inputCls + ' min-h-[120px] resize-y'}
            value={bankAccount}
            onChange={e => setBankAccount(e.target.value)}
            placeholder={'Bank: Kasikorn\nAccount: 123-4-56789-0\nName: Your Name'}
          />
          <p className="text-xs text-mute mt-1">Shown to members on the subscription page.</p>
        </div>
        <div>
          <label className={labelCls}><QrCode className="w-3 h-3 inline mr-1" />Payment QR Code</label>
          <div className="flex items-start gap-3">
            <div className="w-44 h-44 rounded-lg border-[1.5px] border-ink bg-bg2 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5">
              {paymentQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={paymentQrUrl} alt="Payment QR" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-mute" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="btn-retro inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-ink font-semibold px-3 py-1.5 rounded-full text-xs cursor-pointer">
                {qrUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                {paymentQrUrl ? 'Replace' : 'Upload QR'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { uploadQr(f); e.target.value = '' } }} />
              </label>
              {paymentQrUrl && (
                <button onClick={removeQr} className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-retro-coral border-[1.5px] border-ink px-3 py-1.5 rounded-full">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-line" />

      <div>
        <h3 className="font-display text-lg font-bold text-ink mb-2">Subscription Plans</h3>
        <div className="space-y-2 mb-3">
          {plans.length === 0 && <p className="text-sm text-mute">No plans yet. Add one below.</p>}
          {plans.map(plan => (
            <div key={plan.id} className="flex flex-wrap items-center gap-2 bg-bg2 border-[1.5px] border-ink rounded-lg p-2">
              <input className="flex-1 min-w-[120px] bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                defaultValue={plan.name} onBlur={e => e.target.value !== plan.name && updatePlan(plan.id, { name: e.target.value })} />
              <div className="flex items-center gap-1">
                <input type="number" min={1} className="w-16 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                  defaultValue={plan.months} onBlur={e => Number(e.target.value) !== plan.months && updatePlan(plan.id, { months: Number(e.target.value) })} />
                <span className="text-xs text-mute">mo</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-mute">฿</span>
                <input type="number" min={0} className="w-24 bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
                  defaultValue={plan.priceThb} onBlur={e => Number(e.target.value) !== plan.priceThb && updatePlan(plan.id, { priceThb: Number(e.target.value) })} />
              </div>
              <select value={plan.groupId ?? ''} onChange={e => updatePlan(plan.id, { groupId: e.target.value || null })}
                className="text-xs bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-ink max-w-[150px]">
                <option value="">— No group —</option>
                {catGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => updatePlan(plan.id, { active: !plan.active })}
                className={`text-xs px-2 py-1 rounded-full font-medium border-[1.5px] border-ink ${plan.active ? 'bg-retro-mint text-ink' : 'bg-bg text-mute'}`}>
                {plan.active ? 'Active' : 'Hidden'}
              </button>
              <button onClick={() => deletePlan(plan.id)} className="text-mute hover:text-retro-coral p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-bg2/50 border-[1.5px] border-dashed border-ink rounded-lg p-2">
          <input className="flex-1 min-w-[120px] bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink"
            placeholder="Plan name" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} />
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
          <select value={newPlan.groupId} onChange={e => setNewPlan(p => ({ ...p, groupId: e.target.value }))}
            className="text-sm bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-ink max-w-[150px]">
            <option value="">— No group —</option>
            {catGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={addPlan} className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
      </div>
    </SettingsShell>
  )
}
