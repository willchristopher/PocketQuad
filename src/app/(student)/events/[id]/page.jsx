'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, Heart, MapPin, Trash2 } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
function formatLongDate(iso) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(iso));
}
function toEventEnd(startIso) {
    return new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
}
export default function EventDetailPage({ params }) {
    const { id } = React.use(params);
    const [event, setEvent] = React.useState(null);
    const [added, setAdded] = React.useState(false);
    const [calendarEntryId, setCalendarEntryId] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        let active = true;
        const loadEvent = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiRequest(`/api/events/${id}`);
                if (active) {
                    setEvent(data);
                }
            }
            catch (err) {
                const message = err instanceof ApiClientError ? err.message : 'Unable to load event';
                if (active) {
                    setError(message);
                    setEvent(null);
                }
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        };
        void loadEvent();
        return () => {
            active = false;
        };
    }, [id]);
    const toggleInterest = async () => {
        if (!event)
            return;
        if (event.isCancelled)
            return;
        setError(null);
        try {
            const result = await apiRequest(`/api/events/${event.id}/interest`, {
                method: 'POST',
            });
            setEvent((previous) => previous
                ? {
                    ...previous,
                    interestedCount: result.interestedCount,
                    isInterested: result.isInterested,
                }
                : previous);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update interest';
            setError(message);
        }
    };
    const addToCalendar = async () => {
        if (!event)
            return;
        if (event.isCancelled)
            return;
        setError(null);
        try {
            const created = await apiRequest('/api/calendar', {
                method: 'POST',
                body: {
                    title: event.title,
                    description: event.description,
                    start: event.date,
                    end: toEventEnd(event.date),
                    allDay: false,
                    type: 'CAMPUS',
                    location: event.location,
                },
            });
            setAdded(true);
            setCalendarEntryId(created.id);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to add event to calendar';
            setError(message);
        }
    };
    const removeFromCalendar = async () => {
        if (!calendarEntryId) {
            setError('This event can only be removed if it was added in this session');
            return;
        }
        setError(null);
        try {
            await apiRequest(`/api/calendar/${calendarEntryId}`, {
                method: 'DELETE',
            });
            setAdded(false);
            setCalendarEntryId(null);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to remove event from calendar';
            setError(message);
        }
    };
    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading event...</p>;
    }
    if (!event) {
        return (<div className="flex flex-col items-center justify-center py-24 text-center animate-in-up">
        <p className="text-sm text-muted-foreground">Event not found.</p>
        <Link href="/events" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to Events
        </Link>
      </div>);
    }
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(event.location)}`;
    return (<div className="mx-auto max-w-3xl space-y-6">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground animate-in-up">
        <ArrowLeft className="h-4 w-4"/>
        Back to Events
      </Link>

      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 md:p-8 animate-in-up stagger-1">
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{event.category}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{event.organizer}</span>
            {event.isCancelled ? (<span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                Canceled
              </span>) : null}
          </div>

          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight md:text-3xl">{event.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>

          {event.isCancelled ? (<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              This event has been canceled. The details below are kept for reference from your notification history.
            </div>) : null}

          <div className="mt-5 space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
            <p><span className="font-semibold">Date:</span> {formatLongDate(event.date)}</p>
            <p><span className="font-semibold">Time:</span> {event.time}</p>
            <p className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5"/>
              <span><span className="font-semibold">Location:</span> {event.location}</span>
            </p>
            <p><span className="font-semibold">Interested:</span> {event.interestedCount}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => void addToCalendar()} disabled={event.isCancelled} className={cn('inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60', added ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-primary text-primary-foreground shadow-lg')}>
              <CalendarPlus className="h-4 w-4"/>
              {event.isCancelled ? 'Unavailable' : added ? 'Added to Calendar' : 'Add to Calendar'}
            </button>
                        {added && !event.isCancelled ? (<button onClick={() => void removeFromCalendar()} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 px-3.5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400">
                                <Trash2 className="h-4 w-4"/>
                                Remove from Calendar
                            </button>) : null}

            <button onClick={() => void toggleInterest()} disabled={event.isCancelled} className={cn('inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60', event.isInterested
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border/60 hover:bg-muted/35')}>
              <Heart className={cn('h-4 w-4', event.isInterested && 'fill-red-600 dark:fill-red-400')}/>
              {event.isCancelled ? 'Unavailable' : event.isInterested ? 'Interested' : 'Mark Interested'}
            </button>

            <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/35">
              <MapPin className="h-4 w-4"/>
              Get Directions
            </a>
          </div>
        </div>
      </section>
    </div>);
}
