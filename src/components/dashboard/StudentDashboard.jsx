'use client';

import React from 'react';
import Link from 'next/link';
import { differenceInCalendarDays } from 'date-fns';
import { CalendarClock, ExternalLink, Flag, Heart, Newspaper, Star } from 'lucide-react';
import { BentoGrid, BentoWidget } from '@/components/dashboard/BentoGrid';
import { NotificationWidget } from '@/components/dashboard/NotificationWidget';
import { dashboardModulesToPreferences } from '@/lib/studentData';
import { getStudentFacingFacultyAvailabilityTone } from '@/lib/faculty';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { useAuth } from '@/lib/auth/context';
import { cn, formatEnumLabel } from '@/lib/utils';

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
  const statusLabel = building.currentOperationalLabel || formatBuildingStatusLabel(building.operationalStatus);
  if (building.latestAnnouncement?.title) {
    return `${statusLabel} · ${building.latestAnnouncement.title}`;
  }
  if (building.operationalNote) {
    return `${statusLabel} · ${building.operationalNote}`;
  }
  if (building.operatingHours) {
    return `${statusLabel} · ${building.operatingHours}`;
  }
  return `${building.type} · ${statusLabel}`;
}
function formatDaysLeft(value) {
  const dueDate = new Date(value);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysLeft = differenceInCalendarDays(dueDate, today);

  if (daysLeft < 0) {
    return 'Overdue';
  }
  if (daysLeft === 0) {
    return 'Due today';
  }
  if (daysLeft === 1) {
    return '1 day left';
  }
  return `${daysLeft} days left`;
}

const facultyAvailabilityColors = {
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'border-border/60 bg-muted/20 text-muted-foreground',
};

const listItemClassName =
  'rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors duration-200 hover:border-primary/25 hover:bg-muted';
const emptyStateClassName =
  'rounded-xl border border-dashed border-border/60 bg-background px-4 py-7 text-center text-xs text-muted-foreground';

