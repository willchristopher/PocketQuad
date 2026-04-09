'use client';
import React from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths, } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { apiRequest, ApiClientError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
const entryColor = {
    Event: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    Deadline: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    Personal: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};
export function UnifiedCalendar() {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState(null);
    const [activeFilter, setActiveFilter] = React.useState('All');
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [deletingEntryId, setDeletingEntryId] = React.useState(null);
    const [error, setError] = React.useState(null);
    const monthDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth)),
    });
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
                        category = event.priority || 'MEDIUM';
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
        return ['All', 'Event', 'Deadline', 'Personal', ...categories];
    }, [entries]);
    const filteredEntries = entries.filter((entry) => {
        if (activeFilter === 'All')
            return true;
        if (activeFilter === 'Event' || activeFilter === 'Deadline' || activeFilter === 'Personal') {
            return entry.kind === activeFilter;
        }
        return entry.category === activeFilter;
    });
    const selectedEntries = selectedDate
        ? filteredEntries.filter((entry) => isSameDay(new Date(entry.dateISO), selectedDate))
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
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-extrabold tracking-tight min-w-[160px]">{format(currentMonth, 'MMMM yyyy')}</h2>
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

        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {filterOptions.map((option) => {
            const isActive = activeFilter === option;
            const eventCount = entries.filter((entry) => {
              if (option === 'All') return true;
              if (option === 'Event' || option === 'Deadline' || option === 'Personal') {
                return entry.kind === option;
              }
              return entry.category === option;
            }).length;
            
            return (
              <button 
                key={option} 
                onClick={() => setActiveFilter(option)}
                title={`${option}${eventCount > 0 ? ` (${eventCount})` : ''}`}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-muted/60'
                )}
              >
                <span>{option}</span>
                {eventCount > 0 && (
                  <span className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                    isActive ? 'bg-primary-foreground/30' : 'bg-muted'
                  )}>
                    {eventCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (<div className="px-4 pt-3">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>)}

      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/10 mt-3">
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

      {selectedDate && (<Dialog open={Boolean(selectedDate)} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="rounded-xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</DialogTitle>
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
                    className={cn('rounded-xl border p-4 animate-in-up space-y-2', entryColor[entry.kind])}
                    style={{ animationDelay: `${0.03 * (index + 1)}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-tight">{entry.title}</p>
                        <p className="mt-1 text-xs opacity-75">{entry.kind} • {entry.category}</p>
                      </div>
                      <span className={cn('whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold', 
                        entry.kind === 'Event' && 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
                        entry.kind === 'Deadline' && 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
                        entry.kind === 'Personal' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      )}>
                        {entry.kind === 'Deadline' ? '📋' : entry.kind === 'Event' ? '🎉' : '📅'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{entry.locationOrSource}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span>🕐</span>
                        <span>{format(new Date(entry.dateISO), 'h:mm a')}</span>
                      </p>
                    </div>
                    {(entry.source === 'calendar' || entry.source === 'deadline') && (<div className="pt-1">
                        <button type="button" onClick={() => void removeEntry(entry)} disabled={deletingEntryId === entry.id} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400">
                          <Trash2 className="h-3.5 w-3.5"/>
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
