'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Check,
  Clock,
  Heart,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react'

import {
  ChoiceTile,
  DayChip,
  OnboardingShell,
  SearchField,
  SelectionRow,
  StatusPill,
  StepCard,
  StepFooter,
  StepHeader,
  StepToggle,
} from '@/components/onboarding/OnboardingShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import { getHomeForRole } from '@/lib/auth/routing'
import { useUniversityTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

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

type OnboardingStep = 'welcome' | 'faculty' | 'buildings' | 'clubs' | 'theme' | 'officeHours'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const THEME_OPTIONS = [
  {
    value: 'light' as const,
    label: 'Light',
    description: 'Bright surfaces with clear structure.',
    icon: <Sun className="h-5 w-5" />,
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    description: 'A lower-glare look for longer sessions.',
    icon: <Moon className="h-5 w-5" />,
  },
  {
    value: 'system' as const,
    label: 'System',
    description: 'Follow your device preference automatically.',
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    value: 'university' as const,
    label: 'University',
    description: 'Use your school colors when available.',
    icon: <Palette className="h-5 w-5" />,
  },
]

export default function OnboardingPage() {
  const { profile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  const isFaculty = profile?.role === 'FACULTY'

  const studentSteps: OnboardingStep[] = ['welcome', 'faculty', 'buildings', 'clubs', 'theme']
  const facultySteps: OnboardingStep[] = ['welcome', 'officeHours', 'theme']
  const steps = isFaculty ? facultySteps : studentSteps

  const [currentStepIdx, setCurrentStepIdx] = React.useState(0)
  const [direction, setDirection] = React.useState<'forward' | 'backward'>('forward')

  const [favoriteFacultyIds, setFavoriteFacultyIds] = React.useState<string[]>([])
  const [buildingAlerts, setBuildingAlerts] = React.useState(false)
  const [selectedBuildingIds, setSelectedBuildingIds] = React.useState<string[]>([])
  const [selectedClubIds, setSelectedClubIds] = React.useState<string[]>([])
  const [selectedTheme, setSelectedTheme] = React.useState<'system' | 'light' | 'dark' | 'university'>('system')

  const [officeHours, setOfficeHours] = React.useState<Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    location: string
    mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  }>>([])

  const [facultyList, setFacultyList] = React.useState<Faculty[]>([])
  const [buildingList, setBuildingList] = React.useState<CampusBuilding[]>([])
  const [clubList, setClubList] = React.useState<Club[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [authChecked, setAuthChecked] = React.useState(false)

  const currentStep = steps[currentStepIdx]

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

  React.useEffect(() => {
    setSearchQuery('')
  }, [currentStepIdx])

  const goNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setDirection('forward')
      setCurrentStepIdx((index) => index + 1)
    }
  }

  const goBack = () => {
    if (currentStepIdx > 0) {
      setDirection('backward')
      setCurrentStepIdx((index) => index - 1)
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
      // Continue anyway.
    }
    router.push(getHomeForRole(profile))
    router.refresh()
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Preparing your setup...</p>
        </div>
      </div>
    )
  }

  const isLastStep = currentStepIdx === steps.length - 1

  return (
    <OnboardingShell
      currentStep={currentStepIdx}
      totalSteps={steps.length}
      footer={
        <StepFooter
          onBack={goBack}
          onSkip={skipOnboarding}
          onNext={isLastStep ? finishOnboarding : goNext}
          disableBack={currentStepIdx === 0 || submitting}
          disableNext={submitting}
          isLastStep={isLastStep}
          submitting={submitting}
        />
      }
    >
      <StepCard direction={direction}>
        {currentStep === 'welcome' ? (
          <WelcomeStep name={profile.firstName} role={profile.role} />
        ) : null}
        {currentStep === 'faculty' ? (
          <FacultyStep
            facultyList={facultyList}
            selected={favoriteFacultyIds}
            onToggle={(id) =>
              setFavoriteFacultyIds((previous) =>
                previous.includes(id) ? previous.filter((facultyId) => facultyId !== id) : [...previous, id],
              )
            }
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />
        ) : null}
        {currentStep === 'buildings' ? (
          <BuildingsStep
            buildings={buildingList}
            enabled={buildingAlerts}
            onToggle={setBuildingAlerts}
            selected={selectedBuildingIds}
            onSelect={(id) =>
              setSelectedBuildingIds((previous) =>
                previous.includes(id) ? previous.filter((buildingId) => buildingId !== id) : [...previous, id],
              )
            }
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />
        ) : null}
        {currentStep === 'clubs' ? (
          <ClubsStep
            clubs={clubList}
            selected={selectedClubIds}
            onToggle={(id) =>
              setSelectedClubIds((previous) =>
                previous.includes(id) ? previous.filter((clubId) => clubId !== id) : [...previous, id],
              )
            }
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />
        ) : null}
        {currentStep === 'theme' ? (
          <ThemeStep selected={selectedTheme} onSelect={setSelectedTheme} />
        ) : null}
        {currentStep === 'officeHours' ? (
          <OfficeHoursStep officeHours={officeHours} onChange={setOfficeHours} />
        ) : null}
      </StepCard>
    </OnboardingShell>
  )
}

