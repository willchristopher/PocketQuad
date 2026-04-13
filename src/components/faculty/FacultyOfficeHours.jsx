'use client';

import React from 'react';
import {
  Clock3,
  Loader2,
  MapPin,
  PencilLine,
  Save,
} from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { formatFacultySlotLabel } from '@/lib/faculty';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const availabilityOptions = [
  {
    value: 'AVAILABLE',
    label: 'Available',
    description: 'Students can expect normal office-hours access.',
  },
  {
    value: 'LIMITED',
    label: 'Limited',
    description: 'Responses or drop-ins will be slower than usual.',
  },
  {
    value: 'AWAY',
    label: 'Away',
    description: 'Students should not expect immediate availability.',
  },
];

const modeLabels = { IN_PERSON: 'In person', VIRTUAL: 'Virtual', HYBRID: 'Hybrid' };

const defaultForm = {
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:00',
  location: '',
  mode: 'IN_PERSON',
  maxQueue: 20,
};

function formatTo12Hour(time24) {
  const [hoursRaw, minutes] = time24.split(':').map(Number);
  const isPm = hoursRaw >= 12;
  const hours = hoursRaw % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}

function err(error, fallback) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function Feedback({ tone, children }) {
  if (!children) return null;
  return (
    <p
      className={cn(
        'rounded-xl border px-4 py-3 text-sm font-medium',
        tone === 'error'
          ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      )}
    >
      {children}
    </p>
  );
}

