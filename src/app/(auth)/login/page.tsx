'use client'
import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, AtSign, LogIn, AlertCircle, Eye } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)
  const [branding, setBranding] = useState({ siteTitle: 'SecureFiles', heroHeading: '', heroSubheading: '', guestEnabled: false })
  const router = useRouter()
  const params = useSearchParams()

  async function resendConfirmation() {
    setResending(true)
    setResendMsg('')
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }),
      })
      const data = await res.json()
      setResendMsg(data.message ?? 'A new confirmation link has been sent.')
    } catch {
      setResendMsg('Could not resend right now. Please try again later.')
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    fetch('/api/public-settings').then(r => r.json()).then(setBranding).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResendMsg('')
    setNeedsConfirm(false)
    setLoading(true)

    // Pre-check account state so we can show a helpful message instead of
    // NextAuth's generic "Configuration" error for unconfirmed/pending users.
    try {
      const pre = await fetch('/api/auth/precheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }),
      }).then(r => r.json())
      if (pre?.status === 'unverified' || pre?.status === 'pending') {
        setError(pre.message ?? 'Please confirm your email before signing in.')
        setNeedsConfirm(pre.status === 'unverified')
        setLoading(false)
        return
      }
    } catch { /* fall through to signIn */ }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(result.error === 'CredentialsSignin'
        ? 'Invalid username/email or password'
        : 'Invalid username/email or password')
    } else {
      router.push('/download')
      router.refresh()
    }
  }

  return (
    <div className="bg-paper border-[1.5px] border-ink rounded-retro p-8 shadow-hard-lg">
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink shadow-hard-sm shadow-retro-coral mb-4">
          <Lock className="w-7 h-7 text-retro-lime" />
        </div>
        <h1 className="font-display text-3xl text-ink leading-tight">
          {branding.siteTitle}
        </h1>
        <p className="text-ink2 text-sm mt-2">
          {branding.heroHeading || 'Sign in to your member portal'}
        </p>
      </div>

      {params.get('error') === 'pending' && (
        <div className="flex gap-2 items-center bg-retro-lemon/40 border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-ink text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Your account is awaiting admin approval.
        </div>
      )}

      {params.get('verify') === 'success' && (
        <div className="flex gap-2 items-center bg-retro-mint/50 border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-ink text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Email confirmed! You can now sign in.
        </div>
      )}
      {params.get('verify') === 'invalid' && (
        <div className="flex gap-2 items-center bg-retro-coral border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-white text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This confirmation link is invalid or has already been used.
        </div>
      )}

      {error && (
        <div className="bg-retro-coral border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-white text-sm shadow-hard-sm">
          <div className="flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
          {needsConfirm && (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={resending}
              className="mt-2 inline-flex items-center gap-1.5 bg-white text-ink border-[1.5px] border-ink rounded-full px-3 py-1 text-xs font-semibold hover:bg-bg2 transition-colors disabled:opacity-60"
            >
              {resending ? 'Sending…' : 'Resend confirmation email'}
            </button>
          )}
        </div>
      )}

      {resendMsg && (
        <div className="flex gap-2 items-center bg-retro-mint/50 border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-ink text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {resendMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-ink2 mb-1.5">Username or Email</label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink2" />
            <input
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="johndoe or you@example.com"
              className="w-full bg-bg border-[1.5px] border-ink rounded-2xl py-2.5 pl-10 pr-4 text-ink placeholder-mute font-mono text-sm focus:outline-none focus:shadow-hard-sm transition-shadow"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-ink2 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink2" />
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg border-[1.5px] border-ink rounded-2xl py-2.5 pl-10 pr-4 text-ink placeholder-mute font-mono text-sm focus:outline-none focus:shadow-hard-sm transition-shadow"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-retro w-full flex items-center justify-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold py-3 rounded-full text-sm disabled:opacity-70"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-retro-lime/30 border-t-retro-lime rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-ink2 text-sm mt-6">
        No account?{' '}
        <Link href="/register" className="font-semibold text-ink hover:bg-retro-lime transition-colors px-1 rounded">
          Request access →
        </Link>
      </p>

      {branding.guestEnabled && (
        <div className="mt-4 pt-4 border-t border-line text-center">
          <Link
            href="/download"
            className="btn-retro inline-flex items-center justify-center gap-2 w-full bg-bg2 text-ink border-[1.5px] border-ink font-medium py-2.5 rounded-full text-sm hover:bg-retro-sky/20 transition-colors"
          >
            <Eye className="w-4 h-4" />
            เข้าชมแบบ Guest (ไม่ต้อง Login)
          </Link>
          <p className="text-[11px] text-mute mt-2">ดูคลิปได้จำกัด — ไม่สามารถ Download</p>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-64 animate-pulse bg-paper border-[1.5px] border-ink rounded-retro" />}>
      <LoginForm />
    </Suspense>
  )
}
