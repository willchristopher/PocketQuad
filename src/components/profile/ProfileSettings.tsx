'use client'

import React from 'react'
import { Check, ChevronDown, GraduationCap, LayoutGrid, Mail, Moon, Monitor, Palette, Pencil, Sun } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import {
  dashboardModuleConfig,
  dashboardModuleIds,
  dashboardModulesToPreferences,
  type DashboardModuleId,
} from '@/lib/studentData'
import { useUniversityTheme, type ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type NotificationPreferences = {
  officeHourChanges: boolean
  newEvents: boolean
  eventReminders: boolean
  deadlineReminders: boolean
  emailDigest: boolean
  pushEnabled: boolean
  theme?: 'system' | 'light' | 'dark' | 'university'
  dashboardModules?: DashboardModuleId[]
}

type PreferenceToggleKey = Exclude<keyof NotificationPreferences, 'theme' | 'dashboardModules'>

const defaultPreferences: NotificationPreferences = {
  officeHourChanges: true,
  newEvents: true,
  eventReminders: true,
  deadlineReminders: true,
  emailDigest: true,
  pushEnabled: false,
  theme: 'system',
}

const preferenceLabels: Array<{ key: PreferenceToggleKey; label: string }> = [
  { key: 'officeHourChanges', label: 'Office Hour Updates' },
  { key: 'newEvents', label: 'New Event Announcements' },
  { key: 'eventReminders', label: 'Event Reminders' },
  { key: 'deadlineReminders', label: 'Deadline Reminders' },
  { key: 'emailDigest', label: 'Email Digest' },
  { key: 'pushEnabled', label: 'Push Notifications' },
]

export function ProfileSettings() {
  const { profile, refreshProfile } = useAuth()
  const isFaculty = profile?.role === 'FACULTY'

  const [displayName, setDisplayName] = React.useState('')
  const [editingProfile, setEditingProfile] = React.useState(false)
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(defaultPreferences)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPrefs, setSavingPrefs] = React.useState(false)
  const [savingDashboardPrefs, setSavingDashboardPrefs] = React.useState(false)
  const [openSections, setOpenSections] = React.useState({
    details: true,
    notifications: false,
    dashboard: false,
    appearance: false,
  })
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!profile) return

    setDisplayName(profile.displayName ?? '')
    setPreferences({
      ...defaultPreferences,
      ...(profile.notificationPreferences ?? {}),
      dashboardModules:
        profile.notificationPreferences?.dashboardModules?.length
          ? profile.notificationPreferences.dashboardModules
          : [...dashboardModuleIds],
    })
  }, [profile])

  const dashboardPreferences = React.useMemo(
    () => dashboardModulesToPreferences(preferences.dashboardModules),
    [preferences.dashboardModules],
  )

  const visibleDashboardModules = React.useMemo(
    () => dashboardModuleIds.filter((moduleId) => dashboardPreferences[moduleId]),
    [dashboardPreferences],
  )

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  const handleProfileSave = async () => {
    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        body: { displayName },
      })
      await refreshProfile()
      setEditingProfile(false)
      setSuccess('Profile updated')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to update profile'
      setError(message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePreferenceToggle = async (key: PreferenceToggleKey) => {
    const next = { ...preferences, [key]: !preferences[key] }
    setPreferences(next)
    setSavingPrefs(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me/preferences', {
        method: 'PATCH',
        body: next,
      })
      await refreshProfile()
      setSuccess('Preferences updated')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to save preferences'
      setError(message)
      setPreferences(preferences)
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleDashboardModuleToggle = async (moduleId: DashboardModuleId) => {
    const previousModules = preferences.dashboardModules?.length
      ? preferences.dashboardModules
      : [...dashboardModuleIds]
    const nextVisibility = {
      ...dashboardPreferences,
      [moduleId]: !dashboardPreferences[moduleId],
    }
    const nextModules = dashboardModuleIds.filter((id) => nextVisibility[id])

    setPreferences((current) => ({
      ...current,
      dashboardModules: nextModules,
    }))
    setSavingDashboardPrefs(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me/preferences', {
        method: 'PATCH',
        body: {
          dashboardModules: nextModules,
        },
      })
      await refreshProfile()
      setSuccess('Dashboard layout updated')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to save dashboard layout'
      setError(message)
      setPreferences((current) => ({
        ...current,
        dashboardModules: previousModules,
      }))
    } finally {
      setSavingDashboardPrefs(false)
    }
  }

  const handleDashboardReset = async () => {
    const nextModules = [...dashboardModuleIds]

    setPreferences((current) => ({
      ...current,
      dashboardModules: nextModules,
    }))
    setSavingDashboardPrefs(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me/preferences', {
        method: 'PATCH',
        body: {
          dashboardModules: nextModules,
        },
      })
      await refreshProfile()
      setSuccess('Dashboard layout reset')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to reset dashboard layout'
      setError(message)
      setPreferences((current) => ({
        ...current,
        dashboardModules: profile?.notificationPreferences?.dashboardModules?.length
          ? profile.notificationPreferences.dashboardModules
          : [...dashboardModuleIds],
      }))
    } finally {
      setSavingDashboardPrefs(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-7 animate-in-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Profile and Preferences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account name and notification settings for your {isFaculty ? 'faculty' : 'student'} account.
          </p>

          <div className="mt-5 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Account Email</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {profile?.email ?? 'Loading...'}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">University</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {profile?.university?.name ?? 'Not linked to a university'}
            </p>
            {!profile?.university && profile?.email && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Your email domain isn&apos;t associated with a registered university yet. Contact your admin.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {success}
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-1">
        <button
          type="button"
          onClick={() => toggleSection('details')}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
        >
          <div>
            <h2 className="text-base font-bold">Profile Details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update the name shown on your account.
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              openSections.details && 'rotate-180',
            )}
          />
        </button>

        {openSections.details && (
          <div className="border-t border-border/60 p-4">
            <div className="mb-4 flex justify-end">
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/35"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-70"
                >
                  <Check className="h-3.5 w-3.5" />
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            <div className="max-w-md">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Name
              </label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={!editingProfile || savingProfile}
                variant="soft"
              />
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-2">
        <button
          type="button"
          onClick={() => toggleSection('notifications')}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
        >
          <div>
            <h2 className="text-base font-bold">Notification Preferences</h2>
            <p className="mt-1 text-xs text-muted-foreground">These settings are saved to your account.</p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              openSections.notifications && 'rotate-180',
            )}
          />
        </button>

        {openSections.notifications && (
          <div className="divide-y divide-border/40 border-t border-border/60">
            {preferenceLabels.map((item, index) => (
              <button
                key={item.key}
                onClick={() => void handlePreferenceToggle(item.key)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/20 animate-in-up"
                style={{ animationDelay: `${0.03 * (index + 1)}s` }}
                disabled={savingPrefs}
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span
                  className={cn(
                    'inline-flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                    preferences[item.key] ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full bg-white transition-transform',
                      preferences[item.key] ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-3">
        <button
          type="button"
          onClick={() => toggleSection('dashboard')}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold">Customize Dashboard</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {visibleDashboardModules.length} of {dashboardModuleIds.length} sections visible. Changes save to your account automatically.
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              openSections.dashboard && 'rotate-180',
            )}
          />
        </button>

        {openSections.dashboard && (
          <div className="border-t border-border/60 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Turn dashboard sections on or off. Your home dashboard will reflect these changes the next time it renders.
              </p>
              <button
                type="button"
                onClick={() => void handleDashboardReset()}
                disabled={savingDashboardPrefs}
                className="shrink-0 rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/35 disabled:opacity-60"
              >
                Reset
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {dashboardModuleConfig.map((module) => {
                const enabled = dashboardPreferences[module.id]

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => void handleDashboardModuleToggle(module.id)}
                    disabled={savingDashboardPrefs}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60',
                      enabled
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-muted/10 text-muted-foreground hover:bg-muted/25',
                    )}
                  >
                    <p className="text-sm font-semibold">{module.label}</p>
                    <p className="mt-1 text-[11px]">{enabled ? 'Visible on dashboard' : 'Hidden from dashboard'}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <ThemeSelector
        open={openSections.appearance}
        onToggle={() => toggleSection('appearance')}
      />
    </div>
  )
}

function ThemeSelector({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const { themeMode, setThemeMode, universityName, universityColors } = useUniversityTheme()

  const themeOptions: Array<{ id: ThemeMode; label: string; description: string; icon: React.ReactNode }> = [
    {
      id: 'light',
      label: 'Light',
      description: 'Clean light appearance',
      icon: <Sun className="h-5 w-5" />,
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes',
      icon: <Moon className="h-5 w-5" />,
    },
    {
      id: 'system',
      label: 'System',
      description: 'Match your device',
      icon: <Monitor className="h-5 w-5" />,
    },
  ]

  const hasUniversityColors = !!(universityColors?.mainColor && universityColors?.accentColor)

  if (hasUniversityColors) {
    themeOptions.push({
      id: 'university',
      label: universityName ? `${universityName} Colors` : 'University Colors',
      description: 'Custom colors set by your admin',
      icon: <Palette className="h-5 w-5" />,
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
      >
        <div>
          <h2 className="text-base font-bold">Appearance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose how PocketQuad looks for you. Your preference is saved across sessions.
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <>
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setThemeMode(option.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:bg-muted/20',
                  themeMode === option.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border/60',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                    themeMode === option.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-[11px] text-muted-foreground">{option.description}</p>
                </div>
                {themeMode === option.id && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {hasUniversityColors && (
            <div className="border-t border-border/60 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                University colors:{' '}
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border/60 align-middle"
                  style={{ backgroundColor: universityColors!.mainColor }}
                />{' '}
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border/60 align-middle"
                  style={{ backgroundColor: universityColors!.accentColor }}
                />{' '}
                set by your admin.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
