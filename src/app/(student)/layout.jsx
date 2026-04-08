'use client';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate';
import { StudentPageVisibilityGate } from '@/components/auth/StudentPageVisibilityGate';
const CommandPalette = dynamic(() => import('@/components/layout/CommandPalette').then((module) => module.CommandPalette), { ssr: false });
const AIChatWidget = dynamic(() => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget), { ssr: false });
function LayoutShell({ children }) {
    return (<div className="relative min-h-screen">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-32 lg:pt-8 xl:px-10" id="main-content">
          <div className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <AIChatWidget />
    </div>);
}
export default function StudentLayout({ children, }) {
    return (<AuthenticatedLayoutGate title="Loading your dashboard" message="Please wait while PocketQuad loads your account details and dashboard preferences.">
        <StudentPageVisibilityGate>
          <LayoutShell>{children}</LayoutShell>
        </StudentPageVisibilityGate>
      </AuthenticatedLayoutGate>);
}
