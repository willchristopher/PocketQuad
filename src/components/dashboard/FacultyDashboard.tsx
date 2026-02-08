'use client'

import React from 'react'
import { ApiClientError, apiRequest } from '@/lib/api/client'

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

type FacultyStatus = 'AVAILABLE' | 'LIMITED' | 'OUT_OF_OFFICE'

type StatusResponse = {
  status: FacultyStatus
  note: string
  display: string
}

type AnnouncementResponse = {
  canPublish: boolean
}

type OfficeHourFormState = {
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  mode: OfficeHourSlot['mode']
  maxQueue: number
}

type EventFormState = {
  title: string
  description: string
  date: string
  time: string
  location: string
  category: 'ACADEMIC' | 'SOCIAL' | 'SPORTS' | 'ARTS' | 'CAREER' | 'CLUBS' | 'WELLNESS' | 'OTHER'
  maxAttendees: string
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

const defaultEventForm: EventFormState = {
  title: '',
  description: '',
  date: '',
  time: '12:00',
  location: '',
  category: 'ACADEMIC',
  maxAttendees: '',
}

const defaultStatusState: StatusResponse = {
  status: 'AVAILABLE',
  note: '',
  display: 'Available',
}

export function FacultyDashboard() {
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

  const [eventForm, setEventForm] = React.useState<EventFormState>(defaultEventForm)
  const [eventSaving, setEventSaving] = React.useState(false)
  const [eventError, setEventError] = React.useState<string | null>(null)
  const [eventSuccess, setEventSuccess] = React.useState<string | null>(null)

  const [canPublishAnnouncements, setCanPublishAnnouncements] = React.useState(false)
  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true)
  const [announcementTitle, setAnnouncementTitle] = React.useState('')
  const [announcementMessage, setAnnouncementMessage] = React.useState('')
  const [announcementLinkUrl, setAnnouncementLinkUrl] = React.useState('')
  const [announcementSaving, setAnnouncementSaving] = React.useState(false)
  const [announcementError, setAnnouncementError] = React.useState<string | null>(null)
  const [announcementSuccess, setAnnouncementSuccess] = React.useState<string | null>(null)

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiClientError ? error.message : fallback

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
      setStatusError(getErrorMessage(error, 'Unable to load faculty status'))
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const loadAnnouncementPermission = React.useCallback(async () => {
    setAnnouncementsLoading(true)

    try {
      const result = await apiRequest<AnnouncementResponse>('/api/announcements')
      setCanPublishAnnouncements(result.canPublish)
    } catch {
      setCanPublishAnnouncements(false)
    } finally {
      setAnnouncementsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadOfficeHours()
    void loadStatus()
    void loadAnnouncementPermission()
  }, [loadAnnouncementPermission, loadOfficeHours, loadStatus])

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
      await loadOfficeHours()
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
      await loadOfficeHours()
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
      setStatusSuccess('Status saved')
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Unable to save status'))
    } finally {
      setStatusSaving(false)
    }
  }

  const onSubmitEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEventSaving(true)
    setEventError(null)
    setEventSuccess(null)

    try {
      await apiRequest('/api/events', {
        method: 'POST',
        body: {
          title: eventForm.title,
          description: eventForm.description,
          date: eventForm.date,
          time: eventForm.time,
          location: eventForm.location,
          category: eventForm.category,
          maxAttendees: eventForm.maxAttendees ? Number(eventForm.maxAttendees) : undefined,
        },
      })

      setEventForm(defaultEventForm)
      setEventSuccess('Event created and notifications sent')
    } catch (error) {
      setEventError(getErrorMessage(error, 'Unable to create event'))
    } finally {
      setEventSaving(false)
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
          title: announcementTitle,
          message: announcementMessage,
          linkUrl: announcementLinkUrl.trim() || undefined,
        },
      })

      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setAnnouncementLinkUrl('')
      setAnnouncementSuccess('Announcement published')
    } catch (error) {
      setAnnouncementError(getErrorMessage(error, 'Unable to publish announcement'))
    } finally {
      setAnnouncementSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section id="office-hours" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <h1 className="font-display text-xl font-bold tracking-tight">Office Hours</h1>

        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={onSubmitOfficeHour}>
          <label className="space-y-1 text-sm">
            <span>Day</span>
            <select
              value={officeHourForm.dayOfWeek}
              onChange={(input) =>
                setOfficeHourForm((current) => ({ ...current, dayOfWeek: Number(input.target.value) }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            >
              {weekdays.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Start</span>
            <input
              type="time"
              value={officeHourForm.startTime}
              onChange={(input) =>
                setOfficeHourForm((current) => ({ ...current, startTime: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>End</span>
            <input
              type="time"
              value={officeHourForm.endTime}
              onChange={(input) =>
                setOfficeHourForm((current) => ({ ...current, endTime: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Location</span>
            <input
              value={officeHourForm.location}
              onChange={(input) =>
                setOfficeHourForm((current) => ({ ...current, location: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Mode</span>
            <select
              value={officeHourForm.mode}
              onChange={(input) =>
                setOfficeHourForm((current) => ({
                  ...current,
                  mode: input.target.value as OfficeHourSlot['mode'],
                }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            >
              <option value="IN_PERSON">In person</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Max queue</span>
            <input
              type="number"
              min={1}
              value={officeHourForm.maxQueue}
              onChange={(input) =>
                setOfficeHourForm((current) => ({ ...current, maxQueue: Number(input.target.value) }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <div className="md:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={savingOfficeHour}
            >
              {savingOfficeHour ? 'Saving...' : editingOfficeHourId ? 'Update slot' : 'Add slot'}
            </button>

            {editingOfficeHourId && (
              <button
                type="button"
                className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold"
                onClick={resetOfficeHourForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {officeHoursError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {officeHoursError}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Queue</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {officeHoursLoading && (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={7}>
                    Loading office hours...
                  </td>
                </tr>
              )}

              {!officeHoursLoading && officeHours.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={7}>
                    No office hour slots
                  </td>
                </tr>
              )}

              {!officeHoursLoading &&
                officeHours.map((slot) => (
                  <tr key={slot.id} className="border-t border-border/40 text-sm">
                    <td className="px-3 py-2">{weekdays[slot.dayOfWeek]}</td>
                    <td className="px-3 py-2">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    <td className="px-3 py-2">{slot.location}</td>
                    <td className="px-3 py-2">{slot.mode.replace('_', ' ')}</td>
                    <td className="px-3 py-2">{slot.maxQueue}</td>
                    <td className="px-3 py-2">{slot.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-border/60 px-2 py-1 text-xs font-semibold"
                          onClick={() => onEditOfficeHour(slot)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-border/60 px-2 py-1 text-xs font-semibold"
                          onClick={() => void onToggleOfficeHour(slot.id)}
                        >
                          {slot.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-300"
                          onClick={() => void onDeleteOfficeHour(slot.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight">Faculty Status</h2>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitStatus}>
          <label className="space-y-1 text-sm">
            <span>Status</span>
            <select
              value={statusState.status}
              onChange={(input) =>
                setStatusState((current) => ({
                  ...current,
                  status: input.target.value as FacultyStatus,
                }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              disabled={statusLoading}
            >
              <option value="AVAILABLE">Available</option>
              <option value="LIMITED">Limited availability</option>
              <option value="OUT_OF_OFFICE">Out of office</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Note</span>
            <input
              value={statusState.note}
              onChange={(input) =>
                setStatusState((current) => ({ ...current, note: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              disabled={statusLoading}
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={statusLoading || statusSaving}
            >
              {statusSaving ? 'Saving...' : 'Save status'}
            </button>
            <p className="text-sm text-muted-foreground">{statusState.display}</p>
          </div>
        </form>

        {statusError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {statusError}
          </p>
        )}

        {statusSuccess && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {statusSuccess}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight">Create Event</h2>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmitEvent}>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>Title</span>
            <input
              value={eventForm.title}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, title: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span>Description</span>
            <textarea
              value={eventForm.description}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, description: input.target.value }))
              }
              className="min-h-28 w-full rounded-xl border border-border/60 bg-background px-3 py-2"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Date</span>
            <input
              type="date"
              value={eventForm.date}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, date: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Time</span>
            <input
              type="time"
              value={eventForm.time}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, time: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Location</span>
            <input
              value={eventForm.location}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, location: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Category</span>
            <select
              value={eventForm.category}
              onChange={(input) =>
                setEventForm((current) => ({
                  ...current,
                  category: input.target.value as EventFormState['category'],
                }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              required
            >
              <option value="ACADEMIC">Academic</option>
              <option value="SOCIAL">Social</option>
              <option value="SPORTS">Sports</option>
              <option value="ARTS">Arts</option>
              <option value="CAREER">Career</option>
              <option value="CLUBS">Clubs</option>
              <option value="WELLNESS">Wellness</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Max attendees</span>
            <input
              type="number"
              min={1}
              value={eventForm.maxAttendees}
              onChange={(input) =>
                setEventForm((current) => ({ ...current, maxAttendees: input.target.value }))
              }
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              disabled={eventSaving}
            >
              {eventSaving ? 'Creating...' : 'Create event'}
            </button>
          </div>
        </form>

        {eventError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {eventError}
          </p>
        )}

        {eventSuccess && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {eventSuccess}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight">Campus Announcement</h2>

        {announcementsLoading && <p className="text-sm text-muted-foreground">Checking permissions...</p>}

        {!announcementsLoading && !canPublishAnnouncements && (
          <p className="text-sm text-muted-foreground">
            Your account does not have campus announcement permission.
          </p>
        )}

        {!announcementsLoading && canPublishAnnouncements && (
          <form className="grid gap-3" onSubmit={onSubmitAnnouncement}>
            <label className="space-y-1 text-sm">
              <span>Title</span>
              <input
                value={announcementTitle}
                onChange={(input) => setAnnouncementTitle(input.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Message</span>
              <textarea
                value={announcementMessage}
                onChange={(input) => setAnnouncementMessage(input.target.value)}
                className="min-h-28 w-full rounded-xl border border-border/60 bg-background px-3 py-2"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Link URL (optional)</span>
              <input
                type="url"
                value={announcementLinkUrl}
                onChange={(input) => setAnnouncementLinkUrl(input.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3"
              />
            </label>

            <div>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                disabled={announcementSaving}
              >
                {announcementSaving ? 'Publishing...' : 'Publish announcement'}
              </button>
            </div>
          </form>
        )}

        {announcementError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {announcementError}
          </p>
        )}

        {announcementSuccess && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {announcementSuccess}
          </p>
        )}
      </section>
    </div>
  )
}
