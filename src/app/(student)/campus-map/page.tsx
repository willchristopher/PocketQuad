'use client'

import React from 'react'
import Link from 'next/link'
import { Accessibility, AlertTriangle, CalendarDays, Clock3, MapPin, Navigation } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type BuildingRecord = {
  id: string
  name: string
  type: string
  address: string
  mapQuery: string
  operatingHours: string | null
  operationalStatus: 'OPEN' | 'CLOSED' | 'LIMITED'
  operationalNote: string | null
  accessibilityNotes: string | null
  operationalUpdatedAt: string | null
  announcements: Array<{
    id: string
    title: string
    message: string
    expiresAt: string | null
    createdAt: string
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    date: string
    time: string
    category: string
  }>
}

function buildDirectionsLink(query: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
}

const statusTone: Record<BuildingRecord['operationalStatus'], string> = {
  OPEN: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LIMITED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export default function CampusMapPage() {
  const [buildings, setBuildings] = React.useState<BuildingRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadBuildings = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiRequest<BuildingRecord[]>('/api/buildings')
        setBuildings(result)
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to load campus map locations'
        setError(message)
        setBuildings([])
      } finally {
        setLoading(false)
      }
    }

    void loadBuildings()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Campus Map</h1>
        <p className="text-sm text-muted-foreground">
          Resource locations, faculty offices, and event venues with direct directions links.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 animate-in-up stagger-1">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20 p-8 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />
          <MapPin className="relative mx-auto h-8 w-8 text-primary" />
          <p className="relative mt-2 text-sm text-muted-foreground">
            Map provider integration placeholder. Use the location cards below for directions.
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading campus locations...</p>}

        {!loading && buildings.map((building, index) => (
          <article
            key={building.id}
            className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up"
            style={{ animationDelay: `${0.04 * (index + 1)}s` }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{building.type}</p>
            <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{building.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>
              </div>
              <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]', statusTone[building.operationalStatus])}>
                {building.operationalStatus}
              </Badge>
            </div>

            {(building.operatingHours || building.operationalNote) && (
              <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                {building.operatingHours && (
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    <span>{building.operatingHours}</span>
                  </p>
                )}
                {building.operationalNote && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{building.operationalNote}</span>
                  </p>
                )}
              </div>
            )}

            {building.accessibilityNotes && (
              <div className="mt-4 rounded-xl border border-border/60 bg-card p-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <Accessibility className="h-3.5 w-3.5" />
                  Accessibility
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{building.accessibilityNotes}</p>
              </div>
            )}

            {building.announcements.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Current alerts</p>
                {building.announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{announcement.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Posted {formatDate(announcement.createdAt)}
                      {announcement.expiresAt ? ` • Ends ${formatDate(announcement.expiresAt)}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {building.upcomingEvents.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Upcoming in this building</p>
                {building.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-muted-foreground">
                        {formatDate(event.date)} • {event.time} • {event.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <a
              href={buildDirectionsLink(building.mapQuery)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35"
            >
              <Navigation className="h-3.5 w-3.5" />
              Get Directions
            </a>
          </article>
        ))}
      </section>

      {!loading && buildings.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No map locations are available for your university yet.
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground animate-in-up stagger-2">
        Need service operating hours? Visit <Link href="/services-status" className="font-semibold text-primary hover:text-primary/80">Services Status</Link>.
      </section>
    </div>
  )
}
