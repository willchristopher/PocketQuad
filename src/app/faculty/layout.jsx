'use client';
import React from 'react';
import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate';
import { FacultySidebar } from '@/components/layout/FacultySidebar';
import { FacultyHeader } from '@/components/layout/FacultyHeader';

export default function FacultyLayout({ children }) {
    return (<AuthenticatedLayoutGate title="Loading your faculty workspace" message="Please wait while PocketQuad loads your account details and faculty tools.">
      <div className="dark min-h-screen overflow-hidden bg-background text-foreground">
        <FacultySidebar />
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-[304px]">
          <FacultyHeader />
          <main className="flex-1 overflow-y-auto px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8 xl:px-10 custom-scrollbar">
            <div className="mx-auto max-w-[1500px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthenticatedLayoutGate>);
}
