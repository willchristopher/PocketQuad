'use client';

import React, { Suspense } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AuthInteractionPanel,
  AuthExperienceLayout,
  authPanelErrorMessageClassName,
  authPanelFieldShellClassName,
  authPanelInputClassName,
} from '@/components/auth/AuthExperienceLayout';
import { AuthField, AuthFieldShell, AuthMessage } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { apiRequest, ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { getHomeForRole, getSafeRedirectTarget } from '@/lib/auth/routing';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  React.useEffect(() => {
    const rememberedEmail = window.localStorage.getItem('pocketquad:last-login-email');

    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      });

      if (rememberMe) {
        window.localStorage.setItem('pocketquad:last-login-email', email);
      } else {
        window.localStorage.removeItem('pocketquad:last-login-email');
      }

      const session = (await refreshSession()) ?? (await apiRequest('/api/auth/session'));
      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'));

      if (session.profile && !session.profile.onboardingComplete) {
        router.push('/onboarding');
        router.refresh();
        return;
      }

      const destination = redirectTarget ?? getHomeForRole(session.profile);
      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to sign in right now';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthExperienceLayout
      heroLead="Sign in once. Keep the day in reach."
      heroDescription="Classes, office hours, campus updates, and student services stay connected from the moment you get in."
    >
      <AuthInteractionPanel
        eyebrow="Welcome back"
        title="Sign in"
        description="Use your university email and password to return to your campus workspace."
        footer={
          <p>
            New here or faculty first time?{' '}
            <Link href="/register" className="font-semibold text-primary transition-colors hover:text-primary/80">
              Create or activate access
            </Link>
          </p>
        }
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthField label="University Email">
            <AuthFieldShell icon={<Mail className="h-4 w-4" />} className={authPanelFieldShellClassName}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@university.edu"
                className={authPanelInputClassName}
                required
                autoComplete="email"
                disabled={submitting}
              />
            </AuthFieldShell>
          </AuthField>

          <AuthField
            label="Password"
            hint={
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Forgot password?
              </Link>
            }
          >
            <AuthFieldShell
              icon={<Lock className="h-4 w-4" />}
              className={authPanelFieldShellClassName}
              trailing={
                <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className={authPanelInputClassName}
                required
                autoComplete="current-password"
                disabled={submitting}
              />
            </AuthFieldShell>
          </AuthField>

          {error ? (
            <AuthMessage variant="error" className={authPanelErrorMessageClassName}>
              {error}
            </AuthMessage>
          ) : null}

          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-border/70 bg-background text-primary focus:ring-primary/20"
            />
            <span>Remember me on this device</span>
          </label>

          <Button
            type="submit"
            variant="gradient"
            size="xl"
            className="w-full gap-2 !bg-[linear-gradient(135deg,#f4c84f_0%,#d3a72f_100%)] !text-[#0e163f] !shadow-[0_18px_40px_rgba(244,200,79,0.18)]"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
            {submitting ? null : <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </AuthInteractionPanel>
    </AuthExperienceLayout>
  );
}
