'use client';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate';
const CommandPalette = dynamic(() => import('@/components/layout/CommandPalette').then((module) => module.CommandPalette), { ssr: false });
const AIChatWidget = dynamic(() => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget), { ssr: false });
function LayoutShell({ children }) {
    return (<div className="relative min-h-screen bg-background">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-24 md:p-6 md:pb-32 lg:p-8 lg:pb-36" id="main-content">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <AIChatWidget />
    </div>);
}
export default function StudentLayout({ children, }) {
    return (<AuthenticatedLayoutGate title="Loading your dashboard" message="Please wait while PocketQuad loads your account details and dashboard preferences.">
        <LayoutShell>{children}</LayoutShell>
      </AuthenticatedLayoutGate>);
}
