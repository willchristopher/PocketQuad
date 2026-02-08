'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { AuthProvider } from '@/lib/auth/context'
import { UniversityThemeProvider } from '@/lib/theme'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UniversityThemeProvider>
            <TooltipProvider delayDuration={0}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </TooltipProvider>
          </UniversityThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
