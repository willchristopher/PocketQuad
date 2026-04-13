'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AuthExperienceLayout,
  AuthInteractionPanel,
  authPanelErrorMessageClassName,
  authPanelFieldShellClassName,
  authPanelInfoMessageClassName,
  authPanelInputClassName,
} from '@/components/auth/AuthExperienceLayout';
import { AuthField, AuthFieldShell, AuthMessage } from '@/components/auth/AuthShell';
import { ApiClientError, apiRequest } from '@/lib/api/client';

const transitionEase = [0.16, 1, 0.3, 1];

function getProgressMeta(role, studentStep, facultyStep) {
  if (role === 'FACULTY') {
    if (facultyStep === 'email') {
      return {
        trackLabel: 'Faculty activation',
        stepLabel: 'Step 1 of 3',
        progress: 34,
        description: 'Use the university email your school invited so we can send a one-time activation code.',
      };
    }

    if (facultyStep === 'code') {
      return {
        trackLabel: 'Faculty activation',
        stepLabel: 'Step 2 of 3',
        progress: 68,
        description: 'Enter the one-time code from your inbox to confirm your access.',
      };
    }

    return {
      trackLabel: 'Faculty activation',
      stepLabel: 'Step 3 of 3',
      progress: 100,
      description: 'Create the password you will use each time you return to PocketQuad.',
    };
  }

  if (studentStep === 'details') {
    return {
      trackLabel: 'Student sign up',
      stepLabel: 'Step 1 of 2',
      progress: 50,
      description: 'Tell us who you are and we will send a one-time passcode to your university inbox.',
    };
  }

  return {
    trackLabel: 'Student sign up',
    stepLabel: 'Step 2 of 2',
    progress: 100,
    description: 'Enter the passcode from your inbox to finish creating your account.',
  };
}

