'use client';

import React from 'react';
import {
  CalendarDays,
  Loader2,
  PencilLine,
  Send,
} from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const defaultEventForm = {
  title: '',
  description: '',
  date: '',
  time: '12:00',
  location: '',
  category: 'OTHER',
  audience: 'ALL_CAMPUS',
  maxAttendees: '',
  buildingId: '',
};

const eventAudienceLabels = {
  ORGANIZATION: 'Organization',
  ALL_CAMPUS: 'All campus',
  DEADLINE: 'Deadline',
};

function toDateInput(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(value) {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '12:00';
  let h = Number(m[1]);
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  else if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function errMsg(error, fallback) {
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

export function FacultyEvents({ initialWorkspace = null, initialEvents = null }) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [events, setEvents] = React.useState(initialEvents ?? []);
  const [loading, setLoading] = React.useState(!initialEvents);
  const [form, setForm] = React.useState(defaultEventForm);
  const [editingId, setEditingId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);

  const loadWorkspace = React.useCallback(async () => {
    try {
      setWorkspace(await apiRequest('/api/faculty/me'));
    } catch {
      /* workspace context is optional */
    }
  }, []);

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await apiRequest('/api/faculty/me/events'));
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to load events') });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialWorkspace && initialEvents) {
      return;
    }

    void Promise.all([loadWorkspace(), loadEvents()]);
  }, [initialEvents, initialWorkspace, loadWorkspace, loadEvents]);

  const resetForm = () => {
    setForm(defaultEventForm);
    setEditingId(null);
  };

  const editEvent = (item) => {
    setEditingId(item.id);
    setFeedback(null);
    setForm({
      title: item.title,
      description: item.description,
      date: toDateInput(item.date),
      time: toTimeInput(item.time),
      location: item.location,
      category: item.category,
      audience: item.audience ?? 'ALL_CAMPUS',
      maxAttendees: item.maxAttendees ? String(item.maxAttendees) : '',
      buildingId: item.buildingId ?? '',
    });
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time,
        location: form.location,
        category: form.category,
        audience: form.audience,
        maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : editingId ? null : undefined,
        buildingId: form.buildingId || (editingId ? null : undefined),
      };
      const result = editingId
        ? await apiRequest(`/api/faculty/me/events/${editingId}`, { method: 'PATCH', body: payload })
        : await apiRequest('/api/faculty/me/events', { method: 'POST', body: payload });
      resetForm();
      await loadEvents();
      const label = editingId ? 'Event updated' : 'Event published';
      setFeedback({
        tone: 'success',
        msg: result.notifiedCount ? `${label} and notified ${result.notifiedCount} student${result.notifiedCount === 1 ? '' : 's'}.` : `${label}.`,
      });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to save event') });
    } finally {
      setSaving(false);
    }
  };

  const toggleCancel = async (item) => {
    setUpdatingId(item.id);
    setFeedback(null);
    try {
      const result = await apiRequest(`/api/faculty/me/events/${item.id}`, {
        method: 'PATCH',
        body: { isCancelled: !item.isCancelled },
      });
      await loadEvents();
      setFeedback({
        tone: 'success',
        msg: item.isCancelled
          ? 'Event restored.'
          : result.notifiedCount
            ? `Event canceled and ${result.notifiedCount} student${result.notifiedCount === 1 ? '' : 's'} notified.`
            : 'Event canceled.',
      });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to update') });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in-soft">
      <header className="space-y-1 pt-2">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Create workshops, advising sessions, and student-facing events.
        </p>
      </header>

      {/* ── Composer ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          {editingId ? 'Edit event' : 'Create an event'}
        </h2>
        <form onSubmit={submitEvent} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>Title</span>
            <Input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Midterm review session"
              required
            />
          </label>

          <label className="block space-y-2 text-sm font-medium">
            <span>Description</span>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Who it's for, what students should bring or expect."
              className="min-h-28 resize-none"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Date</span>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Time</span>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((c) => ({ ...c, time: e.target.value }))}
                required
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium">
            <span>Location</span>
            <Input
              value={form.location}
              onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
              placeholder="Engineering Hall 220"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="ACADEMIC">Academic</option>
                <option value="CAREER">Career</option>
                <option value="SOCIAL">Social</option>
                <option value="SPORTS">Sports</option>
                <option value="ARTS">Arts</option>
                <option value="CLUBS">Clubs</option>
                <option value="WELLNESS">Wellness</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Audience</span>
              <select
                value={form.audience}
                onChange={(e) => setForm((c) => ({ ...c, audience: e.target.value }))}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="ORGANIZATION">Organization</option>
                <option value="ALL_CAMPUS">All campus</option>
                {workspace?.canCreateDeadlineEvents || form.audience === 'DEADLINE' ? (
                  <option value="DEADLINE">Deadline</option>
                ) : null}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Max attendees</span>
              <Input
                type="number"
                min={1}
                value={form.maxAttendees}
                onChange={(e) => setForm((c) => ({ ...c, maxAttendees: e.target.value }))}
                placeholder="Optional"
              />
            </label>
          </div>

          {workspace?.availableBuildings?.length > 0 ? (
            <label className="block space-y-2 text-sm font-medium">
              <span>Building link</span>
              <select
                value={form.buildingId}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    buildingId: e.target.value,
                    location:
                      c.location ||
                      workspace?.availableBuildings?.find((b) => b.id === e.target.value)?.name ||
                      '',
                  }))
                }
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">No building link</option>
                {workspace.availableBuildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {editingId ? 'Save changes' : 'Publish event'}
                </>
              )}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Event List ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Your events</h2>

        <Feedback tone={feedback?.tone}>{feedback?.msg}</Feedback>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No events yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the form above to publish your first event.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {events.map((item) => (
              <div
                key={item.id}
                className={cn('px-4 py-4', item.isCancelled && 'opacity-60')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <Badge
                    variant={item.isCancelled ? 'outline' : 'default'}
                    className="rounded-full text-[11px]"
                  >
                    {item.isCancelled ? 'Canceled' : 'Published'}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {item.category}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {eventAudienceLabels[item.audience ?? 'ALL_CAMPUS']}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEventDate(item.date)} · {item.time} · {item.location}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => editEvent(item)}
                  >
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'rounded-xl',
                      !item.isCancelled && 'text-red-600 hover:text-red-600 dark:text-red-300',
                    )}
                    onClick={() => void toggleCancel(item)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id
                      ? 'Updating...'
                      : item.isCancelled
                        ? 'Restore'
                        : 'Cancel event'}
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
