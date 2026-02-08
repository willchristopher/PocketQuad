'use client'

import React from 'react'
import { Clock, Users2, MapPin, Plus, Play, Pause, Video } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { subscribeToOfficeHourQueue } from '@/lib/supabase/realtime'
import { cn } from '@/lib/utils'

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

type QueueEntry = {
  id: string
  topic: string
  position: number
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  joinedAt: string
  student: {
    id: string
    displayName: string
    email: string
  }
}

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const modeIcons: Record<OfficeHourSlot['mode'], React.ElementType> = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Users2,
}
const modeColors: Record<OfficeHourSlot['mode'], string> = {
  IN_PERSON: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  VIRTUAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  HYBRID: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}

function formatTo12Hour(time24: string) {
  const [hoursRaw, minutes] = time24.split(':').map(Number)
  const isPm = hoursRaw >= 12
  const hours = hoursRaw % 12 || 12
  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`
}

export function OfficeHoursManager() {
  const [slots, setSlots] = React.useState<OfficeHourSlot[]>([])
  const [queue, setQueue] = React.useState<QueueEntry[]>([])
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = React.useState(true)
  const [loadingQueue, setLoadingQueue] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const activeSlot = slots.find((slot) => slot.id === selectedSlot)

  const loadSlots = React.useCallback(async () => {
    setLoadingSlots(true)
    setError(null)

    try {
      const data = await apiRequest<OfficeHourSlot[]>('/api/office-hours')
      setSlots(data)
      if (data.length > 0) {
        setSelectedSlot((previous) => previous ?? data[0].id)
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load office hour slots'
      setError(message)
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  const loadQueue = React.useCallback(async (slotId: string) => {
    setLoadingQueue(true)
    setError(null)

    try {
      const data = await apiRequest<QueueEntry[]>(`/api/office-hours/${slotId}/queue`)
      setQueue(data)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load queue'
      setError(message)
      setQueue([])
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  React.useEffect(() => {
    if (!selectedSlot) {
      setQueue([])
      return
    }

    void loadQueue(selectedSlot)

    const realtime = subscribeToOfficeHourQueue(selectedSlot, () => {
      void loadQueue(selectedSlot)
    })

    return () => {
      void realtime.unsubscribe()
    }
  }, [loadQueue, selectedSlot])

  const toggleActive = async (slotId: string) => {
    setError(null)

    try {
      const updated = await apiRequest<OfficeHourSlot>(`/api/office-hours/${slotId}/toggle`, {
        method: 'PATCH',
      })

      setSlots((previous) => previous.map((slot) => (slot.id === slotId ? updated : slot)))
      if (updated.isActive) {
        setSelectedSlot(updated.id)
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to toggle office hour slot'
      setError(message)
    }
  }

  const advanceQueueEntry = async (entry: QueueEntry) => {
    const nextStatus = entry.status === 'WAITING' ? 'IN_PROGRESS' : 'COMPLETED'

    try {
      await apiRequest(`/api/office-hours/queue/${entry.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })

      if (selectedSlot) {
        await loadQueue(selectedSlot)
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to update queue status'
      setError(message)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loadingSlots && <p className="text-sm text-muted-foreground">Loading office hour slots...</p>}

        {!loadingSlots && slots.map((slot) => {
          const ModeIcon = modeIcons[slot.mode]
          const activeQueueCount =
            selectedSlot === slot.id
              ? queue.filter((entry) => entry.status === 'WAITING' || entry.status === 'IN_PROGRESS').length
              : 0
          const fillPercent = Math.min(100, Math.round((activeQueueCount / slot.maxQueue) * 100))

          return (
            <div
              key={slot.id}
              onClick={() => setSelectedSlot(slot.id)}
              className={cn(
                'rounded-2xl border bg-card p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                selectedSlot === slot.id ? 'border-primary shadow-lg shadow-primary/10' : 'border-border/60',
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', modeColors[slot.mode])}>
                    <ModeIcon className="w-4 h-4" />
                  </div>
                  <span className={cn('pill-btn text-[10px] font-bold', modeColors[slot.mode])}>{slot.mode.replace('_', ' ')}</span>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    void toggleActive(slot.id)
                  }}
                  className={cn('p-1.5 rounded-lg transition-all', slot.isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
                >
                  {slot.isActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h3 className="font-display font-bold text-sm">{weekdayNames[slot.dayOfWeek]}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{formatTo12Hour(slot.startTime)} - {formatTo12Hour(slot.endTime)}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{slot.location}</p>

              {slot.isActive && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${fillPercent}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{activeQueueCount}/{slot.maxQueue}</span>
                </div>
              )}
            </div>
          )
        })}

        {!loadingSlots && (
          <div className="rounded-2xl border-2 border-dashed border-border/60 p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm font-semibold">Create slot via API (UI form pending)</span>
          </div>
        )}
      </div>

      {activeSlot?.isActive && (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base">Student Queue</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {weekdayNames[activeSlot.dayOfWeek]} · {formatTo12Hour(activeSlot.startTime)} - {formatTo12Hour(activeSlot.endTime)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {loadingQueue && <p className="p-4 text-sm text-muted-foreground">Loading queue...</p>}

            {!loadingQueue && queue
              .filter((entry) => entry.status === 'WAITING' || entry.status === 'IN_PROGRESS')
              .map((student, index) => (
                <div key={student.id} className="p-4 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{student.student.displayName}</p>
                    <p className="text-xs text-muted-foreground">{student.topic}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{student.status}</span>
                  <button
                    onClick={() => void advanceQueueEntry(student)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {student.status === 'WAITING' ? 'Start' : 'Complete'}
                  </button>
                </div>
              ))}
          </div>

          {!loadingQueue && queue.filter((entry) => entry.status === 'WAITING' || entry.status === 'IN_PROGRESS').length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No students in queue</div>
          )}
        </div>
      )}
    </div>
  )
}
