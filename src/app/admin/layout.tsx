'use client'

import React, { Suspense } from 'react'

import { AuthenticatedLayoutGate } from '@/components/auth/AuthenticatedLayoutGate'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  return (
    <Suspense>
      <AuthenticatedLayoutGate
        title="Loading your admin workspace"
        message="Please wait while PocketQuad loads your account details and admin permissions."
      >
        <div className="relative min-h-screen bg-background">
          <AdminSidebar />

          <div className="flex min-h-screen flex-col md:pl-[260px]">
            <AdminHeader onMenuClick={() => setMobileSidebarOpen(true)} />
            <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 pb-8 md:p-6 lg:p-8">{children}</main>
          </div>

          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-[290px] p-0">
              <AdminSidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </AuthenticatedLayoutGate>
    </Suspense>
  )
}
