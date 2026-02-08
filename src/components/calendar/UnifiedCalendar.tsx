'use client'

import React from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { apiRequest, ApiClientError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type PersonalCalendarEvent = {
  id: string
  title: string
  start: string
  type: 'PERSONAL' | 'CAMPUS' | 'OFFICE_HOURS' | 'DEADLINE'
  location: string | null
}

type Deadline = {
  id: string
  title: string
  dueDate: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  course: string
}

type EventListResponse = {
  items: Array<{
    id: string
    title: string
    date: string
    category: string
    location: string
  }>
}

type CalendarEntry = {
  id: string
  title: string
  dateISO: string
  kind: 'Event' | 'Deadline' | 'Personal'
  category: string
  locationOrSource: string
}

const entryColor: Record<CalendarEntry['kind'], string> = {
  Event: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Deadline: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Personal: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
}

export function UnifiedCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = React.useState('All')
  const [entries, setEntries] = React.useState<CalendarEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  })

  React.useEffect(() => {
    let active = true

    const loadEntries = async () => {
      setLoading(true)
      setError(null)

      const start = startOfWeek(startOfMonth(currentMonth)).toISOString()
      const end = endOfWeek(endOfMonth(currentMonth)).toISOString()

      try {
        const [eventsData, calendarData, deadlinesData] = await Promise.all([
          apiRequest<EventListResponse>('/api/events?upcoming=true&limit=200'),
          apiRequest<PersonalCalendarEvent[]>(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
          apiRequest<Deadline[]>('/api/calendar/deadlines'),
        ])

        const nextEntries: CalendarEntry[] = [
          ...eventsData.items.map((event) => ({
            id: `event:${event.id}`,
            title: event.title,
            dateISO: event.date,
            kind: 'Event' as const,
            category: event.category,
            locationOrSource: event.location,
          })),
          ...calendarData.map((event) => ({
            id: `calendar:${event.id}`,
            title: event.title,
            dateISO: event.start,
            kind: 'Personal' as const,
            category: event.type,
            locationOrSource: event.location ?? 'Personal schedule',
          })),
          ...deadlinesData.map((deadline) => ({
            id: `deadline:${deadline.id}`,
            title: deadline.title,
            dateISO: deadline.dueDate,
            kind: 'Deadline' as const,
            category: deadline.priority,
            locationOrSource: deadline.course,
          })),
        ]

        if (active) {
          setEntries(nextEntries)
        }
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to load calendar data'
        if (active) {
          setEntries([])
          setError(message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadEntries()

    return () => {
      active = false
    }
  }, [currentMonth])

  const filterOptions = React.useMemo(() => {
    const categories = Array.from(new Set(entries.map((entry) => entry.category))).sort()
    return ['All', 'Event', 'Deadline', 'Personal', ...categories]
  }, [entries])

  const filteredEntries = entries.filter((entry) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Event' || activeFilter === 'Deadline' || activeFilter === 'Personal') {
      return entry.kind === activeFilter
    }
    return entry.category === activeFilter
  })

  const selectedEntries = selectedDate
    ? filteredEntries.filter((entry) => isSameDay(new Date(entry.dateISO), selectedDate))
    : []

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card animate-in-up">
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center overflow-hidden rounded-xl border border-border/60 bg-card/80">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 transition-colors hover:bg-muted/40"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="border-x border-border/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/40"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 transition-colors hover:bg-muted/40"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => setActiveFilter(option)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                activeFilter === option
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/40',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 pt-3">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/10 mt-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-h-[520px] grid-cols-7 auto-rows-fr">
        {monthDays.map((day) => {
          const dayEntries = filteredEntries.filter((entry) => isSameDay(new Date(entry.dateISO), day))
          const currentMonthDay = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'min-h-[88px] border-b border-r border-border/30 p-1.5 text-left transition-all duration-200 hover:bg-muted/30',
                !currentMonthDay && 'opacity-35',
                isToday(day) && 'bg-primary/[0.04]',
              )}
            >
              <span
                className={cn(
                  'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold',
                  isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="space-y-1">
                {loading ? (
                  <p className="px-1 text-[10px] text-muted-foreground">...</p>
                ) : (
                  <>
                    {dayEntries.slice(0, 2).map((entry) => (
                      <div
                        key={entry.id}
                        className={cn('truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold animate-in-up', entryColor[entry.kind])}
                      >
                        {entry.title}
                      </div>
                    ))}
                    {dayEntries.length > 2 && (
                      <p className="px-1 text-[10px] font-medium text-muted-foreground">+{dayEntries.length - 2} more</p>
                    )}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <Dialog open={Boolean(selectedDate)} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{format(selectedDate, 'EEEE, MMMM d')}</DialogTitle>
              <DialogDescription>
                {selectedEntries.length === 0
                  ? 'No matching calendar items for this day.'
                  : `${selectedEntries.length} item(s) on this day.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {selectedEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn('rounded-xl border p-3 animate-in-up', entryColor[entry.kind])}
                  style={{ animationDelay: `${0.03 * (index + 1)}s` }}
                >
                  <p className="text-sm font-semibold">{entry.title}</p>
                  <p className="mt-0.5 text-xs">{entry.kind} | {entry.category}</p>
                  <p className="mt-0.5 text-xs">{entry.locationOrSource}</p>
                  <p className="mt-1 text-xs">{format(new Date(entry.dateISO), 'h:mm a')}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