export function FacultyOfficeHours({ initialStatusState = null, initialOfficeHours = null }) {
  const [statusState, setStatusState] = React.useState(
    initialStatusState ?? {
      status: 'AVAILABLE',
      note: '',
      display: 'Available',
    },
  );
  const [statusLoading, setStatusLoading] = React.useState(!initialStatusState);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusFeedback, setStatusFeedback] = React.useState(null);

  const [officeHours, setOfficeHours] = React.useState(initialOfficeHours ?? []);
  const [hoursLoading, setHoursLoading] = React.useState(!initialOfficeHours);
  const [form, setForm] = React.useState(defaultForm);
  const [editingId, setEditingId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [hoursFeedback, setHoursFeedback] = React.useState(null);

  const loadStatus = React.useCallback(async () => {
    setStatusLoading(true);
    try {
      setStatusState(await apiRequest('/api/faculty/me/status'));
    } catch (error) {
      setStatusFeedback({ tone: 'error', msg: err(error, 'Unable to load status') });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadHours = React.useCallback(async () => {
    setHoursLoading(true);
    try {
      setOfficeHours(await apiRequest('/api/office-hours'));
    } catch (error) {
      setHoursFeedback({ tone: 'error', msg: err(error, 'Unable to load office hours') });
    } finally {
      setHoursLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialStatusState && initialOfficeHours) {
      return;
    }

    void Promise.all([loadStatus(), loadHours()]);
  }, [initialOfficeHours, initialStatusState, loadStatus, loadHours]);

  const submitStatus = async (e) => {
    e.preventDefault();
    setStatusSaving(true);
    setStatusFeedback(null);
    try {
      const updated = await apiRequest('/api/faculty/me/status', {
        method: 'PATCH',
        body: { status: statusState.status, note: statusState.note.trim() || undefined },
      });
      setStatusState(updated);
      setStatusFeedback({ tone: 'success', msg: 'Availability saved.' });
    } catch (error) {
      setStatusFeedback({ tone: 'error', msg: err(error, 'Unable to save') });
    } finally {
      setStatusSaving(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const submitSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    setHoursFeedback(null);
    try {
      const payload = { ...form, maxQueue: Number(form.maxQueue) };
      if (editingId) {
        await apiRequest(`/api/office-hours/${editingId}`, { method: 'PATCH', body: payload });
      } else {
        await apiRequest('/api/office-hours', { method: 'POST', body: payload });
      }
      resetForm();
      await loadHours();
      setHoursFeedback({ tone: 'success', msg: editingId ? 'Slot updated.' : 'Slot added.' });
    } catch (error) {
      setHoursFeedback({ tone: 'error', msg: err(error, 'Unable to save slot') });
    } finally {
      setSaving(false);
    }
  };

  const editSlot = (slot) => {
    setEditingId(slot.id);
    setForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      mode: slot.mode,
      maxQueue: slot.maxQueue,
    });
  };

  const deleteSlot = async (id) => {
    setHoursFeedback(null);
    try {
      await apiRequest(`/api/office-hours/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await loadHours();
    } catch (error) {
      setHoursFeedback({ tone: 'error', msg: err(error, 'Unable to delete') });
    }
  };

  const toggleSlot = async (id) => {
    try {
      const updated = await apiRequest(`/api/office-hours/${id}/toggle`, { method: 'PATCH' });
      setOfficeHours((current) => current.map((s) => (s.id === id ? updated : s)));
    } catch (error) {
      setHoursFeedback({ tone: 'error', msg: err(error, 'Unable to toggle') });
    }
  };

  return (
    <div className="space-y-8 animate-in-soft">
      <header className="space-y-1 pt-2">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight">
          Office Hours
        </h1>
        <p className="text-sm text-muted-foreground">
          Set your availability and publish weekly slots for students.
        </p>
      </header>

      {/* ── Availability ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Your availability
        </h2>
        <form onSubmit={submitStatus} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {availabilityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusState((c) => ({ ...c, status: opt.value }))}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  statusState.status === opt.value
                    ? 'border-primary bg-primary/8 shadow-sm'
                    : 'border-border/60 hover:bg-muted/20',
                )}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {opt.description}
                </p>
              </button>
            ))}
          </div>

          <label className="block space-y-2 text-sm font-medium">
            <span>Status note</span>
            <Textarea
              value={statusState.note}
              onChange={(e) => setStatusState((c) => ({ ...c, note: e.target.value }))}
              placeholder="Optional context like conference travel or alternate contact."
              className="min-h-24 resize-none"
              disabled={statusLoading}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              className="rounded-xl"
              disabled={statusLoading || statusSaving}
            >
              {statusSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save availability
                </>
              )}
            </Button>
            <Feedback tone={statusFeedback?.tone}>{statusFeedback?.msg}</Feedback>
          </div>
        </form>
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Slot Editor ────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {editingId ? 'Edit slot' : 'Add a slot'}
        </h2>
        <form onSubmit={submitSlot} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 space-y-2 text-sm font-medium">
              <span>Day</span>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm((c) => ({ ...c, dayOfWeek: Number(e.target.value) }))}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {weekdays.map((day, i) => (
                  <option key={day} value={i}>{day}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              <span>Mode</span>
              <select
                value={form.mode}
                onChange={(e) => setForm((c) => ({ ...c, mode: e.target.value }))}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="IN_PERSON">In person</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </label>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <label className="min-w-0 space-y-2 text-sm font-medium">
                <span>Start time</span>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))}
                  className="min-w-0 [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </label>
              <label className="min-w-0 space-y-2 text-sm font-medium">
                <span>End time</span>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((c) => ({ ...c, endTime: e.target.value }))}
                  className="min-w-0 [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </label>
            </div>
          </div>

          <label className="block min-w-0 space-y-2 text-sm font-medium">
            <span>Location</span>
            <Input
              value={form.location}
              onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
              placeholder="Engineering Hall 314 or Zoom room"
              required
            />
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? 'Update slot' : 'Add slot'}
                </>
              )}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={resetForm}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Published Slots ────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Published slots
        </h2>

        <Feedback tone={hoursFeedback?.tone}>{hoursFeedback?.msg}</Feedback>

        {hoursLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : officeHours.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center">
            <p className="text-sm font-medium">No office hours yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the form above to add your first slot.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {officeHours.map((slot) => (
              <div key={slot.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{formatFacultySlotLabel(slot)}</p>
                  <Badge
                    variant={slot.isActive ? 'default' : 'outline'}
                    className="rounded-full text-[11px]"
                  >
                    {slot.isActive ? 'Live' : 'Scheduled'}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {modeLabels[slot.mode]}
                  </Badge>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {slot.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatTo12Hour(slot.startTime)} – {formatTo12Hour(slot.endTime)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => editSlot(slot)}
                  >
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void toggleSlot(slot.id)}
                  >
                    {slot.isActive ? 'Pause' : 'Go live'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-red-600 hover:text-red-600 dark:text-red-300"
                    onClick={() => void deleteSlot(slot.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
