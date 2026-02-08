'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'
import { CommandPalette } from '@/components/layout/CommandPalette'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <SkipLink />
      <Sidebar />
      <div className="flex flex-col md:pl-[260px]">
        <Header />
        <main
          className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-24 md:p-6 md:pb-8 lg:p-8"
          id="main-content"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  )
}