function WelcomeStep({ name, role }: { name: string; role: string }) {
  const highlights =
    role === 'FACULTY'
      ? [
          {
            title: 'Set office hours',
            description: 'Publish your weekly availability so students know where to find you.',
          },
          {
            title: 'Use campus tools',
            description: 'Access faculty workflows, updates, and resource links from one place.',
          },
          {
            title: 'Keep your theme',
            description: 'Choose a look that fits your day, including university colors as an option.',
          },
        ]
      : [
          {
            title: 'Follow faculty',
            description: 'Keep your most relevant professors easy to find as the term gets busy.',
          },
          {
            title: 'Track important places',
            description: 'Watch key buildings and get closure alerts when campus operations change.',
          },
          {
            title: 'Personalize the app',
            description: 'Choose clubs and a visual theme so PocketQuad feels tailored from day one.',
          },
        ]

  return (
    <div className="space-y-6">
      <StepHeader
        badge="Welcome"
        icon={<Sparkles className="h-5 w-5" />}
        title={`Hey ${name}`}
        description={
          role === 'FACULTY'
            ? 'We will get your faculty profile ready in a couple of quick steps.'
            : 'We will tune PocketQuad to the people, places, and communities you care about most.'
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {highlights.map((highlight) => (
          <div key={highlight.title} className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-surface">
            <Badge variant="subtle">{highlight.title}</Badge>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{highlight.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FacultyStep({
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
  onSearch: (query: string) => void
}) {
  const filtered = facultyList.filter(
    (faculty) =>
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faculty.department ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <StepHeader
        badge="Favorite Faculty"
        icon={<Heart className="h-5 w-5" />}
        title="Choose faculty to follow"
        description="Pick professors you want quick access to for updates, office hours, and contact info."
      />

      <SearchField value={searchQuery} onChange={onSearch} placeholder="Search faculty by name or department" />

      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <EmptyState label="No faculty found." />
        ) : (
          filtered.map((faculty) => {
            const isSelected = selected.includes(faculty.id)

            return (
              <SelectionRow
                key={faculty.id}
                selected={isSelected}
                onClick={() => onToggle(faculty.id)}
                leading={
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}>
                    {faculty.name.charAt(0)}
                  </div>
                }
                title={faculty.name}
                description={faculty.department ?? faculty.title ?? 'Faculty member'}
                trailing={isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              />
            )
          })
        )}
      </div>

      {selected.length > 0 ? (
        <p className="text-sm text-muted-foreground">{selected.length} faculty selected</p>
      ) : null}
    </div>
  )
}

function BuildingsStep({
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
  onToggle: (next: boolean) => void
  selected: string[]
  onSelect: (id: string) => void
  searchQuery: string
  onSearch: (query: string) => void
}) {
  const filtered = buildings.filter(
    (building) =>
      building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (building.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <StepHeader
        badge="Building Alerts"
        icon={<Building2 className="h-5 w-5" />}
        title="Keep an eye on campus spaces"
        description="Turn on alerts for building closures, service changes, and the places you depend on most."
      />

      <StepToggle
        enabled={enabled}
        onToggle={onToggle}
        title="Enable building closure alerts"
        description="Receive updates when important buildings close or change operating status."
      />

      {enabled ? (
        <>
          <SearchField value={searchQuery} onChange={onSearch} placeholder="Search buildings by name or code" />

          <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <EmptyState label="No buildings found." />
            ) : (
              filtered.map((building) => {
                const isSelected = selected.includes(building.id)

                return (
                  <SelectionRow
                    key={building.id}
                    selected={isSelected}
                    onClick={() => onSelect(building.id)}
                    leading={
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}>
                        <Building2 className="h-4 w-4" />
                      </div>
                    }
                    title={building.name}
                    description={building.code ?? building.category ?? 'Campus building'}
                    trailing={isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  />
                )
              })
            )}
          </div>

          {selected.length > 0 ? (
            <p className="text-sm text-muted-foreground">{selected.length} buildings selected</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function ClubsStep({
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
  onSearch: (query: string) => void
}) {
  const filtered = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.category ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <StepHeader
        badge="Club Interests"
        icon={<Users className="h-5 w-5" />}
        title="Pick the communities that matter"
        description="Following clubs makes it easier to see activity, events, and organizations you may want to join."
      />

      <SearchField value={searchQuery} onChange={onSearch} placeholder="Search clubs by name or category" />

      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <EmptyState label="No clubs found." />
        ) : (
          filtered.map((club) => {
            const isSelected = selected.includes(club.id)

            return (
              <SelectionRow
                key={club.id}
                selected={isSelected}
                onClick={() => onToggle(club.id)}
                leading={
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}>
                    {club.name.charAt(0)}
                  </div>
                }
                title={club.name}
                description={club.description ?? 'Student club'}
                meta={club.category ? <Badge variant="subtle">{club.category}</Badge> : null}
                trailing={isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              />
            )
          })
        )}
      </div>

      {selected.length > 0 ? (
        <p className="text-sm text-muted-foreground">{selected.length} clubs selected</p>
      ) : null}
    </div>
  )
}

function ThemeStep({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (theme: 'system' | 'light' | 'dark' | 'university') => void
}) {
  const { universityColors, universityName } = useUniversityTheme()

  return (
    <div className="space-y-5">
      <StepHeader
        badge="Appearance"
        icon={<Palette className="h-5 w-5" />}
        title="Choose your visual theme"
        description="Pick the presentation you want to use by default. You can always change this later in settings."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_OPTIONS.map((theme) => {
          const isUniversity = theme.value === 'university'
          const detail = isUniversity && universityColors ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-3 w-3 rounded-full border border-border/70"
                  style={{ backgroundColor: universityColors.mainColor }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-border/70"
                  style={{ backgroundColor: universityColors.accentColor }}
                />
              </span>
              {universityName ? `${universityName} colors` : 'School palette ready'}
            </span>
          ) : isUniversity ? (
            'Uses your university palette when your school has configured one.'
          ) : undefined

          return (
            <ChoiceTile
              key={theme.value}
              selected={selected === theme.value}
              onClick={() => onSelect(theme.value)}
              icon={theme.icon}
              title={theme.label}
              description={theme.description}
              detail={detail}
            />
          )
        })}
      </div>
    </div>
  )
}

function OfficeHoursStep({
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
  onChange: (hours: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    location: string
    mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  }>) => void
}) {
  const addSlot = (dayOfWeek: number) => {
    onChange([
      ...officeHours,
      { dayOfWeek, startTime: '09:00', endTime: '10:00', location: '', mode: 'IN_PERSON' },
    ])
  }

  const removeSlot = (index: number) => {
    onChange(officeHours.filter((_, slotIndex) => slotIndex !== index))
  }

  const updateSlot = (index: number, field: string, value: string | number) => {
    onChange(
      officeHours.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    )
  }

  return (
    <div className="space-y-5">
      <StepHeader
        badge="Office Hours"
        icon={<Clock className="h-5 w-5" />}
        title="Set your weekly availability"
        description="Choose the days and times students can expect to find you, then add the location or meeting mode."
      />

      <div className="flex flex-wrap gap-2">
        {DAYS.map((day, index) => {
          const hasSlot = officeHours.some((slot) => slot.dayOfWeek === index)

          return (
            <DayChip key={day} selected={hasSlot} onClick={() => !hasSlot && addSlot(index)}>
              {day}
            </DayChip>
          )
        })}
      </div>

      <div className="space-y-3">
        {officeHours.length === 0 ? (
          <EmptyState label="Pick a day above to add office hours." />
        ) : (
          officeHours.map((slot, index) => (
            <div key={index} className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-surface">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="section">{DAYS[slot.dayOfWeek]}</Badge>
                  <StatusPill variant="granted">{slot.mode.replace('_', ' ')}</StatusPill>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSlot(index)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input
                  type="time"
                  value={slot.startTime}
                  onChange={(event) => updateSlot(index, 'startTime', event.target.value)}
                  variant="soft"
                  inputSize="lg"
                  className="[color-scheme:light] dark:[color-scheme:dark]"
                />
                <Input
                  type="time"
                  value={slot.endTime}
                  onChange={(event) => updateSlot(index, 'endTime', event.target.value)}
                  variant="soft"
                  inputSize="lg"
                  className="[color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={slot.location}
                    onChange={(event) => updateSlot(index, 'location', event.target.value)}
                    placeholder="Location (optional)"
                    variant="soft"
                    inputSize="lg"
                    className="pl-11"
                  />
                </div>

                <select
                  value={slot.mode}
                  onChange={(event) => updateSlot(index, 'mode', event.target.value)}
                  className="h-12 rounded-2xl border border-border/70 bg-background/90 px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 hover:border-primary/15 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
