'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Heart, Building2, Users, Palette, ArrowRight, ArrowLeft,
  Check, Search, X, Clock, MapPin, Sparkles, ChevronRight,
} from 'lucide-react'

import { apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import { getHomeForRole } from '@/lib/auth/routing'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Faculty = {
  id: string
  name: string
  title: string | null
  department: string | null
  imageUrl: string | null
}

type CampusBuilding = {
  id: string
  name: string
  code: string | null
  category: string | null
}

type Club = {
  id: string
  name: string
  category: string | null
  description: string | null
}

type OnboardingStep = 'welcome' | 'faculty' | 'buildings' | 'clubs' | 'theme' | 'officeHours' | 'permissions'

type UserProfileForPermissions = {
  portalPermissions: string[]
  role: string
  managedClubs?: Array<{ clubId: string; club: { id: string; universityId: string; name: string } }> | null
}

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: '☀️', desc: 'Clean and bright' },
  { value: 'dark' as const, label: 'Dark', icon: '🌙', desc: 'Easy on the eyes' },
  { value: 'system' as const, label: 'System', icon: '💻', desc: 'Match your device' },
  { value: 'university' as const, label: 'University', icon: '🎓', desc: 'Your school colors' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const { profile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  const isStudent = profile?.role === 'STUDENT'
  const isFaculty = profile?.role === 'FACULTY'

  const studentSteps: OnboardingStep[] = ['welcome', 'faculty', 'buildings', 'clubs', 'theme']
  const facultySteps: OnboardingStep[] = ['welcome', 'officeHours', 'theme']
  const steps = isFaculty ? facultySteps : studentSteps

  const [currentStepIdx, setCurrentStepIdx] = React.useState(0)
  const [direction, setDirection] = React.useState<'forward' | 'backward'>('forward')

  // Student selections
  const [favoriteFacultyIds, setFavoriteFacultyIds] = React.useState<string[]>([])
  const [buildingAlerts, setBuildingAlerts] = React.useState(false)
  const [selectedBuildingIds, setSelectedBuildingIds] = React.useState<string[]>([])
  const [selectedClubIds, setSelectedClubIds] = React.useState<string[]>([])
  const [selectedTheme, setSelectedTheme] = React.useState<'system' | 'light' | 'dark' | 'university'>('system')

  // Faculty office hours
  const [officeHours, setOfficeHours] = React.useState<Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    location: string
    mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  }>>([])

  // Data fetching
  const [facultyList, setFacultyList] = React.useState<Faculty[]>([])
  const [buildingList, setBuildingList] = React.useState<CampusBuilding[]>([])
  const [clubList, setClubList] = React.useState<Club[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [authChecked, setAuthChecked] = React.useState(false)

  const currentStep = steps[currentStepIdx]

  // Redirect if not logged in or already onboarded.
  // When navigating here right after login/register, the auth context may not
  // have the profile yet (race condition). Attempt a refreshProfile() once
  // before giving up and redirecting to /login.
  React.useEffect(() => {
    if (loading) return

    if (!profile && !authChecked) {
      refreshProfile()
        .catch(() => {})
        .finally(() => setAuthChecked(true))
      return
    }

    if (!profile) {
      router.push('/login')
    } else if (profile.onboardingComplete) {
      router.push(getHomeForRole(profile))
    }
  }, [loading, profile, router, authChecked, refreshProfile])

  // Fetch data when reaching relevant steps
  React.useEffect(() => {
    if (currentStep === 'faculty' && facultyList.length === 0) {
      apiRequest<Faculty[]>('/api/faculty?limit=50')
        .then((res) => setFacultyList(res ?? []))
        .catch(() => {})
    }
    if (currentStep === 'buildings' && buildingList.length === 0) {
      apiRequest<CampusBuilding[]>('/api/buildings?limit=100')
        .then((res) => setBuildingList(res ?? []))
        .catch(() => {})
    }
    if (currentStep === 'clubs' && clubList.length === 0) {
      apiRequest<Club[]>('/api/clubs?limit=100')
        .then((res) => setClubList(res ?? []))
        .catch(() => {})
    }
  }, [currentStep, facultyList.length, buildingList.length, clubList.length])

  // Reset search when changing steps
  React.useEffect(() => {
    setSearchQuery('')
  }, [currentStepIdx])

  const goNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setDirection('forward')
      setCurrentStepIdx((i) => i + 1)
    }
  }

  const goBack = () => {
    if (currentStepIdx > 0) {
      setDirection('backward')
      setCurrentStepIdx((i) => i - 1)
    }
  }

  const finishOnboarding = async () => {
    setSubmitting(true)
    try {
      await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: {
          favoriteFacultyIds,
          buildingAlerts,
          buildingIds: selectedBuildingIds,
          clubInterestIds: selectedClubIds,
          theme: selectedTheme,
          officeHours,
        },
      })
      await refreshProfile()
      router.push(getHomeForRole(profile))
      router.refresh()
    } catch {
      // Still navigate on error — onboarding is not blocking
      router.push(getHomeForRole(profile))
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const skipOnboarding = async () => {
    setSubmitting(true)
    try {
      await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: { theme: 'system' },
      })
      await refreshProfile()
    } catch {
      // continue anyway
    }
    router.push(getHomeForRole(profile))
    router.refresh()
  }

  const isLastStep = currentStepIdx === steps.length - 1

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <Image src="/transparentlogo.png" alt="PocketQuad" width={40} height={40} className="rounded-xl" />
          <span className="font-display text-2xl font-black text-white">
            Pocket<span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Quad</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= currentStepIdx ? 'w-10 bg-gradient-to-r from-blue-400 to-cyan-400' : 'w-6 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Card container with animation */}
        <div className="w-full max-w-lg">
          <div
            key={currentStep}
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 ${
              direction === 'forward'
                ? 'animate-[slideInRight_0.3s_ease-out]'
                : 'animate-[slideInLeft_0.3s_ease-out]'
            }`}
          >
            <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />

            <div className="relative">
              {currentStep === 'welcome' && <WelcomeCard name={profile.firstName} role={profile.role} />}
              {currentStep === 'faculty' && (
                <FacultyPickerCard
                  facultyList={facultyList}
                  selected={favoriteFacultyIds}
                  onToggle={(id) =>
                    setFavoriteFacultyIds((prev) =>
                      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
                    )
                  }
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                />
              )}
              {currentStep === 'buildings' && (
                <BuildingAlertCard
                  buildings={buildingList}
                  enabled={buildingAlerts}
                  onToggle={setBuildingAlerts}
                  selected={selectedBuildingIds}
                  onSelect={(id) =>
                    setSelectedBuildingIds((prev) =>
                      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
                    )
                  }
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                />
              )}
              {currentStep === 'clubs' && (
                <ClubInterestCard
                  clubs={clubList}
                  selected={selectedClubIds}
                  onToggle={(id) =>
                    setSelectedClubIds((prev) =>
                      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
                    )
                  }
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                />
              )}
              {currentStep === 'theme' && (
                <ThemeCard selected={selectedTheme} onSelect={setSelectedTheme} />
              )}
              {currentStep === 'officeHours' && (
                <OfficeHoursCard officeHours={officeHours} onChange={setOfficeHours} />
              )}
              {currentStep === 'permissions' && <PermissionsCard profile={profile} />}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex w-full max-w-lg items-center justify-between gap-3">
          <button
            onClick={goBack}
            disabled={currentStepIdx === 0 || submitting}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={skipOnboarding}
            disabled={submitting}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Skip for now
          </button>

          <button
            onClick={isLastStep ? finishOnboarding : goNext}
            disabled={submitting}
            className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finishing...
              </>
            ) : isLastStep ? (
              <>
                Let&apos;s Go! <Sparkles className="h-4 w-4" />
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global animation keyframes */}
      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Welcome Card                                                        */
/* ------------------------------------------------------------------ */

function WelcomeCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
        <Sparkles className="h-7 w-7 text-blue-400" />
      </div>
      <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
        Hey {name}! 👋
      </h2>
      <p className="mt-3 text-sm text-blue-200/50 max-w-sm mx-auto leading-relaxed">
        {role === 'FACULTY'
          ? "Let's set up your faculty profile. We'll walk you through configuring your office hours and preferences."
          : "Let's personalize your experience. Pick your favorite faculty, buildings to watch, clubs to follow, and choose your theme."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        {['⚡ Quick Setup', '🎨 Personalized', '🔔 Smart Alerts'].map((badge) => (
          <span
            key={badge}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-blue-200/60"
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Faculty Picker Card                                                 */
/* ------------------------------------------------------------------ */

function FacultyPickerCard({
  facultyList,
  selected,
  onToggle,
  searchQuery,
  onSearch,
}: {
  facultyList: Faculty[]
  selected: string[]
  onToggle: (id: string) => void
  searchQuery: string
  onSearch: (q: string) => void
}) {
  const filtered = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.department ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 border border-pink-400/30">
          <Heart className="h-5 w-5 text-pink-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Favorite Faculty</h3>
          <p className="text-xs text-blue-200/40">Follow professors for updates & office hours</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search faculty..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
        />
      </div>

      <div className="max-h-[280px] space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">No faculty found</p>
        ) : (
          filtered.map((f) => {
            const isSelected = selected.includes(f.id)
            return (
              <button
                key={f.id}
                onClick={() => onToggle(f.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-pink-400/40 bg-pink-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected ? 'bg-pink-500/20 text-pink-300' : 'bg-white/10 text-white/50'
                }`}>
                  {f.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>{f.name}</p>
                  {f.department && <p className="text-[11px] text-white/30 truncate">{f.department}</p>}
                </div>
                {isSelected && <Check className="h-4 w-4 text-pink-400 shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-xs text-pink-300/60 text-center">{selected.length} faculty selected</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Building Alert Card                                                 */
/* ------------------------------------------------------------------ */

function BuildingAlertCard({
  buildings,
  enabled,
  onToggle,
  selected,
  onSelect,
  searchQuery,
  onSearch,
}: {
  buildings: CampusBuilding[]
  enabled: boolean
  onToggle: (v: boolean) => void
  selected: string[]
  onSelect: (id: string) => void
  searchQuery: string
  onSearch: (q: string) => void
}) {
  const filtered = buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-400/30">
          <Building2 className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Building Alerts</h3>
          <p className="text-xs text-blue-200/40">Get notified about closures & status changes</p>
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(!enabled)}
        className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
          enabled ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <span className="text-sm font-medium text-white">Enable building closure alerts</span>
        <div className={`relative h-6 w-11 rounded-full transition-all ${enabled ? 'bg-amber-500' : 'bg-white/15'}`}>
          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </div>
      </button>

      {enabled && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search buildings..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
            />
          </div>

          <div className="max-h-[220px] space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
            {filtered.map((b) => {
              const isSelected = selected.includes(b.id)
              return (
                <button
                  key={b.id}
                  onClick={() => onSelect(b.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'border-amber-400/40 bg-amber-500/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                  }`}
                >
                  <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-white/30'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>{b.name}</p>
                    {b.code && <p className="text-[11px] text-white/30">{b.code}</p>}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                </button>
              )
            })}
          </div>

          {selected.length > 0 && (
            <p className="mt-3 text-xs text-amber-300/60 text-center">{selected.length} buildings selected</p>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Club Interest Card                                                  */
/* ------------------------------------------------------------------ */

function ClubInterestCard({
  clubs,
  selected,
  onToggle,
  searchQuery,
  onSearch,
}: {
  clubs: Club[]
  selected: string[]
  onToggle: (id: string) => void
  searchQuery: string
  onSearch: (q: string) => void
}) {
  const filtered = clubs.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.category ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30">
          <Users className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Club Interests</h3>
          <p className="text-xs text-blue-200/40">Follow clubs you&apos;re interested in</p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search clubs..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20"
        />
      </div>

      <div className="max-h-[280px] space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">No clubs found</p>
        ) : (
          filtered.map((c) => {
            const isSelected = selected.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'
                }`}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>{c.name}</p>
                  {c.category && (
                    <span className="inline-block rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">{c.category}</span>
                  )}
                </div>
                {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
              </button>
            )
          })
        )}
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-xs text-emerald-300/60 text-center">{selected.length} clubs selected</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Theme Card                                                          */
/* ------------------------------------------------------------------ */

function ThemeCard({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (theme: 'system' | 'light' | 'dark' | 'university') => void
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-400/30">
          <Palette className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Choose Your Theme</h3>
          <p className="text-xs text-blue-200/40">You can always change this later in settings</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.value
          return (
            <button
              key={theme.value}
              onClick={() => onSelect(theme.value)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all ${
                isSelected
                  ? 'border-violet-400/50 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-violet-400" />
                </div>
              )}
              <span className="text-3xl">{theme.icon}</span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/60'}`}>{theme.label}</span>
              <span className="text-[11px] text-white/30">{theme.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Office Hours Card (Faculty)                                         */
/* ------------------------------------------------------------------ */

function OfficeHoursCard({
  officeHours,
  onChange,
}: {
  officeHours: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    location: string
    mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  }>
  onChange: (hours: typeof officeHours) => void
}) {
  const addSlot = (dayOfWeek: number) => {
    onChange([
      ...officeHours,
      { dayOfWeek, startTime: '09:00', endTime: '10:00', location: '', mode: 'IN_PERSON' },
    ])
  }

  const removeSlot = (index: number) => {
    onChange(officeHours.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: string, value: string | number) => {
    onChange(
      officeHours.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      ),
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/30">
          <Clock className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Office Hours</h3>
          <p className="text-xs text-blue-200/40">Set your weekly availability for students</p>
        </div>
      </div>

      {/* Day chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {DAYS.map((day, i) => {
          const hasSlot = officeHours.some((oh) => oh.dayOfWeek === i)
          return (
            <button
              key={day}
              onClick={() => !hasSlot && addSlot(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                hasSlot
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Slots */}
      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
        {officeHours.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-white/15 mb-2" />
            <p className="text-xs text-white/30">Tap a day above to add office hours</p>
            <p className="text-[10px] text-white/20 mt-1">You can always add more later</p>
          </div>
        ) : (
          officeHours.map((slot, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">{DAYS[slot.dayOfWeek]}</span>
                <button onClick={() => removeSlot(i)} className="text-white/30 hover:text-red-400 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400/50 [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400/50 [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={slot.location}
                  onChange={(e) => updateSlot(i, 'location', e.target.value)}
                  placeholder="Location (optional)"
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/20"
                />
                <select
                  value={slot.mode}
                  onChange={(e) => updateSlot(i, 'mode', e.target.value)}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] text-white outline-none [color-scheme:dark]"
                >
                  <option value="IN_PERSON">In Person</option>
                  <option value="VIRTUAL">Virtual</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Permissions Card (Faculty)                                          */
/* ------------------------------------------------------------------ */

function PermissionsCard({ profile }: { profile: UserProfileForPermissions }) {
  const canAnnounce = profile.portalPermissions.includes('CAN_PUBLISH_ANNOUNCEMENTS')
  const hasClubs = (profile.managedClubs?.length ?? 0) > 0

  const permissions = [
    { key: 'announce', label: 'Campus Announcements', desc: 'Publish announcements to all students', granted: canAnnounce },
    { key: 'clubs', label: 'Club Management', desc: 'Manage assigned student organizations', granted: hasClubs },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/30">
          <ChevronRight className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Your Permissions</h3>
          <p className="text-xs text-blue-200/40">What you can do in PocketQuad</p>
        </div>
      </div>

      <div className="space-y-3">
        {permissions.map((perm) => (
          <div
            key={perm.key}
            className={`rounded-xl border p-4 transition-all ${
              perm.granted ? 'border-cyan-400/30 bg-cyan-500/10' : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-semibold ${perm.granted ? 'text-white' : 'text-white/40'}`}>{perm.label}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{perm.desc}</p>
              </div>
              {perm.granted ? (
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-[10px] font-bold text-cyan-300">GRANTED</span>
              ) : (
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/30">NOT ASSIGNED</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-white/20 text-center">
        Permissions are managed by your university admin. Contact them for changes.
      </p>
    </div>
  )
}
