'use client'

import React from 'react'
import Link from 'next/link'
import { CalendarPlus, Heart, MapPin, Search } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type EventItem = {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  category: 'ACADEMIC' | 'SOCIAL' | 'SPORTS' | 'ARTS' | 'CAREER' | 'CLUBS' | 'WELLNESS' | 'OTHER'
  organizer: string
  interestedCount: number
  isInterested: boolean
}

type EventsResponse = {
  items: EventItem[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}

const categoryFilters = ['All', 'ACADEMIC', 'SOCIAL', 'SPORTS', 'ARTS', 'CAREER', 'CLUBS', 'WELLNESS', 'OTHER'] as const
const dateFilters = ['All Dates', 'Next 7 Days', 'Next 30 Days'] as const

function formatDate(iso: string) {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function isWithinDateFilter(dateISO: string, filter: (typeof dateFilters)[number]) {
  if (filter === 'All Dates') return true

  const now = Date.now()
  const target = new Date(dateISO).getTime()
  const diffDays = (target - now) / (1000 * 60 * 60 * 24)

  if (filter === 'Next 7 Days') return diffDays >= 0 && diffDays <= 7
  return diffDays >= 0 && diffDays <= 30
}

function toEventEnd(startIso: string) {
  return new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString()
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<(typeof categoryFilters)[number]>('All')
  const [dateFilter, setDateFilter] = React.useState<(typeof dateFilters)[number]>('All Dates')
  const [locationFilter, setLocationFilter] = React.useState('')
  const [events, setEvents] = React.useState<EventItem[]>([])
  const [calendarAdds, setCalendarAdds] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadEvents = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      limit: '100',
      ...(searchQuery ? { search: searchQuery } : {}),
      ...(categoryFilter !== 'All' ? { category: categoryFilter } : {}),
    })

    try {
      const response = await apiRequest<EventsResponse>(`/api/events?${params.toString()}`)
      setEvents(response.items)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load events'
      setError(message)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, searchQuery])

  React.useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const filteredEvents = events.filter((event) => {
    const matchesLocation = event.location.toLowerCase().includes(locationFilter.toLowerCase())
    const matchesDate = isWithinDateFilter(event.date, dateFilter)
    return matchesLocation && matchesDate
  })

  const toggleInterest = async (eventId: string) => {
    setError(null)

    try {
      const result = await apiRequest<{ interestedCount: number; isInterested: boolean }>(`/api/events/${eventId}/interest`, {
        method: 'POST',
      })

      setEvents((previous) =>
        previous.map((item) =>
          item.id === eventId
            ? { ...item, isInterested: result.isInterested, interestedCount: result.interestedCount }
            : item,
        ),
      )
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to update event interest'
      setError(message)
    }
  }

  const addToCalendar = async (event: EventItem) => {
    setError(null)

    try {
      await apiRequest('/api/calendar', {
        method: 'POST',
        body: {
          title: event.title,
          description: event.description,
          start: event.date,
          end: toEventEnd(event.date),
          allDay: false,
          type: 'CAMPUS',
          location: event.location,
        },
      })

      setCalendarAdds((previous) => new Set(previous).add(event.id))
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to add event to calendar'
      setError(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Campus Event Discovery</h1>
        <p className="text-sm text-muted-foreground">
          Browse, search, and filter campus events by category, date, and location.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/90 p-4 md:p-5 animate-in-up stagger-1">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as (typeof categoryFilters)[number])}
            className="h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm transition-colors hover:bg-muted/35"
          >
            {categoryFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter === 'All' ? 'All Categories' : filter}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as (typeof dateFilters)[number])}
            className="h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm transition-colors hover:bg-muted/35"
          >
            {dateFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>

          <input
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            placeholder="Filter by location"
            className="h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm outline-none transition-colors focus:border-primary/40 focus:bg-muted/35"
          />
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && <p className="text-sm text-muted-foreground">Loading events...</p>}

        {!loading && filteredEvents.map((event, index) => {
          const added = calendarAdds.has(event.id)

          return (
            <article
              key={event.id}
              className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up"
              style={{ animationDelay: `${0.04 * (index + 1)}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{event.category}</p>
                  <h2 className="mt-1 text-lg font-bold leading-tight">{event.title}</h2>
                </div>
                <button
                  onClick={() => void toggleInterest(event.id)}
                  className={cn(
                    'rounded-lg border p-2 transition-all duration-200',
                    event.isInterested
                      ? 'border-red-500/40 bg-red-500/10 text-red-600'
                      : 'border-border/60 text-muted-foreground hover:bg-muted/40',
                  )}
                  aria-label={event.isInterested ? 'Remove interest' : 'Mark interested'}
                >
                  <Heart className={cn('h-4 w-4', event.isInterested && 'fill-red-600')} />
                </button>
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>{formatDate(event.date)} | {event.time}</p>
                <p className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </p>
                <p>Organizer: {event.organizer}</p>
                <p>{event.interestedCount} interested</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/events/${event.id}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35">
                  View Details
                </Link>
                <button
                  onClick={() => void addToCalendar(event)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200',
                    added
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
                  )}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {added ? 'Added' : 'Add to Calendar'}
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {!loading && filteredEvents.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No events matched your filters. Try broadening the category, date window, or location.
        </section>
      )}
    </div>
  )
}
