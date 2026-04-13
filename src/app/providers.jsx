'use client';
import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { AuthProvider } from '@/lib/auth/context';
import { UniversityThemeProvider } from '@/lib/theme';
export function Providers({ children, initialAuthSnapshot = null }) {
    return (<NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider initialSnapshot={initialAuthSnapshot}>
          <UniversityThemeProvider>
            <TooltipProvider delayDuration={0}>
              {children}
              <Toaster position="top-right" richColors closeButton/>
            </TooltipProvider>
          </UniversityThemeProvider>
        </AuthProvider>
    </NextThemesProvider>);
}
