'use client'

import type * as React from 'react'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/lib/auth/context'

type AuthenticatedLayoutGateProps = {
  children: React.ReactNode
  title?: string
  message?: string
}

export function AuthenticatedLayoutGate({
  children,
  title = 'Loading your account',
  message = 'Please wait while PocketQuad finishes syncing your profile and permissions.',
}: AuthenticatedLayoutGateProps) {
  const { loading, profile } = useAuth()

  if (!loading && profile) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card px-8 py-10 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-24 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
