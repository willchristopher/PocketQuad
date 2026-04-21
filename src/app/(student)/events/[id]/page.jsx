'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Users } from 'lucide-react';
import { EventCalendarActions } from '@/components/events/EventCalendarActions';
import { Button } from '@/components/ui/button';
import { ApiClientError, apiRequest } from '@/lib/api/client';

function formatLongDate(isoString) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString));
}

function formatInterestedCount(count) {
  if (count === 1) {
    return '1 student added this event to a calendar.';
  }

  return `${count} students added this event to a calendar.`;
}

function formatCalendarProvider(provider) {
  if (provider === 'GOOGLE') return 'Google Calendar';
  if (provider === 'OUTLOOK') return 'Outlook';
  return 'Apple Calendar';
}

function DetailRow({ icon: Icon, label, primary, secondary, action }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(var(--msu-blue-rgb),0.06)] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-foreground">{primary}</p>
        {secondary ? (
          <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default function EventDetailPage({ params }) {
  const { id } = React.use(params);
  const [event, setEvent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busyAction, setBusyAction] = React.useState(null);
  const [error, setError] = React.useState(null);

  const loadEvent = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/events/${id}`);
      setEvent(data);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load the event.';
      setError(message);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const syncEvent = React.useCallback((updater) => {
    setEvent((current) => (current ? updater(current) : current));
  }, []);

  const handleAddToAppCalendar = React.useCallback(async (currentEvent) => {
    setBusyAction(`${currentEvent.id}:app:add`);
    setError(null);

    try {
      const created = await apiRequest('/api/calendar', {
        method: 'POST',
        body: {
          title: currentEvent.title,
          description: currentEvent.description,
          start: currentEvent.date,
          end: currentEvent.endDate,
          allDay: currentEvent.allDay,
          type: 'CAMPUS',
          campusEventId: currentEvent.id,
          location: currentEvent.location,
        },
      });
      syncEvent((previous) => ({
        ...previous,
        isInCalendar: true,
        calendarEntryId: created.id,
        interestedCount: (previous.interestedCount ?? 0) + (previous.isInCalendar ? 0 : 1),
      }));
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        await loadEvent();
      }
      const message = err instanceof ApiClientError ? err.message : 'Unable to add this event to your app calendar.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [loadEvent, syncEvent]);

  const handleRemoveFromAppCalendar = React.useCallback(async (currentEvent) => {
    if (!currentEvent.calendarEntryId) {
      setError('PocketQuad needs a refresh before it can remove this calendar item.');
      return;
    }

    setBusyAction(`${currentEvent.id}:app:remove`);
    setError(null);
    try {
      await apiRequest(`/api/calendar/${currentEvent.calendarEntryId}`, {
        method: 'DELETE',
      });
      syncEvent((previous) => ({
        ...previous,
        isInCalendar: false,
        calendarEntryId: null,
        interestedCount: Math.max(0, (previous.interestedCount ?? 0) - 1),
      }));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to remove this event from your app calendar.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [syncEvent]);

  const handleOpenExternalCalendar = React.useCallback(async (currentEvent, provider) => {
    setBusyAction(`${currentEvent.id}:provider:${provider}`);
    setError(null);

    try {
      const response = await apiRequest(`/api/events/${currentEvent.id}/calendar-link`, {
        method: 'POST',
        body: { provider },
      });
      syncEvent((previous) => ({
        ...previous,
        exportedProviders: Array.from(new Set([...(previous.exportedProviders ?? []), provider])),
      }));
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to open your personal calendar handoff.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [syncEvent]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading event...</p>;
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">{error ?? 'Event not found.'}</p>
        <Button asChild className="mt-4">
          <Link href="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const mapUrl = event.location
    ? `https://maps.google.com/?q=${encodeURIComponent(event.location)}`
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {error ? (
        <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card">
        <div className="border-b border-border/50 bg-[linear-gradient(180deg,rgba(var(--msu-blue-rgb),0.08),rgba(255,255,255,0))] px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:gap-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {event.sourceLabel ?? event.audienceLabel ?? event.activityLabel ?? 'Campus event'}
              </span>
              {event.myClubActivity ? (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  My club
                </span>
              ) : null}
              {event.isCancelled ? (
                <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                  Canceled
                </span>
              ) : null}
              {event.isInCalendar ? (
                <span className="rounded-full bg-[rgb(236,172,0)]/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(132,88,0)]">
                  In PocketQuad
                </span>
              ) : null}
              </div>

              <div>
                <h1 className="font-display text-[2.1rem] font-semibold tracking-tight text-foreground sm:text-[3rem]">
                  {event.title}
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  {event.description}
                </p>
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-border/60 bg-background/80 p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quick actions</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Save this event, get directions, or send it to the calendar you already use.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {event.autoAddedToCalendar
                  ? 'Deadline events appear automatically on every PocketQuad calendar.'
                  : formatInterestedCount(event.interestedCount)}
              </p>
              <div className="mt-4 space-y-3">
                <EventCalendarActions
                  event={event}
                  onAddToAppCalendar={handleAddToAppCalendar}
                  onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
                  onOpenExternalCalendar={handleOpenExternalCalendar}
                  busyAction={busyAction}
                  compact
                  mobileStack
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  {mapUrl ? (
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                      <a href={mapUrl} target="_blank" rel="noreferrer">
                        <MapPin className="mr-2 h-4 w-4" />
                        Open map
                      </a>
                    </Button>
                  ) : null}

                  {event.externalUrl ? (
                    <Button asChild variant="outline" size="sm" className="w-full justify-center">
                      <a href={event.externalUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Source listing
                      </a>
                    </Button>
                  ) : null}
                </div>

                {event.exportedProviders?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {event.exportedProviders.map((provider) => (
                      <span key={provider} className="rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        Added to {formatCalendarProvider(provider)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-background/75">
            <div className="divide-y divide-border/60">
              <DetailRow
                icon={CalendarDays}
                label="When"
                primary={formatLongDate(event.date)}
                secondary={event.time}
              />
              <DetailRow
                icon={MapPin}
                label="Where"
                primary={event.location ?? 'Location TBA'}
                secondary={event.organizer ?? 'Organizer will be listed here when available.'}
                action={mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
                  >
                    Directions
                  </a>
                ) : null}
              />
              <DetailRow
                icon={Users}
                label="Event status"
                primary={
                  event.isCancelled
                    ? 'This event has been canceled.'
                    : event.isInCalendar
                      ? 'Saved in your PocketQuad calendar.'
                      : 'Not saved yet.'
                }
                secondary={event.audienceLabel ?? event.activityLabel ?? 'Open to the campus community.'}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
