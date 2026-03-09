'use client'

import React from 'react'
import {
  BellRing,
  Clock3,
  Loader2,
  MapPin,
  Megaphone,
  PencilLine,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
} from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { formatFacultyAvailability, formatFacultySlotLabel } from '@/lib/faculty'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type OfficeHourSlot = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  isActive: boolean
  maxQueue: number
}

type FacultyStatus = 'AVAILABLE' | 'LIMITED' | 'AWAY'

type StatusResponse = {
  status: FacultyStatus
  note: string
  display: string
}

type FacultyWorkspaceResponse = {
  id: string
  name: string
  title: string
  department: string
  officeLocation: string
  officeHours: string
  availabilityStatus: FacultyStatus
  availabilityNote: string | null
}

type AnnouncementScope = 'CAMPUS' | 'BUILDING' | 'SERVICE'

type AnnouncementComposerResponse = {
  permissions: {
    canPublishCampus: boolean
    canPublishBuildings: boolean
    canPublishServices: boolean
  }
  availableBuildings: Array<{
    id: string
    name: string
    type: string
  }>
  availableServices: Array<{
    id: string
    name: string
    location: string
  }>
  items: Array<{
    id: string
    scope: AnnouncementScope
    title: string
    message: string
    linkUrl: string | null
    createdAt: string
    audienceLabel: string
    authorName: string | null
  }>
}

type OfficeHourFormState = {
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  mode: OfficeHourSlot['mode']
  maxQueue: number
}

