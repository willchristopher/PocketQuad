'use client'

import React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Compass,
  ExternalLink,
  Flag,
  Heart,
  MapPinned,
  Newspaper,
  Star,
} from 'lucide-react'

import { BentoGrid, BentoWidget } from '@/components/dashboard/BentoGrid'
import {
  dashboardModulesToPreferences,
  type FavoriteItem,
} from '@/lib/studentData'
import { readFavorites, toggleFavoriteItem } from '@/lib/favorites'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'

type EventItem = {
  id: string
  title: string
  date: string
  time: string
  location: string
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

type FavoriteFacultyItem = {
  id: string
  name: string
  department: string
  officeHours: string
  officeLocation: string
}

type CampusNewsItem = {
  id: string
  title: string
  message: string
  linkUrl: string | null
  createdAt: string
}

type PinnedBuilding = {
  id: string
  name: string
  type: string
  address: string
  operationalStatus: 'OPEN' | 'CLOSED' | 'LIMITED'
}

type PinnedClub = {
  id: string
  name: string
  category: string
}

type DashboardOverviewResponse = {
  upcomingEvents: EventItem[]
  upcomingDeadlines: DeadlineItem[]
  serviceSnapshot: ServiceSnapshot[]
  quickLinks: ResourceLinkSnapshot[]
  clubSnapshot: ClubSnapshot[]
  favoriteFaculty: FavoriteFacultyItem[]
  campusNews: CampusNewsItem[]
  pinnedBuildings: PinnedBuilding[]
  pinnedClubs: PinnedClub[]
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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

function formatNewsTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400',
  MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  CLOSED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  LIMITED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const [upcomingEvents, setUpcomingEvents] = React.useState<EventItem[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = React.useState<DeadlineItem[]>([])
  const [serviceSnapshot, setServiceSnapshot] = React.useState<ServiceSnapshot[]>([])
  const [quickLinks, setQuickLinks] = React.useState<ResourceLinkSnapshot[]>([])
  const [clubSnapshot, setClubSnapshot] = React.useState<ClubSnapshot[]>([])
  const [favoriteFaculty, setFavoriteFaculty] = React.useState<FavoriteFacultyItem[]>([])
  const [campusNews, setCampusNews] = React.useState<CampusNewsItem[]>([])
  const [pinnedBuildings, setPinnedBuildings] = React.useState<PinnedBuilding[]>([])
  const [pinnedClubs, setPinnedClubs] = React.useState<PinnedClub[]>([])
  const [pinnedResources, setPinnedResources] = React.useState<FavoriteItem[]>([])
  const dashboardPreferences = React.useMemo(
    () => dashboardModulesToPreferences(profile?.notificationPreferences?.dashboardModules),
    [profile?.notificationPreferences?.dashboardModules],
  )

  const firstName = profile?.firstName || profile?.displayName?.split(' ')[0] || ''

  React.useEffect(() => {
    const resourcePins = readFavorites().filter((item) => item.kind === 'resource')
    setPinnedResources(resourcePins)
  }, [])

  React.useEffect(() => {
    const loadBackendData = async () => {
      try {
        const overview = await apiRequest<DashboardOverviewResponse>('/api/dashboard/overview')

        setUpcomingEvents(overview.upcomingEvents)
        setUpcomingDeadlines(overview.upcomingDeadlines)
        setServiceSnapshot(overview.serviceSnapshot)
        setQuickLinks(overview.quickLinks)
        setClubSnapshot(overview.clubSnapshot)
        setFavoriteFaculty(overview.favoriteFaculty)
        setCampusNews(overview.campusNews)
        setPinnedBuildings(overview.pinnedBuildings)
        setPinnedClubs(overview.pinnedClubs)
      } catch {
        setUpcomingEvents([])
        setUpcomingDeadlines([])
        setServiceSnapshot([])
        setQuickLinks([])
        setClubSnapshot([])
        setFavoriteFaculty([])
        setCampusNews([])
        setPinnedBuildings([])
        setPinnedClubs([])
      }
    }

    void loadBackendData()
  }, [])

  const toggleResourcePin = (link: ResourceLinkSnapshot) => {
    const target: FavoriteItem = {
      id: `resource-link-${link.id}`,
      kind: 'resource',
      label: link.label,
      subtitle: link.category.replaceAll('_', ' '),
      href: link.href,
    }

    const next = toggleFavoriteItem(target).filter((item) => item.kind === 'resource')
    setPinnedResources(next)
  }

  const pinnedItems = [
    ...pinnedBuildings.map((item) => ({
      id: `building-${item.id}`,
      label: item.name,
      subtitle: `${item.type} · ${item.operationalStatus}`,
      href: '/campus-map',
    })),
    ...pinnedResources.map((item) => ({
      id: `resource-${item.id}`,
      label: item.label,
      subtitle: item.subtitle,
      href: item.href,
    })),
    ...pinnedClubs.map((item) => ({
      id: `club-${item.id}`,
      label: item.name,
      subtitle: item.category,
      href: '/clubs',
    })),
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 md:px-7 md:py-6 animate-in-up">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          {loading ? (
            <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/40" />
          ) : (
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {getTimeGreeting()}
              {firstName ? (
                <>, <span className="text-primary">{firstName}</span></>
              ) : null}
            </h1>
          )}
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Your dashboard is personalized to your preferences, saved clubs, and pinned campus resources.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4 md:p-5 animate-in-up stagger-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-tight">Dashboard Overview</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Widget visibility now lives in your profile settings and is saved to your account.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex shrink-0 items-center rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/35"
          >
            Manage Layout
          </Link>
        </div>
      </section>

      <BentoGrid>
        {(dashboardPreferences.events || dashboardPreferences.deadlines) && (
          <BentoWidget
            title="Schedule"
            icon={CalendarClock}
            span="large"
            action={{ label: 'Calendar', href: '/calendar' }}
            className="animate-in-up stagger-2"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {dashboardPreferences.events && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Upcoming Events</p>
                  <div className="space-y-1.5">
                    {upcomingEvents.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No upcoming events</p>
                    ) : (
                      upcomingEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/events/${event.id}`}
                          className="block rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          <p className="line-clamp-1 text-sm font-semibold">{event.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(event.date)} · {event.time}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}

              {dashboardPreferences.deadlines && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Deadlines</p>
                  <div className="space-y-1.5">
                    {upcomingDeadlines.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No upcoming deadlines</p>
                    ) : (
                      upcomingDeadlines.map((deadline) => (
                        <div
                          key={deadline.id}
                          className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">{deadline.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityColors[deadline.priority] ?? 'bg-muted text-muted-foreground'}`}>
                              {deadline.priority}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{deadline.course}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Due {formatDue(deadline.dueDate)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.favorites && (
          <BentoWidget
            title="Pinned"
            icon={Star}
            span="medium"
            action={{ label: 'Preferences', href: '/profile' }}
            className="animate-in-up stagger-3"
          >
            <div className="space-y-1.5">
              {pinnedItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  No pinned items yet. Pin campus resources below and set building alerts or club interests in your profile.
                </p>
              ) : (
                pinnedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                  </Link>
                ))
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.faculty && (
          <BentoWidget
            title="Favorite Faculty"
            icon={Heart}
            span="medium"
            action={{ label: 'Directory', href: '/faculty-directory' }}
            className="animate-in-up stagger-4"
          >
            <div className="space-y-1.5">
              {favoriteFaculty.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  No favorite faculty yet. Star professors from the faculty directory.
                </p>
              ) : (
                favoriteFaculty.map((faculty) => (
                  <Link
                    key={faculty.id}
                    href={`/faculty-directory/${faculty.id}`}
                    className="block rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <p className="text-sm font-semibold text-foreground">{faculty.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{faculty.department}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{faculty.officeHours} · {faculty.officeLocation}</p>
                  </Link>
                ))
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.news && (
          <BentoWidget
            title="Campus News"
            icon={Newspaper}
            span="medium"
            action={{ label: 'Notifications', href: '/notifications' }}
            className="animate-in-up stagger-5"
          >
            <div className="space-y-1.5">
              {campusNews.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
                  No campus updates right now.
                </p>
              ) : (
                campusNews.map((item) => (
                  <a
                    key={item.id}
                    href={item.linkUrl ?? '/notifications'}
                    target={item.linkUrl ? '_blank' : undefined}
                    rel={item.linkUrl ? 'noreferrer' : undefined}
                    className="block rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatNewsTime(item.createdAt)}</p>
                  </a>
                ))
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.services && (
          <BentoWidget
            title="Services"
            icon={Compass}
            span="medium"
            action={{ label: 'All', href: '/services-status' }}
            className="animate-in-up stagger-6"
          >
            <div className="space-y-1.5">
              {serviceSnapshot.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No service data</p>
              ) : (
                serviceSnapshot.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{service.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[service.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {service.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{service.hours}</p>
                  </div>
                ))
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/campus-map" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                  <MapPinned className="h-3 w-3" />
                  Campus map
                </Link>
              </div>
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.links && (
          <BentoWidget
            title="Quick Links"
            icon={ExternalLink}
            span="medium"
            action={{ label: 'All', href: '/links-directory' }}
            className="animate-in-up stagger-7"
          >
            <div className="grid gap-1.5 sm:grid-cols-2">
              {quickLinks.length === 0 ? (
                <p className="col-span-full py-4 text-center text-xs text-muted-foreground">No links available</p>
              ) : (
                quickLinks.map((link) => {
                  const favoriteId = `resource-link-${link.id}`
                  const isPinned = pinnedResources.some((item) => item.id === favoriteId)

                  return (
                    <div
                      key={link.id}
                      className="rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0"
                        >
                          <p className="line-clamp-1 text-sm font-semibold">{link.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{link.category.replaceAll('_', ' ')}</p>
                        </a>
                        <button
                          type="button"
                          onClick={() => toggleResourcePin(link)}
                          className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                            isPinned
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {isPinned ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </BentoWidget>
        )}

        {dashboardPreferences.clubs && (
          <BentoWidget
            title="Clubs"
            icon={Flag}
            span="medium"
            action={{ label: 'All', href: '/clubs' }}
            className="animate-in-up stagger-8"
          >
            <div className="space-y-1.5">
              {clubSnapshot.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No clubs to show</p>
              ) : (
                clubSnapshot.map((club) => (
                  <Link
                    key={club.id}
                    href="/clubs"
                    className="block rounded-lg border border-border/40 bg-muted/5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <p className="text-sm font-semibold">{club.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{club.category}</p>
                  </Link>
                ))
              )}
            </div>
          </BentoWidget>
        )}
      </BentoGrid>
    </div>
  )
}
