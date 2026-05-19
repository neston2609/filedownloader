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
      <div className="bg-paper border-[1.5px] border-ink rounded-2xl p-6">
        <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-ink" />
          Profile Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-mute uppercase tracking-wider flex items-center gap-1.5"><User className="w-3 h-3" />Username</dt>
            <dd className="text-ink font-medium mt-0.5">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3 h-3" />Email</dt>
            <dd className="text-ink font-medium mt-0.5">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-mute uppercase tracking-wider flex items-center gap-1.5"><Shield className="w-3 h-3" />Role</dt>
            <dd className="mt-0.5">
              {user.role === 'ADMIN' ? (
                <span className="text-xs bg-retro-lemon text-ink px-2 py-0.5 rounded font-medium">Administrator</span>
              ) : (
                <span className="text-xs bg-bg2 text-ink2 px-2 py-0.5 rounded font-medium">Member</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-mute uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="w-3 h-3" />Payment Status</dt>
            <dd className="mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                user.paymentStatus === 'paid' ? 'bg-retro-mint text-ink' : 'bg-bg2 text-ink2'
              }`}>{user.paymentStatus}</span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-mute uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3 h-3" />Member Since</dt>
            <dd className="text-ink mt-0.5">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Change password */}
      <div className="bg-paper border-[1.5px] border-ink rounded-2xl p-6">
        <h2 className="font-semibold text-ink mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-ink" />
          Change Password
        </h2>
        <p className="text-sm text-mute mb-4">After updating, you&apos;ll be signed out and asked to log in with your new password.</p>

        {success && (
          <div className="flex items-start gap-2 bg-retro-mint/30 border border-ink/40 rounded-lg p-3 mb-4 text-ink text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Password updated. Signing you out…</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-retro-coral/20 border border-retro-coral rounded-lg p-3 mb-4 text-retro-coral text-sm">
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
            className="flex items-center gap-2 bg-ink hover:bg-ink2 disabled:bg-line disabled:text-mute text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
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
      <label className="block text-xs font-medium text-ink2 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-bg2 border border-ink rounded-lg py-2.5 pl-10 pr-10 text-sm text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink2 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
