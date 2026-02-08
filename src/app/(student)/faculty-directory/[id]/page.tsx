'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, MapPin, Mail } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type OfficeHourSlot = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  mode: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  isActive: boolean
}

type FacultyDetail = {
  id: string
  name: string
  title: string
  department: string
  email: string
  officeLocation: string
  officeHours: string
  bio: string | null
  isFavorited: boolean
  officeHourSlots: OfficeHourSlot[]
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function FacultyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)

  const [faculty, setFaculty] = React.useState<FacultyDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    const loadFaculty = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await apiRequest<FacultyDetail>(`/api/faculty/${id}`)
        if (active) {
          setFaculty(data)
        }
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty details'
        if (active) {
          setError(message)
          setFaculty(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadFaculty()

    return () => {
      active = false
    }
  }, [id])

  const onToggleFavorite = async () => {
    if (!faculty) return

    setError(null)

    try {
      const result = await apiRequest<{ isFavorited: boolean }>(`/api/faculty/${faculty.id}/favorite`, {
        method: 'POST',
      })

      setFaculty((previous) =>
        previous
          ? {
              ...previous,
              isFavorited: result.isFavorited,
            }
          : previous,
      )
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to update favorite'
      setError(message)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading faculty profile...</p>
  }

  if (!faculty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in-up">
        <p className="text-sm text-muted-foreground">Faculty member not found.</p>
        <Link href="/faculty-directory" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to Faculty Directory
        </Link>
      </div>
    )
  }

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(faculty.officeLocation)}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/faculty-directory" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground animate-in-up">
        <ArrowLeft className="h-4 w-4" />
        Back to Faculty Directory
      </Link>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 md:p-8 animate-in-up stagger-1">
        <div className="pointer-events-none absolute -left-20 -top-20 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{faculty.department}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight md:text-3xl">{faculty.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{faculty.title}</p>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{faculty.bio ?? 'No bio available yet.'}</p>

          <div className="mt-5 space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${faculty.email}`} className="font-medium text-primary hover:text-primary/80">
                {faculty.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {faculty.officeLocation}
            </p>
            <p><span className="font-semibold">Office Hours:</span> {faculty.officeHours}</p>
          </div>

          {faculty.officeHourSlots.length > 0 && (
            <div className="mt-5 rounded-xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Live Office Hour Slots</p>
              <div className="mt-2 space-y-2">
                {faculty.officeHourSlots.map((slot) => (
                  <p key={slot.id} className="text-xs text-muted-foreground">
                    {weekdays[slot.dayOfWeek]} {slot.startTime}-{slot.endTime} | {slot.mode.replace('_', ' ')} |{' '}
                    {slot.isActive ? 'Active' : 'Inactive'}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => void onToggleFavorite()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
                faculty.isFavorited
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'border-border/60 hover:bg-muted/35',
              )}
            >
              <Heart className={cn('h-4 w-4', faculty.isFavorited && 'fill-red-600 dark:fill-red-400')} />
              {faculty.isFavorited ? 'Favorited' : 'Favorite'}
            </button>

            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/35"
            >
              <MapPin className="h-4 w-4" />
              Get Directions
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
