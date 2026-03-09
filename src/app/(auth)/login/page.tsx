'use client'

import React, { Suspense } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  AuthField,
  AuthFieldShell,
  AuthMessage,
} from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
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

  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshSession } = useAuth()

  React.useEffect(() => {
    const rememberedEmail = window.localStorage.getItem('pocketquad:last-login-email')
    if (rememberedEmail) setEmail(rememberedEmail)
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

      const session = (await refreshSession()) ?? (await apiRequest<SessionResponse>('/api/auth/session'))
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'))

      if (session.profile && !session.profile.onboardingComplete) {
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
    <div className="min-h-screen bg-[#050c18] text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
        <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#081223_0%,#0c1930_52%,#0a1730_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(77,124,255,0.28),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(0,82,255,0.2),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(77,124,255,0.18),transparent_32%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,_rgba(255,255,255,0.7)_1px,_transparent_1px)] [background-size:30px_30px]" />
          <div className="absolute inset-x-0 bottom-0 h-[18rem] bg-gradient-to-t from-[#050c18] via-[#050c18]/30 to-transparent" />

          <div className="relative z-10 flex min-h-screen flex-col px-10 pb-0 pt-10 xl:px-14 xl:pt-12">
            <Link
              href="/login"
              className="inline-flex w-fit items-center text-[2.4rem] font-semibold leading-none text-white transition-opacity hover:opacity-85"
            >
              Pocket<span className="gradient-text">Quad</span>.
            </Link>

            <div className="mt-20 max-w-[30rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                Move with purpose
              </p>
              <h1 className="mt-6 text-balance text-[3.5rem] leading-[0.95] tracking-[-0.04em] text-white xl:text-[4.25rem]">
                Show up ready.
                <br />
                Stay in sync.
                <br />
                Own the quad.
              </h1>
              <div className="mt-8 h-px w-36 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
              <p className="mt-8 max-w-md text-base leading-7 text-slate-300">
                Keep classes, campus updates, office hours, and student tools within reach the
                moment you sign in.
              </p>
            </div>

            <div className="relative mt-auto flex min-h-[24rem] items-end justify-center overflow-hidden">
              <div className="absolute bottom-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
              <div className="animate-logo-emerge relative -mb-[24%] aspect-[843/1029] w-[18rem] opacity-0 xl:w-[22rem]">
                <Image
                  src="/transparentlogo.png"
                  alt=""
                  fill
                  priority
                  aria-hidden="true"
                  className="object-contain object-bottom drop-shadow-[0_34px_60px_rgba(0,82,255,0.24)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#071120_0%,#0a1730_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(77,124,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,82,255,0.18),transparent_30%)]" />

          <div className="relative z-10 w-full max-w-[30rem]">
            <div className="mb-8 lg:hidden">
              <Link
                href="/login"
                className="inline-flex items-center text-[2.2rem] font-semibold leading-none text-white transition-opacity hover:opacity-85"
              >
                Pocket<span className="gradient-text">Quad</span>.
              </Link>
            </div>

            <section className="surface-card-lg relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,21,40,0.94)_0%,rgba(8,16,31,0.98)_100%)] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8 [&_label]:!text-slate-300">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

              <div className="relative">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Student + Faculty Access
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                      Welcome back
                    </p>
                    <h2 className="text-balance text-[2.5rem] leading-[0.98] tracking-[-0.04em] text-white sm:text-[2.9rem]">
                      Pick up where you left off.
                    </h2>
                    <p className="text-sm leading-6 text-slate-300 sm:text-[15px]">
                      Sign in to get back to everything happening across your campus experience.
                    </p>
                  </div>
                </div>

                <form className="mt-8 space-y-5" onSubmit={onSubmit}>
                  <AuthField label="University Email">
                    <AuthFieldShell
                      icon={<Mail className="h-4 w-4" />}
                      className="border-white/10 bg-white/[0.03] hover:border-primary/30 focus-within:border-primary/45 focus-within:bg-white/[0.05] focus-within:ring-primary/20"
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@university.edu"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        required
                        autoComplete="email"
                        disabled={submitting}
                      />
                    </AuthFieldShell>
                  </AuthField>

                  <AuthField
                    label="Password"
                    hint={
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-sky-300 transition-colors hover:text-sky-200"
                      >
                        Forgot password?
                      </Link>
                    }
                  >
                    <AuthFieldShell
                      icon={<Lock className="h-4 w-4" />}
                      className="border-white/10 bg-white/[0.03] hover:border-primary/30 focus-within:border-primary/45 focus-within:bg-white/[0.05] focus-within:ring-primary/20"
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="text-slate-400 transition-colors hover:text-white"
                          disabled={submitting}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        required
                        autoComplete="current-password"
                        disabled={submitting}
                      />
                    </AuthFieldShell>
                  </AuthField>

                  {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}

                  <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      disabled={submitting}
                      className="h-4 w-4 rounded border-slate-500 bg-transparent text-primary focus:ring-primary/20"
                    />
                    <span>Remember me</span>
                  </label>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="xl"
                    className="w-full gap-2"
                    disabled={submitting}
                  >
                    {submitting ? 'Signing in...' : 'Sign in'}
                    {submitting ? null : <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-300">
                  <p>
                    Do not have an account?{' '}
                    <Link
                      href="/register"
                      className="font-semibold text-sky-300 transition-colors hover:text-sky-200"
                    >
                      Sign up
                    </Link>
                  </p>
                  <p className="mt-2 text-xs">
                    Faculty first time?{' '}
                    <Link
                      href="/register"
                      className="font-semibold text-sky-300 transition-colors hover:text-sky-200"
                    >
                      Activate account
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}
