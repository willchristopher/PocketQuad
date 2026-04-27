'use client';
import React from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfToday, startOfWeek, subMonths, } from 'date-fns';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { apiRequest, ApiClientError } from '@/lib/api/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn, formatEnumLabel } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
const entryColor = {
    Event: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    Deadline: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    Personal: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};
function matchesFilter(entry, filter) {
    if (filter === 'All')
        return true;
    if (filter === 'Event' || filter === 'Deadline' || filter === 'Personal') {
        return entry.kind === filter;
    }
    return entry.category === filter;
}
function getFilterLabel(filter) {
    if (filter === 'All' || filter === 'Event' || filter === 'Deadline' || filter === 'Personal') {
        return filter;
    }
    return formatEnumLabel(filter);
}
function isUpcomingEntry(entry, today) {
    return new Date(entry.dateISO) >= today;
}
export function UnifiedCalendar() {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState(null);
    const [activeFilter, setActiveFilter] = React.useState('All');
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [deletingEntryId, setDeletingEntryId] = React.useState(null);
    const [error, setError] = React.useState(null);
    const isMobile = useMediaQuery('(max-width: 767px)');
    const monthDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth)),
    });
    const currentMonthDays = React.useMemo(() => monthDays.filter((day) => isSameMonth(day, currentMonth)), [currentMonth, monthDays]);
    const loadEntries = React.useCallback(async () => {
      let active = true;
      const run = async () => {
            setLoading(true);
            setError(null);
            const start = startOfWeek(startOfMonth(currentMonth)).toISOString();
            const end = endOfWeek(endOfMonth(currentMonth)).toISOString();
            try {
                // Using unified calendar endpoint that combines all event types
                const unifiedData = await apiRequest(
                    `/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&includeDeadlines=true&includeCampusEvents=true`
                );
                
                const nextEntries = unifiedData.map((event) => {
                    // Map unified event format to display format
                    let kind = 'Personal';
                    let category = event.type || 'Other';
                    let locationOrSource = event.location ?? 'Calendar';
                    
                    if (event.eventType === 'DEADLINE') {
                        kind = 'Deadline';
                        category = 'Deadline';
                        locationOrSource = event.course || 'Academic';
                    } else if (event.eventType === 'CAMPUS_EVENT') {
                        kind = 'Event';
                        category = event.type || 'Other';
                        locationOrSource = event.location || event.organizer || 'Campus';
                    }
                    
                    return {
                        id: `${event.source}:${event.id}`,
                      rawId: event.id,
                      source: event.source,
                        title: event.title,
                        dateISO: event.start,
                        kind,
                        category,
                        locationOrSource,
                    };
                });
                
                if (active) {
                    setEntries(nextEntries);
                }
            }
            catch (err) {
                const message = err instanceof ApiClientError ? err.message : 'Unable to load calendar data';
                if (active) {
                    setEntries([]);
                    setError(message);
                }
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        };
              await run();
        return () => {
            active = false;
        };
            }, [currentMonth]);
            React.useEffect(() => {
              void loadEntries();
            }, [loadEntries]);
    const filterOptions = React.useMemo(() => {
        const categories = Array.from(new Set(entries.map((entry) => entry.category))).sort();
        return Array.from(new Set(['All', 'Event', 'Deadline', 'Personal', ...categories]));
    }, [entries]);
    const today = React.useMemo(() => startOfToday(), []);
    const getOptionCount = React.useCallback((option) => {
        return entries.filter((entry) => {
            return matchesFilter(entry, option) && (!isMobile || isUpcomingEntry(entry, today));
        }).length;
    }, [entries, isMobile, today]);
    const filteredEntries = entries.filter((entry) => {
        return matchesFilter(entry, activeFilter);
    });
    const upcomingFilteredEntries = React.useMemo(() => {
        return filteredEntries.filter((entry) => isUpcomingEntry(entry, today));
    }, [filteredEntries, today]);
    const mobileEventDays = React.useMemo(() => {
        return currentMonthDays.filter((day) => {
            return upcomingFilteredEntries.some((entry) => isSameDay(new Date(entry.dateISO), day));
        });
    }, [currentMonthDays, upcomingFilteredEntries]);
    const selectedEntryPool = isMobile ? upcomingFilteredEntries : filteredEntries;
    const selectedEntries = selectedDate
        ? selectedEntryPool.filter((entry) => isSameDay(new Date(entry.dateISO), selectedDate))
        : [];
    const removeEntry = async (entry) => {
      if (entry.source !== 'calendar' && entry.source !== 'deadline') {
        setError('Only personal calendar items and deadlines can be removed here');
        return;
      }
      setError(null);
      setDeletingEntryId(entry.id);
      try {
        if (entry.source === 'calendar') {
          await apiRequest(`/api/calendar/${entry.rawId}`, { method: 'DELETE' });
        }
        else {
          await apiRequest(`/api/calendar/deadlines/${entry.rawId}`, { method: 'DELETE' });
        }
        setEntries((previous) => previous.filter((item) => item.id !== entry.id));
      }
      catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Unable to remove this calendar item';
        setError(message);
      }
      finally {
        setDeletingEntryId(null);
      }
    };
    return (<section className="overflow-hidden rounded-xl border border-border/60 bg-card animate-in-up">
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <h2 className="min-w-0 font-display text-lg font-extrabold tracking-tight sm:min-w-[160px]">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/80 p-1">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
              className="rounded-lg p-2 transition-colors hover:bg-muted/60 active:bg-muted"
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4"/>
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())} 
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-muted/60 active:bg-muted"
              title="Jump to today"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
              className="rounded-lg p-2 transition-colors hover:bg-muted/60 active:bg-muted"
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4"/>
            </button>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-2 self-start rounded-full border border-border/60 bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-card">
              <span>{getFilterLabel(activeFilter)}</span>
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {getOptionCount(activeFilter)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {filterOptions.map((option) => {
            const isActive = activeFilter === option;
            return (<DropdownMenuItem key={option} onClick={() => setActiveFilter(option)} className="flex items-center justify-between gap-3">
                <span>{getFilterLabel(option)}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {getOptionCount(option)}
                  {isActive ? <Check className="h-3.5 w-3.5 text-foreground"/> : null}
                </span>
              </DropdownMenuItem>);
        })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (<div className="px-4 pt-3">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>)}

      {isMobile ? (<div className="grid min-w-0 grid-cols-1 gap-3 p-3 min-[460px]:grid-cols-2">
          {loading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 min-[460px]:col-span-2">
              <p className="text-sm text-muted-foreground">Loading upcoming calendar items...</p>
            </div>
          ) : mobileEventDays.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 min-[460px]:col-span-2">
              <p className="text-sm font-semibold text-foreground">No upcoming items this month</p>
              <p className="mt-1 text-sm text-muted-foreground">Future events you add to your calendar will show here.</p>
            </div>
          ) : mobileEventDays.map((day) => {
            const dayEntries = upcomingFilteredEntries.filter((entry) => isSameDay(new Date(entry.dateISO), day));
            const isTodayDate = isToday(day);
            const isSelectedDate = selectedDate ? isSameDay(day, selectedDate) : false;
            return (<button 
                key={day.toISOString()} 
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'min-w-0 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200',
                  isSelectedDate
                    ? 'border-primary/40 bg-primary/[0.08] shadow-sm'
                    : 'border-border/60 bg-card hover:border-primary/20 hover:bg-muted/20',
                  isTodayDate && !isSelectedDate && 'border-primary/20'
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{format(day, 'EEE')}</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className={cn(
                        'font-display text-3xl font-extrabold tracking-tight',
                        isTodayDate ? 'text-primary' : 'text-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                      <span className="pb-1 text-sm font-medium text-muted-foreground">{format(day, 'MMM')}</span>
                    </div>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                    'border-primary/20 bg-primary/10 text-primary'
                  )}>
                    {dayEntries.length} item{dayEntries.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 min-w-0 space-y-2">
                  {dayEntries.slice(0, 3).map((entry) => (<div 
                          key={entry.id} 
                          className={cn('min-w-0 rounded-xl px-3 py-2 text-xs font-semibold leading-5 break-words', entryColor[entry.kind])}
                          title={entry.title}
                        >
                          {entry.title}
                        </div>))}
                      {dayEntries.length > 3 ? (<p className="text-xs font-medium text-muted-foreground">
                          +{dayEntries.length - 3} more scheduled
                        </p>) : null}
                </div>
              </button>);
        })}
        </div>) : (<>
          <div className="mt-3 grid grid-cols-7 border-b border-border/60 bg-muted/10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (<div key={day} className="p-2 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {day}
              </div>))}
          </div>

          <div className="grid min-h-[520px] grid-cols-7 auto-rows-fr gap-px bg-border/30">
            {monthDays.map((day) => {
                const dayEntries = filteredEntries.filter((entry) => isSameDay(new Date(entry.dateISO), day));
                const currentMonthDay = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                return (
                  <button 
                    key={day.toISOString()} 
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative min-h-[100px] p-2 text-left transition-all duration-200 hover:bg-muted/40',
                      !currentMonthDay && 'bg-muted/10 opacity-40',
                      isTodayDate && 'bg-primary/[0.08]'
                    )}
                  >
                    <span className={cn(
                      'mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold',
                      isTodayDate 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30' 
                        : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>

                    <div className="space-y-0.5 text-[10px]">
                      {loading ? (
                        <p className="text-muted-foreground">…</p>
                      ) : dayEntries.length > 0 ? (
                        <>
                          {dayEntries.slice(0, 2).map((entry) => (
                            <div 
                              key={entry.id} 
                              className={cn('truncate rounded px-1.5 py-0.5 font-semibold animate-in-up', entryColor[entry.kind])}
                              title={entry.title}
                            >
                              {entry.title}
                            </div>
                          ))}
                          {dayEntries.length > 2 && (
                            <p className="px-1 font-medium text-muted-foreground">
                              +{dayEntries.length - 2} more
                            </p>
                          )}
                        </>
                      ) : null}
                    </div>
                  </button>
                );
            })}
          </div>
        </>)}

      {selectedDate && (<Dialog open={Boolean(selectedDate)} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-lg break-words">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</DialogTitle>
              <DialogDescription className="text-xs">
                {selectedEntries.length === 0
                ? 'No events scheduled'
                : `${selectedEntries.length} item${selectedEntries.length !== 1 ? 's' : ''} planned`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedEntries.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No events scheduled for this day</p>
                </div>
              ) : (
                selectedEntries.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className={cn('min-w-0 overflow-hidden rounded-xl border p-4 animate-in-up space-y-2', entryColor[entry.kind])}
                    style={{ animationDelay: `${0.03 * (index + 1)}s` }}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight break-words">{entry.title}</p>
                        <p className="mt-1 text-xs opacity-75 break-words">{entry.kind} • {getFilterLabel(entry.category)}</p>
                      </div>
                      <span className={cn('shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold', 
                        entry.kind === 'Event' && 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
                        entry.kind === 'Deadline' && 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
                        entry.kind === 'Personal' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      )}>
                        {entry.kind === 'Deadline' ? '📋' : entry.kind === 'Event' ? '🎉' : '📅'}
                      </span>
                    </div>
                    
                    <div className="min-w-0 space-y-1 text-xs">
                      <p className="flex min-w-0 items-start gap-2">
                        <span className="shrink-0">📍</span>
                        <span className="min-w-0 break-words">{entry.locationOrSource}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="shrink-0">🕐</span>
                        <span>{format(new Date(entry.dateISO), 'h:mm a')}</span>
                      </p>
                    </div>
                    {(entry.source === 'calendar' || entry.source === 'deadline') && (<div className="pt-1">
                        <button type="button" onClick={() => void removeEntry(entry)} disabled={deletingEntryId === entry.id} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400">
                          <Trash2 className="h-3.5 w-3.5 shrink-0"/>
                          {deletingEntryId === entry.id
                            ? 'Removing...'
                            : entry.source === 'deadline'
                                ? 'Delete Deadline'
                                : 'Remove from Calendar'}
                        </button>
                      </div>)}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>)}
    </section>);
}
