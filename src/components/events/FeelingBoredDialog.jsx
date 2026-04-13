'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, MapPin, Sparkles, ThumbsDown, Undo2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EventCalendarActions } from '@/components/events/EventCalendarActions';

function formatCardDate(isoString) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString));
}

export function FeelingBoredDialog({
  open,
  onOpenChange,
  recommendations,
  loading,
  error,
  onRefresh,
  onPass,
  onAddToAppCalendar,
  onRemoveFromAppCalendar,
  onOpenExternalCalendar,
  busyAction,
}) {
  const [dismissedIds, setDismissedIds] = useLocalStorage('pocketquad:bored-dismissed-events', []);
  const [index, setIndex] = React.useState(0);
  const visibleCards = React.useMemo(() => {
    const dismissed = new Set(dismissedIds ?? []);
    return (recommendations?.cards ?? []).filter((card) => !dismissed.has(card.event.id));
  }, [dismissedIds, recommendations?.cards]);

  React.useEffect(() => {
    if (!open && index !== 0) {
      setIndex(0);
    }
  }, [index, open]);

  React.useEffect(() => {
    if (visibleCards.length === 0 && index !== 0) {
      setIndex(0);
      return;
    }

    if (visibleCards.length > 0 && index >= visibleCards.length) {
      setIndex(0);
    }
  }, [index, visibleCards.length]);

  const activeCard = visibleCards[index] ?? null;
  const queuedCards = visibleCards.slice(index + 1, index + 3);

  const dismissCard = React.useCallback(
    (eventId) => {
      setDismissedIds((current) => Array.from(new Set([...(current ?? []), eventId])));
      setIndex((current) => current + 1);
    },
    [setDismissedIds],
  );

  const handlePass = React.useCallback(() => {
    if (!activeCard) {
      return;
    }
    dismissCard(activeCard.event.id);
    onPass?.(activeCard.event);
  }, [activeCard, dismissCard, onPass]);

  const handleAddToCalendar = React.useCallback(async () => {
    if (!activeCard) {
      return;
    }
    if (!activeCard.event.isInCalendar) {
      await onAddToAppCalendar?.(activeCard.event);
    }
    dismissCard(activeCard.event.id);
  }, [activeCard, dismissCard, onAddToAppCalendar]);

  const resetDeck = React.useCallback(() => {
    setDismissedIds([]);
    setIndex(0);
  }, [setDismissedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-border/60 bg-background p-0 shadow-2xl">
        <div className="overflow-hidden rounded-[1.3rem]">
          <div className="grid gap-8 p-6 md:grid-cols-[0.82fr_1.18fr] md:p-8">
            <div className="space-y-5">
              <DialogHeader className="space-y-3 text-left">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Feeling bored?
                </div>
                <DialogTitle className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  Quick picks for your week.
                </DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-6 text-muted-foreground">
                  {recommendations?.overview ?? 'Suggestions based on your interests and schedule.'}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-3xl border border-border/60 bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">How it works</p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                    <p>We check your saved club interests and your upcoming PocketQuad calendar.</p>
                  </div>
                  <p>Swipe right for interested or left to pass.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void onRefresh?.()}>
                  Refresh picks
                </Button>
                <Button type="button" variant="ghost" onClick={resetDeck}>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reset dismissed cards
                </Button>
              </div>
            </div>

            <div className="relative min-h-[510px]">
              {loading ? (
                <div className="flex h-full min-h-[510px] items-center justify-center rounded-[2rem] border border-border/60 bg-card text-sm text-muted-foreground">
                  Pulling personalized campus picks...
                </div>
              ) : error ? (
                <div className="flex h-full min-h-[510px] flex-col items-center justify-center rounded-[2rem] border border-rose-400/20 bg-rose-500/10 px-8 text-center text-sm text-rose-700 dark:text-rose-300">
                  <p>{error}</p>
                  <Button type="button" className="mt-4" onClick={() => void onRefresh?.()}>
                    Try again
                  </Button>
                </div>
              ) : !activeCard ? (
                <div className="flex h-full min-h-[510px] flex-col items-center justify-center rounded-[2rem] border border-border/60 bg-card px-8 text-center">
                  <p className="text-lg font-semibold text-foreground">You cleared the deck.</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Reset dismissed cards or refresh picks to see more recommendations.
                  </p>
                  <Button type="button" className="mt-5" onClick={resetDeck}>
                    Start over
                  </Button>
                </div>
              ) : (
                <div className="relative h-full min-h-[510px]">
                  {queuedCards.map((card, queuedIndex) => (
                    <div
                      key={card.event.id}
                      className="absolute inset-x-7 top-8 rounded-[2rem] border border-border/50 bg-muted/40"
                      style={{
                        transform: `translateY(${(queuedIndex + 1) * 16}px) scale(${1 - (queuedIndex + 1) * 0.03})`,
                        opacity: 0.22 - queuedIndex * 0.06,
                        height: '78%',
                      }}
                    />
                  ))}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCard.event.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 120) {
                          void handleAddToCalendar();
                        } else if (info.offset.x < -120) {
                          handlePass();
                        }
                      }}
                      initial={{ opacity: 0, y: 24, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 16, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-[2rem] border border-border/60 bg-card p-6 md:p-7"
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                              {activeCard.hook}
                            </span>
                            <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Fit score {activeCard.fitScore}
                            </span>
                          </div>

                          <div className="mt-5 flex items-start justify-between gap-6">
                            <div>
                              <h3 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground">
                                {activeCard.event.title}
                              </h3>
                            </div>
                            <span className="hidden rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground md:inline-flex">
                              {index + 1} / {visibleCards.length}
                            </span>
                          </div>

                          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {activeCard.reason}
                          </p>

                          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                <span>{formatCardDate(activeCard.event.date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{activeCard.event.location ?? 'Location TBA'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                                {activeCard.event.sourceLabel ?? 'Campus event'}
                              </span>
                              {activeCard.event.myClubActivity ? (
                                <span className="rounded-full border border-emerald-500/20 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                                  My club
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <EventCalendarActions
                            event={activeCard.event}
                            onAddToAppCalendar={onAddToAppCalendar}
                            onRemoveFromAppCalendar={onRemoveFromAppCalendar}
                            onOpenExternalCalendar={onOpenExternalCalendar}
                            busyAction={busyAction}
                            compact
                          />

                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handlePass}
                            >
                              <ThumbsDown className="mr-2 h-4 w-4" />
                              Pass
                            </Button>
                            {!activeCard.event.isInCalendar ? (
                              <Button
                                type="button"
                                onClick={() => void handleAddToCalendar()}
                              >
                                Add to calendar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
