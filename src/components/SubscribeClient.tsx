'use client'
import { useState } from 'react'
import { CreditCard, CalendarClock, Check, Loader2, Upload, Banknote, QrCode, AlertCircle, ArrowRight, Clock, CheckCircle, XCircle, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { addMonths } from '@/lib/membership'

interface Plan { id: string; name: string; months: number; priceThb: number }
interface Req {
  id: string; planName: string; months: number; priceThb: number; status: string
  slipUrl: string | null; previousExpiry: string | null; newExpiry: string | null; createdAt: string
}
interface Props {
  plans: Plan[]
  currentExpiry: string | null
  expired: boolean
  bankAccount: string
  paymentQrUrl: string | null
  contactEmail: string
  initialRequests: Req[]
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  wait_payment: { label: 'Waiting for payment', cls: 'bg-retro-lemon text-ink', icon: Clock },
  wait_confirm: { label: 'Waiting for confirmation', cls: 'bg-retro-sky text-ink', icon: Clock },
  paid: { label: 'Paid', cls: 'bg-retro-mint text-ink', icon: CheckCircle },
  failed: { label: 'Failed', cls: 'bg-retro-coral text-white', icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-bg2 text-mute', icon: XCircle },
}

export function SubscribeClient({ plans, currentExpiry, expired, bankAccount, paymentQrUrl, contactEmail, initialRequests }: Props) {
  const [requests, setRequests] = useState<Req[]>(initialRequests)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  // Compute the new expiry for the selected plan (mirror of server logic)
  function projectedExpiry(plan: Plan): Date {
    const base = !currentExpiry || expired ? new Date() : new Date(currentExpiry)
    return addMonths(base, plan.months)
  }

  async function confirmSubscription() {
    if (!selected) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create request')
      setRequests(r => [{
        id: data.id, planName: data.planName, months: data.months, priceThb: data.priceThb,
        status: data.status, slipUrl: null,
        previousExpiry: data.previousExpiry, newExpiry: data.newExpiry, createdAt: data.createdAt,
      }, ...r])
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  async function uploadSlip(id: string, file: File) {
    setUploadingId(id)
    try {
      const fd = new FormData()
      fd.append('slip', file)
      const res = await fetch(`/api/subscriptions/${id}/slip`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setRequests(rs => rs.map(r => r.id === id ? { ...r, status: data.status, slipUrl: data.slipUrl } : r))
      } else {
        alert(data.error ?? 'Upload failed')
      }
    } finally {
      setUploadingId(null)
    }
  }

  async function cancelReq(id: string) {
    if (!confirm('Cancel this subscription request?')) return
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) setRequests(rs => rs.map(r => r.id === id ? { ...r, status: 'cancelled' } : r))
  }

  return (
    <div>
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-ink mb-1">Extend Membership</h1>
      <p className="text-ink2 mb-2 text-lg">Choose a plan to {expired ? 'reactivate' : 'extend'} your access.</p>
      <p className="text-sm text-mute mb-8 flex items-center gap-1.5">
        <CalendarClock className="w-4 h-4" />
        {currentExpiry
          ? <>Current expiry: <strong className={expired ? 'text-retro-coral' : 'text-ink'}>{formatDate(currentExpiry)}{expired ? ' (expired)' : ''}</strong></>
          : <>You currently have no active membership window.</>}
      </p>

      {plans.length === 0 ? (
        <div className="bg-paper border-[1.5px] border-ink rounded-retro p-10 text-center shadow-hard">
          <CreditCard className="w-10 h-10 text-mute mx-auto mb-3" />
          <p className="text-ink2">No subscription plans are available right now.</p>
          {contactEmail && <p className="text-sm text-mute mt-1">Contact <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> for help.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {plans.map(plan => {
            const isSel = selected?.id === plan.id
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan)}
                className={`text-left bg-paper border-[1.5px] rounded-retro p-5 transition-all ${isSel ? 'border-ink shadow-hard ring-2 ring-retro-coral' : 'border-ink shadow-hard-sm hover:shadow-hard'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-2xl font-bold text-ink">{plan.name}</h3>
                  {isSel && <Check className="w-5 h-5 text-retro-coral" />}
                </div>
                <p className="text-mute text-sm">{plan.months} month{plan.months > 1 ? 's' : ''} access</p>
                <p className="font-display text-3xl font-extrabold text-ink mt-3">฿{plan.priceThb.toLocaleString()}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected plan detail + payment info */}
      {selected && (
        <div className="bg-paper border-[1.5px] border-ink rounded-retro p-6 shadow-hard mb-10">
          <h2 className="font-display text-2xl font-bold text-ink mb-4">Confirm: {selected.name}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-bg2 border-[1.5px] border-ink rounded-lg p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-mute">Current expiry</p>
              <p className="text-ink font-semibold mt-1">{currentExpiry ? formatDate(currentExpiry) : '—'}</p>
            </div>
            <div className="bg-bg2 border-[1.5px] border-ink rounded-lg p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-mute">Plan</p>
              <p className="text-ink font-semibold mt-1">+{selected.months} mo · ฿{selected.priceThb.toLocaleString()}</p>
            </div>
            <div className="bg-retro-mint/40 border-[1.5px] border-ink rounded-lg p-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-ink2">New expiry</p>
              <p className="text-ink font-bold mt-1 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" /> {formatDate(projectedExpiry(selected).toISOString())}
              </p>
            </div>
          </div>

          {/* Payment instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {bankAccount && (
              <div className="bg-bg2/50 border-[1.5px] border-ink rounded-lg p-4">
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5 mb-2"><Banknote className="w-4 h-4" /> Bank Transfer</p>
                <pre className="text-sm text-ink2 whitespace-pre-wrap font-sans">{bankAccount}</pre>
              </div>
            )}
            {paymentQrUrl && (
              <div className="bg-bg2/50 border-[1.5px] border-ink rounded-lg p-4 flex flex-col items-center">
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5 mb-3 self-start"><QrCode className="w-4 h-4" /> Scan to pay</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={paymentQrUrl} alt="Payment QR" className="w-full max-w-[340px] aspect-square object-contain border-[1.5px] border-ink rounded-lg bg-white p-2" />
                <a href={paymentQrUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-mute hover:text-ink underline mt-2">
                  Open full size
                </a>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-retro-coral/20 border border-retro-coral rounded-lg p-3 mb-4 text-retro-coral text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={confirmSubscription} disabled={creating} className="btn-retro inline-flex items-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-6 py-3 rounded-full">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {creating ? 'Submitting…' : 'Confirm Subscription'}
            </button>
            <button onClick={() => setSelected(null)} className="text-ink2 px-4 py-3 rounded-full text-sm hover:bg-bg2 transition-colors">Cancel</button>
          </div>
          <p className="text-xs text-mute mt-3">
            After confirming, transfer the amount, then upload your payment slip below. We&apos;ll verify and activate your access.
          </p>
        </div>
      )}

      {/* My requests */}
      <h2 className="font-display text-2xl font-bold text-ink mb-3">My Requests</h2>
      {requests.length === 0 ? (
        <p className="text-mute text-sm">No subscription requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const meta = STATUS_META[r.status] ?? STATUS_META.wait_payment
            const StatusIcon = meta.icon
            const canUpload = r.status === 'wait_payment' || r.status === 'wait_confirm'
            const canCancel = r.status === 'wait_payment'
            return (
              <div key={r.id} className="bg-paper border-[1.5px] border-ink rounded-retro p-4 shadow-hard-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-lg font-bold text-ink">{r.planName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-mute mt-0.5">
                      {r.months} mo · ฿{r.priceThb.toLocaleString()} · requested {formatDate(r.createdAt)}
                    </p>
                    {r.newExpiry && (
                      <p className="text-xs text-ink2 mt-0.5">
                        New expiry if approved: <strong>{formatDate(r.newExpiry)}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.slipUrl && (
                      <a href={r.slipUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs border-[1.5px] border-ink px-3 py-1.5 rounded-full text-ink2 hover:bg-bg2">
                        <FileText className="w-3.5 h-3.5" /> View slip
                      </a>
                    )}
                    {canUpload && (
                      <label className="btn-retro inline-flex items-center gap-1.5 bg-retro-coral text-white border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs cursor-pointer">
                        {uploadingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {r.slipUrl ? 'แจ้งชำระเงินอีกครั้ง' : 'แจ้งชำระเงิน'}
                        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { uploadSlip(r.id, f); e.target.value = '' } }} />
                      </label>
                    )}
                    {canCancel && (
                      <button onClick={() => cancelReq(r.id)} className="text-xs text-mute hover:text-retro-coral border-[1.5px] border-ink px-3 py-1.5 rounded-full">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
