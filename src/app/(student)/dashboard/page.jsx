'use client';
import React from 'react';
import Link from 'next/link';
import { CalendarClock, Compass, ExternalLink, Flag, Heart, MapPinned, Newspaper, Star, } from 'lucide-react';
import { BentoGrid, BentoWidget } from '@/components/dashboard/BentoGrid';
import { NotificationWidget } from '@/components/dashboard/NotificationWidget';
import { dashboardModulesToPreferences, } from '@/lib/studentData';
import { getStudentFacingFacultyAvailabilityTone } from '@/lib/faculty';
import { readFavorites, toggleFavoriteItem } from '@/lib/favorites';
import { useAuth } from '@/lib/auth/context';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(value));
}
function formatDue(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}
function formatBuildingStatusLabel(status) {
    switch (status) {
        case 'OPEN':
            return 'Operating under normal hours';
        case 'LIMITED':
            return 'Operating with limited hours';
        case 'CLOSED':
            return 'Currently closed';
        default:
            return status;
    }
}
function getPinnedBuildingSubtitle(building) {
    const statusLabel = formatBuildingStatusLabel(building.operationalStatus);
    if (building.latestAnnouncement?.title) {
        return `${statusLabel} · ${building.latestAnnouncement.title}`;
    }
    if (building.operationalNote) {
        return `${statusLabel} · ${building.operationalNote}`;
    }
    return `${building.type} · ${statusLabel}`;
}
const priorityColors = {
    HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400',
    MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};
const statusColors = {
    OPEN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    CLOSED: 'bg-red-500/10 text-red-600 dark:text-red-400',
    LIMITED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};
