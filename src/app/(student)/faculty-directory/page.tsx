'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { getStudentFacingFacultyAvailabilityTone } from '@/lib/faculty'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type FacultyEntry = {
  id: string
  name: string
  title: string
  department: string
  email: string
  officeLocation: string
  officeHours: string
  bio: string | null
  tags: string[]
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'AWAY'
  availabilityNote: string | null
  studentAvailabilityLabel: string
  studentAvailabilityState: 'AVAILABLE' | 'LIMITED' | 'AWAY' | 'OUT_OF_OFFICE_HOURS' | 'TBD'
}

const toneClasses = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'border-border/60 bg-muted/20 text-muted-foreground',
} as const

export default function FacultyDirectoryPage() {
  const [query, setQuery] = React.useState('')
  const [department, setDepartment] = React.useState('All')
  const [entries, setEntries] = React.useState<FacultyEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadFaculty = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest<FacultyEntry[]>('/api/faculty')
      setEntries(result)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty directory'
      setError(message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadFaculty()
  }, [loadFaculty])

  const departments = React.useMemo(
    () => ['All', ...Array.from(new Set(entries.map((entry) => entry.department))).sort()],
    [entries],
  )

  const filteredEntries = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesDepartment = department === 'All' || entry.department === department
      if (!matchesDepartment) return false
      if (!normalizedQuery) return true

      const searchable = [
        entry.name,
        entry.title,
        entry.department,
        entry.officeLocation,
        entry.bio ?? '',
        ...entry.tags,
      ].join(' ').toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [department, entries, query])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-6 py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative space-y-3">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Faculty Directory
          </Badge>
          <div className="max-w-3xl space-y-1.5">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Find the right person faster</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Search by name, office location, department, or support tags to find faculty who can help with advising, registration, scholarships, internships, and other campus needs.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-border/60 bg-card/90 p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by faculty name, role, tag, or office"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="h-11 rounded-2xl border border-border/60 bg-muted/20 px-3 text-sm transition-colors hover:bg-muted/35"
          >
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading faculty...</p>}

        {!loading &&
          filteredEntries.map((entry) => {
            const tone = toneClasses[getStudentFacingFacultyAvailabilityTone(entry.studentAvailabilityState)]

            return (
              <Link
                key={entry.id}
                href={`/faculty-directory/${entry.id}`}
                className="group rounded-[24px] border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{entry.department}</p>
                    <h2 className="font-display text-xl font-bold tracking-tight">{entry.name}</h2>
                    <p className="text-sm text-muted-foreground">{entry.title}</p>
                  </div>

                  <div className={cn('rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
                    {entry.studentAvailabilityLabel}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                      {tag}
                    </Badge>
                  ))}
                  {entry.tags.length === 0 && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                      Faculty contact
                    </Badge>
                  )}
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {entry.bio ?? 'No bio added yet. Open the profile to review office hours, office location, and contact details.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {entry.officeLocation}
                  </span>
                  <span>{entry.officeHours}</span>
                </div>

                <div className="mt-5 inline-flex items-center text-sm font-semibold text-primary transition-colors group-hover:text-primary/80">
                  View full profile
                </div>
              </Link>
            )
          })}
      </section>

      {!loading && filteredEntries.length === 0 && (
        <section className="rounded-[24px] border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-base font-semibold">No faculty matched that search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a department filter, a broader keyword, or a tag like advising, tutoring, or scholarships.
          </p>
        </section>
      )}
    </div>
  )
}
