'use client'

import React from 'react'
import { FacultySidebar } from '@/components/layout/FacultySidebar'
import { FacultyHeader } from '@/components/layout/FacultyHeader'
import { AIChatWidget } from '@/components/ai/AIChatWidget'

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
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
  )
}
