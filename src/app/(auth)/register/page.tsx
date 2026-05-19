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
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted!</h2>
          <p className="text-slate-300 text-sm">Your account is pending admin approval. You&apos;ll be redirected to login shortly.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-400/30 rounded-2xl mb-4">
            <UserPlus className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Request Access</h1>
          <p className="text-slate-400 text-sm mt-1">Submit your registration for admin approval</p>
        </div>

        {error && (
          <div className="flex gap-2 items-center bg-red-500/20 border border-red-400/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Email', field: 'email', type: 'email', icon: Mail, placeholder: 'you@example.com' },
            { label: 'Username', field: 'username', type: 'text', icon: User, placeholder: 'johndoe' },
            { label: 'Password', field: 'password', type: 'password', icon: Lock, placeholder: '••••••••' },
            { label: 'Confirm Password', field: 'confirm', type: 'password', icon: Lock, placeholder: '••••••••' },
          ].map(({ label, field, type, icon: Icon, placeholder }) => (
            <div key={field}>
              <label className="block text-sm text-slate-300 mb-1.5">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={type}
                  required
                  value={form[field as keyof typeof form]}
                  onChange={update(field)}
                  placeholder={placeholder}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400/50 transition"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? 'Submitting...' : 'Request Access'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
