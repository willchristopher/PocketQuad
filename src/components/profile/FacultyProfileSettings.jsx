'use client';

import Link from 'next/link';
import React from 'react';
import {
  Accessibility,
  ArrowLeft,
  BellRing,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Megaphone,
  Plus,
  Save,
} from 'lucide-react';

import { ApiClientError, apiRequest } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const emptyBuildingDraft = {
  operatingHours: '',
  operationalStatus: 'OPEN',
  operationalNote: '',
  accessibilityNotes: '',
};

const emptyAnnouncementDraft = {
  title: '',
  message: '',
  expiresAt: '',
};

const buildingStatusTone = {
  OPEN: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  LIMITED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

const eventCategories = [
  'ACADEMIC',
  'SOCIAL',
  'SPORTS',
  'ARTS',
  'CAREER',
  'CLUBS',
  'WELLNESS',
  'OTHER',
];

function toBuildingDraft(building) {
  if (!building) {
    return emptyBuildingDraft;
  }

  return {
    operatingHours: building.operatingHours ?? '',
    operationalStatus: building.operationalStatus,
    operationalNote: building.operationalNote ?? '',
    accessibilityNotes: building.accessibilityNotes ?? '',
  };
}

function toEventDraft(building) {
  return {
    title: '',
    description: '',
    date: '',
    time: '12:00',
    location: building ? `${building.name} · ${building.address}` : '',
    category: 'OTHER',
    maxAttendees: '',
  };
}

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function CollapsiblePanel({ title, description, summary, open, onToggle, children, className, contentClassName }) {
  return (
    <section className={cn('panel-card overflow-hidden rounded-[1.7rem]', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 md:px-6"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {summary ? <p className="mt-2 text-xs font-medium text-muted-foreground">{summary}</p> : null}
        </div>

        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open ? <div className={cn('border-t border-border/60 px-5 py-5 md:px-6', contentClassName)}>{children}</div> : null}
    </section>
  );
}

export function FacultyProfileSettings() {
  const [buildingData, setBuildingData] = React.useState(null);
  const [buildingsLoading, setBuildingsLoading] = React.useState(true);
  const [buildingSearch, setBuildingSearch] = React.useState('');
  const [selectedBuildingId, setSelectedBuildingId] = React.useState('');
  const [buildingDraft, setBuildingDraft] = React.useState(emptyBuildingDraft);
  const [announcementDraft, setAnnouncementDraft] = React.useState(emptyAnnouncementDraft);
  const [eventDraft, setEventDraft] = React.useState(toEventDraft(null));
  const [buildingError, setBuildingError] = React.useState(null);
  const [buildingSuccess, setBuildingSuccess] = React.useState(null);
  const [savingBuildingId, setSavingBuildingId] = React.useState(null);
  const [claimingBuildingId, setClaimingBuildingId] = React.useState(null);
  const [releasingBuildingId, setReleasingBuildingId] = React.useState(null);
  const [publishingBuildingId, setPublishingBuildingId] = React.useState(null);
  const [creatingEventBuildingId, setCreatingEventBuildingId] = React.useState(null);
  const [openSections, setOpenSections] = React.useState({
    availableBuildings: false,
    managedBuildings: true,
    buildingDetails: true,
    alerts: false,
    events: false,
  });

  const getErrorMessage = React.useCallback(
    (value, fallback) => (value instanceof ApiClientError ? value.message : fallback),
    [],
  );

  const loadBuildingManagement = React.useCallback(async () => {
    setBuildingsLoading(true);
    setBuildingError(null);

    try {
      const data = await apiRequest('/api/faculty/buildings');
      setBuildingData(data);
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to load building management'));
      setBuildingData({
        availableBuildings: [],
        managedBuildings: [],
      });
    } finally {
      setBuildingsLoading(false);
    }
  }, [getErrorMessage]);

  React.useEffect(() => {
    void loadBuildingManagement();
  }, [loadBuildingManagement]);

  React.useEffect(() => {
    if (!buildingData) {
      return;
    }

    const selectedStillManaged = buildingData.managedBuildings.some(
      (building) => building.id === selectedBuildingId,
    );

    if (!selectedStillManaged) {
      setSelectedBuildingId(buildingData.managedBuildings[0]?.id ?? '');
    }
  }, [buildingData, selectedBuildingId]);

  const selectedBuilding = React.useMemo(
    () => buildingData?.managedBuildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildingData, selectedBuildingId],
  );

  React.useEffect(() => {
    setBuildingDraft(toBuildingDraft(selectedBuilding));
    setAnnouncementDraft(emptyAnnouncementDraft);
    setEventDraft(toEventDraft(selectedBuilding));
  }, [selectedBuilding]);

  const toggleSection = React.useCallback((section) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  const filteredBuildings = React.useMemo(() => {
    const query = buildingSearch.trim().toLowerCase();

    if (!query) {
      return buildingData?.availableBuildings ?? [];
    }

    return (buildingData?.availableBuildings ?? []).filter((building) =>
      `${building.name} ${building.type} ${building.address}`.toLowerCase().includes(query),
    );
  }, [buildingData?.availableBuildings, buildingSearch]);

  const hasActiveBuildingSearch = buildingSearch.trim().length > 0;
  const showAvailableBuildings = openSections.availableBuildings || hasActiveBuildingSearch;
  const managedBuildings = buildingData?.managedBuildings ?? [];
  const availableBuildings = buildingData?.availableBuildings ?? [];

  const claimBuilding = async (buildingId) => {
    setClaimingBuildingId(buildingId);
    setBuildingError(null);
    setBuildingSuccess(null);

    try {
      await apiRequest('/api/faculty/buildings', {
        method: 'POST',
        body: { buildingId },
      });
      await loadBuildingManagement();
      setSelectedBuildingId(buildingId);
      setBuildingSuccess('Building manager access added');
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to add building manager access'));
    } finally {
      setClaimingBuildingId(null);
    }
  };

  const releaseBuilding = async (buildingId) => {
    setReleasingBuildingId(buildingId);
    setBuildingError(null);
    setBuildingSuccess(null);

    try {
      await apiRequest(`/api/faculty/buildings/${buildingId}`, {
        method: 'DELETE',
      });
      await loadBuildingManagement();
      setBuildingSuccess('Building manager access removed');
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to remove building manager access'));
    } finally {
      setReleasingBuildingId(null);
    }
  };

  const saveBuilding = async (event) => {
    event.preventDefault();

    if (!selectedBuilding) {
      return;
    }

    setSavingBuildingId(selectedBuilding.id);
    setBuildingError(null);
    setBuildingSuccess(null);

    try {
      const result = await apiRequest(`/api/faculty/buildings/${selectedBuilding.id}`, {
        method: 'PATCH',
        body: buildingDraft,
      });
      await loadBuildingManagement();
      setBuildingSuccess(
        result.notifiedCount > 0
          ? `Building status saved and ${result.notifiedCount} student${result.notifiedCount === 1 ? '' : 's'} notified`
          : 'Building status saved',
      );
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to save building status'));
    } finally {
      setSavingBuildingId(null);
    }
  };

  const publishBuildingAnnouncement = async (event) => {
    event.preventDefault();

    if (!selectedBuilding) {
      return;
    }

    setPublishingBuildingId(selectedBuilding.id);
    setBuildingError(null);
    setBuildingSuccess(null);

    try {
      const result = await apiRequest('/api/announcements', {
        method: 'POST',
        body: {
          title: announcementDraft.title,
          message: announcementDraft.message,
          scope: 'BUILDING',
          buildingId: selectedBuilding.id,
          expiresAt: announcementDraft.expiresAt || undefined,
        },
      });

      setAnnouncementDraft(emptyAnnouncementDraft);
      await loadBuildingManagement();
      setBuildingSuccess(
        result.notifiedCount > 0
          ? `Building alert published to ${result.notifiedCount} student${result.notifiedCount === 1 ? '' : 's'}`
          : 'Building alert published',
      );
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to publish building alert'));
    } finally {
      setPublishingBuildingId(null);
    }
  };

  const createBuildingEvent = async (event) => {
    event.preventDefault();

    if (!selectedBuilding) {
      return;
    }

    setCreatingEventBuildingId(selectedBuilding.id);
    setBuildingError(null);
    setBuildingSuccess(null);

    try {
      await apiRequest('/api/faculty/me/events', {
        method: 'POST',
        body: {
          title: eventDraft.title,
          description: eventDraft.description,
          date: eventDraft.date,
          time: eventDraft.time,
          location: eventDraft.location,
          category: eventDraft.category,
          maxAttendees: eventDraft.maxAttendees ? Number(eventDraft.maxAttendees) : undefined,
          buildingId: selectedBuilding.id,
        },
      });

      setEventDraft(toEventDraft(selectedBuilding));
      await loadBuildingManagement();
      setBuildingSuccess('Building event created');
    } catch (err) {
      setBuildingError(getErrorMessage(err, 'Unable to create building event'));
    } finally {
      setCreatingEventBuildingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <section className="hero-panel rounded-[2rem] px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              Building Management
            </Badge>
            <div className="max-w-3xl space-y-1.5">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">Manage your buildings</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Assign buildings, update live status, and publish building-specific alerts or events.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="rounded-2xl px-5">
            <Link href="/faculty/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
        </div>
      </section>

      {buildingError ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {buildingError}
        </p>
      ) : null}

      {buildingSuccess ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {buildingSuccess}
        </p>
      ) : null}

      <section className="panel-card overflow-hidden rounded-[1.7rem]">
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assignments</p>
              <h2 className="font-display text-2xl font-bold tracking-tight">Add yourself as a building manager</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Search for a building when you need one, or expand the full list only when you want to browse.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={buildingSearch}
                onChange={(event) => setBuildingSearch(event.target.value)}
                placeholder="Search buildings"
                className="sm:w-72"
              />
              <Button
                type="button"
                variant="outline"
                className="justify-between rounded-2xl px-4"
                onClick={() => toggleSection('availableBuildings')}
                aria-expanded={showAvailableBuildings}
              >
                {showAvailableBuildings ? 'Hide full list' : 'Browse all buildings'}
                <ChevronDown
                  className={cn(
                    'ml-2 h-4 w-4 shrink-0 transition-transform',
                    showAvailableBuildings && 'rotate-180',
                  )}
                />
              </Button>
            </div>
          </div>

          {!showAvailableBuildings && !buildingsLoading ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              Search stays available here. Expand the list if you want to browse all {availableBuildings.length}{' '}
              building{availableBuildings.length === 1 ? '' : 's'}.
            </div>
          ) : null}
        </div>

        {buildingsLoading ? (
          <div className="border-t border-border/60 px-5 py-4 md:px-6">
            <p className="text-sm text-muted-foreground">Loading building access...</p>
          </div>
        ) : null}

        {!buildingsLoading && showAvailableBuildings ? (
          <div className="border-t border-border/60 px-5 py-5 md:px-6">
            {filteredBuildings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No buildings matched that search.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredBuildings.map((building) => (
                  <article key={building.id} className="rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {building.type}
                        </p>
                        <h3 className="mt-1 font-semibold">{building.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{building.address}</p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] uppercase',
                          buildingStatusTone[building.operationalStatus],
                        )}
                      >
                        {building.operationalStatus}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {building.isManaged ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setSelectedBuildingId(building.id)}
                          >
                            Manage
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => void releaseBuilding(building.id)}
                            disabled={releasingBuildingId === building.id}
                          >
                            {releasingBuildingId === building.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => void claimBuilding(building.id)}
                          disabled={claimingBuildingId === building.id}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          {claimingBuildingId === building.id ? 'Adding...' : 'Add manager access'}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {!selectedBuilding ? (
        <section className="panel-card rounded-[1.7rem] border-dashed p-8 text-center text-sm text-muted-foreground">
          Add a building above to open its controls.
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside>
            <CollapsiblePanel
              title="Managed buildings"
              description="Switch between the buildings you already manage."
              summary={`${managedBuildings.length} building${managedBuildings.length === 1 ? '' : 's'} assigned`}
              open={openSections.managedBuildings}
              onToggle={() => toggleSection('managedBuildings')}
              contentClassName="space-y-3"
            >
              {managedBuildings.map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => setSelectedBuildingId(building.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition-colors',
                    selectedBuildingId === building.id
                      ? 'border-primary/30 bg-secondary'
                      : 'border-border/60 bg-card hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {building.type}
                      </p>
                      <p className="mt-1 font-semibold">{building.name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] uppercase',
                        buildingStatusTone[building.operationalStatus],
                      )}
                    >
                      {building.operationalStatus}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{building.address}</p>
                </button>
              ))}
            </CollapsiblePanel>
          </aside>

          <div className="space-y-6">
            <section className="panel-card rounded-[1.7rem] p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Managed building
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{selectedBuilding.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedBuilding.type} • {selectedBuilding.address}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]',
                    buildingStatusTone[selectedBuilding.operationalStatus],
                  )}
                >
                  {selectedBuilding.operationalStatus}
                </Badge>
              </div>
            </section>

            <CollapsiblePanel
              title="Availability and accessibility"
              description="Update the live hours, status, and accessibility details students see."
              summary={
                selectedBuilding.operationalUpdatedAt
                  ? `Last updated ${formatTimestamp(selectedBuilding.operationalUpdatedAt)}`
                  : 'No live status update posted yet'
              }
              open={openSections.buildingDetails}
              onToggle={() => toggleSection('buildingDetails')}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <form onSubmit={saveBuilding} className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Edit building details</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        These values drive building lookup and the assistant&apos;s availability answers.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Operating hours</span>
                      <Input
                        value={buildingDraft.operatingHours}
                        onChange={(event) =>
                          setBuildingDraft((current) => ({ ...current, operatingHours: event.target.value }))
                        }
                        placeholder="Mon-Fri 7:00 AM - 9:00 PM"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Status</span>
                      <select
                        value={buildingDraft.operationalStatus}
                        onChange={(event) =>
                          setBuildingDraft((current) => ({
                            ...current,
                            operationalStatus: event.target.value,
                          }))
                        }
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
                        value={buildingDraft.operationalNote}
                        onChange={(event) =>
                          setBuildingDraft((current) => ({ ...current, operationalNote: event.target.value }))
                        }
                        placeholder="Elevator maintenance on east side"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Accessibility notes</span>
                      <Textarea
                        value={buildingDraft.accessibilityNotes}
                        onChange={(event) =>
                          setBuildingDraft((current) => ({ ...current, accessibilityNotes: event.target.value }))
                        }
                        placeholder="Automatic doors active at north entrance. Ramp access temporarily rerouted through the plaza entrance."
                        className="min-h-32 resize-none"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      className="rounded-2xl px-5"
                      disabled={savingBuildingId === selectedBuilding.id}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {savingBuildingId === selectedBuilding.id ? 'Saving...' : 'Save building details'}
                    </Button>
                  </div>
                </form>

                <section className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Accessibility className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Current building signal</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The live snapshot students and the chatbot read for this building.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{selectedBuilding.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedBuilding.address}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]',
                          buildingStatusTone[selectedBuilding.operationalStatus],
                        )}
                      >
                        {selectedBuilding.operationalStatus}
                      </Badge>
                    </div>

                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{selectedBuilding.operatingHours || 'No operating hours posted yet.'}</span>
                    </p>
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{selectedBuilding.operationalNote || 'No operational note posted.'}</span>
                    </p>
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Accessibility className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{selectedBuilding.accessibilityNotes || 'No accessibility guidance posted.'}</span>
                    </p>
                  </div>
                </section>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Building alerts"
              description="Publish time-sensitive notices and review the alerts currently live on this building."
              summary={`${selectedBuilding.announcements.length} active alert${selectedBuilding.announcements.length === 1 ? '' : 's'}`}
              open={openSections.alerts}
              onToggle={() => toggleSection('alerts')}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <form onSubmit={publishBuildingAnnouncement} className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Publish a building alert</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add an expiration for short-term disruptions so the notice clears itself automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="space-y-2 text-sm font-medium">
                      <span>Title</span>
                      <Input
                        value={announcementDraft.title}
                        onChange={(event) =>
                          setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Student Union closed early"
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Message</span>
                      <Textarea
                        value={announcementDraft.message}
                        onChange={(event) =>
                          setAnnouncementDraft((current) => ({ ...current, message: event.target.value }))
                        }
                        placeholder="The building will close at 3 PM today due to a water main repair."
                        className="min-h-28 resize-none"
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Ends at (optional)</span>
                      <Input
                        type="datetime-local"
                        value={announcementDraft.expiresAt}
                        onChange={(event) =>
                          setAnnouncementDraft((current) => ({ ...current, expiresAt: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="mt-5 w-full rounded-2xl"
                    disabled={publishingBuildingId === selectedBuilding.id}
                  >
                    {publishingBuildingId === selectedBuilding.id ? 'Publishing...' : 'Publish building alert'}
                  </Button>
                </form>

                <section className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold tracking-tight">Active alerts</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Alerts currently visible on student building cards.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedBuilding.announcements.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active alerts for this building.</p>
                    ) : (
                      selectedBuilding.announcements.map((announcement) => (
                        <div key={announcement.id} className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                          <p className="font-semibold">{announcement.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Posted {formatTimestamp(announcement.createdAt)}
                            {announcement.expiresAt ? ` • Ends ${formatTimestamp(announcement.expiresAt)}` : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              title="Building events"
              description="Create an event for this building and keep upcoming activity tucked away until you need it."
              summary={`${selectedBuilding.upcomingEvents.length} upcoming event${selectedBuilding.upcomingEvents.length === 1 ? '' : 's'}`}
              open={openSections.events}
              onToggle={() => toggleSection('events')}
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <form onSubmit={createBuildingEvent} className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-tight">Create building event</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tie the event to this building so student lookup and assistant responses can reference it directly.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Event title</span>
                      <Input
                        value={eventDraft.title}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Accessibility open house"
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Description</span>
                      <Textarea
                        value={eventDraft.description}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Walkthrough for students to learn about updated entrances, elevators, and support desks."
                        className="min-h-24 resize-none"
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Date</span>
                      <Input
                        type="date"
                        value={eventDraft.date}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, date: event.target.value }))
                        }
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Time</span>
                      <Input
                        type="time"
                        value={eventDraft.time}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, time: event.target.value }))
                        }
                        required
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Category</span>
                      <select
                        value={eventDraft.category}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, category: event.target.value }))
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      >
                        {eventCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm font-medium">
                      <span>Max attendees (optional)</span>
                      <Input
                        type="number"
                        min={1}
                        value={eventDraft.maxAttendees}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, maxAttendees: event.target.value }))
                        }
                        placeholder="75"
                      />
                    </label>

                    <label className="space-y-2 text-sm font-medium md:col-span-2">
                      <span>Location</span>
                      <Input
                        value={eventDraft.location}
                        onChange={(event) =>
                          setEventDraft((current) => ({ ...current, location: event.target.value }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="mt-5 w-full rounded-2xl"
                    disabled={creatingEventBuildingId === selectedBuilding.id}
                  >
                    {creatingEventBuildingId === selectedBuilding.id ? 'Creating...' : 'Create building event'}
                  </Button>
                </form>

                <section className="rounded-[1.45rem] border border-border/60 bg-card p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold tracking-tight">Upcoming events</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Events tied to this building that show up on student calendars.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedBuilding.upcomingEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming building events yet.</p>
                    ) : (
                      selectedBuilding.upcomingEvents.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                          <p className="font-semibold">{event.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatTimestamp(event.date)} • {event.time} • {event.category}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </CollapsiblePanel>
          </div>
        </div>
      )}
    </div>
  );
}
