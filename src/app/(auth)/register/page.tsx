'use client'

import React from 'react'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import {
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'
import { getHomeForRole } from '@/lib/auth/routing'

type Role = 'STUDENT' | 'FACULTY'
type FacultyStep = 'email' | 'code' | 'password'

type SessionResponse = {
  profile: {
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    adminAccessLevel: AdminAccessLevel | null
    portalPermissions: PortalPermission[]
    canPublishCampusAnnouncements: boolean
  } | null
}

type CheckUniversityResponse = {
  university: { id: string; name: string } | null
}

function getFacultyStepNumber(step: FacultyStep) {
  if (step === 'email') return 1
  if (step === 'code') return 2
  return 3
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [otpCode, setOtpCode] = React.useState('')
  const [role, setRole] = React.useState<Role>('STUDENT')
  const [facultyStep, setFacultyStep] = React.useState<FacultyStep>('email')
  const [submitting, setSubmitting] = React.useState(false)
  const [resendingCode, setResendingCode] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({})
  const [detectedUniversity, setDetectedUniversity] = React.useState<string | null>(null)
  const [checkingDomain, setCheckingDomain] = React.useState(false)

  const router = useRouter()
  const domainCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isFaculty = role === 'FACULTY'

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole)
    setError(null)
    setFieldErrors({})
    setShowPassword(false)

    if (nextRole === 'FACULTY') {
      setFacultyStep('email')
      setOtpCode('')
      setPassword('')
    }
  }

  React.useEffect(() => {
    if (domainCheckTimer.current) clearTimeout(domainCheckTimer.current)

    const atIndex = email.lastIndexOf('@')
    if (atIndex < 0 || atIndex === email.length - 1) {
      setDetectedUniversity(null)
      return
    }

    const domain = email.slice(atIndex + 1).toLowerCase()
    if (!domain.includes('.') || domain.length < 4) {
      setDetectedUniversity(null)
      return
    }

    setCheckingDomain(true)
    domainCheckTimer.current = setTimeout(async () => {
      try {
        const result = await apiRequest<CheckUniversityResponse>(
          `/api/auth/check-university?domain=${encodeURIComponent(domain)}`,
        )
        setDetectedUniversity(result.university?.name ?? null)
      } catch {
        setDetectedUniversity(null)
      } finally {
        setCheckingDomain(false)
      }
    }, 400)

    return () => {
      if (domainCheckTimer.current) clearTimeout(domainCheckTimer.current)
    }
  }, [email])

  const redirectToSessionHome = async () => {
    const session = await apiRequest<SessionResponse>('/api/auth/session')
    router.push(getHomeForRole(session.profile))
    router.refresh()
  }

  const submitStudentRegistration = async () => {
    await apiRequest('/api/auther/register', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
        role: 'STUDENT',
      },
    })

    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
      },
    })

    await redirectToSessionHome()
  }

  const submitFacultyEmail = async () => {
    await apiRequest('/api/auth/faculty/request-otp', {
      method: 'POST',
      body: { email },
    })
    setFacultyStep('code')
  }

  const submitFacultyCode = async () => {
    await apiRequest('/api/auth/faculty/verify-otp', {
      method: 'POST',
      body: {
        email,
        code: otpCode,
      },
    })
    setFacultyStep('password')
  }

  const submitFacultyPassword = async () => {
    await apiRequest('/api/auth/faculty/set-password', {
      method: 'POST',
      body: {
        password,
      },
    })
    await redirectToSessionHome()
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      if (isFaculty) {
        if (facultyStep === 'email') {
          await submitFacultyEmail()
          return
        }

        if (facultyStep === 'code') {
          await submitFacultyCode()
          return
        }

        await submitFacultyPassword()
        return
      }

      await submitStudentRegistration()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
        const issues = err.details as { fieldErrors?: Record<string, string[]> } | undefined
        if (issues?.fieldErrors) {
          setFieldErrors(issues.fieldErrors)
        }
      } else {
        setError('Unable to complete this sign up step right now')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resendFacultyCode = async () => {
    setError(null)
    setFieldErrors({})
    setResendingCode(true)
    try {
      await apiRequest('/api/auth/faculty/request-otp', {
        method: 'POST',
        body: { email },
      })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend code right now'
      setError(message)
    } finally {
      setResendingCode(false)
    }
  }

  const submitLabel = (() => {
    if (!isFaculty) {
      return submitting ? 'Creating Account...' : 'Create Account'
    }
    if (facultyStep === 'email') {
      return submitting ? 'Sending Code...' : 'Send One-Time Code'
    }
    if (facultyStep === 'code') {
      return submitting ? 'Validating...' : 'Validate Code'
    }
    return submitting ? 'Saving Password...' : 'Set Password'
  })()

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
          <p className="text-sm text-muted-foreground mt-2">
            {isFaculty
              ? 'Activate your faculty account.'
              : 'Create your campus account.'}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-xl shadow-black/5">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange('STUDENT')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'STUDENT'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:bg-muted'
                  }`}
                  disabled={submitting || resendingCode}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('FACULTY')}
                  className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                    role === 'FACULTY'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:bg-muted'
                  }`}
                  disabled={submitting || resendingCode}
                >
                  Faculty
                </button>
              </div>
            </div>

            {isFaculty && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((stepNumber) => {
                    const currentStep = getFacultyStepNumber(facultyStep)
                    const active = stepNumber === currentStep
                    const completed = stepNumber < currentStep
                    return (
                      <div
                        key={stepNumber}
                        className={`rounded-lg border px-2 py-1 text-center text-[11px] font-semibold ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : completed
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                              : 'border-border/60 text-muted-foreground'
                        }`}
                      >
                        Step {stepNumber}
                      </div>
                    )
                  })}
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2">
                  <p className="text-xs text-foreground">
                    {facultyStep === 'email' && 'Enter the associated university email with this account to get started.'}
                    {facultyStep === 'code' && 'Validation is required. A one time passcode has been sent to the associated email, enter the associated code here.'}
                    {facultyStep === 'password' && 'Enter the password you would like for your account.'}
                  </p>
                </div>
              </div>
            )}

            {!isFaculty && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">First Name</label>
                  <div className={`flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all ${fieldErrors.firstName ? 'border-red-500/60' : 'border-border/60'}`}>
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Alex"
                      className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                      required
                      disabled={submitting}
                    />
                  </div>
                  {fieldErrors.firstName && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.firstName[0]}</p>}
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">Last Name</label>
                  <div className={`flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all ${fieldErrors.lastName ? 'border-red-500/60' : 'border-border/60'}`}>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Johnson"
                      className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                      required
                      disabled={submitting}
                    />
                  </div>
                  {fieldErrors.lastName && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.lastName[0]}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">University Email</label>
              <div className={`flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all ${fieldErrors.email ? 'border-red-500/60' : 'border-border/60'}`}>
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value.toLowerCase())}
                  placeholder="you@university.edu"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                  required
                  autoComplete="email"
                  disabled={submitting || (isFaculty && facultyStep !== 'email')}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.email[0]}</p>
              )}
              {(detectedUniversity || checkingDomain) && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-2">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                  {checkingDomain ? (
                    <span className="text-xs text-muted-foreground">Checking university...</span>
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      You&apos;ll be joining {detectedUniversity}
                    </span>
                  )}
                </div>
              )}
            </div>

            {isFaculty && facultyStep === 'code' && (
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">One-Time Passcode</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.trim())}
                  placeholder="Enter code"
                  className={`w-full rounded-xl border bg-muted/20 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground/50 transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/30 ${fieldErrors.code ? 'border-red-500/60' : 'border-border/60'}`}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  disabled={submitting || resendingCode}
                />
                {fieldErrors.code && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.code[0]}</p>}
                <button
                  type="button"
                  onClick={resendFacultyCode}
                  className="mt-2 text-xs font-semibold text-primary hover:underline disabled:opacity-70"
                  disabled={submitting || resendingCode}
                >
                  {resendingCode ? 'Resending code...' : 'Resend code'}
                </button>
              </div>
            )}

            {(!isFaculty || facultyStep === 'password') && (
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">Password</label>
                <div className={`flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all ${fieldErrors.password ? 'border-red-500/60' : 'border-border/60'}`}>
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors" disabled={submitting}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.password[0]}</p>}
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || resendingCode}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all disabled:opacity-70"
            >
              {submitLabel} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/60 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
