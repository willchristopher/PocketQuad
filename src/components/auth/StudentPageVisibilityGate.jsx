'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/context';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';

export function StudentPageVisibilityGate({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { loading, profile } = useAuth();
    const { fallbackHref, isPathVisible } = useStudentPageVisibility();
    const pageVisible = isPathVisible(pathname);

    React.useEffect(() => {
        if (loading || !profile || pageVisible) {
            return;
        }

        router.replace(fallbackHref);
    }, [fallbackHref, loading, pageVisible, profile, router]);

    if (!loading && profile && !pageVisible) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-6">
              <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card px-8 py-10 text-center shadow-sm">
                <div className="pointer-events-none absolute inset-x-12 top-0 h-24 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Redirecting</h1>
                    <p className="text-sm text-muted-foreground">
                      This page is hidden for your school right now, so PocketQuad is taking you to the next available student page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
        );
    }

    return <>{children}</>;
}
