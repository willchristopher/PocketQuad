'use client';

import React from 'react';
import {
  Accessibility,
  Building2,
  ChevronDown,
  Clock3,
  Loader2,
  MapPin,
  Plus,
  Save,
} from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { BuildingHoursEditor } from '@/components/buildings/BuildingHoursEditor';
import { hasMeaningfulBuildingHoursSchedule, summarizeBuildingHoursSchedule } from '@/lib/buildingHours';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const emptyDraft = {
  operatingHours: '',
  operatingHoursSchedule: null,
  operationalStatus: 'OPEN',
  operationalNote: '',
  accessibilityNotes: '',
};

const statusTone = {
  OPEN: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LIMITED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

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

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function FacultyBuildings({ initialData = null }) {
  const [data, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(!initialData);
  const [search, setSearch] = React.useState('');
  const [showAll, setShowAll] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState('');
  const [draft, setDraft] = React.useState(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [claiming, setClaiming] = React.useState(null);
  const [releasing, setReleasing] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiRequest('/api/faculty/buildings'));
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to load buildings') });
      setData({ availableBuildings: [], managedBuildings: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialData) {
      return;
    }

    void loadData();
  }, [initialData, loadData]);

  React.useEffect(() => {
    if (!data) return;
    const stillManaged = data.managedBuildings.some((b) => b.id === selectedId);
    if (!stillManaged) setSelectedId(data.managedBuildings[0]?.id ?? '');
  }, [data, selectedId]);

  const selected = React.useMemo(
    () => data?.managedBuildings.find((b) => b.id === selectedId) ?? null,
    [data, selectedId],
  );

  React.useEffect(() => {
    if (!selected) {
      setDraft(emptyDraft);
      return;
    }
    setDraft({
      operatingHours: selected.operatingHours ?? '',
      operatingHoursSchedule: selected.operatingHoursSchedule ?? null,
      operationalStatus: selected.operationalStatus,
      operationalNote: selected.operationalNote ?? '',
      accessibilityNotes: selected.accessibilityNotes ?? '',
    });
  }, [selected]);

  const managed = data?.managedBuildings ?? [];
  const showAvailable = showAll || search.trim().length > 0;

  const filtered = React.useMemo(() => {
    const available = data?.availableBuildings ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((b) =>
      `${b.name} ${b.type} ${b.address}`.toLowerCase().includes(q),
    );
  }, [data?.availableBuildings, search]);

  const claim = async (id) => {
    setClaiming(id);
    setFeedback(null);
    try {
      await apiRequest('/api/faculty/buildings', { method: 'POST', body: { buildingId: id } });
      await loadData();
      setSelectedId(id);
      setFeedback({ tone: 'success', msg: 'Building manager access added.' });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to claim') });
    } finally {
      setClaiming(null);
    }
  };

  const release = async (id) => {
    setReleasing(id);
    setFeedback(null);
    try {
      await apiRequest(`/api/faculty/buildings/${id}`, { method: 'DELETE' });
      await loadData();
      setFeedback({ tone: 'success', msg: 'Building manager access removed.' });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to release') });
    } finally {
      setReleasing(null);
    }
  };

  const saveBuilding = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await apiRequest(`/api/faculty/buildings/${selected.id}`, {
        method: 'PATCH',
        body: draft,
      });
      await loadData();
      setFeedback({
        tone: 'success',
        msg:
          result.notifiedCount > 0
            ? `Saved and notified ${result.notifiedCount} student${result.notifiedCount === 1 ? '' : 's'}.`
            : 'Building status saved.',
      });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to save') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in-soft">
      <header className="space-y-1 pt-2">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight">
          Building Status
        </h1>
        <p className="text-sm text-muted-foreground">
          Update hours, operational status, and accessibility notes for your buildings.
        </p>
      </header>

      <Feedback tone={feedback?.tone}>{feedback?.msg}</Feedback>

      {/* ── Managed Buildings ──────────────────────────────── */}
      {managed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Your buildings
          </h2>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {managed.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors',
                  selectedId === b.id
                    ? 'bg-primary/5'
                    : 'hover:bg-muted/30',
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.type} · {b.address}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 rounded-full border text-[10px] uppercase',
                    statusTone[b.operationalStatus],
                  )}
                >
                  {b.operationalStatus}
                </Badge>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Editor ─────────────────────────────────────────── */}
      {selected ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Edit: {selected.name}
            </h2>
            <Badge
              variant="outline"
              className={cn('rounded-full border text-[10px] uppercase', statusTone[selected.operationalStatus])}
            >
              {selected.operationalStatus}
            </Badge>
          </div>

          <form onSubmit={saveBuilding} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>
                {hasMeaningfulBuildingHoursSchedule(draft.operatingHoursSchedule)
                  ? 'Hours summary'
                  : 'Hours summary / fallback'}
              </span>
              <Input
                value={
                  hasMeaningfulBuildingHoursSchedule(draft.operatingHoursSchedule)
                    ? summarizeBuildingHoursSchedule(draft.operatingHoursSchedule, draft.operatingHours) ?? ''
                    : draft.operatingHours
                }
                onChange={(e) => setDraft((c) => ({ ...c, operatingHours: e.target.value }))}
                placeholder="Mon-Fri 7:00 AM – 9:00 PM"
                readOnly={hasMeaningfulBuildingHoursSchedule(draft.operatingHoursSchedule)}
              />
            </label>

            <BuildingHoursEditor
              value={draft.operatingHoursSchedule}
              fallbackSummary={draft.operatingHours}
              onChange={(operatingHoursSchedule) =>
                setDraft((current) => ({ ...current, operatingHoursSchedule }))
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Status</span>
                <select
                  value={draft.operationalStatus}
                  onChange={(e) => setDraft((c) => ({ ...c, operationalStatus: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="OPEN">Open</option>
                  <option value="LIMITED">Limited</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Operational note</span>
                <Input
                  value={draft.operationalNote}
                  onChange={(e) => setDraft((c) => ({ ...c, operationalNote: e.target.value }))}
                  placeholder="Elevator maintenance on east side"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm font-medium">
              <span>Accessibility notes</span>
              <Textarea
                value={draft.accessibilityNotes}
                onChange={(e) => setDraft((c) => ({ ...c, accessibilityNotes: e.target.value }))}
                placeholder="Automatic doors active at north entrance."
                className="min-h-28 resize-none"
              />
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save building status
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-red-600 hover:text-red-600 dark:text-red-300"
                onClick={() => void release(selected.id)}
                disabled={releasing === selected.id}
              >
                {releasing === selected.id ? 'Removing...' : 'Remove building'}
              </Button>
            </div>
          </form>

          {/* Live preview */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Student preview
            </p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              {hasMeaningfulBuildingHoursSchedule(draft.operatingHoursSchedule)
                ? summarizeBuildingHoursSchedule(draft.operatingHoursSchedule, draft.operatingHours)
                : draft.operatingHours || 'No operating hours posted.'}
            </p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {draft.operationalNote || 'No operational note.'}
            </p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Accessibility className="mt-0.5 h-4 w-4 shrink-0" />
              {draft.accessibilityNotes || 'No accessibility guidance.'}
            </p>
          </div>
        </section>
      ) : !loading ? (
        <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center">
          <Building2 className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No buildings assigned</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a building below to start managing it.
          </p>
        </div>
      ) : null}

      <div className="h-px bg-border/60" />

      {/* ── Add Buildings ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Add a building
          </h2>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAvailable ? 'Hide list' : 'Browse all'}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showAvailable && 'rotate-180')}
            />
          </button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buildings..."
        />

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
        ) : showAvailable ? (
          filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No buildings matched that search.
            </p>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border/60">
              {filtered.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.type} · {b.address}
                    </p>
                  </div>
                  {b.isManaged ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      onClick={() => setSelectedId(b.id)}
                    >
                      Manage
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 rounded-xl"
                      onClick={() => void claim(b.id)}
                      disabled={claiming === b.id}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {claiming === b.id ? 'Adding...' : 'Add'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Search or browse to find buildings. {(data?.availableBuildings?.length ?? 0)} building{(data?.availableBuildings?.length ?? 0) === 1 ? '' : 's'} available.
          </p>
        )}
      </section>
    </div>
  );
}
