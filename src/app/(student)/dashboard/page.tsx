'use client'

import React from 'react'
import Link from 'next/link'
import { BellRing, CalendarClock, Compass, ExternalLink, MapPinned, Newspaper, Star } from 'lucide-react'
import { BentoGrid, BentoWidget } from '@/components/dashboard/BentoGrid'
import {
  dashboardModuleIds,
  campusNews,
  defaultFavorites,
} from '@/lib/studentData'
import { readFavorites, writeFavorites } from '@/lib/favorites'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'

type DashboardPreferences = Record<(typeof dashboardModuleIds)[number], boolean>

type EventItem = {
  id: string
  title: string
  date: string
  time: string
  location: string
}

type EventsResponse = {
  items: EventItem[]
}

type DeadlineItem = {
  id: string
  title: string
  course: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string
}

type ServiceSnapshot = {
  id: string
  name: string
  status: 'OPEN' | 'CLOSED' | 'LIMITED'
  hours: string
}

type ResourceLinkSnapshot = {
  id: string
  label: string
  category: 'LEARNING' | 'COMMUNICATION' | 'STUDENT_SERVICES' | 'FINANCE' | 'CAMPUS_LIFE' | 'OTHER'
  href: string
}

type ClubSnapshot = {
  id: string
  name: string
  category: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatDue(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [favorites, setFavorites] = React.useState(defaultFavorites)
  const [upcomingEvents, setUpcomingEvents] = React.useState<EventItem[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = React.useState<DeadlineItem[]>([])
  const [serviceSnapshot, setServiceSnapshot] = React.useState<ServiceSnapshot[]>([])
  const [quickLinks, setQuickLinks] = React.useState<ResourceLinkSnapshot[]>([])
  const [clubSnapshot, setClubSnapshot] = React.useState<ClubSnapshot[]>([])
  const [dashboardPreferences, setDashboardPreferences] = React.useState<DashboardPreferences>({
    favorites: true,
    deadlines: true,
    events: true,
    news: true,
    services: true,
    links: true,
  })

  React.useEffect(() => {
    const storedFavorites = readFavorites()
    if (storedFavorites.length === 0) {
      writeFavorites(defaultFavorites)
      setFavorites(defaultFavorites)
    } else {
      setFavorites(storedFavorites)
    }

    const rawPreferences = window.localStorage.getItem('myquad-dashboard-preferences')
    if (!rawPreferences) return

    try {
      const parsed = JSON.parse(rawPreferences) as DashboardPreferences
      setDashboardPreferences((previous) => ({ ...previous, ...parsed }))
    } catch {
      // Ignore invalid persisted preferences and keep defaults.
    }

    const loadBackendData = async () => {
      try {
        const [eventsData, deadlinesData, servicesData, linksData, clubsData] = await Promise.all([
          apiRequest<EventsResponse>('/api/events?upcoming=true&limit=4'),
          apiRequest<DeadlineItem[]>('/api/calendar/deadlines?upcoming=true'),
          apiRequest<ServiceSnapshot[]>('/api/campus-services'),
          apiRequest<ResourceLinkSnapshot[]>('/api/resource-links'),
          apiRequest<ClubSnapshot[]>('/api/clubs'),
        ])

        setUpcomingEvents(eventsData.items.slice(0, 4))
        setUpcomingDeadlines(deadlinesData.slice(0, 3))
        setServiceSnapshot(servicesData.slice(0, 3))
        setQuickLinks(linksData.slice(0, 4))
        setClubSnapshot(clubsData.slice(0, 3))
      } catch {
        setUpcomingEvents([])
        setUpcomingDeadlines([])
        setServiceSnapshot([])
        setQuickLinks([])
        setClubSnapshot([])
      }
    }

    void loadBackendData()
  }, [])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-6 md:px-7 md:py-7 animate-in-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Student Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Welcome back, <span className="text-primary">{profile?.displayName ?? profile?.email ?? 'Student'}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Events, deadlines, news, services, and quick-access resources in one smooth workspace.
          </p>
        </div>
      </section>

      <BentoGrid>
        {dashboardPreferences.favorites && (
          <BentoWidget
            title="Favorited Items"
            icon={Star}
            span="medium"
            action={{ label: 'Manage', href: '/profile' }}
            className="min-h-[320px] animate-in-up stagger-1"
          >
            <div className="space-y-2.5">
              {favorites.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                  No favorites yet. Save events, faculty, or links to pin them here.
                </p>
              ) : (
                favorites.map((item, index) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-xl border border-border/50 bg-muted/20 p-3 hover-lift animate-in-up"
                    style={{ animationDelay: `${0.03 * (index + 1)}s` }}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                  </Link>
                ))
              )}
            </div>
          </BentoWidget>
        )}

        {(dashboardPreferences.events || dashboardPreferences.deadlines) && (
          <BentoWidget
            title="Upcoming Events and Deadlines"
            icon={CalendarClock}
            span="large"
            action={{ label: 'Open Calendar', href: '/calendar' }}
            className="min-h-[320px] animate-in-up stagger-2"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {dashboardPreferences.events && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Events</p>
                  <div className="space-y-2">
                    {upcomingEvents.map((event, index) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="block rounded-xl border border-border/50 bg-muted/10 p-3 transition-all duration-200 hover:bg-muted/35 hover-lift animate-in-up"
                        style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                      >
                        <p className="line-clamp-1 text-sm font-semibold">{event.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(event.date)} | {event.time} | {event.location}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {dashboardPreferences.deadlines && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Deadlines</p>
                  <div className="space-y-2">
                    {upcomingDeadlines.map((deadline, index) => (
                      <div
                        key={deadline.id}
                        className="rounded-xl border border-border/50 bg-muted/10 p-3 hover-lift animate-in-up"
                        style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">{deadline.title}</p>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {deadline.priority}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{deadline.course}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Due {formatDue(deadline.dueDate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.news && (
          <BentoWidget
            title="Campus News"
            icon={Newspaper}
            span="medium"
            action={{ label: 'All Updates', href: '/notifications' }}
            className="min-h-[320px] animate-in-up stagger-3"
          >
            <div className="space-y-2.5">
              {campusNews.map((item, index) => (
                <Link
                  key={item.id}
                  href="/notifications"
                  className="block rounded-xl border border-border/50 bg-muted/10 p-3 transition-all duration-200 hover:bg-muted/35 hover-lift animate-in-up"
                  style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold">{item.headline}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {item.level}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{item.postedLabel}</p>
                </Link>
              ))}
            </div>
          </BentoWidget>
        )}

        {(dashboardPreferences.links || dashboardPreferences.services) && (
          <BentoWidget
            title="Quick Access"
            icon={ExternalLink}
            span="full"
            className="min-h-[220px] animate-in-up stagger-4"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {dashboardPreferences.links && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">External Portals</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quickLinks.map((link, index) => (
                      <a
                        key={link.id}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-border/50 bg-muted/10 p-3 transition-all duration-200 hover:bg-muted/35 hover-lift animate-in-up"
                        style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                      >
                        <p className="text-sm font-semibold">{link.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{link.category.replaceAll('_', ' ')}</p>
                      </a>
                    ))}
                  </div>
                  <Link href="/links-directory" className="mt-2 inline-flex text-xs font-semibold text-primary hover:text-primary/80">
                    Open full link directory
                  </Link>
                </div>
              )}

              {dashboardPreferences.services && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Services Status</p>
                  <div className="space-y-2">
                    {serviceSnapshot.map((service, index) => (
                      <div
                        key={service.id}
                        className="rounded-xl border border-border/50 bg-muted/10 p-3 hover-lift animate-in-up"
                        style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{service.name}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {service.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{service.hours}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <Link href="/services-status" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                      <Compass className="h-3.5 w-3.5" />
                      Open full services status
                    </Link>
                    <Link href="/campus-map" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                      <MapPinned className="h-3.5 w-3.5" />
                      Open campus map
                    </Link>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Clubs</p>
                <div className="space-y-2">
                  {clubSnapshot.map((club, index) => (
                    <Link
                      key={club.id}
                      href="/clubs"
                      className="block rounded-xl border border-border/50 bg-muted/10 p-3 transition-all duration-200 hover:bg-muted/35 hover-lift animate-in-up"
                      style={{ animationDelay: `${0.04 * (index + 1)}s` }}
                    >
                      <p className="text-sm font-semibold">{club.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{club.category}</p>
                    </Link>
                  ))}
                </div>
                <Link href="/clubs" className="mt-2 inline-flex text-xs font-semibold text-primary hover:text-primary/80">
                  View all clubs
                </Link>
              </div>
            </div>
          </BentoWidget>
        )}
      </BentoGrid>

      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 animate-in-up stagger-5 hover-lift">
        <Link href="/advisor" className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <BellRing className="h-4 w-4" />
          Ask the AI Advisor about events, office hours, and campus services
        </Link>
      </div>
    </div>
  )
}
