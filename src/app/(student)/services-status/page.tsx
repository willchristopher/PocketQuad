'use client'

import React from 'react'
import { ExternalLink, MapPin } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type CampusService = {
  id: string
  name: string
  status: 'OPEN' | 'CLOSED' | 'LIMITED'
  hours: string
  location: string
  directionsUrl: string
}

const statusStyles: Record<CampusService['status'], string> = {
  OPEN: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  CLOSED: 'bg-red-500/10 text-red-700 dark:text-red-300',
  LIMITED: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

export default function ServicesStatusPage() {
  const [services, setServices] = React.useState<CampusService[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadServices = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiRequest<CampusService[]>('/api/campus-services')
        setServices(result)
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to load campus services'
        setError(message)
        setServices([])
      } finally {
        setLoading(false)
      }
    }

    void loadServices()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Campus Services Status</h1>
        <p className="text-sm text-muted-foreground">
          Live-style service indicator for major campus facilities.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading services...</p>}

        {!loading && services.map((service, index) => (
          <article
            key={service.id}
            className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up"
            style={{ animationDelay: `${0.04 * (index + 1)}s` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{service.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{service.hours}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {service.location}
                </p>
              </div>

              <span className={cn('rounded-full px-3 py-1 text-xs font-bold', statusStyles[service.status])}>
                {service.status}
              </span>
            </div>

            <a
              href={service.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Get Directions
            </a>
          </article>
        ))}
      </section>

      {!loading && services.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No service status records are available for your university.
        </section>
      )}
    </div>
  )
}
