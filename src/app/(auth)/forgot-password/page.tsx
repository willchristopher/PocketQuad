'use client'

import React from 'react'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      })

      setSuccess('Password reset email sent. Check your inbox.')
      setEmail('')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to send reset email'
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
          badge="Account Recovery"
          title={
            <>
              Reset your <span className="gradient-text">password</span>
            </>
          }
          description="Enter your university email and we will send a reset link if your account is eligible."
          footer={
            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
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
                  disabled={submitting}
                />
              </AuthFieldShell>
            </AuthField>

            {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
            {success ? <AuthMessage variant="success">{success}</AuthMessage> : null}

            <Button type="submit" variant="gradient" size="xl" className="w-full gap-2" disabled={submitting}>
              {submitting ? 'Sending reset link...' : 'Send reset link'}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  )
}
