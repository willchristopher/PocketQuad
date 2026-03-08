'use client'

import React, { Suspense } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  AppBrand,
  AuthCard,
  AuthField,
  AuthFieldShell,
  AuthMessage,
  AuthShell,
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
  const { refreshProfile } = useAuth()

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

      const session = await apiRequest<SessionResponse>('/api/auth/session')
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'))

      if (session.profile && !session.profile.onboardingComplete) {
        try {
          await refreshProfile()
        } catch {
          // Continue anyway so onboarding can load.
        }
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
    <AuthShell>
      <div className="space-y-6">
        <AppBrand />

        <AuthCard
          badge="Student + Faculty Access"
          title={
            <>
              Sign in to your <span className="gradient-text">campus hub</span>
            </>
          }
          description="Access your schedule, faculty tools, events, office hours, and campus resources from one place."
          footer={
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                Do not have an account?{' '}
                <Link href="/register" className="font-semibold text-primary transition-colors hover:text-primary/80">
                  Sign up
                </Link>
              </p>
              <p className="text-xs">
                Faculty first time?{' '}
                <Link href="/register" className="font-semibold text-primary transition-colors hover:text-primary/80">
                  Activate account
                </Link>
              </p>
            </div>
          }
        >
          <form className="space-y-5" onSubmit={onSubmit}>
            <AuthField label="University Email">
              <AuthFieldShell icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@university.edu"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
              </AuthFieldShell>
            </AuthField>

            <AuthField
              label="Password"
              hint={
                <Link href="/forgot-password" className="text-xs font-medium text-primary transition-colors hover:text-primary/80">
                  Forgot password?
                </Link>
              }
            >
              <AuthFieldShell
                icon={<Lock className="h-4 w-4" />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    disabled={submitting}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  required
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </AuthFieldShell>
            </AuthField>

            {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span>Remember me</span>
              </label>
            </div>

            <Button type="submit" variant="gradient" size="xl" className="w-full gap-2" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  )
}
