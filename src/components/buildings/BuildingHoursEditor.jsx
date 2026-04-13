'use client';

import React from 'react';
import { Clock3, Copy, Plus, Trash2 } from 'lucide-react';

import {
  BUILDING_HOURS_DAY_LABELS,
  BUILDING_HOURS_DISPLAY_ORDER,
  buildBuildingHoursScheduleFromSummary,
  copyBuildingHoursDayToSchedule,
  createDefaultBuildingHoursSchedule,
  formatBuildingHoursTime,
  getBuildingHoursDayCopy,
  hasMeaningfulBuildingHoursSchedule,
  normalizeBuildingHoursSchedule,
  summarizeBuildingHoursSchedule,
} from '@/lib/buildingHours';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function getWorkingSchedule(value, fallbackSummary) {
  const normalized = normalizeBuildingHoursSchedule(value);
  if (normalized) {
    return normalized;
  }

  return buildBuildingHoursScheduleFromSummary(fallbackSummary) ?? createDefaultBuildingHoursSchedule();
}

function DayCard({ day, onChange, onCopyToWeekdays, onCopyToAll }) {
  const handleModeChange = (nextKind) => {
    if (nextKind === 'open') {
      onChange({
        ...day,
        kind: 'open',
        label: '',
        slots: day.slots.length > 0 ? day.slots : [{ openTime: '08:00', closeTime: '16:30' }],
      });
      return;
    }

    if (nextKind === 'all_day') {
      onChange({
        ...day,
        kind: 'all_day',
        label: day.label && day.kind === 'all_day' ? day.label : 'Open 24 hours',
        slots: [],
      });
      return;
    }

    if (nextKind === 'text') {
      onChange({
        ...day,
        kind: 'text',
        label: day.kind === 'text' && day.label ? day.label : 'Hours vary',
        slots: [],
      });
      return;
    }

    onChange({
      ...day,
      kind: 'closed',
      label: 'Closed',
      slots: [],
    });
  };

  const updateSlot = (slotIndex, field, nextValue) => {
    onChange({
      ...day,
      slots: day.slots.map((slot, index) =>
        index === slotIndex ? { ...slot, [field]: nextValue } : slot,
      ),
    });
  };

  const addSlot = () => {
    onChange({
      ...day,
      kind: 'open',
      label: '',
      slots: [...day.slots, { openTime: '08:00', closeTime: '16:30' }],
    });
  };

  const removeSlot = (slotIndex) => {
    const nextSlots = day.slots.filter((_, index) => index !== slotIndex);
    onChange(
      nextSlots.length === 0
        ? { ...day, kind: 'closed', label: 'Closed', slots: [] }
        : { ...day, slots: nextSlots },
    );
  };

  return (
    <article className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{BUILDING_HOURS_DAY_LABELS[day.dayOfWeek]}</p>
          <p className="text-xs text-muted-foreground">
            {day.kind === 'open'
              ? day.slots
                  .map(
                    (slot) =>
                      `${formatBuildingHoursTime(slot.openTime)} - ${formatBuildingHoursTime(slot.closeTime)}`,
                  )
                  .join(', ')
              : day.label}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onCopyToWeekdays}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Weekdays
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onCopyToAll}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Every day
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <label className="space-y-2 text-sm font-medium">
          <span>Mode</span>
          <select
            value={day.kind}
            onChange={(event) => handleModeChange(event.target.value)}
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="closed">Closed</option>
            <option value="open">Set hours</option>
            <option value="all_day">Open 24 hours</option>
            <option value="text">Custom note</option>
          </select>
        </label>

        <div className="space-y-3">
          {day.kind === 'open' ? (
            <>
              {day.slots.map((slot, slotIndex) => (
                <div
                  key={`${day.dayOfWeek}-${slotIndex}`}
                  className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <label className="space-y-2 text-sm font-medium">
                    <span>Open</span>
                    <Input
                      type="time"
                      value={slot.openTime}
                      onChange={(event) => updateSlot(slotIndex, 'openTime', event.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Close</span>
                    <Input
                      type="time"
                      value={slot.closeTime}
                      onChange={(event) => updateSlot(slotIndex, 'closeTime', event.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-red-600 hover:text-red-600 dark:text-red-300"
                      onClick={() => removeSlot(slotIndex)}
                      aria-label={`Remove ${BUILDING_HOURS_DAY_LABELS[day.dayOfWeek]} time slot ${slotIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addSlot}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add time slot
              </Button>
            </>
          ) : null}

          {day.kind === 'all_day' ? (
            <label className="space-y-2 text-sm font-medium">
              <span>Label</span>
              <Input
                value={day.label}
                onChange={(event) => onChange({ ...day, label: event.target.value })}
                placeholder="Open 24 hours"
                className="h-11 rounded-xl"
              />
            </label>
          ) : null}

          {day.kind === 'text' ? (
            <label className="space-y-2 text-sm font-medium">
              <span>Custom note</span>
              <Input
                value={day.label}
                onChange={(event) => onChange({ ...day, label: event.target.value })}
                placeholder="Varies (events), residents only, seasonal hours..."
                className="h-11 rounded-xl"
              />
            </label>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function BuildingHoursEditor({
  value,
  onChange,
  fallbackSummary = '',
  className,
  helperText = 'Set one schedule per day, then reuse it across weekdays or the full week when the hours match.',
}) {
  const scheduleEnabled = hasMeaningfulBuildingHoursSchedule(value);
  const workingSchedule = React.useMemo(
    () => getWorkingSchedule(value, fallbackSummary),
    [fallbackSummary, value],
  );

  const updateDay = (dayOfWeek, nextDay) => {
    onChange({
      ...workingSchedule,
      days: workingSchedule.days.map((day) =>
        day.dayOfWeek === dayOfWeek ? getBuildingHoursDayCopy(nextDay) : day,
      ),
    });
  };

  const applyCopy = (sourceDayOfWeek, targetDayOfWeeks) => {
    onChange(copyBuildingHoursDayToSchedule(workingSchedule, sourceDayOfWeek, targetDayOfWeeks));
  };

  const derivedSummary = summarizeBuildingHoursSchedule(workingSchedule, fallbackSummary);

  return (
    <section className={cn('space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4 text-primary" />
            Weekly hours
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scheduleEnabled ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onChange(null)}
            >
              Remove weekly schedule
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onChange(workingSchedule)}
            >
              Add weekly schedule
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Summary
        </p>
        <p className="mt-2 text-sm">
          {scheduleEnabled ? derivedSummary : fallbackSummary || 'No weekly schedule published yet.'}
        </p>
      </div>

      {scheduleEnabled ? (
        <div className="space-y-3">
          {BUILDING_HOURS_DISPLAY_ORDER.map((dayOfWeek) => workingSchedule.days[dayOfWeek]).map((day) => (
            <DayCard
              key={day.dayOfWeek}
              day={day}
              onChange={(nextDay) => updateDay(day.dayOfWeek, nextDay)}
              onCopyToWeekdays={() => applyCopy(day.dayOfWeek, [1, 2, 3, 4, 5])}
              onCopyToAll={() => applyCopy(day.dayOfWeek, [0, 1, 2, 3, 4, 5, 6])}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
