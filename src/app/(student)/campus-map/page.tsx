'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Navigation } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'

type BuildingRecord = {
  id: string
  name: string
  type: string
  address: string
  mapQuery: string
}

function buildDirectionsLink(query: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
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
            <h2 className="mt-1 text-lg font-bold">{building.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>
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
