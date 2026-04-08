'use client';
import React from 'react';
import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate';
import { FacultySidebar } from '@/components/layout/FacultySidebar';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { SidebarProvider, useSidebarCollapsed } from '@/components/layout/SidebarContext';
import { cn } from '@/lib/utils';

function FacultyShell({ children }) {
    const { sidebarCollapsed } = useSidebarCollapsed();
    return (<div className="dark min-h-screen overflow-hidden bg-background text-foreground">
      <FacultySidebar />
      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[128px]' : 'lg:pl-[304px]')}>
        <FacultyHeader />
        <main className="flex-1 overflow-y-auto px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8 xl:px-10 custom-scrollbar">
          <div className="mx-auto max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>);
}

export default function FacultyLayout({ children }) {
    return (<AuthenticatedLayoutGate title="Loading your faculty workspace" message="Please wait while PocketQuad loads your account details and faculty tools.">
      <SidebarProvider>
        <FacultyShell>{children}</FacultyShell>
      </SidebarProvider>
    </AuthenticatedLayoutGate>);
}
