'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Heart, MapPin, RefreshCcw, Search, Sparkles, Ticket } from 'lucide-react';
import { FeelingBoredDialog } from '@/components/events/FeelingBoredDialog';
import { EventCalendarActions } from '@/components/events/EventCalendarActions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function formatEventMoment(isoString) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString));
}

function bucketLabel(isoString) {
  const target = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  if (target >= today && target < tomorrow) return 'Today';
  if (target >= tomorrow && target < new Date(tomorrow.getTime() + 1000 * 60 * 60 * 24)) return 'Tomorrow';
  if (target < nextWeek) return 'This week';
  return 'Later';
}

function groupEventsByBucket(events) {
  const groups = new Map();
  events.forEach((event) => {
    const label = bucketLabel(event.date);
    const nextEvents = groups.get(label) ?? [];
    nextEvents.push(event);
    groups.set(label, nextEvents);
  });

  return ['Today', 'Tomorrow', 'This week', 'Later']
    .filter((label) => groups.has(label))
    .map((label) => ({
      label,
      events: groups.get(label),
    }));
}

function searchMatch(event, query) {
  if (!query) {
    return true;
  }

  const haystack = [event.title, event.description, event.location, event.organizer, event.activityLabel, event.sourceLabel]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function formatInterestCount(count) {
  if (!count) {
    return '0';
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }

  return String(count);
}

function EventRow({
  event,
  busyAction,
  onToggleInterest,
  onAddToAppCalendar,
  onRemoveFromAppCalendar,
  onOpenExternalCalendar,
}) {
  const interestBusy = busyAction === `${event.id}:interest`;

  return (
    <article className="grid gap-4 border-t border-border/60 py-5 first:border-t-0 md:grid-cols-[112px_minmax(0,1fr)_auto]">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{event.activityLabel}</p>
        <p className="text-sm font-medium text-foreground">{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
        <p className="text-xs text-muted-foreground">{event.time}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            {event.sourceLabel}
          </span>
          {event.myClubActivity ? (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
              My club
            </span>
          ) : null}
          {event.isInCalendar ? (
            <span className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              Added
            </span>
          ) : null}
          {event.exportedProviders?.slice(0, 2).map((provider) => (
            <span key={provider} className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              {provider}
            </span>
          ))}
        </div>

        <div>
          <Link href={`/events/${event.id}`} className="group inline-flex items-center gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {event.title}
            </h2>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatEventMoment(event.date)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {event.location ?? 'Location TBA'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 md:items-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onToggleInterest(event)}
            disabled={interestBusy}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors',
              event.isInterested
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'border-border/60 text-muted-foreground hover:bg-muted/50',
            )}
          >
            <Heart className={cn('h-4 w-4', event.isInterested && 'fill-current')} />
            {interestBusy ? 'Saving...' : event.isInterested ? 'Interested' : 'Interested?'}
          </button>
          <span className="text-xs text-muted-foreground">
            {formatInterestCount(event.interestedCount)} interested
          </span>
        </div>
        <EventCalendarActions
          event={event}
          onAddToAppCalendar={onAddToAppCalendar}
          onRemoveFromAppCalendar={onRemoveFromAppCalendar}
          onOpenExternalCalendar={onOpenExternalCalendar}
          busyAction={busyAction}
        />
      </div>
    </article>
  );
}

