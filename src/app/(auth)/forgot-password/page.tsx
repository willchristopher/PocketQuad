'use client'

import React from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import Link from 'next/link'

import {
  AppBrand,
  AuthCard,
  AuthField,
  AuthFieldShell,
  AuthMessage,
  AuthShell,
} from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { ApiClientError, apiRequest } from '@/lib/api/client'

type RecoveryStep = 'email' | 'code' | 'password' | 'success'

function getRecoveryStepNumber(step: Exclude<RecoveryStep, 'success'>) {
  if (step === 'email') return 1
  if (step === 'code') return 2
  return 3
}

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<RecoveryStep>('email')
  const [email, setEmail] = React.useState('')
  const [otpCode, setOtpCode] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [resendingCode, setResendingCode] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({})

  const submitEmail = async () => {
    await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    })

    setOtpCode('')
    setPassword('')
    setSuccess('We sent a one-time passcode to your inbox.')
    setStep('code')
  }

  const submitCode = async () => {
    await apiRequest('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: {
        email,
        code: otpCode,
      },
    })

    setPassword('')
    setSuccess('Code confirmed. Choose your new password.')
    setStep('password')
  }

  const submitPassword = async () => {
    await apiRequest('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: {
        password,
      },
    })

    setOtpCode('')
    setPassword('')
    setShowPassword(false)
    setSuccess('Your password has been updated. Sign in with your new password.')
    setStep('success')
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      if (step === 'email') {
        await submitEmail()
        return
      }

      if (step === 'code') {
        await submitCode()
        return
      }

      await submitPassword()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
        const issues = err.details as { fieldErrors?: Record<string, string[]> } | undefined
        if (issues?.fieldErrors) {
          setFieldErrors(issues.fieldErrors)
        }
      } else {
        setError('Unable to complete this recovery step right now')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resendCode = async () => {
    setError(null)
    setFieldErrors({})
    setResendingCode(true)

    try {
      await submitEmail()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend the code right now'
      setError(message)
    } finally {
      setResendingCode(false)
    }
  }

  const currentStep = step === 'success' ? 3 : getRecoveryStepNumber(step)
  const submitLabel = (() => {
    if (step === 'email') {
      return submitting ? 'Sending code...' : 'Send one-time code'
    }
    if (step === 'code') {
      return submitting ? 'Validating...' : 'Validate code'
    }
    return submitting ? 'Saving password...' : 'Save new password'
  })()

  return (
    <AuthShell>
      <div className="space-y-6">
        <AppBrand />

        <AuthCard
          badge="Account Recovery"
          title={
            <>
              Recover your <span className="gradient-text">account</span>
            </>
          }
          description="Confirm your university email with a one-time passcode, then choose a new password."
          footer={
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          }
        >
          <div className="space-y-5">
            {step !== 'success' ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((stepNumber) => {
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
                  {step === 'email' && 'Enter the email on your PocketQuad account to receive a one-time passcode.'}
                  {step === 'code' && 'Check your inbox, then enter the one-time passcode to continue.'}
                  {step === 'password' && 'Create a new password for future sign-ins.'}
                </AuthMessage>

                <form className="space-y-5" onSubmit={onSubmit}>
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
                        disabled={submitting || resendingCode || step !== 'email'}
                      />
                    </AuthFieldShell>
                  </AuthField>

                  {step === 'code' ? (
                    <AuthField
                      label="One-Time Passcode"
                      error={fieldErrors.code?.[0]}
                      hint={
                        <button
                          type="button"
                          onClick={resendCode}
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

                  {step === 'password' ? (
                    <AuthField label="New Password" error={fieldErrors.password?.[0]}>
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
                  {success ? <AuthMessage variant="success">{success}</AuthMessage> : null}

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
              </>
            ) : (
              <div className="space-y-5">
                {success ? <AuthMessage variant="success">{success}</AuthMessage> : null}
                <Button asChild variant="gradient" size="xl" className="w-full gap-2">
                  <Link href="/login">
                    Return to sign in
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  )
}
