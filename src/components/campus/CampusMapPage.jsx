'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Accessibility,
  AlertTriangle,
  Building2,
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Star,
} from 'lucide-react'

import CampusGoogleMap from '@/components/campus/CampusGoogleMap'
import { ApiClientError, apiRequest } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SEARCH_DEBOUNCE_MS = 250

const statusTone = {
  OPEN: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LIMITED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

function formatBuildingStatusLabel(status) {
  switch (status) {
    case 'OPEN':
      return 'Operating under normal hours'
    case 'LIMITED':
      return 'Operating with limited hours'
    case 'CLOSED':
      return 'Currently closed'
    default:
      return status
  }
}

function formatBuildingStatusPillLabel(status) {
  switch (status) {
    case 'OPEN':
      return 'Normal hours'
    case 'LIMITED':
      return 'Limited'
    case 'CLOSED':
      return 'Closed'
    default:
      return status
  }
}

function buildDirectionsLink(building) {
  const coordinateTarget =
    Number.isFinite(building.latitude) && Number.isFinite(building.longitude)
      ? `${building.latitude},${building.longitude}`
      : building.mapQuery || building.address || building.name

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinateTarget)}`
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getSearchResultLabel(count, query) {
  if (query) {
    return `${count} match${count === 1 ? '' : 'es'} for "${query}"`
  }

  return `${count} campus location${count === 1 ? '' : 's'}`
}

export default function CampusMapPage({
  initialBuildings = [],
  initialSearchQuery = '',
  hasInitialData = false,
}) {
  const { refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const requestedBuildingId = searchParams.get('buildingId')
  const [buildings, setBuildings] = React.useState(initialBuildings)
  const [selectedBuildingId, setSelectedBuildingId] = React.useState(null)
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState(initialSearchQuery)
  const [loading, setLoading] = React.useState(!hasInitialData)
  const [error, setError] = React.useState(null)
  const [favoritingBuildingId, setFavoritingBuildingId] = React.useState(null)
  const [mapFocusNonce, setMapFocusNonce] = React.useState(0)
  const latestRequestRef = React.useRef(0)
  const initialSearchRef = React.useRef(initialSearchQuery)
  const mapSectionRef = React.useRef(null)

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchQuery])

  React.useEffect(() => {
    if (
      hasInitialData &&
      latestRequestRef.current === 0 &&
      debouncedSearchQuery.trim() === initialSearchRef.current
    ) {
      latestRequestRef.current = 1
      setLoading(false)
      setError(null)
      return undefined
    }

    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId
    setLoading(true)
    setError(null)

    const loadBuildings = async () => {
      try {
        const queryString = debouncedSearchQuery
          ? `?search=${encodeURIComponent(debouncedSearchQuery)}`
          : ''
        const result = await apiRequest(`/api/buildings${queryString}`)

        if (latestRequestRef.current !== requestId) {
          return
        }

        setBuildings(result)
      } catch (err) {
        if (latestRequestRef.current !== requestId) {
          return
        }

        const message =
          err instanceof ApiClientError ? err.message : 'Unable to load campus map locations'
        setError(message)
        setBuildings([])
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false)
        }
      }
    }

    void loadBuildings()
  }, [debouncedSearchQuery, hasInitialData])

  React.useEffect(() => {
    if (buildings.length === 0) {
      setSelectedBuildingId(null)
      return
    }

    setSelectedBuildingId((current) =>
      requestedBuildingId && buildings.some((building) => building.id === requestedBuildingId)
        ? requestedBuildingId
        : current && buildings.some((building) => building.id === current)
          ? current
          : buildings[0].id,
    )
  }, [buildings, requestedBuildingId])

  const selectedBuilding = React.useMemo(() => {
    if (!selectedBuildingId) return null
    return buildings.find((building) => building.id === selectedBuildingId) ?? null
  }, [buildings, selectedBuildingId])

  const handleShowLocation = React.useCallback(() => {
    if (!selectedBuilding) return

    setMapFocusNonce((current) => current + 1)
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedBuilding])

  const toggleBuildingFavorite = React.useCallback(
    async (buildingId) => {
      if (favoritingBuildingId === buildingId) return

      const currentBuilding = buildings.find((building) => building.id === buildingId)

      if (!currentBuilding) return

      const nextFavoriteState = !currentBuilding.isFavorited

      setFavoritingBuildingId(buildingId)
      setError(null)
      setBuildings((current) =>
        current.map((building) =>
          building.id === buildingId ? { ...building, isFavorited: nextFavoriteState } : building,
        ),
      )

      try {
        const result = await apiRequest(`/api/buildings/${buildingId}/favorite`, {
          method: 'POST',
        })

        setBuildings((current) =>
          current.map((building) =>
            building.id === buildingId ? { ...building, isFavorited: result.isFavorited } : building,
          ),
        )
        void refreshProfile().catch(() => {})
      } catch (err) {
        const message =
          err instanceof ApiClientError ? err.message : 'Unable to update saved building'
        setError(message)
        setBuildings((current) =>
          current.map((building) =>
            building.id === buildingId
              ? { ...building, isFavorited: currentBuilding.isFavorited }
              : building,
          ),
        )
      } finally {
        setFavoritingBuildingId((current) => (current === buildingId ? null : current))
      }
    },
    [buildings, favoritingBuildingId, refreshProfile],
  )

  return (
    <div className="space-y-6">
      <section className="animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Campus map
        </h1>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <article className="rounded-xl border border-border/60 bg-card p-5 shadow-sm animate-in-up stagger-1">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Search</p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Science Hall, advising, library, BIO..."
                  className="h-12 rounded-xl pl-11 pr-4"
                  aria-label="Search campus buildings"
                />
                {loading ? (
                  <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-sm font-semibold">
                  {getSearchResultLabel(buildings.length, debouncedSearchQuery)}
                </p>
                <Badge variant="outline" className="rounded-full border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                  {selectedBuilding ? 'Ready' : 'Search'}
                </Badge>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-border/60 bg-card p-3 shadow-sm animate-in-up stagger-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
              <p className="text-sm font-semibold">Results</p>
            </div>

            <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {loading && buildings.length === 0 ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-xl border border-border/60 bg-muted/20"
                    />
                  ))}
                </div>
              ) : null}

              {!loading && buildings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
                  <p className="text-sm font-semibold">No buildings matched that search.</p>
                </div>
              ) : null}

              {buildings.map((building) => {
                const isSelected = selectedBuilding?.id === building.id

                return (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setSelectedBuildingId(building.id)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary/40 bg-primary/6 shadow-sm'
                        : 'border-border/60 bg-card hover:border-primary/20 hover:bg-muted/20',
                    )}
                  >
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-base font-semibold leading-tight text-foreground">
                          {building.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
                            {building.type}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold normal-case tracking-[0.02em]',
                              statusTone[building.operationalStatus],
                            )}
                          >
                            {formatBuildingStatusPillLabel(building.operationalStatus)}
                          </Badge>
                        </div>
                      </div>

                      {building.isFavorited ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Saved to dashboard
                        </div>
                      ) : null}

                      <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                        <MapPin className="mt-1 h-4 w-4 shrink-0" />
                        <span>{building.address}</span>
                      </p>

                      {building.description ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {building.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="rounded-xl border border-border/60 bg-card p-5 shadow-sm animate-in-up stagger-2">
            {selectedBuilding ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/75">
                      {selectedBuilding.type}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
                      {selectedBuilding.name}
                    </h2>
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{selectedBuilding.address}</span>
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] font-medium',
                      statusTone[selectedBuilding.operationalStatus],
                    )}
                  >
                    {formatBuildingStatusLabel(selectedBuilding.operationalStatus)}
                  </Badge>
                </div>

                {selectedBuilding.description ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedBuilding.description}
                  </p>
                ) : null}

                {(selectedBuilding.operatingHours ||
                  selectedBuilding.operationalNote ||
                  selectedBuilding.accessibilityNotes) ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedBuilding.operatingHours ? (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          Hours
                        </p>
                        <p className="mt-2 text-sm">{selectedBuilding.operatingHours}</p>
                      </div>
                    ) : null}

                    {selectedBuilding.operationalNote ? (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Notice
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selectedBuilding.operationalNote}
                        </p>
                      </div>
                    ) : null}

                    {selectedBuilding.accessibilityNotes ? (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                          <Accessibility className="h-3.5 w-3.5" />
                          Accessibility
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selectedBuilding.accessibilityNotes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant={selectedBuilding.isFavorited ? 'default' : 'outline'}
                    onClick={() => void toggleBuildingFavorite(selectedBuilding.id)}
                    disabled={favoritingBuildingId === selectedBuilding.id}
                  >
                    <Star
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedBuilding.isFavorited && 'fill-current',
                      )}
                    />
                    {favoritingBuildingId === selectedBuilding.id
                      ? 'Saving...'
                      : selectedBuilding.isFavorited
                        ? 'Saved to dashboard'
                        : 'Save to dashboard'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleShowLocation}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Show location
                  </Button>
                  <Button asChild>
                    <a
                      href={buildDirectionsLink(selectedBuilding)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Get directions
                    </a>
                  </Button>
                </div>

                {selectedBuilding.announcements.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Current alerts
                    </p>
                    {selectedBuilding.announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="rounded-xl border border-border/60 bg-card p-4"
                      >
                        <p className="text-sm font-semibold">{announcement.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {announcement.message}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Posted {formatDate(announcement.createdAt)}
                          {announcement.expiresAt ? ` • Ends ${formatDate(announcement.expiresAt)}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedBuilding.upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Upcoming in this building
                    </p>
                    {selectedBuilding.upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4"
                      >
                        <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(event.date)} • {event.time} • {event.category}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
                <Building2 className="h-10 w-10 text-primary/80" />
                <p className="mt-4 text-base font-semibold">Choose a building to see details.</p>
              </div>
            )}
          </article>

          <section
            ref={mapSectionRef}
            className="rounded-xl border border-border/60 bg-card p-4 shadow-sm animate-in-up stagger-3"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-semibold">Google Maps preview</p>
              <Badge variant="outline" className="rounded-full border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                {selectedBuilding ? '1 active pin' : 'No active pin'}
              </Badge>
            </div>

            <CampusGoogleMap
              buildings={buildings}
              selectedBuildingId={selectedBuilding?.id ?? null}
              focusBuildingId={selectedBuilding?.id ?? null}
              focusNonce={mapFocusNonce}
            />
          </section>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground animate-in-up stagger-3">
        <Link href="/services-status" className="font-semibold text-primary hover:text-primary/80">
          Services Status
        </Link>
        .
      </section>
    </div>
  )
}
