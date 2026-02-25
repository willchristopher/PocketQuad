'use client'

import React from 'react'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, GraduationCap, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import {
  type AdminAccessLevel,
  type PortalPermission,
} from '@/lib/auth/portalPermissions'

type Role = 'STUDENT' | 'FACULTY'
type StudentStep = 'details' | 'code'
type FacultyStep = 'email' | 'code' | 'password'

type SessionResponse = {
  profile: {
    role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    adminAccessLevel: AdminAccessLevel | null
    portalPermissions: PortalPermission[]
    canPublishCampusAnnouncements: boolean
    onboardingComplete: boolean
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
  const [studentStep, setStudentStep] = React.useState<StudentStep>('details')
  const [facultyStep, setFacultyStep] = React.useState<FacultyStep>('email')
  const [submitting, setSubmitting] = React.useState(false)
  const [resendingCode, setResendingCode] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({})
  const [detectedUniversity, setDetectedUniversity] = React.useState<string | null>(null)
  const [checkingDomain, setCheckingDomain] = React.useState(false)

  const router = useRouter()
  const { refreshProfile } = useAuth()
  const domainCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const isFaculty = role === 'FACULTY'
  const isStudent = role === 'STUDENT'

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole)
    setError(null)
    setFieldErrors({})
    setShowPassword(false)

    if (nextRole === 'FACULTY') {
      setFacultyStep('email')
      setOtpCode('')
      setPassword('')
      return
    }

    setStudentStep('details')
    setOtpCode('')
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
    // Ensure auth context has the fresh profile before navigating
    try { await refreshProfile() } catch { /* continue anyway */ }
    router.push('/onboarding')
    router.refresh()
  }

  const submitStudentDetails = async () => {
    await apiRequest('/api/auth/student/request-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
      },
    })
    setStudentStep('code')
  }

  const submitStudentCode = async () => {
    await apiRequest('/api/auth/student/verify-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
        code: otpCode,
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

      if (studentStep === 'details') {
        await submitStudentDetails()
        return
      }

      await submitStudentCode()
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

  const resendStudentCode = async () => {
    setError(null)
    setFieldErrors({})
    setResendingCode(true)
    try {
      await apiRequest('/api/auth/student/request-otp', {
        method: 'POST',
        body: {
          firstName,
          lastName,
          email,
          password,
        },
      })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend code right now'
      setError(message)
    } finally {
      setResendingCode(false)
    }
  }

  const submitLabel = (() => {
    if (isStudent) {
      if (studentStep === 'details') {
        return submitting ? 'Sending Code...' : 'Create Account'
      }
      return submitting ? 'Verifying Student...' : 'Verify & Finish Sign Up'
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
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/login" className="group inline-flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-lg group-hover:bg-blue-500/30 transition-all" />
                <Image
                  src="/transparentlogo.png"
                  alt="PocketQuad logo"
                  width={48}
                  height={48}
                  className="relative rounded-2xl"
                  priority
                />
              </div>
              <span className="font-display text-3xl font-black tracking-tight text-white">
                Pocket<span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Quad</span>
              </span>
            </Link>
            <p className="text-sm text-blue-200/50">
              {isFaculty ? 'Activate your faculty account.' : 'Create your campus account.'}
            </p>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* Role selector */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('STUDENT')}
                      className={`py-3 rounded-2xl border text-sm font-semibold transition-all ${
                        role === 'STUDENT'
                          ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                          : 'border-white/10 text-white/40 hover:bg-white/5 hover:text-white/60'
                      }`}
                      disabled={submitting || resendingCode}
                    >
                      <Sparkles className="h-3.5 w-3.5 inline mr-1.5" />Student
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleChange('FACULTY')}
                      className={`py-3 rounded-2xl border text-sm font-semibold transition-all ${
                        role === 'FACULTY'
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                          : 'border-white/10 text-white/40 hover:bg-white/5 hover:text-white/60'
                      }`}
                      disabled={submitting || resendingCode}
                    >
                      <GraduationCap className="h-3.5 w-3.5 inline mr-1.5" />Faculty
                    </button>
                  </div>
                </div>

                {/* Faculty step indicator */}
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
                            className={`rounded-xl border px-2 py-1.5 text-center text-[11px] font-semibold transition-all ${
                              active
                                ? 'border-blue-400/50 bg-blue-500/15 text-blue-300'
                                : completed
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                  : 'border-white/10 text-white/30'
                            }`}
                          >
                            Step {stepNumber}
                          </div>
                        )
                      })}
                    </div>
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2">
                      <p className="text-xs text-blue-200/70">
                        {facultyStep === 'email' && 'Enter your university email to get started.'}
                        {facultyStep === 'code' && 'A one-time passcode has been sent to your email.'}
                        {facultyStep === 'password' && 'Choose a password for your account.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Student OTP step info */}
                {isStudent && studentStep === 'code' && (
                  <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2">
                    <p className="text-xs text-blue-200/70">
                      Enter the one-time passcode sent to your university email to verify your account.
                    </p>
                  </div>
                )}

                {/* Student name fields */}
                {isStudent && studentStep === 'details' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">First Name</label>
                      <div className={`flex items-center gap-2.5 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20 ${fieldErrors.firstName ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}>
                        <User className="w-4 h-4 text-blue-400/50 shrink-0" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Alex"
                          className="bg-transparent text-sm text-white outline-none w-full placeholder:text-white/20"
                          required
                          disabled={submitting}
                        />
                      </div>
                      {fieldErrors.firstName && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.firstName[0]}</p>}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">Last Name</label>
                      <div className={`flex items-center gap-2.5 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20 ${fieldErrors.lastName ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="Johnson"
                          className="bg-transparent text-sm text-white outline-none w-full placeholder:text-white/20"
                          required
                          disabled={submitting}
                        />
                      </div>
                      {fieldErrors.lastName && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.lastName[0]}</p>}
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">University Email</label>
                  <div className={`flex items-center gap-2.5 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20 ${fieldErrors.email ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}>
                    <Mail className="w-4 h-4 text-blue-400/50 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value.toLowerCase())}
                      placeholder="you@university.edu"
                      className="bg-transparent text-sm text-white outline-none w-full placeholder:text-white/20"
                      required
                      autoComplete="email"
                      disabled={
                        submitting ||
                        (isFaculty && facultyStep !== 'email') ||
                        (isStudent && studentStep !== 'details')
                      }
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-red-400">{fieldErrors.email[0]}</p>
                  )}
                  {(detectedUniversity || checkingDomain) && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-400/20 px-3 py-2">
                      <GraduationCap className="h-4 w-4 text-blue-400 shrink-0" />
                      {checkingDomain ? (
                        <span className="text-xs text-blue-200/50">Checking university...</span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-300">
                          You&apos;ll be joining {detectedUniversity}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* OTP field */}
                {((isFaculty && facultyStep === 'code') || (isStudent && studentStep === 'code')) && (
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">One-Time Passcode</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.trim())}
                      placeholder="Enter code"
                      className={`w-full rounded-2xl border bg-white/[0.03] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/20 transition-all focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 ${fieldErrors.code ? 'border-red-500/50' : 'border-white/10'}`}
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      disabled={submitting || resendingCode}
                    />
                    {fieldErrors.code && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.code[0]}</p>}
                    <button
                      type="button"
                      onClick={isFaculty ? resendFacultyCode : resendStudentCode}
                      className="mt-2 text-xs font-semibold text-blue-400/70 hover:text-blue-300 transition-colors disabled:opacity-70"
                      disabled={submitting || resendingCode}
                    >
                      {resendingCode ? 'Resending code...' : 'Resend code'}
                    </button>
                  </div>
                )}

                {/* Password field */}
                {((isStudent && studentStep === 'details') || (isFaculty && facultyStep === 'password')) && (
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.22em] font-bold text-blue-200/40 block mb-2">Password</label>
                    <div className={`flex items-center gap-2.5 rounded-2xl border bg-white/[0.03] px-4 py-3.5 transition-all focus-within:border-blue-400/50 focus-within:ring-2 focus-within:ring-blue-400/20 ${fieldErrors.password ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}>
                      <Lock className="w-4 h-4 text-blue-400/50 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        className="bg-transparent text-sm text-white outline-none w-full placeholder:text-white/20"
                        required
                        autoComplete="new-password"
                        disabled={submitting}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white/60 transition-colors" disabled={submitting}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.password[0]}</p>}
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 backdrop-blur">
                    <p className="text-xs font-medium text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || resendingCode}
                  className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {submitLabel}
                      </>
                    ) : (
                      <>
                        {submitLabel} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6 text-center">
                <p className="text-sm text-white/40">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
