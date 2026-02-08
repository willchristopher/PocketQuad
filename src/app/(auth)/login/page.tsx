'use client'

import React, { Suspense } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { apiRequest, ApiClientError } from '@/lib/api/client'
import { getHomeForRole, getSafeRedirectTarget } from '@/lib/auth/routing'

type SessionResponse = {
  profile: {
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
  } | null
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
        },
      })

      const session = await apiRequest<SessionResponse>('/api/auth/session')
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'))
      const destination = redirectTarget ?? getHomeForRole(session.profile?.role)

      router.push(destination)
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to sign in right now'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-lg font-extrabold text-primary-foreground">Q</span>
            </div>
            <span className="font-display text-2xl font-extrabold tracking-tight">MyQuad</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Welcome back! Sign in to continue.</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-xl shadow-black/5">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">Email</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@university.edu"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                  required
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors" disabled={submitting}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-xs text-primary font-semibold hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all disabled:opacity-70">
              {submitting ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/60 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
