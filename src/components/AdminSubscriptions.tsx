'use client'
import { useState } from 'react'
import { CreditCard, CheckCircle, XCircle, Clock, FileText, Loader2, ArrowRight, User as UserIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Req {
  id: string; username: string; email: string
  planName: string; months: number; priceThb: number; status: string
  slipUrl: string | null; previousExpiry: string | null; newExpiry: string | null
  createdAt: string; paidAt: string | null
}

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  wait_payment: { label: 'Waiting for payment', cls: 'bg-retro-lemon text-ink', icon: Clock },
  wait_confirm: { label: 'Waiting for confirm', cls: 'bg-retro-sky text-ink', icon: Clock },
  paid: { label: 'Paid', cls: 'bg-retro-mint text-ink', icon: CheckCircle },
  failed: { label: 'Failed', cls: 'bg-retro-coral text-white', icon: XCircle },
  cancelled: { label: 'Cancelled', cls: 'bg-bg2 text-mute', icon: XCircle },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'wait_confirm', label: 'Needs review' },
  { key: 'wait_payment', label: 'Awaiting payment' },
  { key: 'paid', label: 'Paid' },
  { key: 'failed', label: 'Failed' },
]

export function AdminSubscriptions({ initial }: { initial: Req[] }) {
  const [requests, setRequests] = useState<Req[]>(initial)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState<string | null>(null)

  async function setStatus(id: string, status: 'paid' | 'failed') {
    const label = status === 'paid'
      ? 'Mark this request as PAID? This will extend the member’s membership automatically.'
      : 'Mark this request as FAILED?'
    if (!confirm(label)) return
    setBusy(id)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok) {
        setRequests(rs => rs.map(r => r.id === id ? { ...r, status: data.status, newExpiry: data.newExpiry ?? r.newExpiry, paidAt: data.paidAt ?? r.paidAt } : r))
      } else {
        alert(data.error ?? 'Failed')
      }
    } finally {
      setBusy(null)
    }
  }

  const shown = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const counts = requests.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold text-ink mb-1 flex items-center gap-2">
        <CreditCard className="w-7 h-7" /> Subscription Requests
      </h1>
      <p className="text-mute mb-6">Review payment slips and confirm or reject subscriptions.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-sm font-medium px-3 py-1.5 rounded-full border-[1.5px] border-ink transition-all ${filter === f.key ? 'bg-ink text-retro-lime' : 'bg-paper text-ink2 hover:bg-bg2'}`}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-paper border-[1.5px] border-ink rounded-retro p-12 text-center shadow-hard">
          <CreditCard className="w-10 h-10 text-mute mx-auto mb-3" />
          <p className="text-ink2">No requests in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(r => {
            const meta = STATUS_META[r.status] ?? STATUS_META.wait_payment
            const StatusIcon = meta.icon
            const actionable = r.status === 'wait_confirm' || r.status === 'wait_payment'
            return (
              <div key={r.id} className="bg-paper border-[1.5px] border-ink rounded-retro p-4 shadow-hard-sm">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{r.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-mute">{r.email}</p>
                    <p className="text-sm text-ink2 mt-1">
                      <strong>{r.planName}</strong> · {r.months} mo · ฿{r.priceThb.toLocaleString()}
                    </p>
                    <p className="text-xs text-mute mt-0.5">Requested {formatDate(r.createdAt)}{r.paidAt ? ` · Paid ${formatDate(r.paidAt)}` : ''}</p>
                    {(r.previousExpiry || r.newExpiry) && (
                      <p className="text-xs text-ink2 mt-1 flex items-center gap-1">
                        {r.previousExpiry ? formatDate(r.previousExpiry) : 'none'}
                        <ArrowRight className="w-3 h-3" />
                        <strong>{r.newExpiry ? formatDate(r.newExpiry) : '—'}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {r.slipUrl ? (
                      <a href={r.slipUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs border-[1.5px] border-ink px-3 py-1.5 rounded-full text-ink2 hover:bg-bg2">
                        <FileText className="w-3.5 h-3.5" /> View slip
                      </a>
                    ) : (
                      <span className="text-xs text-mute italic">No slip uploaded</span>
                    )}
                    {actionable && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatus(r.id, 'paid')}
                          disabled={busy === r.id}
                          className="btn-retro inline-flex items-center gap-1.5 bg-retro-mint border-[1.5px] border-ink text-ink font-semibold px-3 py-1.5 rounded-full text-xs"
                        >
                          {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Mark Paid
                        </button>
                        <button
                          onClick={() => setStatus(r.id, 'failed')}
                          disabled={busy === r.id}
                          className="btn-retro inline-flex items-center gap-1.5 bg-paper border-[1.5px] border-ink text-retro-coral font-semibold px-3 py-1.5 rounded-full text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </button>
                      </div>
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
