'use client'
import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, AtSign, LogIn, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState({ siteTitle: 'SecureFiles', heroHeading: '', heroSubheading: '' })
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    fetch('/api/public-settings').then(r => r.json()).then(setBranding).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(result.error === 'CredentialsSignin'
        ? 'Invalid username/email or password'
        : result.error)
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

      {error && (
        <div className="flex gap-2 items-center bg-retro-coral border-[1.5px] border-ink rounded-2xl p-3 mb-4 text-white text-sm shadow-hard-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
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