export function StudentDashboard({ initialOverview }) {
  const { profile } = useAuth();
  const { isHrefVisible, isPageVisible } = useStudentPageVisibility();
  const dashboardPreferences = React.useMemo(
    () => dashboardModulesToPreferences(profile?.notificationPreferences?.dashboardModules),
    [profile?.notificationPreferences?.dashboardModules],
  );

  const pinnedResources = React.useMemo(
    () => initialOverview.pinnedResourceLinks ?? [],
    [initialOverview.pinnedResourceLinks],
  );

  const pinnedItems = [
    ...initialOverview.pinnedBuildings.map((item) => ({
      id: `building-${item.id}`,
      label: item.name,
      subtitle: getPinnedBuildingSubtitle(item),
      href: `/campus-map?buildingId=${item.id}`,
    })),
  ].filter((item) => isHrefVisible(item.href));

  const scheduleAction = isPageVisible('calendar')
    ? { label: 'Calendar', href: '/calendar' }
    : isPageVisible('events')
      ? { label: 'Events', href: '/events' }
      : undefined;

  return (
    <BentoGrid>
      {(dashboardPreferences.events || dashboardPreferences.deadlines) && scheduleAction ? (
        <BentoWidget
          title="Schedule"
          icon={CalendarClock}
          span="large"
          action={scheduleAction}
          className="animate-in-up stagger-2"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {dashboardPreferences.events ? (
              <div>
                <p className="mb-3 poster-label">Saved Events</p>
                <div className="space-y-2">
                  {initialOverview.upcomingEvents.length === 0 ? (
                    <p className={emptyStateClassName}>No saved events yet</p>
                  ) : (
                    initialOverview.upcomingEvents.map((event) => {
                      const eventContent = (
                        <>
                          <p className="line-clamp-1 text-sm font-semibold">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(event.date)} · {event.time}
                          </p>
                        </>
                      );

                      return isPageVisible('events') ? (
                        <Link
                          key={event.id}
                          href={`/events/${event.id}`}
                          className={cn('block', listItemClassName)}
                        >
                          {eventContent}
                        </Link>
                      ) : (
                        <div key={event.id} className={listItemClassName}>
                          {eventContent}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            {dashboardPreferences.deadlines ? (
              <div>
                <p className="mb-3 poster-label">Deadlines</p>
                <div className="space-y-2">
                  {initialOverview.upcomingDeadlines.length === 0 ? (
                    <p className={emptyStateClassName}>No upcoming deadlines</p>
                  ) : (
                    initialOverview.upcomingDeadlines.map((deadline) => {
                      const content = (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">{deadline.title}</p>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                              {formatDaysLeft(deadline.dueDate)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{deadline.course}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Due {formatDue(deadline.dueDate)}
                          </p>
                        </>
                      );

                      return deadline.href ? (
                        <Link
                          key={deadline.id}
                          href={deadline.href}
                          className={cn('block', listItemClassName)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={deadline.id} className={listItemClassName}>
                          {content}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </BentoWidget>
      ) : null}

      {dashboardPreferences.favorites ? (
        <BentoWidget
          title="Pinned Places"
          icon={Star}
          span="medium"
          action={isPageVisible('profile') ? { label: 'Preferences', href: '/profile' } : undefined}
          className="animate-in-up stagger-3"
        >
          <div className="space-y-2">
            {pinnedItems.length === 0 ? (
              <p className={emptyStateClassName}>
                No pinned buildings yet. Save buildings from the campus map to keep them here on your dashboard.
              </p>
            ) : (
              pinnedItems.map((item) => (
                <Link key={item.id} href={item.href} className={cn('block', listItemClassName)}>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                </Link>
              ))
            )}
          </div>
        </BentoWidget>
      ) : null}

      {dashboardPreferences.faculty && isPageVisible('faculty-directory') ? (
        <BentoWidget
          title="Favorite Faculty"
          icon={Heart}
          span="medium"
          action={{ label: 'Directory', href: '/faculty-directory' }}
          className="animate-in-up stagger-4"
        >
          <div className="space-y-2">
            {initialOverview.favoriteFaculty.length === 0 ? (
              <p className={emptyStateClassName}>
                No favorite faculty yet. Star professors from the faculty directory.
              </p>
            ) : (
              initialOverview.favoriteFaculty.map((faculty) => (
                <Link
                  key={faculty.id}
                  href={`/faculty-directory/${faculty.id}`}
                  className={cn('block', listItemClassName)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{faculty.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {faculty.title} · {faculty.department}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold leading-none',
                        facultyAvailabilityColors[getStudentFacingFacultyAvailabilityTone(faculty.studentAvailabilityState)],
                      )}
                    >
                      {faculty.studentAvailabilityLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{faculty.officeHours}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{faculty.officeLocation}</p>
                  {faculty.tags.length > 0 ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {faculty.tags.slice(0, 3).join(' • ')}
                    </p>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </BentoWidget>
      ) : null}

      {dashboardPreferences.news && isPageVisible('notifications') ? (
        <BentoWidget
          title="Notifications"
          icon={Newspaper}
          span="medium"
          action={{ label: 'Inbox', href: '/notifications' }}
          className="animate-in-up stagger-5 xl:col-start-9 xl:row-start-1"
        >
          <NotificationWidget />
        </BentoWidget>
      ) : null}

      {dashboardPreferences.links && isPageVisible('links-directory') ? (
        <BentoWidget
          title="Quick Links"
          icon={ExternalLink}
          span="medium"
          action={{ label: 'All', href: '/links-directory' }}
          className="animate-in-up stagger-6"
        >
          <div className="space-y-2">
            {pinnedResources.length === 0 ? (
              <p className={emptyStateClassName}>Pin links from the resources page to keep them here.</p>
            ) : (
              pinnedResources.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn('block', listItemClassName)}
                >
                  <p className="line-clamp-1 text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatEnumLabel(item.category)}
                  </p>
                </a>
              ))
            )}
          </div>
        </BentoWidget>
      ) : null}

      {dashboardPreferences.clubs && isPageVisible('clubs') ? (
        <BentoWidget
          title="Clubhouse"
          icon={Flag}
          span="medium"
          action={{ label: 'Open', href: '/clubs' }}
          className="animate-in-up stagger-7"
        >
          <div className="space-y-2">
            {initialOverview.pinnedClubs.length === 0 ? (
              <p className={emptyStateClassName}>Follow clubs from Clubhouse to keep them here.</p>
            ) : (
              initialOverview.pinnedClubs.map((club) => (
                <Link key={club.id} href="/clubs" className={cn('block', listItemClassName)}>
                  <p className="text-sm font-semibold">{club.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatEnumLabel(club.category)}</p>
                </Link>
              ))
            )}
          </div>
        </BentoWidget>
      ) : null}
    </BentoGrid>
  );
}
