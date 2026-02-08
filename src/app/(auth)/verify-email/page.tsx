'use client'

import React from 'react'
import { MailCheck, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
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
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-xl shadow-black/5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>

          <h1 className="font-display text-xl font-extrabold">Check your email</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We&apos;ve sent a verification link to your university email.
            Click the link to verify your account and get started.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/60">
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or click below to resend.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-border/60 font-semibold text-sm hover:bg-muted transition-colors">
              <RefreshCw className="w-4 h-4" /> Resend Verification Email
            </button>
            <Link href="/login" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all">
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