type AnnouncementFormState = {
  title: string
  message: string
  linkUrl: string
  scope: AnnouncementScope
  targetId: string
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultOfficeHourForm: OfficeHourFormState = {
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:00',
  location: '',
  mode: 'IN_PERSON',
  maxQueue: 20,
}

const defaultAnnouncementForm: AnnouncementFormState = {
  title: '',
  message: '',
  linkUrl: '',
  scope: 'CAMPUS',
  targetId: '',
}

const defaultStatusState: StatusResponse = {
  status: 'AVAILABLE',
  note: '',
  display: 'Available',
}

const availabilityOptions: Array<{ value: FacultyStatus; label: string; description: string }> = [
  { value: 'AVAILABLE', label: 'Available', description: 'Students can expect normal office-hours access.' },
  { value: 'LIMITED', label: 'Limited', description: 'Use this when responses or drop-ins will be slower than usual.' },
  { value: 'AWAY', label: 'Away', description: 'Mark yourself away when students should not expect immediate availability.' },
]

const modeLabels: Record<OfficeHourSlot['mode'], string> = {
  IN_PERSON: 'In person',
  VIRTUAL: 'Virtual',
  HYBRID: 'Hybrid',
}

function formatTo12Hour(time24: string) {
  const [hoursRaw, minutes] = time24.split(':').map(Number)
  const isPm = hoursRaw >= 12
  const hours = hoursRaw % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
}

function formatAnnouncementTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const scopeLabels: Record<AnnouncementScope, string> = {
  CAMPUS: 'Whole campus',
  BUILDING: 'Building update',
  SERVICE: 'Service update',
}

export function FacultyDashboard() {
  const [workspace, setWorkspace] = React.useState<FacultyWorkspaceResponse | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = React.useState(true)

  const [officeHours, setOfficeHours] = React.useState<OfficeHourSlot[]>([])
  const [officeHoursLoading, setOfficeHoursLoading] = React.useState(true)
  const [officeHoursError, setOfficeHoursError] = React.useState<string | null>(null)
  const [officeHourForm, setOfficeHourForm] = React.useState<OfficeHourFormState>(defaultOfficeHourForm)
  const [editingOfficeHourId, setEditingOfficeHourId] = React.useState<string | null>(null)
  const [savingOfficeHour, setSavingOfficeHour] = React.useState(false)

  const [statusState, setStatusState] = React.useState<StatusResponse>(defaultStatusState)
  const [statusLoading, setStatusLoading] = React.useState(true)
  const [statusSaving, setStatusSaving] = React.useState(false)
  const [statusError, setStatusError] = React.useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = React.useState<string | null>(null)

  const [announcementState, setAnnouncementState] = React.useState<AnnouncementComposerResponse | null>(null)
  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true)
  const [announcementForm, setAnnouncementForm] = React.useState<AnnouncementFormState>(defaultAnnouncementForm)
  const [announcementSaving, setAnnouncementSaving] = React.useState(false)
  const [announcementError, setAnnouncementError] = React.useState<string | null>(null)
  const [announcementSuccess, setAnnouncementSuccess] = React.useState<string | null>(null)

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiClientError ? error.message : fallback

  const loadWorkspace = React.useCallback(async () => {
    setWorkspaceLoading(true)

    try {
      const result = await apiRequest<FacultyWorkspaceResponse>('/api/faculty/me')
      setWorkspace(result)
    } catch {
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const loadOfficeHours = React.useCallback(async () => {
    setOfficeHoursLoading(true)
    setOfficeHoursError(null)

    try {
      const result = await apiRequest<OfficeHourSlot[]>('/api/office-hours')
      setOfficeHours(result)
    } catch (error) {
      setOfficeHours([])
      setOfficeHoursError(getErrorMessage(error, 'Unable to load office hours'))
    } finally {
      setOfficeHoursLoading(false)
    }
  }, [])

  const loadStatus = React.useCallback(async () => {
    setStatusLoading(true)
    setStatusError(null)

    try {
      const result = await apiRequest<StatusResponse>('/api/faculty/me/status')
      setStatusState(result)
    } catch (error) {
      setStatusState(defaultStatusState)
      setStatusError(getErrorMessage(error, 'Unable to load availability status'))
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const loadAnnouncements = React.useCallback(async () => {
    setAnnouncementsLoading(true)
    setAnnouncementError(null)

    try {
      const result = await apiRequest<AnnouncementComposerResponse>('/api/announcements')
      setAnnouncementState(result)
      setAnnouncementForm((current) => {
        const nextScope =
          current.scope === 'CAMPUS' && !result.permissions.canPublishCampus
            ? result.permissions.canPublishBuildings
              ? 'BUILDING'
              : result.permissions.canPublishServices
                ? 'SERVICE'
                : 'CAMPUS'
            : current.scope

        return {
          ...current,
          scope: nextScope,
          targetId:
            nextScope === 'BUILDING'
              ? current.targetId || result.availableBuildings[0]?.id || ''
              : nextScope === 'SERVICE'
                ? current.targetId || result.availableServices[0]?.id || ''
                : '',
        }
      })
    } catch (error) {
      setAnnouncementState(null)
      setAnnouncementError(getErrorMessage(error, 'Unable to load announcement tools'))
    } finally {
      setAnnouncementsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void Promise.all([
      loadWorkspace(),
      loadOfficeHours(),
      loadStatus(),
      loadAnnouncements(),
    ])
  }, [loadAnnouncements, loadOfficeHours, loadStatus, loadWorkspace])

  const resetOfficeHourForm = () => {
    setOfficeHourForm(defaultOfficeHourForm)
    setEditingOfficeHourId(null)
  }

  const onSubmitOfficeHour = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingOfficeHour(true)
    setOfficeHoursError(null)

    try {
      const payload = {
        ...officeHourForm,
        maxQueue: Number(officeHourForm.maxQueue),
      }

      if (editingOfficeHourId) {
        await apiRequest(`/api/office-hours/${editingOfficeHourId}`, {
          method: 'PATCH',
          body: payload,
        })
      } else {
        await apiRequest('/api/office-hours', {
          method: 'POST',
          body: payload,
        })
      }

      resetOfficeHourForm()
      await Promise.all([loadOfficeHours(), loadWorkspace()])
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to save office hour'))
    } finally {
      setSavingOfficeHour(false)
    }
  }

  const onEditOfficeHour = (slot: OfficeHourSlot) => {
    setEditingOfficeHourId(slot.id)
    setOfficeHourForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      mode: slot.mode,
      maxQueue: slot.maxQueue,
    })
  }

  const onDeleteOfficeHour = async (slotId: string) => {
    setOfficeHoursError(null)

    try {
      await apiRequest(`/api/office-hours/${slotId}`, { method: 'DELETE' })
      if (editingOfficeHourId === slotId) {
        resetOfficeHourForm()
      }
      await Promise.all([loadOfficeHours(), loadWorkspace()])
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to delete office hour'))
    }
  }

  const onToggleOfficeHour = async (slotId: string) => {
    setOfficeHoursError(null)

    try {
      const updated = await apiRequest<OfficeHourSlot>(`/api/office-hours/${slotId}/toggle`, {
        method: 'PATCH',
      })
      setOfficeHours((previous) => previous.map((slot) => (slot.id === slotId ? updated : slot)))
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to update office hour status'))
    }
  }

  const onSubmitStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusSaving(true)
    setStatusError(null)
    setStatusSuccess(null)

    try {
      const updated = await apiRequest<StatusResponse>('/api/faculty/me/status', {
        method: 'PATCH',
        body: {
          status: statusState.status,
          note: statusState.note.trim() || undefined,
        },
      })

      setStatusState(updated)
      setStatusSuccess('Availability saved')
      await loadWorkspace()
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Unable to save availability'))
    } finally {
      setStatusSaving(false)
    }
  }

  const onSubmitAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAnnouncementSaving(true)
    setAnnouncementError(null)
    setAnnouncementSuccess(null)

    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: {
          title: announcementForm.title,
          message: announcementForm.message,
          linkUrl: announcementForm.linkUrl.trim() || undefined,
          scope: announcementForm.scope,
          buildingId: announcementForm.scope === 'BUILDING' ? announcementForm.targetId : undefined,
          serviceId: announcementForm.scope === 'SERVICE' ? announcementForm.targetId : undefined,
        },
      })

      setAnnouncementForm((current) => ({
        ...current,
        title: '',
        message: '',
        linkUrl: '',
      }))
      setAnnouncementSuccess('Announcement published')
      await loadAnnouncements()
    } catch (error) {
      setAnnouncementError(getErrorMessage(error, 'Unable to publish announcement'))
    } finally {
      setAnnouncementSaving(false)
    }
  }

  const announcementPermissions = announcementState?.permissions
  const currentTargets = React.useMemo(
    () =>
      announcementForm.scope === 'BUILDING'
        ? announcementState?.availableBuildings ?? []
        : announcementForm.scope === 'SERVICE'
          ? announcementState?.availableServices ?? []
          : [],
    [
      announcementForm.scope,
      announcementState?.availableBuildings,
      announcementState?.availableServices,
    ],
  )

  React.useEffect(() => {
    if (announcementForm.scope === 'BUILDING' && currentTargets.length > 0 && !currentTargets.some((item) => item.id === announcementForm.targetId)) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: currentTargets[0]?.id ?? '',
      }))
    }

    if (announcementForm.scope === 'SERVICE' && currentTargets.length > 0 && !currentTargets.some((item) => item.id === announcementForm.targetId)) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: currentTargets[0]?.id ?? '',
      }))
    }

    if (announcementForm.scope === 'CAMPUS' && announcementForm.targetId) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: '',
      }))
    }
  }, [announcementForm.scope, announcementForm.targetId, currentTargets])

  const activeSlots = officeHours.filter((slot) => slot.isActive).length
  const totalAnnouncementAccess =
    (announcementPermissions?.canPublishCampus ? 1 : 0) +
    (announcementPermissions?.canPublishBuildings ? 1 : 0) +
    (announcementPermissions?.canPublishServices ? 1 : 0)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-6 py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -left-12 top-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-6 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                Faculty Dashboard
              </Badge>
              <div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                  {workspaceLoading ? 'Loading faculty workspace...' : `Manage ${workspace?.name ?? 'your faculty workspace'}`}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Keep your availability current, maintain clean office hours, and publish the right updates without bouncing between admin screens.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs">
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                {workspace?.officeLocation ?? 'No office location'}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs">
                <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                {workspace?.officeHours ?? 'No office hours posted'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Availability</p>
              <p className="mt-2 text-lg font-semibold">
                {statusLoading ? 'Loading...' : formatFacultyAvailability(statusState.status, statusState.note)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Office hours</p>
              <p className="mt-2 text-lg font-semibold">{officeHours.length} scheduled slot{officeHours.length === 1 ? '' : 's'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{activeSlots} active right now</p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Announcement access</p>
              <p className="mt-2 text-lg font-semibold">{totalAnnouncementAccess} publishing channel{totalAnnouncementAccess === 1 ? '' : 's'}</p>
              <p className="mt-1 text-sm text-muted-foreground">Campus, buildings, and service updates are permission-aware.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="space-y-6">
          <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRoundCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">Availability and away status</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep students informed when you are available, limited, or away entirely.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmitStatus} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {availabilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusState((current) => ({ ...current, status: option.value }))}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-left transition-colors',
                      statusState.status === option.value
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : 'border-border/60 bg-muted/10 hover:bg-muted/20',
                    )}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>

              <label className="space-y-2 text-sm font-medium">
                <span>Status note</span>
                <Textarea
                  value={statusState.note}
                  onChange={(event) => setStatusState((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Optional context like conference travel, delayed responses, or alternate contact timing."
                  className="min-h-28 resize-none"
                  disabled={statusLoading}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg" className="rounded-2xl px-5" disabled={statusLoading || statusSaving}>
                  {statusSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save availability
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">{statusState.display}</p>
              </div>
            </form>

            {statusError && (
              <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {statusError}
              </p>
            )}

            {statusSuccess && (
              <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {statusSuccess}
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">Office hours schedule</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publish clean weekly slots, turn them on when you start meeting with students, and keep locations current.
                </p>
              </div>
            </div>

            {officeHoursError && (
              <p className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {officeHoursError}
              </p>
            )}

            {officeHoursLoading ? (
              <p className="text-sm text-muted-foreground">Loading office hours...</p>
            ) : officeHours.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-5 py-8 text-center">
                <p className="text-sm font-medium">No office hours yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first slot from the editor on the right.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {officeHours.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{formatFacultySlotLabel(slot)}</p>
                          <Badge variant={slot.isActive ? 'default' : 'outline'} className="rounded-full">
                            {slot.isActive ? 'Live' : 'Scheduled'}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {modeLabels[slot.mode]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {slot.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" />
                            {formatTo12Hour(slot.startTime)} - {formatTo12Hour(slot.endTime)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4" />
                            Max queue {slot.maxQueue}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => onEditOfficeHour(slot)} className="rounded-xl">
                          <PencilLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void onToggleOfficeHour(slot.id)} className="rounded-xl">
                          {slot.isActive ? 'Pause slot' : 'Go live'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => void onDeleteOfficeHour(slot.id)} className="rounded-xl text-red-600 hover:text-red-600 dark:text-red-300">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {editingOfficeHourId ? 'Edit office hour' : 'Add office hour'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep the slot list concise and use the exact room or meeting location students should use.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmitOfficeHour} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>Day</span>
                  <select
                    value={officeHourForm.dayOfWeek}
                    onChange={(event) =>
                      setOfficeHourForm((current) => ({
                        ...current,
                        dayOfWeek: Number(event.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                    required
                  >
                    {weekdays.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Mode</span>
                  <select
                    value={officeHourForm.mode}
                    onChange={(event) =>
                      setOfficeHourForm((current) => ({
                        ...current,
                        mode: event.target.value as OfficeHourSlot['mode'],
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                    required
                  >
                    <option value="IN_PERSON">In person</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Start time</span>
                  <Input
                    type="time"
                    value={officeHourForm.startTime}
                    onChange={(event) => setOfficeHourForm((current) => ({ ...current, startTime: event.target.value }))}
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>End time</span>
                  <Input
                    type="time"
                    value={officeHourForm.endTime}
                    onChange={(event) => setOfficeHourForm((current) => ({ ...current, endTime: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium">
                <span>Location</span>
                <Input
                  value={officeHourForm.location}
                  onChange={(event) => setOfficeHourForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Engineering Hall 314 or Zoom room"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span>Max queue</span>
                <Input
                  type="number"
                  min={1}
                  value={officeHourForm.maxQueue}
                  onChange={(event) => setOfficeHourForm((current) => ({ ...current, maxQueue: Number(event.target.value) }))}
                  required
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" className="rounded-xl" disabled={savingOfficeHour}>
                  {savingOfficeHour ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingOfficeHourId ? 'Update slot' : 'Add slot'}
                    </>
                  )}
                </Button>

                {editingOfficeHourId && (
                  <Button type="button" variant="outline" className="rounded-xl" onClick={resetOfficeHourForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-[24px] border border-border/60 bg-card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-300">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Announcement composer</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publish whole-campus updates if you have campus permission, or target buildings and services you manage.
                </p>
              </div>
            </div>

            {announcementsLoading ? (
              <p className="text-sm text-muted-foreground">Loading announcement access...</p>
            ) : !announcementPermissions ||
              (!announcementPermissions.canPublishCampus &&
                !announcementPermissions.canPublishBuildings &&
                !announcementPermissions.canPublishServices) ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
                <p className="text-sm font-medium">No announcement permissions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Faculty without publishing access can still keep their profile and office hours current here.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmitAnnouncement} className="space-y-4">
                <label className="space-y-2 text-sm font-medium">
                  <span>Audience</span>
                  <select
                    value={announcementForm.scope}
                    onChange={(event) =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        scope: event.target.value as AnnouncementScope,
                        targetId:
                          event.target.value === 'BUILDING'
                            ? announcementState?.availableBuildings[0]?.id ?? ''
                            : event.target.value === 'SERVICE'
                              ? announcementState?.availableServices[0]?.id ?? ''
                              : '',
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                  >
                    {announcementPermissions.canPublishCampus && <option value="CAMPUS">{scopeLabels.CAMPUS}</option>}
                    {announcementPermissions.canPublishBuildings && <option value="BUILDING">{scopeLabels.BUILDING}</option>}
                    {announcementPermissions.canPublishServices && <option value="SERVICE">{scopeLabels.SERVICE}</option>}
                  </select>
                </label>

                {announcementForm.scope !== 'CAMPUS' && (
                  <label className="space-y-2 text-sm font-medium">
                    <span>{announcementForm.scope === 'BUILDING' ? 'Building' : 'Service'}</span>
                    <select
                      value={announcementForm.targetId}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, targetId: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                      required
                    >
                      {currentTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {'location' in target ? `${target.name} · ${target.location}` : `${target.name} · ${target.type}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="space-y-2 text-sm font-medium">
                  <span>Title</span>
                  <Input
                    value={announcementForm.title}
                    onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Library elevator maintenance on Tuesday"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Message</span>
                  <Textarea
                    value={announcementForm.message}
                    onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Share what changed, who it affects, and what students should do next."
                    className="min-h-32 resize-none"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Link URL (optional)</span>
                  <Input
                    type="url"
                    value={announcementForm.linkUrl}
                    onChange={(event) => setAnnouncementForm((current) => ({ ...current, linkUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>

                <Button type="submit" className="w-full rounded-xl" disabled={announcementSaving}>
                  {announcementSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish announcement
                    </>
                  )}
                </Button>
              </form>
            )}

            {announcementError && (
              <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {announcementError}
              </p>
            )}

            {announcementSuccess && (
              <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {announcementSuccess}
              </p>
            )}

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                Recent published updates
              </div>

              {!announcementState || announcementState.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
                  No announcements published yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {announcementState.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {item.audienceLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatAnnouncementTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                      {item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                        >
                          Open link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
