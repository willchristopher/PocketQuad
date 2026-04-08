'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/context';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';

const LottieLoader = dynamic(
  () => import('@/components/ui/LottieAnimation').then((mod) => mod.LottieLoader),
  { ssr: false, loading: () => <div className="h-10 w-10" /> }
);

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
              <div className="flex flex-col items-center gap-6 text-center">
                <LottieLoader size={40} />
                <div className="space-y-2 max-w-xs">
                  <h1 className="font-display text-lg tracking-tight text-foreground">Redirecting</h1>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    This page is not available for your school right now. Taking you to the next one.
                  </p>
                </div>
              </div>
            </div>
        );
    }

    return <>{children}</>;
}