const facultyAvailabilityColors = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    slate: 'border-border/60 bg-muted/20 text-muted-foreground',
};
const listItemClassName = 'rounded-[1.2rem] border border-border/60 bg-card px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted';
const emptyStateClassName = 'rounded-[1.3rem] border border-dashed border-border/60 bg-background px-4 py-7 text-center text-xs text-muted-foreground';
export default function DashboardPage() {
    const { profile } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = React.useState([]);
    const [upcomingDeadlines, setUpcomingDeadlines] = React.useState([]);
    const [serviceSnapshot, setServiceSnapshot] = React.useState([]);
    const [quickLinks, setQuickLinks] = React.useState([]);
    const [clubSnapshot, setClubSnapshot] = React.useState([]);
    const [favoriteFaculty, setFavoriteFaculty] = React.useState([]);
    const [pinnedBuildings, setPinnedBuildings] = React.useState([]);
    const [pinnedClubs, setPinnedClubs] = React.useState([]);
    const [pinnedResources, setPinnedResources] = React.useState([]);
    const [overviewLoading, setOverviewLoading] = React.useState(true);
    const dashboardPreferences = React.useMemo(() => dashboardModulesToPreferences(profile?.notificationPreferences?.dashboardModules), [profile?.notificationPreferences?.dashboardModules]);
    React.useEffect(() => {
        const resourcePins = readFavorites().filter((item) => item.kind === 'resource');
        setPinnedResources(resourcePins);
    }, []);
    React.useEffect(() => {
        if (!profile?.id)
            return;
        let cancelled = false;
        const loadBackendData = async () => {
            setOverviewLoading(true);
            try {
                const overview = await apiRequest('/api/dashboard/overview');
                if (cancelled)
                    return;
                setUpcomingEvents(overview.upcomingEvents);
                setUpcomingDeadlines(overview.upcomingDeadlines);
                setServiceSnapshot(overview.serviceSnapshot);
                setQuickLinks(overview.quickLinks);
                setClubSnapshot(overview.clubSnapshot);
                setFavoriteFaculty(overview.favoriteFaculty);
                setPinnedBuildings(overview.pinnedBuildings);
                setPinnedClubs(overview.pinnedClubs);
            }
            catch {
                if (cancelled)
                    return;
                setUpcomingEvents([]);
                setUpcomingDeadlines([]);
                setServiceSnapshot([]);
                setQuickLinks([]);
                setClubSnapshot([]);
                setFavoriteFaculty([]);
                setPinnedBuildings([]);
                setPinnedClubs([]);
            }
            finally {
                if (!cancelled) {
                    setOverviewLoading(false);
                }
            }
        };
        void loadBackendData();
        return () => {
            cancelled = true;
        };
    }, [profile?.id]);
    const toggleResourcePin = (link) => {
        const target = {
            id: `resource-link-${link.id}`,
            kind: 'resource',
            label: link.label,
            subtitle: link.category.replaceAll('_', ' '),
            href: link.href,
        };
        const next = toggleFavoriteItem(target).filter((item) => item.kind === 'resource');
        setPinnedResources(next);
    };
    const pinnedItems = [
        ...pinnedBuildings.map((item) => ({
            id: `building-${item.id}`,
            label: item.name,
            subtitle: getPinnedBuildingSubtitle(item),
            href: `/campus-map?buildingId=${item.id}`,
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
    ];
    return (overviewLoading ? (<DashboardLoadingGrid dashboardPreferences={dashboardPreferences}/>) : (<BentoGrid>
          {(dashboardPreferences.events || dashboardPreferences.deadlines) && (<BentoWidget title="Schedule" icon={CalendarClock} span="large" action={{ label: 'Calendar', href: '/calendar' }} className="animate-in-up stagger-2">
              <div className="grid gap-4 md:grid-cols-2">
                {dashboardPreferences.events && (<div>
                    <p className="mb-3 poster-label">Upcoming Events</p>
                    <div className="space-y-2">
                      {upcomingEvents.length === 0 ? (<p className={emptyStateClassName}>No upcoming events</p>) : (upcomingEvents.map((event) => (<Link key={event.id} href={`/events/${event.id}`} className={cn('block', listItemClassName)}>
                            <p className="line-clamp-1 text-sm font-semibold">{event.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(event.date)} · {event.time}
                            </p>
                          </Link>)))}
                    </div>
                  </div>)}

                {dashboardPreferences.deadlines && (<div>
                    <p className="mb-3 poster-label">Deadlines</p>
                    <div className="space-y-2">
                      {upcomingDeadlines.length === 0 ? (<p className={emptyStateClassName}>No upcoming deadlines</p>) : (upcomingDeadlines.map((deadline) => (<div key={deadline.id} className={listItemClassName}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold">{deadline.title}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityColors[deadline.priority] ?? 'bg-muted text-muted-foreground'}`}>
                                {deadline.priority}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{deadline.course}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Due {formatDue(deadline.dueDate)}</p>
                          </div>)))}
                    </div>
                  </div>)}
              </div>
            </BentoWidget>)}

          {dashboardPreferences.favorites && (<BentoWidget title="Pinned" icon={Star} span="medium" action={{ label: 'Preferences', href: '/profile' }} className="animate-in-up stagger-3">
              <div className="space-y-2">
                {pinnedItems.length === 0 ? (<p className={emptyStateClassName}>
                    No pinned items yet. Save buildings from the campus map, pin campus resources below, and manage building alerts in your profile.
                  </p>) : (pinnedItems.map((item) => (<Link key={item.id} href={item.href} className={cn('block', listItemClassName)}>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                    </Link>)))}
              </div>
            </BentoWidget>)}

          {dashboardPreferences.faculty && (<BentoWidget title="Favorite Faculty" icon={Heart} span="medium" action={{ label: 'Directory', href: '/faculty-directory' }} className="animate-in-up stagger-4">
              <div className="space-y-2">
                {favoriteFaculty.length === 0 ? (<p className={emptyStateClassName}>
                    No favorite faculty yet. Star professors from the faculty directory.
                  </p>) : (favoriteFaculty.map((faculty) => (<Link key={faculty.id} href={`/faculty-directory/${faculty.id}`} className={cn('block', listItemClassName)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{faculty.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{faculty.title} · {faculty.department}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${facultyAvailabilityColors[getStudentFacingFacultyAvailabilityTone(faculty.studentAvailabilityState)]}`}>
                          {faculty.studentAvailabilityLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{faculty.officeHours}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{faculty.officeLocation}</p>
                      {faculty.tags.length > 0 && (<p className="mt-2 text-[11px] text-muted-foreground">
                          {faculty.tags.slice(0, 3).join(' • ')}
                        </p>)}
                    </Link>)))}
              </div>
            </BentoWidget>)}

          {dashboardPreferences.news && (<BentoWidget title="Notifications" icon={Newspaper} span="medium" action={{ label: 'Inbox', href: '/notifications' }} className="animate-in-up stagger-5">
              <NotificationWidget />
            </BentoWidget>)}

          {dashboardPreferences.services && (<BentoWidget title="Services" icon={Compass} span="medium" action={{ label: 'All', href: '/services-status' }} className="animate-in-up stagger-6">
              <div className="space-y-2">
                {serviceSnapshot.length === 0 ? (<p className={emptyStateClassName}>No service data</p>) : (serviceSnapshot.map((service) => (<div key={service.id} className={listItemClassName}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{service.name}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[service.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {service.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{service.hours}</p>
                    </div>)))}
                <div className="flex flex-wrap gap-3 pt-1">
                  <Link href="/campus-map" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
                    <MapPinned className="h-3 w-3"/>
                    Campus map
                  </Link>
                </div>
              </div>
            </BentoWidget>)}

          {dashboardPreferences.links && (<BentoWidget title="Quick Links" icon={ExternalLink} span="medium" action={{ label: 'All', href: '/links-directory' }} className="animate-in-up stagger-7">
              <div className="grid gap-2 sm:grid-cols-2">
                {quickLinks.length === 0 ? (<p className={cn(emptyStateClassName, 'col-span-full')}>No links available</p>) : (quickLinks.map((link) => {
                    const favoriteId = `resource-link-${link.id}`;
                    const isPinned = pinnedResources.some((item) => item.id === favoriteId);
                    return (<div key={link.id} className={listItemClassName}>
                        <div className="flex items-start justify-between gap-2">
                          <a href={link.href} target="_blank" rel="noreferrer" className="min-w-0">
                            <p className="line-clamp-1 text-sm font-semibold">{link.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{link.category.replaceAll('_', ' ')}</p>
                          </a>
                          <button type="button" onClick={() => toggleResourcePin(link)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${isPinned
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                            {isPinned ? 'Pinned' : 'Pin'}
                          </button>
                        </div>
                      </div>);
                }))}
              </div>
            </BentoWidget>)}

          {dashboardPreferences.clubs && (<BentoWidget title="Clubs" icon={Flag} span="medium" action={{ label: 'All', href: '/clubs' }} className="animate-in-up stagger-8">
              <div className="space-y-2">
                {clubSnapshot.length === 0 ? (<p className={emptyStateClassName}>No clubs to show</p>) : (clubSnapshot.map((club) => (<Link key={club.id} href="/clubs" className={cn('block', listItemClassName)}>
                      <p className="text-sm font-semibold">{club.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{club.category}</p>
                    </Link>)))}
              </div>
            </BentoWidget>)}
        </BentoGrid>));
}
function DashboardLoadingGrid({ dashboardPreferences }) {
    return (<BentoGrid>
      {(dashboardPreferences.events || dashboardPreferences.deadlines) && (<BentoWidget title="Schedule" icon={CalendarClock} span="large" className="animate-in-up stagger-2">
          <div className="grid gap-4 md:grid-cols-2">
            {dashboardPreferences.events && <DashboardLoadingColumn title="Upcoming Events" rows={3}/>}
            {dashboardPreferences.deadlines && <DashboardLoadingColumn title="Deadlines" rows={3}/>}
          </div>
        </BentoWidget>)}

      {dashboardPreferences.favorites && (<DashboardLoadingWidget title="Pinned" icon={Star} className="animate-in-up stagger-3"/>)}

      {dashboardPreferences.faculty && (<DashboardLoadingWidget title="Favorite Faculty" icon={Heart} className="animate-in-up stagger-4"/>)}

      {dashboardPreferences.news && (<DashboardLoadingWidget title="Notifications" icon={Newspaper} className="animate-in-up stagger-5"/>)}

      {dashboardPreferences.services && (<DashboardLoadingWidget title="Services" icon={Compass} className="animate-in-up stagger-6"/>)}

      {dashboardPreferences.links && (<DashboardLoadingWidget title="Quick Links" icon={ExternalLink} className="animate-in-up stagger-7"/>)}

      {dashboardPreferences.clubs && (<DashboardLoadingWidget title="Clubs" icon={Flag} className="animate-in-up stagger-8"/>)}
    </BentoGrid>);
}
function DashboardLoadingWidget({ title, icon, className, }) {
    return (<BentoWidget title={title} icon={icon} span="medium" className={className}>
      <DashboardLoadingRows rows={3}/>
    </BentoWidget>);
}
function DashboardLoadingColumn({ title, rows }) {
    return (<div>
      <p className="mb-3 poster-label">{title}</p>
      <DashboardLoadingRows rows={rows}/>
    </div>);
}
function DashboardLoadingRows({ rows }) {
    return (<div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (<div key={index} className="rounded-[1.2rem] border border-border/55 bg-card/45 px-4 py-3">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/60"/>
          <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-muted/40"/>
          <div className="mt-1.5 h-2.5 w-1/3 animate-pulse rounded bg-muted/30"/>
        </div>))}
    </div>);
}
