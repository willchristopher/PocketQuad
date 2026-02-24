'use client'

import React, { Suspense } from 'react'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { apiRequest, ApiClientError } from '@/lib/api/client'
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
  } | null
}

const SLOT_KEYWORDS = [
  'campus news',
  'faculty office hours',
  'student chatroom',
  'personal AI advisor',
  'your own event calendar',
  'building directions',
  'accessibility updates',
  'campus closures',
  'dining locations',
  'facility hours',
  'faculty information',
  'list of clubs',
  'directories',
] as const

const SLOT_DURATION_MS = 8000
const SLOT_ROW_HEIGHT_PX = 64
const SLOT_CYCLES = 3
const SLOT_FADE_OUT_MS = 400

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
  const [slotOffset, setSlotOffset] = React.useState(0)
  const [slotSettled, setSlotSettled] = React.useState(false)
  const [slotFadingOut, setSlotFadingOut] = React.useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const slotSequence = React.useMemo(() => {
    const loops = Array.from({ length: SLOT_CYCLES }, () => SLOT_KEYWORDS).flat()
    return [...loops, 'it all.']
  }, [])

  React.useEffect(() => {
    const rememberedEmail = window.localStorage.getItem('myquad:last-login-email')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
    }
  }, [])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  React.useEffect(() => {
    const maxOffset = (slotSequence.length - 1) * SLOT_ROW_HEIGHT_PX
    if (prefersReducedMotion) {
      setSlotOffset(maxOffset)
      setSlotSettled(true)
      setSlotFadingOut(false)
      return
    }

    setSlotSettled(false)
    setSlotFadingOut(false)
    setSlotOffset(0)
    const frame = window.requestAnimationFrame(() => {
      setSlotOffset(maxOffset)
    })
    const fadeTimer = window.setTimeout(() => {
      setSlotFadingOut(true)
    }, SLOT_DURATION_MS)
    const settleTimer = window.setTimeout(() => {
      setSlotSettled(true)
      setSlotFadingOut(false)
    }, SLOT_DURATION_MS + SLOT_FADE_OUT_MS)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(settleTimer)
    }
  }, [prefersReducedMotion, slotSequence.length])

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
          rememberMe,
        },
      })

      if (rememberMe) {
        window.localStorage.setItem('myquad:last-login-email', email)
      } else {
        window.localStorage.removeItem('myquad:last-login-email')
      }

      const session = await apiRequest<SessionResponse>('/api/auth/session')
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'))
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
    <div className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_65%,rgba(6,182,212,0.16),transparent_40%)]" />
        <div className="absolute -top-24 left-[15%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-20 right-[10%] h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:items-center lg:gap-14">
        <section className="flex w-full flex-col items-center text-center lg:w-1/2 lg:items-start lg:text-left">
          <Link href="/login" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <span className="text-lg font-extrabold text-primary-foreground">Q</span>
            </div>
            <span className="font-display text-3xl font-extrabold tracking-tight">MyQuad</span>
          </Link>

          <h1 className="mt-6 text-3xl font-display font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            One login. Infinite opportunity.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            One account unlocks your campus tools, updates, and connections in seconds.
          </p>

          <div className="mt-8 w-full max-w-xl rounded-3xl border border-border/70 bg-card/90 p-4 shadow-2xl shadow-black/5 backdrop-blur sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">MyQuad Highlights</p>
            <div className="mt-3 flex flex-col gap-3 items-center lg:items-start">
              <div className={`flex w-full justify-center gap-2 lg:justify-start ${slotSettled ? 'items-baseline' : 'items-center'}`}>
                <p className="shrink-0 text-xl font-display font-bold leading-none tracking-tight text-foreground sm:text-2xl">MyQuad has</p>
                {slotSettled ? (
                  <span className="text-xl font-display font-extrabold leading-none tracking-tight text-primary sm:text-2xl">it all.</span>
                ) : (
                  <div
                    className={`relative h-16 min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary/25 bg-background transition-opacity duration-500 ${
                      slotFadingOut ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-background to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-background to-transparent" />
                    <div
                      className="will-change-transform subpixel-antialiased [transform:translateZ(0)]"
                      style={{
                        transform: `translate3d(0, -${slotOffset}px, 0)`,
                        transition: prefersReducedMotion
                          ? 'none'
                          : `transform ${SLOT_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                        backfaceVisibility: 'hidden',
                      }}
                    >
                      {slotSequence.map((phrase, index) => (
                        <div
                          key={`${phrase}-${index}`}
                          className="flex h-16 items-center px-4 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                        >
                          {phrase}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground sm:text-base lg:text-left">Everything students and faculty need, all in one place.</p>
            </div>
          </div>
        </section>

        <section className="w-full lg:w-1/2">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl shadow-black/10 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-extrabold tracking-tight text-foreground">Sign in</h2>
              <p className="mt-1 text-sm text-muted-foreground">Use your email and password to continue.</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Email</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@university.edu"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    required
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Password</label>
                <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/30">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    required
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    disabled={submitting}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={submitting}
                  />
                  Remember email
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:shadow-primary/35 disabled:opacity-70"
              >
                {submitting ? 'Signing In...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 border-t border-border/60 pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Sign up
                </Link>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Faculty first-time setup?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Activate faculty account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
