'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { User, Mail, Shield, CreditCard, Calendar, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Save } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface AccountFormProps {
  user: {
    email: string
    username: string
    role: string
    paymentStatus: string
    createdAt: string
  }
}

export function AccountForm({ user }: AccountFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to change password')

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // For security, sign out so the user re-authenticates with the new password
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile details */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          Profile Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3 h-3" />Username</dt>
            <dd className="text-slate-200 font-medium mt-0.5">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3 h-3" />Email</dt>
            <dd className="text-slate-200 font-medium mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Shield className="w-3 h-3" />Role</dt>
            <dd className="mt-0.5">
              {user.role === 'ADMIN' ? (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium">Administrator</span>
              ) : (
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">Member</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="w-3 h-3" />Payment Status</dt>
            <dd className="mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                user.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-300'
              }`}>{user.paymentStatus}</span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3 h-3" />Member Since</dt>
            <dd className="text-slate-200 mt-0.5">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Change password */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="font-semibold text-slate-100 mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" />
          Change Password
        </h2>
        <p className="text-sm text-slate-400 mb-4">After updating, you&apos;ll be signed out and asked to log in with your new password.</p>

        {success && (
          <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 text-green-300 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Password updated. Signing you out…</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password (min 8 chars)"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={saving || success}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

function PasswordField({
  label, value, onChange, show, onToggle, autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  autoComplete?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
