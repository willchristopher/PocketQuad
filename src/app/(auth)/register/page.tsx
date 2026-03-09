'use client'

import React from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  AppBrand,
  AuthCard,
  AuthField,
  AuthFieldShell,
  AuthMessage,
  AuthShell,
} from '@/components/auth/AuthShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'

type Role = 'STUDENT' | 'FACULTY'
type StudentStep = 'details' | 'code'
type FacultyStep = 'email' | 'code' | 'password'

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
  const { refreshSession } = useAuth()
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
    try {
      await refreshSession()
    } catch {
      // Continue anyway so onboarding can load.
    }
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
        return submitting ? 'Sending code...' : 'Create account'
      }
      return submitting ? 'Verifying student...' : 'Verify and finish sign up'
    }
    if (facultyStep === 'email') {
      return submitting ? 'Sending code...' : 'Send one-time code'
    }
    if (facultyStep === 'code') {
      return submitting ? 'Validating...' : 'Validate code'
    }
    return submitting ? 'Saving password...' : 'Set password'
  })()

  const title = isFaculty ? (
    <>
      Activate your <span className="gradient-text">faculty access</span>
    </>
  ) : (
    <>
      Create your <span className="gradient-text">campus account</span>
    </>
  )

  const description = isFaculty
    ? 'Verify your university email, validate the one-time code, and set a password to unlock faculty tools.'
    : 'Create your account with your university email, then confirm it with a one-time passcode.'

  return (
    <AuthShell>
      <div className="space-y-6">
        <AppBrand />

        <AuthCard
          badge={isFaculty ? 'Faculty Activation' : 'Student Sign Up'}
          title={title}
          description={description}
          footer={
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
                Sign in
              </Link>
            </p>
          }
        >
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange('STUDENT')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  role === 'STUDENT'
                    ? 'border-primary/25 bg-primary/[0.06] shadow-accent'
                    : 'border-border/70 bg-card/75 hover:border-primary/15 hover:shadow-surface'
                }`}
                disabled={submitting || resendingCode}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">Student</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Create a new campus account.</p>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('FACULTY')}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  role === 'FACULTY'
                    ? 'border-primary/25 bg-primary/[0.06] shadow-accent'
                    : 'border-border/70 bg-card/75 hover:border-primary/15 hover:shadow-surface'
                }`}
                disabled={submitting || resendingCode}
              >
                <GraduationCap className="h-4 w-4 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">Faculty</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Activate the account your school prepared.</p>
              </button>
            </div>

            {isFaculty ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((stepNumber) => {
                    const currentStep = getFacultyStepNumber(facultyStep)
                    const active = stepNumber === currentStep
                    const completed = stepNumber < currentStep

                    return (
                      <div
                        key={stepNumber}
                        className={`rounded-full border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          active
                            ? 'border-primary/25 bg-primary/[0.06] text-primary'
                            : completed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'border-border/70 bg-card/80 text-muted-foreground'
                        }`}
                      >
                        Step {stepNumber}
                      </div>
                    )
                  })}
                </div>

                <AuthMessage>
                  {facultyStep === 'email' && 'Enter your university email to receive your activation code.'}
                  {facultyStep === 'code' && 'We sent a one-time passcode to your inbox. Enter it below to continue.'}
                  {facultyStep === 'password' && 'Create a password for future sign-ins.'}
                </AuthMessage>
              </div>
            ) : null}

            {isStudent && studentStep === 'code' ? (
              <AuthMessage>
                Enter the one-time passcode sent to your university email to finish creating your account.
              </AuthMessage>
            ) : null}

            {isStudent && studentStep === 'details' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <AuthField label="First Name" error={fieldErrors.firstName?.[0]}>
                  <AuthFieldShell icon={<User className="h-4 w-4" />} invalid={!!fieldErrors.firstName?.[0]}>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Alex"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                      required
                      disabled={submitting}
                    />
                  </AuthFieldShell>
                </AuthField>

                <AuthField label="Last Name" error={fieldErrors.lastName?.[0]}>
                  <AuthFieldShell invalid={!!fieldErrors.lastName?.[0]}>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Johnson"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                      required
                      disabled={submitting}
                    />
                  </AuthFieldShell>
                </AuthField>
              </div>
            ) : null}

            <AuthField label="University Email" error={fieldErrors.email?.[0]}>
              <AuthFieldShell icon={<Mail className="h-4 w-4" />} invalid={!!fieldErrors.email?.[0]}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value.toLowerCase())}
                  placeholder="you@university.edu"
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  required
                  autoComplete="email"
                  disabled={
                    submitting ||
                    (isFaculty && facultyStep !== 'email') ||
                    (isStudent && studentStep !== 'details')
                  }
                />
              </AuthFieldShell>
            </AuthField>

            {detectedUniversity || checkingDomain ? (
              <AuthMessage>
                {checkingDomain ? (
                  'Checking your university domain...'
                ) : (
                  <>
                    You&apos;ll be joining <span className="font-semibold text-foreground">{detectedUniversity}</span>.
                  </>
                )}
              </AuthMessage>
            ) : null}

            {((isFaculty && facultyStep === 'code') || (isStudent && studentStep === 'code')) ? (
              <AuthField
                label="One-Time Passcode"
                error={fieldErrors.code?.[0]}
                hint={
                  <button
                    type="button"
                    onClick={isFaculty ? resendFacultyCode : resendStudentCode}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-60"
                    disabled={submitting || resendingCode}
                  >
                    {resendingCode ? 'Resending...' : 'Resend code'}
                  </button>
                }
              >
                <AuthFieldShell invalid={!!fieldErrors.code?.[0]}>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.trim())}
                    placeholder="Enter code"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={submitting || resendingCode}
                  />
                </AuthFieldShell>
              </AuthField>
            ) : null}

            {((isStudent && studentStep === 'details') || (isFaculty && facultyStep === 'password')) ? (
              <AuthField
                label="Password"
                error={fieldErrors.password?.[0]}
                hint={isStudent ? <Badge variant="subtle">Minimum 8 characters</Badge> : undefined}
              >
                <AuthFieldShell
                  icon={<Lock className="h-4 w-4" />}
                  invalid={!!fieldErrors.password?.[0]}
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
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </AuthFieldShell>
              </AuthField>
            ) : null}

            {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}

            <Button
              type="submit"
              variant="gradient"
              size="xl"
              className="w-full gap-2"
              disabled={submitting || resendingCode}
            >
              {submitLabel}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  )
}