function getAuthFieldShellClassName(invalid) {
  return [
    authPanelFieldShellClassName,
    invalid
      ? 'border-red-300 bg-red-50 focus-within:border-red-400 focus-within:ring-red-500/10'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getDormantAccountSupportMessage(account) {
  const name = account?.displayName ?? 'the account on file';
  return `The name on file for ${name} does not match. Please contact support so we can update the account before signup.`;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [role, setRole] = React.useState('STUDENT');
  const [studentStep, setStudentStep] = React.useState('details');
  const [facultyStep, setFacultyStep] = React.useState('email');
  const [submitting, setSubmitting] = React.useState(false);
  const [resendingCode, setResendingCode] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [detectedUniversity, setDetectedUniversity] = React.useState(null);
  const [dormantAccountMatch, setDormantAccountMatch] = React.useState(null);
  const [dormantAccountDecision, setDormantAccountDecision] = React.useState(null);
  const [checkingDomain, setCheckingDomain] = React.useState(false);
  const router = useRouter();
  const domainCheckTimer = React.useRef(null);
  const deferredEmail = React.useDeferredValue(email.trim().toLowerCase());
  const isFaculty = role === 'FACULTY';
  const isStudent = role === 'STUDENT';
  const showOtpField = (isFaculty && facultyStep === 'code') || (isStudent && studentStep === 'code');
  const showPasswordField =
    (isStudent && studentStep === 'details') || (isFaculty && facultyStep === 'password');
  const canSwitchRoles = !submitting && !resendingCode;
  const hasDormantAccountMatch = Boolean(dormantAccountMatch);
  const hasDormantRoleMismatch = hasDormantAccountMatch && dormantAccountMatch.role !== role;
  const requiresDormantConfirmation = hasDormantAccountMatch && !hasDormantRoleMismatch;
  const dormantAccountConfirmed = dormantAccountDecision === 'yes';
  const dormantAccountRejected = dormantAccountDecision === 'no';
  const dormantAccountId = dormantAccountConfirmed ? dormantAccountMatch?.id : undefined;
  const dormantAccountBlockingMessage = hasDormantRoleMismatch
    ? dormantAccountMatch?.role === 'FACULTY'
      ? 'This email is already on file for a faculty or staff account. Switch to Faculty or contact support.'
      : 'This email is already on file for a student account. Switch to Student or contact support.'
    : dormantAccountRejected
      ? getDormantAccountSupportMessage(dormantAccountMatch)
      : requiresDormantConfirmation && !dormantAccountConfirmed
        ? 'Please confirm the name on file before continuing.'
        : null;

  const handleRoleChange = (nextRole) => {
    if (nextRole === role) {
      return;
    }

    React.startTransition(() => {
      setRole(nextRole);
      setError(null);
      setFieldErrors({});
      setShowPassword(false);
      setDormantAccountDecision(null);

      if (nextRole === 'FACULTY') {
        setFacultyStep('email');
        setOtpCode('');
        setPassword('');
        return;
      }

      setStudentStep('details');
      setOtpCode('');
    });
  };

  React.useEffect(() => {
    if (domainCheckTimer.current) {
      clearTimeout(domainCheckTimer.current);
    }

    const atIndex = deferredEmail.lastIndexOf('@');

    if (atIndex < 0 || atIndex === deferredEmail.length - 1) {
      setDetectedUniversity(null);
      setDormantAccountMatch(null);
      setCheckingDomain(false);
      return;
    }

    const domain = deferredEmail.slice(atIndex + 1);

    if (!domain.includes('.') || domain.length < 4) {
      setDetectedUniversity(null);
      setDormantAccountMatch(null);
      setCheckingDomain(false);
      return;
    }

    setCheckingDomain(true);
    domainCheckTimer.current = setTimeout(async () => {
      try {
        const result = await apiRequest(
          `/api/auth/check-university?email=${encodeURIComponent(deferredEmail)}&role=${encodeURIComponent(role)}`
        );
        setDetectedUniversity(result.university?.name ?? null);
        setDormantAccountMatch(result.dormantAccount ?? null);
      } catch {
        setDetectedUniversity(null);
        setDormantAccountMatch(null);
      } finally {
        setCheckingDomain(false);
      }
    }, 320);

    return () => {
      if (domainCheckTimer.current) {
        clearTimeout(domainCheckTimer.current);
      }
    };
  }, [deferredEmail, role]);

  React.useEffect(() => {
    setDormantAccountDecision(null);
  }, [dormantAccountMatch?.id, role]);

  React.useEffect(() => {
    if (!dormantAccountMatch || dormantAccountMatch.role !== 'STUDENT') {
      return;
    }

    setFirstName(dormantAccountMatch.firstName ?? '');
    setLastName(dormantAccountMatch.lastName ?? '');
  }, [
    dormantAccountMatch,
    dormantAccountMatch?.firstName,
    dormantAccountMatch?.id,
    dormantAccountMatch?.lastName,
    dormantAccountMatch?.role,
  ]);

  const redirectToSessionHome = (result) => {
    router.push(result?.needsOnboarding ? '/onboarding' : result?.destination ?? '/dashboard');
  };

  const submitStudentDetails = async () => {
    await apiRequest('/api/auth/student/request-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
        dormantAccountId,
      },
    });

    React.startTransition(() => {
      setStudentStep('code');
    });
  };

  const submitStudentCode = async () => {
    const result = await apiRequest('/api/auth/student/verify-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
        code: otpCode,
        dormantAccountId,
      },
    });
    redirectToSessionHome(result);
  };

  const submitFacultyEmail = async () => {
    await apiRequest('/api/auth/faculty/request-otp', {
      method: 'POST',
      body: { email, dormantAccountId },
    });

    React.startTransition(() => {
      setFacultyStep('code');
    });
  };

  const submitFacultyCode = async () => {
    await apiRequest('/api/auth/faculty/verify-otp', {
      method: 'POST',
      body: {
        email,
        code: otpCode,
        dormantAccountId,
      },
    });

    React.startTransition(() => {
      setFacultyStep('password');
    });
  };

  const submitFacultyPassword = async () => {
    const result = await apiRequest('/api/auth/faculty/set-password', {
      method: 'POST',
      body: {
        password,
      },
    });
    redirectToSessionHome(result);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (dormantAccountBlockingMessage) {
      setError(dormantAccountBlockingMessage);
      return;
    }

    setSubmitting(true);

    try {
      if (isFaculty) {
        if (facultyStep === 'email') {
          await submitFacultyEmail();
          return;
        }

        if (facultyStep === 'code') {
          await submitFacultyCode();
          return;
        }

        await submitFacultyPassword();
        return;
      }

      if (studentStep === 'details') {
        await submitStudentDetails();
        return;
      }

      await submitStudentCode();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        const issues = err.details;

        if (issues?.fieldErrors) {
          setFieldErrors(issues.fieldErrors);
        }
      } else {
        setError('Unable to complete this sign up step right now');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resendFacultyCode = async () => {
    setError(null);
    setFieldErrors({});
    setResendingCode(true);

    try {
      await apiRequest('/api/auth/faculty/request-otp', {
        method: 'POST',
        body: { email, dormantAccountId },
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend code right now';
      setError(message);
    } finally {
      setResendingCode(false);
    }
  };

  const resendStudentCode = async () => {
    setError(null);
    setFieldErrors({});
    setResendingCode(true);

    try {
      await apiRequest('/api/auth/student/request-otp', {
        method: 'POST',
        body: {
          firstName,
          lastName,
          email,
          password,
          dormantAccountId,
        },
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to resend code right now';
      setError(message);
    } finally {
      setResendingCode(false);
    }
  };

  const submitLabel = (() => {
    if (isStudent) {
      if (studentStep === 'details') {
        return submitting ? 'Sending code...' : 'Create account';
      }

      return submitting ? 'Verifying account...' : 'Verify and finish';
    }

    if (facultyStep === 'email') {
      return submitting ? 'Sending code...' : 'Send one-time code';
    }

    if (facultyStep === 'code') {
      return submitting ? 'Validating...' : 'Validate code';
    }

    return submitting ? 'Saving password...' : 'Set password';
  })();

  const title = isFaculty ? 'Activate access' : 'Create account';
  const progressMeta = getProgressMeta(role, studentStep, facultyStep);

  return (
    <AuthExperienceLayout
      panelClassName="max-w-[42rem]"
    >
      <AuthInteractionPanel
        eyebrow={isFaculty ? 'Faculty activation' : 'Student sign up'}
        title={title}
        description={isFaculty ? 'Confirm your university access, then set the password you will use going forward.' : 'Use your university email to create your account and verify it with a one-time passcode.'}
        mobileCentered
        headerSlot={
          <div className="relative grid grid-cols-2 rounded-2xl border border-border/70 bg-muted/[0.55] p-1.5">
            {[
              { id: 'STUDENT', label: 'Student' },
              { id: 'FACULTY', label: 'Faculty' },
            ].map((option) => {
              const active = role === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={role === option.id}
                  onClick={() => handleRoleChange(option.id)}
                  className="relative min-h-[44px] overflow-hidden rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
                  disabled={!canSwitchRoles}
                >
                  {active ? (
                    <motion.span
                      layoutId="auth-role-pill"
                      className="absolute inset-0 rounded-xl bg-card shadow-sm"
                      transition={{ duration: 0.3, ease: transitionEase }}
                    />
                  ) : null}
                  <span className={active ? 'relative z-10 text-foreground' : 'relative z-10 text-muted-foreground'}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        }
        footer={
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-msu-gold transition-colors hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/[0.35] p-4 sm:p-5">
            <div className="flex flex-col gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{progressMeta.trackLabel}</span>
              <span>{progressMeta.stepLabel}</span>
            </div>
            <div className="h-2 rounded-full bg-background">
              <motion.div
                className="h-full rounded-full bg-msu-gold"
                initial={false}
                animate={{ width: `${progressMeta.progress}%` }}
                transition={{ duration: 0.38, ease: transitionEase }}
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${role}-${isFaculty ? facultyStep : studentStep}-message`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: transitionEase }}
                className="text-sm leading-6 text-muted-foreground"
              >
                {progressMeta.description}
              </motion.p>
            </AnimatePresence>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <motion.div layout className="space-y-5">
              <AnimatePresence initial={false} mode="wait">
                {isStudent && studentStep === 'details' ? (
                  <motion.div
                    key="student-details"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: transitionEase }}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <AuthField
                      label="First Name"
                      htmlFor="register-first-name"
                      error={fieldErrors.firstName?.[0]}
                    >
                      <AuthFieldShell
                        icon={<User className="h-4 w-4" />}
                        invalid={!!fieldErrors.firstName?.[0]}
                        className={getAuthFieldShellClassName(!!fieldErrors.firstName?.[0])}
                      >
                        <input
                          id="register-first-name"
                          type="text"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Alex"
                          className={authPanelInputClassName}
                          required
                          autoComplete="given-name"
                          disabled={submitting || (dormantAccountMatch?.role === 'STUDENT' && !hasDormantRoleMismatch)}
                        />
                      </AuthFieldShell>
                    </AuthField>

                    <AuthField
                      label="Last Name"
                      htmlFor="register-last-name"
                      error={fieldErrors.lastName?.[0]}
                    >
                      <AuthFieldShell
                        invalid={!!fieldErrors.lastName?.[0]}
                        className={getAuthFieldShellClassName(!!fieldErrors.lastName?.[0])}
                      >
                        <input
                          id="register-last-name"
                          type="text"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="Johnson"
                          className={authPanelInputClassName}
                          required
                          autoComplete="family-name"
                          disabled={submitting || (dormantAccountMatch?.role === 'STUDENT' && !hasDormantRoleMismatch)}
                        />
                      </AuthFieldShell>
                    </AuthField>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AuthField
                label="University Email"
                htmlFor="register-email"
                error={fieldErrors.email?.[0]}
              >
                <AuthFieldShell
                  icon={<Mail className="h-4 w-4" />}
                  invalid={!!fieldErrors.email?.[0]}
                  className={getAuthFieldShellClassName(!!fieldErrors.email?.[0])}
                >
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value.toLowerCase())}
                    placeholder="you@university.edu"
                    className={authPanelInputClassName}
                    required
                    autoComplete="email"
                    disabled={
                      submitting ||
                      (isFaculty && facultyStep !== 'email') ||
                      (isStudent && studentStep !== 'details')
                    }
                  />
                </AuthFieldShell>
              </AuthField>

              {detectedUniversity || checkingDomain ? (
                <motion.div
                  key={checkingDomain ? 'checking-domain' : detectedUniversity}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: transitionEase }}
                  className="text-sm text-muted-foreground"
                >
                  <span className="text-msu-gold">
                    {checkingDomain ? 'Checking domain...' : 'Joining'}
                  </span>{' '}
                  {checkingDomain ? null : <span className="font-semibold text-foreground">{detectedUniversity}</span>}
                </motion.div>
              ) : null}

              {dormantAccountMatch ? (
                <motion.div
                  key={`dormant-account-${dormantAccountMatch.id}-${role}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: transitionEase }}
                  className="rounded-2xl border border-border/70 bg-muted/[0.45] px-4 py-4 text-sm text-foreground"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Account On File
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">{dormantAccountMatch.displayName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dormantAccountMatch.email}</p>

                  {hasDormantRoleMismatch ? (
                    <p className="mt-3 leading-6 text-muted-foreground">
                      {dormantAccountMatch.role === 'FACULTY'
                        ? 'This email is already reserved for a faculty or staff activation. Switch to Faculty or contact support if this looks wrong.'
                        : 'This email is already reserved for a student signup. Switch to Student or contact support if this looks wrong.'}
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 leading-6">
                        Does the name associated above match who you&apos;re signing up for?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDormantAccountDecision('yes');
                            setError(null);
                          }}
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            dormantAccountConfirmed
                              ? 'bg-msu-gold text-msu-blue'
                              : 'border border-border/70 bg-card text-foreground hover:border-primary/20 hover:bg-background'
                          }`}
                        >
                          Yes, that&apos;s me
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDormantAccountDecision('no');
                            setError(getDormantAccountSupportMessage(dormantAccountMatch));
                          }}
                          className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            dormantAccountRejected
                              ? 'bg-amber-100 text-amber-900'
                              : 'border border-border/70 bg-card text-foreground hover:border-primary/20 hover:bg-background'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      {dormantAccountRejected ? (
                        <p className="mt-3 text-sm leading-6 text-amber-800">
                          Please contact support so we can correct the name on file before signup.
                        </p>
                      ) : null}
                    </>
                  )}
                </motion.div>
              ) : null}

              <AnimatePresence initial={false} mode="wait">
                {showOtpField ? (
                  <motion.div
                    key="otp-field"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: transitionEase }}
                  >
                    <AuthField
                      label="One-Time Passcode"
                      htmlFor="register-code"
                      error={fieldErrors.code?.[0]}
                      hint={
                        <button
                          type="button"
                          onClick={isFaculty ? resendFacultyCode : resendStudentCode}
                          className="text-xs font-medium text-msu-gold transition-colors hover:text-msu-gold/80 disabled:opacity-60"
                          disabled={submitting || resendingCode}
                        >
                          {resendingCode ? 'Resending...' : 'Resend code'}
                        </button>
                      }
                    >
                      <AuthFieldShell
                        invalid={!!fieldErrors.code?.[0]}
                        className={getAuthFieldShellClassName(!!fieldErrors.code?.[0])}
                      >
                        <input
                          id="register-code"
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
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence initial={false} mode="wait">
                {showPasswordField ? (
                  <motion.div
                    key={`password-field-${role}-${isFaculty ? facultyStep : studentStep}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.28, ease: transitionEase }}
                  >
                    <AuthField
                      label="Password"
                      htmlFor="register-password"
                      error={fieldErrors.password?.[0]}
                      hint={
                        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Minimum 8 characters
                        </span>
                      }
                    >
                      <AuthFieldShell
                        icon={<Lock className="h-4 w-4" />}
                        invalid={!!fieldErrors.password?.[0]}
                        className={getAuthFieldShellClassName(!!fieldErrors.password?.[0])}
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
                          id="register-password"
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
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>

            {error ? (
              <AuthMessage variant="error" className={authPanelErrorMessageClassName}>
                {error}
              </AuthMessage>
            ) : null}

            {showOtpField ? (
              <AuthMessage variant="info" className={authPanelInfoMessageClassName}>
                {isFaculty
                  ? 'Your one-time code was sent to the university email on file.'
                  : 'We sent a one-time code to your university inbox.'}
              </AuthMessage>
            ) : null}

            <button
              type="submit"
              disabled={submitting || resendingCode || Boolean(dormantAccountBlockingMessage)}
              className="group flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-msu-gold px-6 py-3.5 text-[14px] font-semibold text-msu-blue shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-px disabled:cursor-not-allowed"
            >
              {submitLabel}
              {submitting ? null : <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
            </button>
          </form>
        </div>
      </AuthInteractionPanel>
    </AuthExperienceLayout>
  );
}
