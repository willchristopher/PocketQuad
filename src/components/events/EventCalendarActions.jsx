'use client';

import React from 'react';
import { CalendarCheck2, CalendarPlus, ChevronDown, ExternalLink, LoaderCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function providerLabel(provider) {
  if (provider === 'GOOGLE') return 'Google Calendar';
  if (provider === 'OUTLOOK') return 'Outlook';
  return 'Apple Calendar';
}

export function EventCalendarActions({
  event,
  onAddToAppCalendar,
  onRemoveFromAppCalendar,
  onOpenExternalCalendar,
  busyAction,
  compact = false,
  mobileStack = false,
}) {
  const addBusy = busyAction === `${event.id}:app:add`;
  const removeBusy = busyAction === `${event.id}:app:remove`;
  const autoAddedToCalendar = event.autoAddedToCalendar || event.audience === 'DEADLINE';

  return (
    <div
      className={cn(
        'flex gap-2',
        compact ? 'justify-start' : 'justify-start',
        mobileStack ? 'flex-col items-stretch sm:flex-row sm:flex-wrap sm:items-center' : 'flex-wrap items-center',
      )}
    >
      {autoAddedToCalendar ? (
        <Button
          type="button"
          variant="secondary"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-2', mobileStack && 'w-full justify-center sm:w-auto')}
          disabled
        >
          <CalendarCheck2 className="h-4 w-4" />
          On every PocketQuad calendar
        </Button>
      ) : event.isInCalendar ? (
        <Button
          type="button"
          variant="secondary"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-2', mobileStack && 'w-full justify-center sm:w-auto')}
          onClick={() => void onRemoveFromAppCalendar(event)}
          disabled={removeBusy || event.isCancelled}
        >
          {removeBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Remove from app calendar
        </Button>
      ) : (
        <Button
          type="button"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-2', mobileStack && 'w-full justify-center sm:w-auto')}
          onClick={() => void onAddToAppCalendar(event)}
          disabled={addBusy || event.isCancelled}
        >
          {addBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          Add to app calendar
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={compact ? 'sm' : 'default'}
            className={cn('gap-2', mobileStack && 'w-full justify-center sm:w-auto')}
          >
            <ExternalLink className="h-4 w-4" />
            Personal calendar
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Add outside PocketQuad</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {['GOOGLE', 'OUTLOOK', 'APPLE'].map((provider) => {
            const providerBusy = busyAction === `${event.id}:provider:${provider}`;
            const exported = event.exportedProviders?.includes(provider);
            return (
              <DropdownMenuItem
                key={provider}
                onSelect={() => void onOpenExternalCalendar(event, provider)}
                className="flex items-center justify-between"
                disabled={event.isCancelled}
              >
                <span>{providerLabel(provider)}</span>
                {providerBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : exported ? (
                  <CalendarCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
