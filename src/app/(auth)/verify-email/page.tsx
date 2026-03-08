'use client'

import { ArrowRight, MailCheck, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { AppBrand, AuthCard, AuthMessage, AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <div className="space-y-6">
        <AppBrand />

        <AuthCard
          badge="Verify Email"
          title={
            <>
              Check your <span className="gradient-text">inbox</span>
            </>
          }
          description="We sent a verification link to your university email. Open that message to confirm your account and continue."
        >
          <div className="space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[image:var(--gradient-primary)] text-primary-foreground shadow-accent">
              <MailCheck className="h-8 w-8" />
            </div>

            <AuthMessage>
              <p className="text-sm leading-6">
                Did not receive the email? Check your spam folder first, then resend if needed.
              </p>
            </AuthMessage>

            <div className="space-y-3">
              <Button type="button" variant="surface" size="xl" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Resend verification email
              </Button>
              <Button asChild variant="gradient" size="xl" className="w-full gap-2">
                <Link href="/login">
                  Go to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    </AuthShell>
  )
}
