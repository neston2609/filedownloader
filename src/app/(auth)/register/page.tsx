'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, User, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, username: form.username, password: form.password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Registration failed')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  if (success) {
    return (
      <div className="bg-paper border-[1.5px] border-ink rounded-retro p-8 text-center shadow-hard-lg">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-retro-mint border-[1.5px] border-ink mb-4 shadow-hard-sm">
          <CheckCircle className="w-7 h-7 text-ink" />
        </div>
        <h2 className="font-display text-2xl text-ink mb-2">Request submitted!</h2>
        <p className="text-ink2 text-sm">Your account is pending admin approval. Redirecting to login shortly…</p>
      </div>
    )
  }

  return (
    <div className="bg-paper border-[1.5px] border-ink rounded-retro p-8 shadow-hard-lg">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink shadow-hard-sm shadow-retro-sky mb-4">
          <UserPlus className="w-7 h-7 text-retro-mint" />
        </div>
        <h1 className="font-display text-3xl text-ink leading-tight">
          Get <span className="swatch bg-retro-sky">access</span>
        </h1>
        <p className="text-ink2 text-sm mt-2">Submit your registration for admin approval</p>
      </div>

      {error && (
        <div className="flex gap-2 items-center bg-retro-coral border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-white text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { label: 'Email', field: 'email', type: 'email', icon: Mail, placeholder: 'you@example.com' },
          { label: 'Username', field: 'username', type: 'text', icon: User, placeholder: 'johndoe' },
          { label: 'Password', field: 'password', type: 'password', icon: Lock, placeholder: '••••••••' },
          { label: 'Confirm Password', field: 'confirm', type: 'password', icon: Lock, placeholder: '••••••••' },
        ].map(({ label, field, type, icon: Icon, placeholder }) => (
          <div key={field}>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink2 mb-1.5">{label}</label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink2" />
              <input
                type={type}
                required
                value={form[field as keyof typeof form]}
                onChange={update(field)}
                placeholder={placeholder}
                className="w-full bg-bg border-[1.5px] border-ink rounded-2xl py-2.5 pl-10 pr-4 text-ink placeholder-mute font-mono text-sm focus:outline-none focus:shadow-hard-sm transition-shadow"
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="btn-retro w-full flex items-center justify-center gap-2 bg-ink text-retro-mint border-[1.5px] border-ink font-semibold py-3 rounded-full text-sm mt-2 disabled:opacity-70"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-retro-mint/30 border-t-retro-mint rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {loading ? 'Submitting...' : 'Request Access'}
        </button>
      </form>

      <p className="text-center text-ink2 text-sm mt-6">
        Have an account?{' '}
        <Link href="/login" className="font-semibold text-ink hover:bg-retro-lime transition-colors px-1 rounded">
          Sign in →
        </Link>
      </p>
    </div>
  )
}
