'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate'
import { FacultySidebar } from '@/components/layout/FacultySidebar'
import { FacultyHeader } from '@/components/layout/FacultyHeader'

const AIChatWidget = dynamic(
  () => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget),
  { ssr: false },
)

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedLayoutGate
      title="Loading your faculty workspace"
      message="Please wait while PocketQuad loads your account details and faculty tools."
    >
      <div className="flex h-screen bg-background overflow-hidden">
        <FacultySidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <FacultyHeader />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6 md:py-8">
              {children}
            </div>
          </main>
          <AIChatWidget />
        </div>
      </div>
    </AuthenticatedLayoutGate>
  )
}
