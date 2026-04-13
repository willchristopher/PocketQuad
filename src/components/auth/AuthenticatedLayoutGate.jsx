'use client';
import { useAuth } from '@/lib/auth/context';

export function AuthenticatedLayoutGate({ children, title = 'Loading your account', message = 'Please wait while PocketQuad finishes syncing your profile and permissions.', }) {
    const { loading, profile } = useAuth();
    if (!loading && profile) {
        return <>{children}</>;
    }
    return (<div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <div className="space-y-2 max-w-xs">
          <h1 className="font-display text-lg tracking-tight text-foreground">{title}</h1>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>);
}
