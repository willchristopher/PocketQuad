'use client';
import React from 'react';
import Link from 'next/link';
import { Check, ChevronDown, GraduationCap, LayoutGrid, Mail, Moon, Monitor, Pencil, Sun } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { dashboardModuleConfig, dashboardModuleIds, dashboardModulesToPreferences, } from '@/lib/studentData';
import { useUniversityTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const defaultPreferences = {
    officeHourChanges: true,
    newEvents: true,
    eventReminders: true,
    deadlineReminders: true,
    pushEnabled: false,
    buildingAlerts: false,
    buildingIds: [],
    clubInterestIds: [],
    theme: 'system',
};
const preferenceLabels = [
    { key: 'officeHourChanges', label: 'Office Hour Updates' },
    { key: 'newEvents', label: 'Faculty Event Alerts' },
    { key: 'eventReminders', label: 'Event Reminders' },
    { key: 'deadlineReminders', label: 'Deadline Reminders' },
    { key: 'pushEnabled', label: 'Push Notifications' },
    { key: 'buildingAlerts', label: 'Building Alerts' },
];
export function ProfileSettings() {
    const { profile, refreshProfile } = useAuth();
    const { isPageVisible } = useStudentPageVisibility();
    const isFaculty = profile?.role === 'FACULTY';
    const isStudent = profile?.role === 'STUDENT';
    const [displayName, setDisplayName] = React.useState('');
    const [editingProfile, setEditingProfile] = React.useState(false);
    const [preferences, setPreferences] = React.useState(defaultPreferences);
    const [savingProfile, setSavingProfile] = React.useState(false);
    const [savingPrefs, setSavingPrefs] = React.useState(false);
    const [savingDashboardPrefs, setSavingDashboardPrefs] = React.useState(false);
    const [openSections, setOpenSections] = React.useState({
        details: true,
        notifications: false,
        dashboard: false,
        appearance: false,
    });
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(null);
    React.useEffect(() => {
        if (!profile)
            return;
        setDisplayName(profile.displayName ?? '');
        setPreferences({
            ...defaultPreferences,
            ...(profile.notificationPreferences ?? {}),
            dashboardModules: profile.notificationPreferences?.dashboardModules?.length
                ? profile.notificationPreferences.dashboardModules
                : [...dashboardModuleIds],
        });
    }, [profile]);
    const dashboardPreferences = React.useMemo(() => dashboardModulesToPreferences(preferences.dashboardModules), [preferences.dashboardModules]);
    const visibleDashboardModules = React.useMemo(() => dashboardModuleIds.filter((moduleId) => dashboardPreferences[moduleId]), [dashboardPreferences]);
    const toggleSection = (section) => {
        setOpenSections((current) => ({
            ...current,
            [section]: !current[section],
        }));
    };
    const handleProfileSave = async () => {
        setSavingProfile(true);
        setError(null);
        setSuccess(null);
        try {
            await apiRequest('/api/users/me', {
                method: 'PATCH',
                body: { displayName },
            });
            await refreshProfile();
            setEditingProfile(false);
            setSuccess('Profile updated');
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update profile';
            setError(message);
        }
        finally {
            setSavingProfile(false);
        }
    };
    const handlePreferenceToggle = async (key) => {
        const next = { ...preferences, [key]: !preferences[key] };
        setPreferences(next);
        setSavingPrefs(true);
        setError(null);
        setSuccess(null);
        try {
            await apiRequest('/api/users/me/preferences', {
                method: 'PATCH',
                body: next,
            });
            await refreshProfile();
            setSuccess('Preferences updated');
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to save preferences';
            setError(message);
            setPreferences(preferences);
        }
        finally {
            setSavingPrefs(false);
        }
    };
    const handleDashboardModuleToggle = async (moduleId) => {
        const previousModules = preferences.dashboardModules?.length
            ? preferences.dashboardModules
            : [...dashboardModuleIds];
        const nextVisibility = {
            ...dashboardPreferences,
            [moduleId]: !dashboardPreferences[moduleId],
        };
        const nextModules = dashboardModuleIds.filter((id) => nextVisibility[id]);
        setPreferences((current) => ({
            ...current,
            dashboardModules: nextModules,
        }));
        setSavingDashboardPrefs(true);
        setError(null);
        setSuccess(null);
        try {
            await apiRequest('/api/users/me/preferences', {
                method: 'PATCH',
                body: {
                    dashboardModules: nextModules,
                },
            });
            await refreshProfile();
            setSuccess('Dashboard layout updated');
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to save dashboard layout';
            setError(message);
            setPreferences((current) => ({
                ...current,
                dashboardModules: previousModules,
            }));
        }
        finally {
            setSavingDashboardPrefs(false);
        }
    };
    const handleDashboardReset = async () => {
        const nextModules = [...dashboardModuleIds];
        setPreferences((current) => ({
            ...current,
            dashboardModules: nextModules,
        }));
        setSavingDashboardPrefs(true);
        setError(null);
        setSuccess(null);
        try {
            await apiRequest('/api/users/me/preferences', {
                method: 'PATCH',
                body: {
                    dashboardModules: nextModules,
                },
            });
            await refreshProfile();
            setSuccess('Dashboard layout reset');
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to reset dashboard layout';
            setError(message);
            setPreferences((current) => ({
                ...current,
                dashboardModules: profile?.notificationPreferences?.dashboardModules?.length
                    ? profile.notificationPreferences.dashboardModules
                    : [...dashboardModuleIds],
            }));
        }
        finally {
            setSavingDashboardPrefs(false);
        }
    };
    return (<div className="mx-auto max-w-4xl space-y-7">
      <section className="hero-panel rounded-xl p-6 md:p-7 animate-in-soft">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Profile and Preferences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account name and notification settings for your {isFaculty ? 'faculty' : 'student'} account.
          </p>

          <div className="subtle-panel mt-5 rounded-xl p-4">
            <p className="mb-2 poster-label">Account Email</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground"/>
              {profile?.email ?? 'Loading...'}
            </p>
          </div>

          <div className="subtle-panel mt-3 rounded-xl p-4">
            <p className="mb-2 poster-label">University</p>
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-muted-foreground"/>
              {profile?.university?.name ?? 'Not linked to a university'}
            </p>
            {!profile?.university && profile?.email && (<p className="mt-1.5 text-xs text-muted-foreground">
                Your email domain isn&apos;t associated with a registered university yet. Contact your admin.
              </p>)}
          </div>

          {error && (<p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </p>)}
          {success && (<p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {success}
            </p>)}
        </div>
      </section>

      <section className="panel-card overflow-hidden rounded-xl animate-in-up stagger-1">
        <button type="button" aria-expanded={openSections.details} onClick={() => toggleSection('details')} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60">
          <div>
            <h2 className="text-base font-bold">Profile Details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update the name shown on your account.
            </p>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', openSections.details && 'rotate-180')}/>
        </button>

        {openSections.details && (<div className="border-t border-border/60 p-4">
            <div className="mb-4 flex justify-end">
              {!editingProfile ? (<button onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5"/>
                  Edit
                </button>) : (<Button onClick={handleProfileSave} disabled={savingProfile} size="sm" className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.12em]">
                  <Check className="h-3.5 w-3.5"/>
                  {savingProfile ? 'Saving...' : 'Save'}
                </Button>)}
            </div>

            <div className="max-w-md">
                  <label htmlFor="profile-display-name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input id="profile-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!editingProfile || savingProfile} variant="soft"/>
            </div>
          </div>)}
      </section>

      <section className="panel-card overflow-hidden rounded-xl animate-in-up stagger-2">
        <button type="button" aria-expanded={openSections.notifications} onClick={() => toggleSection('notifications')} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60">
          <div>
            <h2 className="text-base font-bold">Notification Preferences</h2>
            <p className="mt-1 text-xs text-muted-foreground">These settings are saved to your account.</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', openSections.notifications && 'rotate-180')}/>
        </button>

        {openSections.notifications && (<div className="divide-y divide-border/40 border-t border-border/60">
            {preferenceLabels.map((item, index) => (<button key={item.key} role="switch" aria-checked={!!preferences[item.key]} onClick={() => void handlePreferenceToggle(item.key)} className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50 animate-in-up" style={{ animationDelay: `${0.03 * (index + 1)}s` }} disabled={savingPrefs}>
                <span className="text-sm font-medium">{item.label}</span>
                <span aria-hidden="true" className={cn('inline-flex h-6 w-11 items-center rounded-full p-1 transition-colors', preferences[item.key] ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn('h-4 w-4 rounded-full bg-white transition-transform', preferences[item.key] ? 'translate-x-5' : 'translate-x-0')}/>
                </span>
              </button>))}
            {isStudent && (<div className="px-5 py-4">
                <div className="subtle-panel rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Saved buildings</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(preferences.buildingIds?.length ?? 0)} building{(preferences.buildingIds?.length ?? 0) === 1 ? '' : 's'} saved for your dashboard.
                      </p>
                    </div>
                    {isPageVisible('campus-map') ? (<Link href="/campus-map" className="inline-flex items-center rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-muted">
                        Manage on campus map
                      </Link>) : null}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Turn on Building Alerts above if you want notifications when a saved building closes, changes status, or gets a new building announcement.
                  </p>
                </div>
              </div>)}
          </div>)}
      </section>

      <section className="panel-card overflow-hidden rounded-xl animate-in-up stagger-3">
        <button type="button" aria-expanded={openSections.dashboard} onClick={() => toggleSection('dashboard')} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary"/>
              <h2 className="text-base font-bold">Customize Dashboard</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {visibleDashboardModules.length} of {dashboardModuleIds.length} sections visible. Changes save to your account automatically.
            </p>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', openSections.dashboard && 'rotate-180')}/>
        </button>

        {openSections.dashboard && (<div className="border-t border-border/60 px-5 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Turn dashboard sections on or off. Your home dashboard will reflect these changes the next time it renders.
              </p>
              <button type="button" onClick={() => void handleDashboardReset()} disabled={savingDashboardPrefs} className="shrink-0 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-muted disabled:opacity-60">
                Reset
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {dashboardModuleConfig.map((module) => {
                const enabled = dashboardPreferences[module.id];
                return (<button key={module.id} type="button" aria-pressed={enabled} onClick={() => void handleDashboardModuleToggle(module.id)} disabled={savingDashboardPrefs} className={cn('min-h-11 rounded-lg border px-4 py-3.5 text-left transition-colors disabled:opacity-60', enabled
                        ? 'border-primary/35 bg-secondary text-foreground'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted')}>
                    <p className="text-sm font-semibold">{module.label}</p>
                    <p className="mt-1 text-[11px]">{enabled ? 'Visible on dashboard' : 'Hidden from dashboard'}</p>
                  </button>);
            })}
            </div>
          </div>)}
      </section>

      <ThemeSelector open={openSections.appearance} onToggle={() => toggleSection('appearance')}/>
    </div>);
}
function ThemeSelector({ open, onToggle, }) {
    const { themeMode, setThemeMode } = useUniversityTheme();
    const themeOptions = [
        {
            id: 'light',
            label: 'Light',
            description: 'Clean light appearance',
            icon: <Sun className="h-5 w-5"/>,
        },
        {
            id: 'dark',
            label: 'Dark',
            description: 'Easy on the eyes',
            icon: <Moon className="h-5 w-5"/>,
        },
        {
            id: 'system',
            label: 'System',
            description: 'Match your device',
            icon: <Monitor className="h-5 w-5"/>,
        },
    ];
    return (<section className="panel-card overflow-hidden rounded-xl animate-in-up stagger-4">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60">
        <div>
          <h2 className="text-base font-bold">Appearance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose how PocketQuad looks for you. Your preference is saved across sessions.
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true"/>
      </button>

      {open && (
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4">
            {themeOptions.map((option) => (<button key={option.id} type="button" aria-pressed={themeMode === option.id} onClick={() => setThemeMode(option.id)} className={cn('flex min-h-11 flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-card/55', themeMode === option.id
                    ? 'border-primary/35 bg-secondary ring-1 ring-primary/20'
                    : 'border-border/60 bg-card')}>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors', themeMode === option.id ? 'bg-card text-primary' : 'bg-muted text-muted-foreground')} aria-hidden="true">
                  {option.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-[11px] text-muted-foreground">{option.description}</p>
                </div>
                {themeMode === option.id && (<div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary" aria-hidden="true">
                    <Check className="h-3 w-3 text-primary-foreground"/>
                  </div>)}
              </button>))}
          </div>
      )}
    </section>);
}
