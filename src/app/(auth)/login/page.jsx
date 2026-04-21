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
import { apiRequest, ApiClientError } from '@/lib/api/client';
import { getSafeRedirectTarget } from '@/lib/auth/routing';

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
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      });

      if (rememberMe) {
        window.localStorage.setItem('pocketquad:last-login-email', email);
      } else {
        window.localStorage.removeItem('pocketquad:last-login-email');
      }

      const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'));

      if (result.needsOnboarding) {
        router.push('/onboarding');
        return;
      }

      const destination = redirectTarget ?? result.destination;
      router.push(destination);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to sign in right now';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthExperienceLayout>
      <AuthInteractionPanel
        eyebrow="Welcome back"
        title="Sign in"
        description="Enter your university email and password to access PocketQuad."
        mobileCentered
        footer={
          <p>
            New here?{' '}
            <Link href="/register" className="font-medium text-msu-gold transition-colors hover:underline">
              Create an account
            </Link>
          </p>
        }
      >
        <form className="space-y-6" onSubmit={onSubmit}>
          <AuthField label="Email" htmlFor="login-email">
            <AuthFieldShell icon={<Mail className="h-4 w-4" />} className={authPanelFieldShellClassName}>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@murraystate.edu"
                className={authPanelInputClassName}
                required
                autoComplete="email"
                disabled={submitting}
              />
            </AuthFieldShell>
          </AuthField>

          <AuthField
            label="Password"
            htmlFor="login-password"
            hint={
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot?
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
                id="login-password"
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

          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={submitting}
                className="h-3.5 w-3.5 rounded border-border bg-background text-msu-gold focus:ring-primary/10"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-msu-gold px-6 py-3.5 text-[14px] font-semibold text-msu-blue shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-px disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in\u2026' : 'Sign in'}
            {submitting ? null : <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
          </button>
        </form>
      </AuthInteractionPanel>
    </AuthExperienceLayout>
  );
}
