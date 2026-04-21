'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import {
  AuthExperienceLayout,
  AuthInteractionPanel,
  authPanelErrorMessageClassName,
  authPanelFieldShellClassName,
  authPanelInfoMessageClassName,
  authPanelInputClassName,
  authPanelSuccessMessageClassName,
} from '@/components/auth/AuthExperienceLayout';
import { AuthField, AuthFieldShell, AuthMessage } from '@/components/auth/AuthShell';
import { ApiClientError, apiRequest } from '@/lib/api/client';

function getRecoveryStepNumber(step) {
  if (step === 'email') return 1;
  if (step === 'code') return 2;
  return 3;
}

function getFieldShellClassName(invalid) {
  return [
    authPanelFieldShellClassName,
    invalid ? 'border-red-300 bg-red-50 focus-within:border-red-400 focus-within:ring-red-500/10' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getStepContent(step) {
  if (step === 'email') {
    return {
      eyebrow: 'Password recovery',
      title: 'Forgot password',
      description: 'Enter your university email so we can send a one-time passcode to reset your password.',
      helper: 'We will send a one-time code to the email on your PocketQuad account.',
    };
  }

  if (step === 'code') {
    return {
      eyebrow: 'Password recovery',
      title: 'Check your inbox',
      description: 'Enter the one-time passcode we sent to your university email to keep moving.',
      helper: 'Use the code from your inbox, then we will take you to create a new password.',
    };
  }

  if (step === 'password') {
    return {
      eyebrow: 'Password recovery',
      title: 'Create a new password',
      description: 'Choose a new password for your PocketQuad account so you can get back in.',
      helper: 'Your new password will be used the next time you sign in.',
    };
  }

  return {
    eyebrow: 'Password recovery',
    title: 'Password updated',
    description: 'Your password has been reset. Head back to sign in and use your new credentials.',
    helper: null,
  };
}

const primaryActionClassName =
  'group flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-msu-gold px-6 py-3.5 text-[14px] font-semibold text-msu-blue shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70';

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState('email');
  const [email, setEmail] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [resendingCode, setResendingCode] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [fieldErrors, setFieldErrors] = React.useState({});

  const submitEmail = async () => {
    await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });

    setOtpCode('');
    setPassword('');
    setSuccess('We sent a one-time passcode to your inbox.');
    setStep('code');
  };

  const submitCode = async () => {
    await apiRequest('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: {
        email,
        code: otpCode,
      },
    });

    setPassword('');
    setSuccess('Code confirmed. Choose your new password.');
    setStep('password');
  };

  const submitPassword = async () => {
    await apiRequest('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: { password },
    });

    setOtpCode('');
    setPassword('');
    setShowPassword(false);
    setSuccess('Your password has been updated. Sign in with your new password.');
    setStep('success');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      if (step === 'email') {
        await submitEmail();
        return;
      }

      if (step === 'code') {
        await submitCode();
        return;
      }

      await submitPassword();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        const issues = err.details;

        if (issues?.fieldErrors) {
          setFieldErrors(issues.fieldErrors);
        }
      } else {
        setError('Unable to complete this recovery step right now');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setFieldErrors({});
    setResendingCode(true);

    try {
      await submitEmail();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend the code right now';
      setError(message);
    } finally {
      setResendingCode(false);
    }
  };

  const currentStep = step === 'success' ? 3 : getRecoveryStepNumber(step);
  const stepContent = getStepContent(step);
  const submitLabel =
    step === 'email'
      ? submitting
        ? 'Sending code...'
        : 'Send one-time code'
      : step === 'code'
        ? submitting
          ? 'Validating...'
          : 'Validate code'
        : submitting
          ? 'Saving password...'
          : 'Save new password';

  return (
    <AuthExperienceLayout>
      <AuthInteractionPanel
        eyebrow={stepContent.eyebrow}
        title={stepContent.title}
        description={stepContent.description}
        mobileCentered
        footer={
          <p>
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-msu-gold transition-colors hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <div className="space-y-6">
          {step !== 'success' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/[0.72] p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Step {currentStep} of 3
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {step === 'email' ? 'Verify email' : step === 'code' ? 'Confirm code' : 'Reset password'}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((stepNumber) => {
                    const active = stepNumber === currentStep;
                    const completed = stepNumber < currentStep;

                    return (
                      <div
                        key={stepNumber}
                        className={[
                          'rounded-full border px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
                          active
                            ? 'border-msu-gold/60 bg-msu-gold/15 text-foreground'
                            : completed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-border/70 bg-card/70 text-muted-foreground',
                        ].join(' ')}
                      >
                        Step {stepNumber}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full rounded-full bg-msu-gold transition-all duration-300"
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>
              </div>

              {stepContent.helper ? (
                <AuthMessage className={authPanelInfoMessageClassName}>{stepContent.helper}</AuthMessage>
              ) : null}

              {success ? (
                <AuthMessage variant="success" className={authPanelSuccessMessageClassName}>
                  {success}
                </AuthMessage>
              ) : null}

              <form className="space-y-6" onSubmit={onSubmit}>
                {step === 'email' ? (
                  <AuthField label="University Email" htmlFor="fp-email" error={fieldErrors.email?.[0]}>
                    <AuthFieldShell
                      icon={<Mail className="h-4 w-4" />}
                      className={getFieldShellClassName(!!fieldErrors.email?.[0])}
                    >
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value.toLowerCase())}
                        placeholder="you@murraystate.edu"
                        className={authPanelInputClassName}
                        required
                        autoComplete="email"
                        disabled={submitting || resendingCode}
                      />
                    </AuthFieldShell>
                  </AuthField>
                ) : null}

                {step === 'code' ? (
                  <>
                    <AuthField label="University Email" htmlFor="fp-email-preview">
                      <AuthFieldShell icon={<Mail className="h-4 w-4" />} className={authPanelFieldShellClassName}>
                        <input
                          id="fp-email-preview"
                          type="email"
                          value={email}
                          className={authPanelInputClassName}
                          readOnly
                          disabled
                        />
                      </AuthFieldShell>
                    </AuthField>

                    <AuthField
                      label="One-Time Passcode"
                      htmlFor="fp-code"
                      error={fieldErrors.code?.[0]}
                      hint={
                        <button
                          type="button"
                          onClick={resendCode}
                          className="text-[11px] font-medium text-msu-gold transition-colors hover:underline disabled:opacity-60"
                          disabled={submitting || resendingCode}
                        >
                          {resendingCode ? 'Resending...' : 'Resend code'}
                        </button>
                      }
                    >
                      <AuthFieldShell className={getFieldShellClassName(!!fieldErrors.code?.[0])}>
                        <input
                          id="fp-code"
                          type="text"
                          value={otpCode}
                          onChange={(event) => setOtpCode(event.target.value.trim())}
                          placeholder="Enter code"
                          className={authPanelInputClassName}
                          required
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          disabled={submitting || resendingCode}
                        />
                      </AuthFieldShell>
                    </AuthField>
                  </>
                ) : null}

                {step === 'password' ? (
                  <>
                    <AuthField label="University Email" htmlFor="fp-email-preview">
                      <AuthFieldShell icon={<Mail className="h-4 w-4" />} className={authPanelFieldShellClassName}>
                        <input
                          id="fp-email-preview"
                          type="email"
                          value={email}
                          className={authPanelInputClassName}
                          readOnly
                          disabled
                        />
                      </AuthFieldShell>
                    </AuthField>

                    <AuthField label="New Password" htmlFor="fp-password" error={fieldErrors.password?.[0]}>
                      <AuthFieldShell
                        icon={<Lock className="h-4 w-4" />}
                        className={getFieldShellClassName(!!fieldErrors.password?.[0])}
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
                          id="fp-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          className={authPanelInputClassName}
                          required
                          autoComplete="new-password"
                          disabled={submitting}
                        />
                      </AuthFieldShell>
                    </AuthField>
                  </>
                ) : null}

                {error ? (
                  <AuthMessage variant="error" className={authPanelErrorMessageClassName}>
                    {error}
                  </AuthMessage>
                ) : null}

                <button
                  type="submit"
                  className={primaryActionClassName}
                  disabled={submitting || resendingCode}
                >
                  {submitLabel}
                  {submitting ? null : (
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {success ? (
                <AuthMessage variant="success" className={authPanelSuccessMessageClassName}>
                  {success}
                </AuthMessage>
              ) : null}

              <Link href="/login" className={primaryActionClassName}>
                Return to sign in
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </AuthInteractionPanel>
    </AuthExperienceLayout>
  );
}
