'use client'

import dynamic from 'next/dynamic'

import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider, useSidebarCollapsed } from '@/components/layout/SidebarContext'
import { MobileNav } from '@/components/layout/MobileNav'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'

const CommandPalette = dynamic(
  () => import('@/components/layout/CommandPalette').then((module) => module.CommandPalette),
  { ssr: false },
)
const AIChatWidget = dynamic(
  () => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget),
  { ssr: false },
)

function LayoutShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useSidebarCollapsed()

  return (
    <div className="relative min-h-screen bg-background">
      <SkipLink />
      <Sidebar />
      <div
        className={`flex flex-col transition-[padding-left] duration-200 ${sidebarCollapsed ? 'md:pl-[68px]' : 'md:pl-[260px]'}`}
      >
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
      <AIChatWidget />
    </div>
  )
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <LayoutShell>{children}</LayoutShell>
    </SidebarProvider>
  )
}
