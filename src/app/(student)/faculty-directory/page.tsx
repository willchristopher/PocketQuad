'use client'

import React from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'

type FacultyEntry = {
  id: string
  name: string
  title: string
  department: string
  email: string
  officeLocation: string
  officeHours: string
}

export default function FacultyDirectoryPage() {
  const [query, setQuery] = React.useState('')
  const [department, setDepartment] = React.useState('All')
  const [entries, setEntries] = React.useState<FacultyEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadFaculty = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      ...(query ? { search: query } : {}),
      ...(department !== 'All' ? { department } : {}),
    })

    try {
      const result = await apiRequest<FacultyEntry[]>(`/api/faculty?${params.toString()}`)
      setEntries(result)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty directory'
      setError(message)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [department, query])

  React.useEffect(() => {
    void loadFaculty()
  }, [loadFaculty])

  const departments = React.useMemo(
    () => ['All', ...Array.from(new Set(entries.map((entry) => entry.department))).sort()],
    [entries],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Faculty Directory</h1>
        <p className="text-sm text-muted-foreground">
          Search faculty by department and review contact details, office locations, and office hours.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/90 p-4 md:p-5 animate-in-up stagger-1">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search faculty"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm transition-colors hover:bg-muted/35"
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
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading faculty...</p>}

        {!loading && entries.map((entry, index) => (
          <Link
            key={entry.id}
            href={`/faculty-directory/${entry.id}`}
            className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up"
            style={{ animationDelay: `${0.04 * (index + 1)}s` }}
          >
            <h2 className="text-lg font-bold">{entry.name}</h2>
            <p className="text-sm text-muted-foreground">{entry.title} | {entry.department}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p>Email: {entry.email}</p>
              <p>Office: {entry.officeLocation}</p>
              <p>Office Hours: {entry.officeHours}</p>
            </div>
          </Link>
        ))}
      </section>

      {!loading && entries.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No faculty entries matched your search.
        </section>
      )}
    </div>
  )
}