export default function EventsPage({ initialResponse = null }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const deferredSearch = React.useDeferredValue(searchQuery);
  const [collectionFilter, setCollectionFilter] = React.useState('all');
  const [eventsResponse, setEventsResponse] = React.useState(initialResponse);
  const [view, setView] = React.useState('list');
  const [loading, setLoading] = React.useState(!initialResponse);
  const [busyAction, setBusyAction] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [showBoredDialog, setShowBoredDialog] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = React.useState(false);
  const [recommendationsError, setRecommendationsError] = React.useState(null);

  const syncEventInState = React.useCallback((eventId, updater) => {
    setEventsResponse((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((event) => (event.id === eventId ? updater(event) : event)),
      };
    });

    setRecommendations((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        cards: current.cards.map((card) =>
          card.event.id === eventId
            ? {
                ...card,
                event: updater(card.event),
              }
            : card,
        ),
      };
    });
  }, []);

  const loadEvents = React.useCallback(async ({ forceSync = false } = {}) => {
    if (forceSync) {
      setBusyAction('sync');
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (forceSync) {
        await apiRequest('/api/events/sync', {
          method: 'POST',
        });
      }

      const response = await apiRequest('/api/events?limit=100&upcoming=true&includeMeta=true');
      setEventsResponse(response);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load campus events.';
      setError(message);
      setEventsResponse(null);
    } finally {
      if (forceSync) {
        setBusyAction(null);
      }
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialResponse) {
      return;
    }

    void loadEvents();
  }, [initialResponse, loadEvents]);

  const loadRecommendations = React.useCallback(async () => {
    setRecommendationsLoading(true);
    setRecommendationsError(null);

    try {
      const response = await apiRequest('/api/events/recommendations');
      setRecommendations(response);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to build event recommendations.';
      setRecommendationsError(message);
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (showBoredDialog && !recommendations && !recommendationsLoading) {
      void loadRecommendations();
    }
  }, [loadRecommendations, recommendations, recommendationsLoading, showBoredDialog]);

  const handleToggleInterest = React.useCallback(async (event) => {
    setBusyAction(`${event.id}:interest`);
    setError(null);

    try {
      const result = await apiRequest(`/api/events/${event.id}/interest`, {
        method: 'POST',
      });
      syncEventInState(event.id, (current) => ({
        ...current,
        isInterested: result.isInterested,
        interestedCount: result.interestedCount,
      }));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to update your interest.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [syncEventInState]);

  const handleAddToAppCalendar = React.useCallback(async (event) => {
    setBusyAction(`${event.id}:app:add`);
    setError(null);

    try {
      const created = await apiRequest('/api/calendar', {
        method: 'POST',
        body: {
          title: event.title,
          description: event.description,
          start: event.date,
          end: event.endDate,
          allDay: event.allDay,
          type: 'CAMPUS',
          campusEventId: event.id,
          location: event.location,
        },
      });
      syncEventInState(event.id, (current) => ({
        ...current,
        isInCalendar: true,
        calendarEntryId: created.id,
      }));
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        await loadEvents();
      }
      const message = err instanceof ApiClientError ? err.message : 'Unable to add the event to your app calendar.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [loadEvents, syncEventInState]);

  const handleRemoveFromAppCalendar = React.useCallback(async (event) => {
    if (!event.calendarEntryId) {
      setError('PocketQuad needs a refresh before it can remove this event.');
      return;
    }

    setBusyAction(`${event.id}:app:remove`);
    setError(null);

    try {
      await apiRequest(`/api/calendar/${event.calendarEntryId}`, {
        method: 'DELETE',
      });
      syncEventInState(event.id, (current) => ({
        ...current,
        isInCalendar: false,
        calendarEntryId: null,
      }));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to remove the event from your app calendar.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [syncEventInState]);

  const handleOpenExternalCalendar = React.useCallback(async (event, provider) => {
    setBusyAction(`${event.id}:provider:${provider}`);
    setError(null);

    try {
      const response = await apiRequest(`/api/events/${event.id}/calendar-link`, {
        method: 'POST',
        body: { provider },
      });
      syncEventInState(event.id, (current) => ({
        ...current,
        exportedProviders: Array.from(new Set([...(current.exportedProviders ?? []), provider])),
      }));
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to open your personal calendar handoff.';
      setError(message);
    } finally {
      setBusyAction(null);
    }
  }, [syncEventInState]);

  const items = React.useMemo(() => eventsResponse?.items ?? [], [eventsResponse?.items]);
  const collectionFilters = React.useMemo(
    () => [
      {
        id: 'all',
        label: 'All campus events',
        count: items.length,
      },
      {
        id: 'main-campus',
        label: 'Main campus calendar',
        count: items.filter((event) => event.sourceType === 'FEED').length,
      },
      {
        id: 'faculty',
        label: 'Faculty & department',
        count: items.filter((event) => event.originGroup === 'FACULTY').length,
      },
      {
        id: 'clubs',
        label: 'Club activities',
        count: items.filter((event) => event.clubActivity).length,
      },
      {
        id: 'my-clubs',
        label: 'My club activities',
        count: items.filter((event) => event.myClubActivity).length,
      },
    ],
    [items],
  );
  const filteredEvents = React.useMemo(() => {
    return items.filter((event) => {
      const matchesSearch = searchMatch(event, deferredSearch);
      const matchesCollection =
        collectionFilter === 'all'
        || (collectionFilter === 'main-campus' && event.sourceType === 'FEED')
        || (collectionFilter === 'faculty' && event.originGroup === 'FACULTY')
        || (collectionFilter === 'clubs' && event.clubActivity)
        || (collectionFilter === 'my-clubs' && event.myClubActivity);
      const matchesSavedView =
        view !== 'saved' || event.isInterested || event.isInCalendar || (event.exportedProviders?.length ?? 0) > 0;

      return matchesSearch && matchesCollection && matchesSavedView;
    });
  }, [collectionFilter, deferredSearch, items, view]);

  const groupedEvents = React.useMemo(() => groupEventsByBucket(filteredEvents), [filteredEvents]);

  return (
    <>
      <div className="space-y-5">
        <section className="rounded-[1.5rem] border border-border/60 bg-card px-5 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Events</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Check out all the Murray State events happening and see what there is to do!
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void loadEvents({ forceSync: true })} disabled={busyAction === 'sync'}>
                <RefreshCcw className={cn('mr-2 h-4 w-4', busyAction === 'sync' && 'animate-spin')} />
                Refresh
              </Button>
              <Button type="button" onClick={() => setShowBoredDialog(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Feeling bored?
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/60 bg-card px-5 py-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search events"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </label>

            <div className="flex h-11 items-center text-sm text-muted-foreground">
              {filteredEvents.length} result{filteredEvents.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {collectionFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setCollectionFilter(filter.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  collectionFilter === filter.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/40',
                )}
              >
                {filter.label}
                <span className="ml-2 text-xs opacity-75">{filter.count}</span>
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <section className="rounded-[1.5rem] border border-border/60 bg-card px-6 py-16 text-center text-sm text-muted-foreground">
            Loading events...
          </section>
        ) : (
          <Tabs value={view} onValueChange={setView} className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <section className="rounded-[1.5rem] border border-border/60 bg-card px-6 py-2">
                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No events matched this view.</div>
                ) : (
                  filteredEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      busyAction={busyAction}
                      onToggleInterest={handleToggleInterest}
                      onAddToAppCalendar={handleAddToAppCalendar}
                      onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
                      onOpenExternalCalendar={handleOpenExternalCalendar}
                    />
                  ))
                )}
              </section>
            </TabsContent>

            <TabsContent value="timeline">
              <section className="rounded-[1.5rem] border border-border/60 bg-card px-6 py-2">
                {groupedEvents.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No events matched this view.</div>
                ) : (
                  groupedEvents.map((group) => (
                    <div key={group.label} className="border-t border-border/60 py-6 first:border-t-0">
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{group.label}</h2>
                      <div className="mt-2">
                        {group.events.map((event) => (
                          <EventRow
                            key={event.id}
                            event={event}
                            busyAction={busyAction}
                            onToggleInterest={handleToggleInterest}
                            onAddToAppCalendar={handleAddToAppCalendar}
                            onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
                            onOpenExternalCalendar={handleOpenExternalCalendar}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </TabsContent>

            <TabsContent value="saved">
              <section className="rounded-[1.5rem] border border-border/60 bg-card px-6 py-2">
                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">No saved events yet.</div>
                ) : (
                  filteredEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      busyAction={busyAction}
                      onToggleInterest={handleToggleInterest}
                      onAddToAppCalendar={handleAddToAppCalendar}
                      onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
                      onOpenExternalCalendar={handleOpenExternalCalendar}
                    />
                  ))
                )}
              </section>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <FeelingBoredDialog
        open={showBoredDialog}
        onOpenChange={setShowBoredDialog}
        recommendations={recommendations}
        loading={recommendationsLoading}
        error={recommendationsError}
        onRefresh={loadRecommendations}
        onPass={() => {}}
        onInterested={handleToggleInterest}
        onAddToAppCalendar={handleAddToAppCalendar}
        onRemoveFromAppCalendar={handleRemoveFromAppCalendar}
        onOpenExternalCalendar={handleOpenExternalCalendar}
        busyAction={busyAction}
      />
    </>
  );
}
