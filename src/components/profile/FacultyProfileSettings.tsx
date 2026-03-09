'use client'

import React from 'react'
import {
  Accessibility,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  Megaphone,
  Plus,
  Save,
  Sparkles,
  Tag,
  UserRound,
  X,
} from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import { getStudentFacingFacultyAvailabilityTone } from '@/lib/faculty'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type FacultyStatus = 'AVAILABLE' | 'LIMITED' | 'AWAY'
type BuildingStatus = 'OPEN' | 'CLOSED' | 'LIMITED'
type EventCategory =
  | 'ACADEMIC'
  | 'SOCIAL'
  | 'SPORTS'
  | 'ARTS'
  | 'CAREER'
  | 'CLUBS'
  | 'WELLNESS'
  | 'OTHER'

type FacultyProfilePayload = {
  id: string
  name: string
  title: string
  department: string
  email: string
  phone: string | null
  officeLocation: string
  officeHours: string
  bio: string | null
  tags: string[]
  availabilityStatus: FacultyStatus
  availabilityNote: string | null
  studentAvailabilityLabel: string
  studentAvailabilityState: 'AVAILABLE' | 'LIMITED' | 'AWAY' | 'OUT_OF_OFFICE_HOURS' | 'TBD'
}

type FacultyProfileDraft = {
  displayName: string
  title: string
  department: string
  officeLocation: string
  bio: string
  phone: string
  tags: string[]
}

type BuildingAnnouncementRecord = {
  id: string
  title: string
  message: string
  createdAt: string
  expiresAt: string | null
}

type BuildingEventRecord = {
  id: string
  title: string
  date: string
  time: string
  category: EventCategory
}

type ManagedBuildingRecord = {
  id: string
  name: string
  type: string
  address: string
  operatingHours: string | null
  operationalStatus: BuildingStatus
  operationalNote: string | null
  operationalUpdatedAt: string | null
  accessibilityNotes: string | null
  isManaged: boolean
  announcements: BuildingAnnouncementRecord[]
  upcomingEvents: BuildingEventRecord[]
}

type BuildingManagementResponse = {
  availableBuildings: ManagedBuildingRecord[]
  managedBuildings: ManagedBuildingRecord[]
}

type BuildingDraft = {
  operatingHours: string
  operationalStatus: BuildingStatus
  operationalNote: string
  accessibilityNotes: string
}

type BuildingAnnouncementDraft = {
  title: string
  message: string
  expiresAt: string
}

type BuildingEventDraft = {
  title: string
  description: string
  date: string
  time: string
  location: string
  category: EventCategory
  maxAttendees: string
}

const emptyDraft: FacultyProfileDraft = {
  displayName: '',
  title: '',
  department: '',
  officeLocation: '',
  bio: '',
  phone: '',
  tags: [],
}

const emptyBuildingDraft: BuildingDraft = {
  operatingHours: '',
  operationalStatus: 'OPEN',
  operationalNote: '',
  accessibilityNotes: '',
}

const emptyAnnouncementDraft: BuildingAnnouncementDraft = {
  title: '',
  message: '',
  expiresAt: '',
}

const toneClasses = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'border-border/60 bg-muted/20 text-muted-foreground',
} as const

