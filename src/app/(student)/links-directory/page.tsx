'use client'

import React from 'react'
import { ExternalLink, Search } from 'lucide-react'

import { ApiClientError, apiRequest } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type LinkCategory = 'LEARNING' | 'COMMUNICATION' | 'STUDENT_SERVICES' | 'FINANCE' | 'CAMPUS_LIFE' | 'OTHER'

type ResourceLink = {
  id: string
  label: string
  category: LinkCategory
  href: string
  description: string
}

const categories: Array<'All' | LinkCategory> = [
  'All',
  'LEARNING',
  'COMMUNICATION',
  'STUDENT_SERVICES',
  'FINANCE',
  'CAMPUS_LIFE',
  'OTHER',
]

export default function LinksDirectoryPage() {
  const [query, setQuery] = React.useState('')
  const [activeCategory, setActiveCategory] = React.useState<(typeof categories)[number]>('All')
  const [links, setLinks] = React.useState<ResourceLink[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadLinks = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      ...(query ? { search: query } : {}),
      ...(activeCategory !== 'All' ? { category: activeCategory } : {}),
    })

    try {
      const result = await apiRequest<ResourceLink[]>(`/api/resource-links?${params.toString()}`)
      setLinks(result)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load resource links'
      setError(message)
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [activeCategory, query])

  React.useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  return (
    <div className="space-y-6">
      <div className="space-y-1 animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Links Directory</h1>
        <p className="text-sm text-muted-foreground">
          Categorized shortcuts to external university portals from one place.
        </p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/90 p-4 md:p-5 animate-in-up stagger-1">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search links"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                  activeCategory === category
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/40'
                )}
              >
                {category === 'All' ? 'All' : category.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading links...</p>}

        {!loading && links.map((link, index) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-border/60 bg-card p-5 hover-lift animate-in-up"
            style={{ animationDelay: `${0.04 * (index + 1)}s` }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{link.category.replaceAll('_', ' ')}</p>
            <h2 className="mt-1 text-lg font-bold">{link.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              Open portal
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </a>
        ))}
      </section>

      {!loading && links.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No links matched your query.
        </section>
      )}
    </div>
  )
}
