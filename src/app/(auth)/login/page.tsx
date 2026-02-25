'use client'

import React, { Suspense } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { apiRequest, ApiClientError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import {
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { getHomeForRole, getSafeRedirectTarget } from '@/lib/auth/routing'

type SessionResponse = {
  profile: {
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    adminAccessLevel: AdminAccessLevel | null
    portalPermissions: PortalPermission[]
    canPublishCampusAnnouncements: boolean
    onboardingComplete: boolean
  } | null
}

const FEATURE_CHIPS = [
  'Campus Map', 'AI Advisor', 'Office Hours', 'Clubs', 'Events',
  'Chatroom', 'Notifications', 'Calendar', 'Faculty Directory',
]

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
  const [rememberMe, setRememberMe] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [focusedField, setFocusedField] = React.useState<string | null>(null)
  const [activeFeature, setActiveFeature] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshProfile } = useAuth()

  React.useEffect(() => {
    const rememberedEmail = window.localStorage.getItem('pocketquad:last-login-email')
    if (rememberedEmail) setEmail(rememberedEmail)
  }, [])

  // Cycle through feature chips with smooth animation
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveFeature((prev) => (prev + 1) % FEATURE_CHIPS.length)
        setIsTransitioning(false)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      })

      if (rememberMe) {
        window.localStorage.setItem('pocketquad:last-login-email', email)
      } else {
        window.localStorage.removeItem('pocketquad:last-login-email')
      }

      const session = await apiRequest<SessionResponse>('/api/auth/session')
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'))

      if (session.profile && !session.profile.onboardingComplete) {
        try { await refreshProfile() } catch { /* continue anyway */ }
        router.push('/onboarding')
        router.refresh()
        return
      }

      const destination = redirectTarget ?? getHomeForRole(session.profile)
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
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-indigo-500/[0.08] blur-[150px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:gap-20 lg:px-10">
        {/* Left - Branding */}
        <section className="flex w-full flex-col items-center text-center lg:w-1/2 lg:items-start lg:text-left">
          <Link href="/login" className="group inline-flex items-center gap-3 mb-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-lg group-hover:bg-blue-500/30 transition-all" />
              <Image
                src="/transparentlogo.png"
                alt="PocketQuad logo"
                width={56}
                height={56}
                className="relative rounded-2xl"
                priority
              />
            </div>
            <span className="font-display text-4xl font-black tracking-tight text-white">
              Pocket<span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Quad</span>
            </span>
          </Link>

          <h1 className="text-4xl font-display font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your campus,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              your way.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-blue-100/60">
            One login unlocks everything — AI advisor, live chatrooms, office hours, events, and more.
          </p>

          {/* Animated feature rotator */}
          <div className="mt-8 flex items-center gap-3 justify-center lg:justify-start">
            <span className="text-xs font-medium text-blue-200/40 uppercase tracking-widest shrink-0">Explore</span>
            <div className="relative h-9 overflow-hidden">
              <div
                className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm transition-all duration-400 ease-in-out ${
                  isTransitioning
                    ? 'opacity-0 translate-y-3 blur-[2px]'
                    : 'opacity-100 translate-y-0 blur-0'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400/80" />
                <span className="text-sm font-medium text-blue-100/90 whitespace-nowrap">
                  {FEATURE_CHIPS[activeFeature]}
                </span>
              </div>
            </div>
            {/* Progress dots */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              {FEATURE_CHIPS.map((_, i) => (
                <span
                  key={i}
                  className={`block h-1 rounded-full transition-all duration-500 ${
                    i === activeFeature
                      ? 'w-4 bg-blue-400/70'
                      : 'w-1 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Right - Login Card */}
        <section className="w-full lg:w-[440px]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
            {/* Glow effect */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">Welcome back</h2>
              <p className="mt-1.5 text-sm text-blue-200/50">Sign in to continue to your campus hub.</p>

              <form className="mt-7 space-y-5" onSubmit={onSubmit}>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/40">Email</label>
                  <div className={`flex items-center gap-3 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all ${
                    focusedField === 'email'
                      ? 'border-blue-400/50 ring-2 ring-blue-400/20 bg-white/[0.06]'
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    <Mail className="h-4 w-4 shrink-0 text-blue-400/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="you@university.edu"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                      required
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/40">Password</label>
                  <div className={`flex items-center gap-3 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all ${
                    focusedField === 'password'
                      ? 'border-blue-400/50 ring-2 ring-blue-400/20 bg-white/[0.06]'
                      : 'border-white/10 hover:border-white/20'
                  }`}>
                    <Lock className="h-4 w-4 shrink-0 text-blue-400/50" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                      required
                      autoComplete="current-password"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-white/30 transition-colors hover:text-white/60"
                      disabled={submitting}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 backdrop-blur">
                    <p className="text-xs font-medium text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2.5 text-xs text-white/40 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={submitting}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-5 rounded-lg border border-white/15 bg-white/5 transition-all peer-checked:border-blue-400/50 peer-checked:bg-blue-500/20" />
                      <svg className="absolute top-0.5 left-0.5 h-4 w-4 text-blue-400 opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                      </svg>
                    </div>
                    <span className="group-hover:text-white/60 transition-colors">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-blue-400/70 hover:text-blue-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6 text-center space-y-2.5">
                <p className="text-sm text-white/40">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    Sign up
                  </Link>
                </p>
                <p className="text-xs text-white/30">
                  Faculty first time?{' '}
                  <Link href="/register" className="font-semibold text-cyan-400/70 hover:text-cyan-300 transition-colors">
                    Activate account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