const buildingStatusTone: Record<BuildingStatus, string> = {
  OPEN: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LIMITED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

const eventCategories: EventCategory[] = [
  'ACADEMIC',
  'SOCIAL',
  'SPORTS',
  'ARTS',
  'CAREER',
  'CLUBS',
  'WELLNESS',
  'OTHER',
]

function toBuildingDraft(building: ManagedBuildingRecord | null): BuildingDraft {
  if (!building) {
    return emptyBuildingDraft
  }

  return {
    operatingHours: building.operatingHours ?? '',
    operationalStatus: building.operationalStatus,
    operationalNote: building.operationalNote ?? '',
    accessibilityNotes: building.accessibilityNotes ?? '',
  }
}

function toEventDraft(building: ManagedBuildingRecord | null): BuildingEventDraft {
  return {
    title: '',
    description: '',
    date: '',
    time: '12:00',
    location: building ? `${building.name} · ${building.address}` : '',
    category: 'OTHER',
    maxAttendees: '',
  }
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function FacultyProfileSettings() {
  const { profile, refreshProfile } = useAuth()

  const [faculty, setFaculty] = React.useState<FacultyProfilePayload | null>(null)
  const [draft, setDraft] = React.useState<FacultyProfileDraft>(emptyDraft)
  const [tagInput, setTagInput] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [buildingData, setBuildingData] = React.useState<BuildingManagementResponse | null>(null)
  const [buildingsLoading, setBuildingsLoading] = React.useState(true)
  const [buildingSearch, setBuildingSearch] = React.useState('')
  const [selectedBuildingId, setSelectedBuildingId] = React.useState('')
  const [buildingDraft, setBuildingDraft] = React.useState<BuildingDraft>(emptyBuildingDraft)
  const [announcementDraft, setAnnouncementDraft] =
    React.useState<BuildingAnnouncementDraft>(emptyAnnouncementDraft)
  const [eventDraft, setEventDraft] = React.useState<BuildingEventDraft>(toEventDraft(null))
  const [buildingError, setBuildingError] = React.useState<string | null>(null)
  const [buildingSuccess, setBuildingSuccess] = React.useState<string | null>(null)
  const [savingBuildingId, setSavingBuildingId] = React.useState<string | null>(null)
  const [claimingBuildingId, setClaimingBuildingId] = React.useState<string | null>(null)
  const [releasingBuildingId, setReleasingBuildingId] = React.useState<string | null>(null)
  const [publishingBuildingId, setPublishingBuildingId] = React.useState<string | null>(null)
  const [creatingEventBuildingId, setCreatingEventBuildingId] = React.useState<string | null>(null)

  const getErrorMessage = React.useCallback(
    (value: unknown, fallback: string) =>
      value instanceof ApiClientError ? value.message : fallback,
    [],
  )

  const loadFacultyProfile = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiRequest<FacultyProfilePayload>('/api/faculty/me')
      setFaculty(data)
      setDraft({
        displayName: data.name,
        title: data.title,
        department: data.department,
        officeLocation: data.officeLocation,
        bio: data.bio ?? '',
        phone: data.phone ?? '',
        tags: data.tags,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load faculty profile'))
      setFaculty(null)
    } finally {
      setLoading(false)
    }
  }, [getErrorMessage])

  const loadBuildingManagement = React.useCallback(async () => {
    setBuildingsLoading(true)
    setBuildingError(null)

    try {
      const data = await apiRequest<BuildingManagementResponse>('/api/faculty/buildings')
      setBuildingData(data)
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to load building management'))
      setBuildingData({
        availableBuildings: [],
        managedBuildings: [],
      })
    } finally {
      setBuildingsLoading(false)
    }
  }, [getErrorMessage])

  React.useEffect(() => {
    void loadFacultyProfile()
    void loadBuildingManagement()
  }, [loadBuildingManagement, loadFacultyProfile])

  React.useEffect(() => {
    if (!buildingData) {
      return
    }

    const selectedStillManaged = buildingData.managedBuildings.some(
      (building) => building.id === selectedBuildingId,
    )

    if (!selectedStillManaged) {
      setSelectedBuildingId(buildingData.managedBuildings[0]?.id ?? '')
    }
  }, [buildingData, selectedBuildingId])

  const selectedBuilding = React.useMemo(
    () =>
      buildingData?.managedBuildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildingData, selectedBuildingId],
  )

  React.useEffect(() => {
    setBuildingDraft(toBuildingDraft(selectedBuilding))
    setAnnouncementDraft(emptyAnnouncementDraft)
    setEventDraft(toEventDraft(selectedBuilding))
  }, [selectedBuilding])

  const filteredBuildings = React.useMemo(() => {
    const query = buildingSearch.trim().toLowerCase()
    if (!query) {
      return buildingData?.availableBuildings ?? []
    }

    return (buildingData?.availableBuildings ?? []).filter((building) =>
      `${building.name} ${building.type} ${building.address}`.toLowerCase().includes(query),
    )
  }, [buildingData?.availableBuildings, buildingSearch])

  const addTag = React.useCallback(() => {
    const nextTag = tagInput.trim().replace(/\s+/g, ' ')
    if (!nextTag) return

    setDraft((current) => {
      const exists = current.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
      if (exists || current.tags.length >= 12) {
        return current
      }

      return {
        ...current,
        tags: [...current.tags, nextTag],
      }
    })
    setTagInput('')
  }, [tagInput])

  const removeTag = (tagToRemove: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updated = await apiRequest<FacultyProfilePayload>('/api/faculty/me', {
        method: 'PATCH',
        body: draft,
      })

      setFaculty(updated)
      setDraft({
        displayName: updated.name,
        title: updated.title,
        department: updated.department,
        officeLocation: updated.officeLocation,
        bio: updated.bio ?? '',
        phone: updated.phone ?? '',
        tags: updated.tags,
      })
      await refreshProfile()
      setSuccess('Faculty profile updated')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save faculty profile'))
    } finally {
      setSaving(false)
    }
  }

  const claimBuilding = async (buildingId: string) => {
    setClaimingBuildingId(buildingId)
    setBuildingError(null)
    setBuildingSuccess(null)

    try {
      await apiRequest('/api/faculty/buildings', {
        method: 'POST',
        body: { buildingId },
      })
      await loadBuildingManagement()
      setSelectedBuildingId(buildingId)
      setBuildingSuccess('Building manager access added')
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to add building manager access'))
    } finally {
      setClaimingBuildingId(null)
    }
  }

  const releaseBuilding = async (buildingId: string) => {
    setReleasingBuildingId(buildingId)
    setBuildingError(null)
    setBuildingSuccess(null)

    try {
      await apiRequest(`/api/faculty/buildings/${buildingId}`, {
        method: 'DELETE',
      })
      await loadBuildingManagement()
      setBuildingSuccess('Building manager access removed')
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to remove building manager access'))
    } finally {
      setReleasingBuildingId(null)
    }
  }

  const saveBuilding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBuilding) return

    setSavingBuildingId(selectedBuilding.id)
    setBuildingError(null)
    setBuildingSuccess(null)

    try {
      await apiRequest(`/api/faculty/buildings/${selectedBuilding.id}`, {
        method: 'PATCH',
        body: buildingDraft,
      })
      await loadBuildingManagement()
      setBuildingSuccess('Building status saved')
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to save building status'))
    } finally {
      setSavingBuildingId(null)
    }
  }

  const publishBuildingAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBuilding) return

    setPublishingBuildingId(selectedBuilding.id)
    setBuildingError(null)
    setBuildingSuccess(null)

    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: {
          title: announcementDraft.title,
          message: announcementDraft.message,
          scope: 'BUILDING',
          buildingId: selectedBuilding.id,
          expiresAt: announcementDraft.expiresAt || undefined,
        },
      })
      setAnnouncementDraft(emptyAnnouncementDraft)
      await loadBuildingManagement()
      setBuildingSuccess('Building alert published')
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to publish building alert'))
    } finally {
      setPublishingBuildingId(null)
    }
  }

  const createBuildingEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedBuilding) return

    setCreatingEventBuildingId(selectedBuilding.id)
    setBuildingError(null)
    setBuildingSuccess(null)

    try {
      await apiRequest('/api/events', {
        method: 'POST',
        body: {
          title: eventDraft.title,
          description: eventDraft.description,
          date: eventDraft.date,
          time: eventDraft.time,
          location: eventDraft.location,
          category: eventDraft.category,
          maxAttendees: eventDraft.maxAttendees ? Number(eventDraft.maxAttendees) : undefined,
          buildingId: selectedBuilding.id,
        },
      })
      setEventDraft(toEventDraft(selectedBuilding))
      await loadBuildingManagement()
      setBuildingSuccess('Building event created')
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to create building event'))
    } finally {
      setCreatingEventBuildingId(null)
    }
  }

  const availabilityTone = toneClasses[getStudentFacingFacultyAvailabilityTone(faculty?.studentAvailabilityState ?? 'TBD')]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-6 py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative space-y-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Faculty Profile
          </Badge>
          <div className="max-w-3xl space-y-1.5">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Manage what students see and what buildings report</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep your faculty profile current, then step into building management when you need to publish alerts, adjust building availability, or post building-specific events.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto rounded-2xl border border-border/60 bg-card p-1">
          <TabsTrigger value="profile" className="rounded-xl px-4 py-2.5">Faculty Profile</TabsTrigger>
          <TabsTrigger value="building-management" className="rounded-xl px-4 py-2.5">Building Management</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
            <form onSubmit={onSubmit} className="space-y-6">
              <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight">Public identity</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These details power the faculty directory card and full student profile.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Name</span>
                    <Input
                      value={draft.displayName}
                      onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder="Dr. Maya Thompson"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>Title</span>
                    <Input
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Associate Professor"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>Department</span>
                    <Input
                      value={draft.department}
                      onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))}
                      placeholder="Computer Science"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>Office location</span>
                    <Input
                      value={draft.officeLocation}
                      onChange={(event) => setDraft((current) => ({ ...current, officeLocation: event.target.value }))}
                      placeholder="Engineering Hall 314"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Phone (optional)</span>
                    <Input
                      value={draft.phone}
                      onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="(555) 555-0148"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight">Student-facing context</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use tags to describe what you help with so students and the AI assistant can route requests correctly.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Short bio</span>
                    <Textarea
                      value={draft.bio}
                      onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                      placeholder="I help students with registration planning, degree audits, internships, and academic appeals."
                      className="min-h-36 resize-none"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Tags</span>
                      <span className="text-xs text-muted-foreground">{draft.tags.length}/12</span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ',') {
                            event.preventDefault()
                            addTag()
                          }
                        }}
                        placeholder="Add tags like academic advising, scholarships, internships"
                      />
                      <Button type="button" variant="outline" onClick={addTag} className="sm:w-auto">
                        Add tag
                      </Button>
                    </div>

                    <div className="flex min-h-14 flex-wrap gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-3">
                      {draft.tags.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tags yet. Add the kinds of questions or resources students should come to you for.</p>
                      ) : (
                        draft.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={`Remove ${tag}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg" disabled={saving || loading} className="rounded-2xl px-5">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving changes...' : 'Save faculty profile'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Students see these updates immediately in the directory after save.
                </p>
              </div>
            </form>

            <aside className="space-y-6">
              <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold tracking-tight">Student preview</h2>
                    <p className="mt-1 text-sm text-muted-foreground">This is the information students use when deciding who to contact.</p>
                  </div>
                </div>

                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading profile preview...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{draft.department || 'Department'}</p>
                      <h3 className="font-display text-2xl font-extrabold tracking-tight">{draft.displayName || 'Faculty name'}</h3>
                      <p className="text-sm text-muted-foreground">{draft.title || 'Faculty title'}</p>
                    </div>

                    <div className={cn('rounded-2xl border px-3 py-2 text-sm font-medium', availabilityTone)}>
                      {faculty
                        ? faculty.studentAvailabilityLabel
                        : 'Availability status unavailable'}
                    </div>

                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {faculty?.email ?? profile?.email ?? 'faculty@university.edu'}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {draft.officeLocation || 'No office location yet'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {profile?.university?.name ?? 'University'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">About</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {draft.bio || 'Add a short bio so students know what kinds of questions you can help with.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        Tags students and AI can use
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draft.tags.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No routing tags yet.</p>
                        ) : (
                          draft.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="rounded-full px-3 py-1 text-xs">
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Office hours summary</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {faculty?.officeHours || 'No office hours posted yet. Add them from the faculty dashboard.'}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="building-management" className="mt-0 space-y-6">
          {buildingError && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {buildingError}
            </p>
          )}

          {buildingSuccess && (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {buildingSuccess}
            </p>
          )}

          <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignments</p>
                <h2 className="font-display text-2xl font-bold tracking-tight">Add yourself as a building manager</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Claim the buildings you manage so you can publish building alerts, update accessibility notes, change hours, and tie events to the correct building.
                </p>
              </div>
              <Input
                value={buildingSearch}
                onChange={(event) => setBuildingSearch(event.target.value)}
                placeholder="Search buildings"
                className="md:max-w-xs"
              />
            </div>

            {buildingsLoading ? (
              <p className="mt-5 text-sm text-muted-foreground">Loading building access...</p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBuildings.map((building) => (
                  <article key={building.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{building.type}</p>
                        <h3 className="mt-1 font-semibold">{building.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>
                      </div>
                      <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 text-[11px] uppercase', buildingStatusTone[building.operationalStatus])}>
                        {building.operationalStatus}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {building.isManaged ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setSelectedBuildingId(building.id)}
                          >
                            Manage
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => void releaseBuilding(building.id)}
                            disabled={releasingBuildingId === building.id}
                          >
                            {releasingBuildingId === building.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => void claimBuilding(building.id)}
                          disabled={claimingBuildingId === building.id}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          {claimingBuildingId === building.id ? 'Adding...' : 'Add manager access'}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {!selectedBuilding ? (
            <section className="rounded-[24px] border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Add at least one building above to open the building management workspace.
            </section>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-3">
                {(buildingData?.managedBuildings ?? []).map((building) => (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setSelectedBuildingId(building.id)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-colors',
                      selectedBuildingId === building.id
                        ? 'border-primary/30 bg-primary/[0.06]'
                        : 'border-border/60 bg-card hover:bg-muted/20',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{building.type}</p>
                        <p className="mt-1 font-semibold">{building.name}</p>
                      </div>
                      <Badge variant="outline" className={cn('rounded-full border px-2 py-1 text-[10px] uppercase', buildingStatusTone[building.operationalStatus])}>
                        {building.operationalStatus}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{building.address}</p>
                  </button>
                ))}
              </aside>

              <div className="space-y-6">
                <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Managed building</p>
                      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{selectedBuilding.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedBuilding.type} • {selectedBuilding.address}</p>
                    </div>
                    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]', buildingStatusTone[selectedBuilding.operationalStatus])}>
                      {selectedBuilding.operationalStatus}
                    </Badge>
                  </div>
                </section>

                <form onSubmit={saveBuilding} className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Availability and accessibility</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        These values drive building lookup and the AI assistant’s availability answers.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Operating hours</span>
                      <Input
                        value={buildingDraft.operatingHours}
                        onChange={(event) => setBuildingDraft((current) => ({ ...current, operatingHours: event.target.value }))}
                        placeholder="Mon-Fri 7:00 AM - 9:00 PM"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Status</span>
                      <select
                        value={buildingDraft.operationalStatus}
                        onChange={(event) =>
                          setBuildingDraft((current) => ({
                            ...current,
                            operationalStatus: event.target.value as BuildingStatus,
                          }))
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        <option value="OPEN">Open</option>
                        <option value="LIMITED">Limited</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Operational note</span>
                      <Input
                        value={buildingDraft.operationalNote}
                        onChange={(event) => setBuildingDraft((current) => ({ ...current, operationalNote: event.target.value }))}
                        placeholder="Elevator maintenance on east side"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Accessibility notes</span>
                      <Textarea
                        value={buildingDraft.accessibilityNotes}
                        onChange={(event) => setBuildingDraft((current) => ({ ...current, accessibilityNotes: event.target.value }))}
                        placeholder="Automatic doors active at north entrance. Ramp access temporarily rerouted through the plaza entrance."
                        className="min-h-32 resize-none"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      className="rounded-2xl px-5"
                      disabled={savingBuildingId === selectedBuilding.id}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {savingBuildingId === selectedBuilding.id ? 'Saving...' : 'Save building details'}
                    </Button>
                    {selectedBuilding.operationalUpdatedAt && (
                      <p className="text-sm text-muted-foreground">
                        Last updated {formatTimestamp(selectedBuilding.operationalUpdatedAt)}
                      </p>
                    )}
                  </div>
                </form>

                <div className="grid gap-6 xl:grid-cols-2">
                  <form onSubmit={publishBuildingAnnouncement} className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        <Megaphone className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold tracking-tight">Time-sensitive alert or announcement</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Publish a building notice to student notifications. Add an expiration for closures or short-term disruptions.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="space-y-2 text-sm font-medium">
                        <span>Title</span>
                        <Input
                          value={announcementDraft.title}
                          onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))}
                          placeholder="Student Union closed early"
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Message</span>
                        <Textarea
                          value={announcementDraft.message}
                          onChange={(event) => setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))}
                          placeholder="The building will close at 3 PM today due to a water main repair."
                          className="min-h-28 resize-none"
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Ends at (optional)</span>
                        <Input
                          type="datetime-local"
                          value={announcementDraft.expiresAt}
                          onChange={(event) => setAnnouncementDraft((current) => ({ ...current, expiresAt: event.target.value }))}
                        />
                      </label>
                    </div>

                    <Button
                      type="submit"
                      className="mt-5 w-full rounded-2xl"
                      disabled={publishingBuildingId === selectedBuilding.id}
                    >
                      {publishingBuildingId === selectedBuilding.id ? 'Publishing...' : 'Publish building alert'}
                    </Button>
                  </form>

                  <form onSubmit={createBuildingEvent} className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold tracking-tight">Create building event</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tie the event to this building so student building lookup and AI responses can reference it directly.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium md:col-span-2">
                        <span>Event title</span>
                        <Input
                          value={eventDraft.title}
                          onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
                          placeholder="Accessibility open house"
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium md:col-span-2">
                        <span>Description</span>
                        <Textarea
                          value={eventDraft.description}
                          onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Walkthrough for students to learn about updated entrances, elevators, and support desks."
                          className="min-h-24 resize-none"
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Date</span>
                        <Input
                          type="date"
                          value={eventDraft.date}
                          onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Time</span>
                        <Input
                          type="time"
                          value={eventDraft.time}
                          onChange={(event) => setEventDraft((current) => ({ ...current, time: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Category</span>
                        <select
                          value={eventDraft.category}
                          onChange={(event) =>
                            setEventDraft((current) => ({
                              ...current,
                              category: event.target.value as EventCategory,
                            }))
                          }
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          {eventCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Max attendees (optional)</span>
                        <Input
                          type="number"
                          min={1}
                          value={eventDraft.maxAttendees}
                          onChange={(event) => setEventDraft((current) => ({ ...current, maxAttendees: event.target.value }))}
                          placeholder="75"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium md:col-span-2">
                        <span>Location</span>
                        <Input
                          value={eventDraft.location}
                          onChange={(event) => setEventDraft((current) => ({ ...current, location: event.target.value }))}
                          required
                        />
                      </label>
                    </div>

                    <Button
                      type="submit"
                      className="mt-5 w-full rounded-2xl"
                      disabled={creatingEventBuildingId === selectedBuilding.id}
                    >
                      {creatingEventBuildingId === selectedBuilding.id ? 'Creating...' : 'Create building event'}
                    </Button>
                  </form>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Accessibility className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold tracking-tight">Current building signal</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This is the availability snapshot students and the chatbot will read first.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{selectedBuilding.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedBuilding.address}</p>
                        </div>
                        <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]', buildingStatusTone[selectedBuilding.operationalStatus])}>
                          {selectedBuilding.operationalStatus}
                        </Badge>
                      </div>

                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{selectedBuilding.operatingHours || 'No operating hours posted yet.'}</span>
                      </p>
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{selectedBuilding.operationalNote || 'No operational note posted.'}</span>
                      </p>
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Accessibility className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{selectedBuilding.accessibilityNotes || 'No accessibility guidance posted.'}</span>
                      </p>
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current alerts</p>
                        <div className="mt-3 space-y-3">
                          {selectedBuilding.announcements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active alerts for this building.</p>
                          ) : (
                            selectedBuilding.announcements.map((announcement) => (
                              <div key={announcement.id} className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                                <p className="font-semibold">{announcement.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  Posted {formatTimestamp(announcement.createdAt)}
                                  {announcement.expiresAt ? ` • Ends ${formatTimestamp(announcement.expiresAt)}` : ''}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Upcoming building events</p>
                        <div className="mt-3 space-y-3">
                          {selectedBuilding.upcomingEvents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No upcoming building events yet.</p>
                          ) : (
                            selectedBuilding.upcomingEvents.map((event) => (
                              <div key={event.id} className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                                <p className="font-semibold">{event.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatTimestamp(event.date)} • {event.time} • {event.category}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
