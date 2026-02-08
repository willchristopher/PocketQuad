'use client'

import React from 'react'
import { ExternalLink, Mail } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'

type ClubRecord = {
  id: string
  name: string
  category: string
  description: string
  contactEmail: string | null
  websiteUrl: string | null
  meetingInfo: string | null
}

export default function ClubsPage() {
  const [clubs, setClubs] = React.useState<ClubRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadClubs = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await apiRequest<ClubRecord[]>('/api/clubs')
        setClubs(result)
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to load clubs and organizations'
        setError(message)
        setClubs([])
      } finally {
        setLoading(false)
      }
    }

    void loadClubs()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Clubs & Organizations</h1>
        <p className="text-sm text-muted-foreground">Discover groups, communities, and student-led organizations.</p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading organizations...</p>}

        {!loading && clubs.map((club, index) => (
          <article key={club.id} className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up" style={{ animationDelay: `${0.04 * (index + 1)}s` }}>
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{club.category}</p>
            <h2 className="mt-1 text-lg font-bold">{club.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{club.description}</p>

            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {club.meetingInfo && <p>{club.meetingInfo}</p>}
              {club.contactEmail && (
                <p className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {club.contactEmail}
                </p>
              )}
            </div>

            {club.websiteUrl && (
              <a
                href={club.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Website
              </a>
            )}
          </article>
        ))}
      </section>

      {!loading && clubs.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No clubs are available for your university yet.
        </section>
      )}
    </div>
  )
}
