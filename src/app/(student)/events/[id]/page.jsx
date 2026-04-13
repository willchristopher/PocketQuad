'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
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
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      {error ? (
        <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <section className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/96 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
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
              <h1 className="font-display text-[2.5rem] font-semibold tracking-tight text-foreground sm:text-[3rem]">
                {event.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                {event.description}
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-border/60 bg-muted/20 p-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">When</p>
                <p className="mt-2 text-sm text-foreground">{formatLongDate(event.date)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.time}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Where</p>
                <p className="mt-2 text-sm text-foreground">{event.location ?? 'Location TBA'}</p>
                {event.organizer ? (
                  <p className="mt-1 text-sm text-muted-foreground">{event.organizer}</p>
                ) : null}
              </div>
            </div>

          </div>

          <div className="space-y-5 rounded-[1.6rem] border border-border/60 bg-muted/20 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your actions</p>
              <p className="mt-3 text-sm leading-6 text-foreground">
                Save this event, open directions, or add it to a calendar.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {event.autoAddedToCalendar
                  ? 'This deadline event appears automatically on every PocketQuad calendar.'
                  : formatInterestedCount(event.interestedCount)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {event.exportedProviders?.map((provider) => (
                  <span key={provider} className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                    Added to {formatCalendarProvider(provider)}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {mapUrl ? (
                <Button asChild variant="outline" className="w-full justify-center">
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    <MapPin className="mr-2 h-4 w-4" />
                    Open map
                  </a>
                </Button>
              ) : null}
            </div>

            <EventCalendarActions
              event={event}
              onAddToAppCalendar={handleAddToAppCalendar}
              onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
              onOpenExternalCalendar={handleOpenExternalCalendar}
              busyAction={busyAction}
              mobileStack
            />

            {event.externalUrl ? (
              <Button asChild variant="ghost" className="w-full justify-start px-0 text-primary hover:bg-transparent">
                <a href={event.externalUrl} target="_blank" rel="noreferrer">
                  View source listing
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
