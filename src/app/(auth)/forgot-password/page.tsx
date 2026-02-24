'use client'

import React from 'react'
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
            <span className="font-display text-2xl font-extrabold tracking-tight">PocketQuad</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-xl shadow-black/5">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-xl font-extrabold">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">University Email</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@university.edu"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground/50"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {success}
              </p>
            )}

            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:brightness-110 transition-all disabled:opacity-70">
              {submitting ? 'Sending...' : 'Send Reset Link'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/60 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
