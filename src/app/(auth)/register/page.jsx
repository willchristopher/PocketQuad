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
import { Button } from '@/components/ui/button';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';

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

function getDarkFieldShellClassName(invalid) {
  return [
    authPanelFieldShellClassName,
    invalid
      ? 'border-red-400/50 bg-red-500/10 focus-within:border-red-300 focus-within:ring-red-400/20'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
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
  const [checkingDomain, setCheckingDomain] = React.useState(false);
  const router = useRouter();
  const { refreshSession } = useAuth();
  const domainCheckTimer = React.useRef(null);
  const deferredEmail = React.useDeferredValue(email.trim().toLowerCase());
  const isFaculty = role === 'FACULTY';
  const isStudent = role === 'STUDENT';
  const showOtpField = (isFaculty && facultyStep === 'code') || (isStudent && studentStep === 'code');
  const showPasswordField =
    (isStudent && studentStep === 'details') || (isFaculty && facultyStep === 'password');
  const canSwitchRoles = !submitting && !resendingCode;

  const handleRoleChange = (nextRole) => {
    if (nextRole === role) {
      return;
    }

    React.startTransition(() => {
      setRole(nextRole);
      setError(null);
      setFieldErrors({});
      setShowPassword(false);

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
      setCheckingDomain(false);
      return;
    }

    const domain = deferredEmail.slice(atIndex + 1);

    if (!domain.includes('.') || domain.length < 4) {
      setDetectedUniversity(null);
      setCheckingDomain(false);
      return;
    }

    setCheckingDomain(true);
    domainCheckTimer.current = setTimeout(async () => {
      try {
        const result = await apiRequest(`/api/auth/check-university?domain=${encodeURIComponent(domain)}`);
        setDetectedUniversity(result.university?.name ?? null);
      } catch {
        setDetectedUniversity(null);
      } finally {
        setCheckingDomain(false);
      }
    }, 320);

    return () => {
      if (domainCheckTimer.current) {
        clearTimeout(domainCheckTimer.current);
      }
    };
  }, [deferredEmail]);

  const redirectToSessionHome = async () => {
    try {
      await refreshSession();
    } catch {
      // Continue anyway so onboarding can load.
    }

    router.push('/onboarding');
    router.refresh();
  };

  const submitStudentDetails = async () => {
    await apiRequest('/api/auth/student/request-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
      },
    });

    React.startTransition(() => {
      setStudentStep('code');
    });
  };

  const submitStudentCode = async () => {
    await apiRequest('/api/auth/student/verify-otp', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        password,
        code: otpCode,
      },
    });

    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
      },
    });

    await redirectToSessionHome();
  };

  const submitFacultyEmail = async () => {
    await apiRequest('/api/auth/faculty/request-otp', {
      method: 'POST',
      body: { email },
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
      },
    });

    React.startTransition(() => {
      setFacultyStep('password');
    });
  };

  const submitFacultyPassword = async () => {
    await apiRequest('/api/auth/faculty/set-password', {
      method: 'POST',
      body: {
        password,
      },
    });

    await redirectToSessionHome();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
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
        body: { email },
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

  const title = isFaculty ? 'Activate faculty access' : 'Create your campus account';
  const description = isFaculty
    ? 'Verify your university email, confirm the one-time code, and set the password you will use from now on.'
    : 'Use your university email to create an account, then confirm it once with a one-time passcode.';
  const progressMeta = getProgressMeta(role, studentStep, facultyStep);

  return (
    <AuthExperienceLayout
      heroLead="Create or activate the access you use every day."
      heroDescription="Set up your university account once, then keep your classes, office hours, and campus updates in one place."
    >
      <AuthInteractionPanel
        eyebrow={isFaculty ? 'Faculty activation' : 'Student sign up'}
        title={title}
        description={description}
        headerSlot={
          <div className="relative grid grid-cols-2 rounded-full border border-white/10 bg-background/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {[
              { id: 'STUDENT', label: 'Student' },
              { id: 'FACULTY', label: 'Faculty' },
            ].map((option) => {
              const active = role === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRoleChange(option.id)}
                  className="relative min-h-[44px] overflow-hidden rounded-full px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors"
                  disabled={!canSwitchRoles}
                >
                  {active ? (
                    <motion.span
                      layoutId="auth-role-pill"
                      className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(244,200,79,0.24)_0%,rgba(17,27,87,0.55)_100%)]"
                      transition={{ duration: 0.35, ease: transitionEase }}
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
            <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
              Sign in
            </Link>
          </p>
        }
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              <span>{progressMeta.trackLabel}</span>
              <span>{progressMeta.stepLabel}</span>
            </div>
            <div className="h-[3px] rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(135deg,#f4c84f_0%,#d3a72f_100%)]"
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
                      error={fieldErrors.firstName?.[0]}
                      errorClassName="text-red-700"
                    >
                      <AuthFieldShell
                        icon={<User className="h-4 w-4" />}
                        invalid={!!fieldErrors.firstName?.[0]}
                        className={getDarkFieldShellClassName(!!fieldErrors.firstName?.[0])}
                      >
                        <input
                          type="text"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Alex"
                          className={authPanelInputClassName}
                          required
                          disabled={submitting}
                        />
                      </AuthFieldShell>
                    </AuthField>

                    <AuthField
                      label="Last Name"
                      error={fieldErrors.lastName?.[0]}
                      errorClassName="text-red-700"
                    >
                      <AuthFieldShell
                        invalid={!!fieldErrors.lastName?.[0]}
                        className={getDarkFieldShellClassName(!!fieldErrors.lastName?.[0])}
                      >
                        <input
                          type="text"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="Johnson"
                          className={authPanelInputClassName}
                          required
                          disabled={submitting}
                        />
                      </AuthFieldShell>
                    </AuthField>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AuthField label="University Email" error={fieldErrors.email?.[0]} errorClassName="text-red-700">
                <AuthFieldShell
                  icon={<Mail className="h-4 w-4" />}
                  invalid={!!fieldErrors.email?.[0]}
                  className={getDarkFieldShellClassName(!!fieldErrors.email?.[0])}
                >
                  <input
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
                  <span className="text-primary">
                    {checkingDomain ? 'Checking your university domain...' : 'Joining'}
                  </span>{' '}
                  {checkingDomain ? null : <span className="font-semibold text-foreground">{detectedUniversity}</span>}
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
                      error={fieldErrors.code?.[0]}
                      errorClassName="text-red-700"
                      hint={
                        <button
                          type="button"
                          onClick={isFaculty ? resendFacultyCode : resendStudentCode}
                          className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-60"
                          disabled={submitting || resendingCode}
                        >
                          {resendingCode ? 'Resending...' : 'Resend code'}
                        </button>
                      }
                    >
                      <AuthFieldShell
                        invalid={!!fieldErrors.code?.[0]}
                        className={getDarkFieldShellClassName(!!fieldErrors.code?.[0])}
                      >
                        <input
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
                      error={fieldErrors.password?.[0]}
                      errorClassName="text-red-700"
                      hint={
                        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Minimum 8 characters
                        </span>
                      }
                    >
                      <AuthFieldShell
                        icon={<Lock className="h-4 w-4" />}
                        invalid={!!fieldErrors.password?.[0]}
                        className={getDarkFieldShellClassName(!!fieldErrors.password?.[0])}
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

            <Button
              type="submit"
              variant="gradient"
              size="xl"
              className="w-full gap-2 !bg-[linear-gradient(135deg,#f4c84f_0%,#d3a72f_100%)] !text-[#0e163f] !shadow-[0_18px_40px_rgba(244,200,79,0.18)]"
              disabled={submitting || resendingCode}
            >
              {submitLabel}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </AuthInteractionPanel>
    </AuthExperienceLayout>
  );
}
