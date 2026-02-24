'use client'

import React from 'react'
import { Check, GraduationCap, Mail, Pencil, Upload, Trash2, Sun, Moon, Monitor, Palette } from 'lucide-react'
import Image from 'next/image'

import { useAuth } from '@/lib/auth/context'
import { apiRequest, ApiClientError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useUniversityTheme, type ThemeMode } from '@/lib/theme'

type NotificationPreferences = {
  officeHourChanges: boolean
  newEvents: boolean
  eventReminders: boolean
  deadlineReminders: boolean
  emailDigest: boolean
  pushEnabled: boolean
  theme?: 'system' | 'light' | 'dark' | 'university'
}

const defaultPreferences: NotificationPreferences = {
  officeHourChanges: true,
  newEvents: true,
  eventReminders: true,
  deadlineReminders: true,
  emailDigest: true,
  pushEnabled: false,
  theme: 'system',
}

const preferenceLabels: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'officeHourChanges', label: 'Office Hour Updates' },
  { key: 'newEvents', label: 'New Event Announcements' },
  { key: 'eventReminders', label: 'Event Reminders' },
  { key: 'deadlineReminders', label: 'Deadline Reminders' },
  { key: 'emailDigest', label: 'Email Digest' },
  { key: 'pushEnabled', label: 'Push Notifications' },
]

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [website, setWebsite] = React.useState('')
  const [major, setMajor] = React.useState('')
  const [year, setYear] = React.useState('')

  const [editingProfile, setEditingProfile] = React.useState(false)
  const [preferences, setPreferences] = React.useState<NotificationPreferences>(defaultPreferences)
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPrefs, setSavingPrefs] = React.useState(false)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!profile) return

    setDisplayName(profile.displayName ?? '')
    setBio(profile.bio ?? '')
    setLocation(profile.location ?? '')
    setWebsite(profile.website ?? '')
    setMajor(profile.major ?? '')
    setYear(profile.year ?? '')
    setPreferences({
      ...defaultPreferences,
      ...(profile.notificationPreferences ?? {}),
    })
  }, [profile])

  const handleProfileSave = async () => {
    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        body: {
          displayName,
          bio: bio || null,
          location: location || null,
          website: website || null,
          major: major || null,
          year: year || null,
        },
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

  const handlePreferenceToggle = async (key: keyof NotificationPreferences) => {
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
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to save preferences'
      setError(message)
      setPreferences(preferences)
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const body = new FormData()
    body.append('file', file)

    setUploadingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me/avatar', {
        method: 'POST',
        body,
      })
      await refreshProfile()
      setSuccess('Avatar updated')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to upload avatar'
      setError(message)
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const removeAvatar = async () => {
    setUploadingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      await apiRequest('/api/users/me/avatar', {
        method: 'DELETE',
      })
      await refreshProfile()
      setSuccess('Avatar removed')
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to remove avatar'
      setError(message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-7 animate-in-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Profile and Preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage account details, avatar, and notification settings.
          </p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Image
              src={profile?.avatar ?? '/next.svg'}
              alt="Avatar"
              width={80}
              height={80}
              className="h-20 w-20 rounded-2xl border border-border/60 object-cover"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35">
                <Upload className="h-3.5 w-3.5" />
                {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
              {profile?.avatar && (
                <button
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Avatar
                </button>
              )}
            </div>
          </div>

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
        <div className="border-b border-border/60 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Profile Details</h2>
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

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {[
            { label: 'Display Name', value: displayName, setter: setDisplayName },
            { label: 'Major', value: major, setter: setMajor },
            { label: 'Year', value: year, setter: setYear },
            { label: 'Location', value: location, setter: setLocation },
            { label: 'Website', value: website, setter: setWebsite },
            { label: 'Bio', value: bio, setter: setBio, full: true },
          ].map((field) => (
            <div key={field.label} className={cn(field.full && 'sm:col-span-2')}>
              <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 block mb-1.5">
                {field.label}
              </label>
              <input
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                disabled={!editingProfile || savingProfile}
                className="h-10 w-full rounded-xl border border-border/60 bg-muted/20 px-3 text-sm outline-none transition-colors focus:border-primary/40 disabled:opacity-80"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-2">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-bold">Notification Preferences</h2>
          <p className="mt-1 text-xs text-muted-foreground">These settings are saved to your account.</p>
        </div>

        <div className="divide-y divide-border/40">
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
      </section>

      <ThemeSelector />
    </div>
  )
}

function ThemeSelector() {
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
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up stagger-3">
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-bold">Appearance</h2>
        <p className="mt-1 text-xs text-muted-foreground">Choose how MyQuad looks for you. Your preference is saved across sessions.</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
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
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              themeMode === option.id
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            )}>
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
    </section>
  )
}
