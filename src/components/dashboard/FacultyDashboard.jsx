'use client';

import React from 'react';
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  PencilLine,
  Phone,
  Save,
  Send,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  X,
} from 'lucide-react';

import { ApiClientError, apiRequest } from '@/lib/api/client';
import {
  formatFacultyAvailability,
  formatFacultySlotLabel,
  getStudentFacingFacultyAvailabilityTone,
} from '@/lib/faculty';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const availabilityOptions = [
  {
    value: 'AVAILABLE',
    label: 'Available',
    description: 'Students can expect normal office-hours access.',
  },
  {
    value: 'LIMITED',
    label: 'Limited',
    description: 'Use this when responses or drop-ins will be slower than usual.',
  },
  {
    value: 'AWAY',
    label: 'Away',
    description: 'Mark yourself away when students should not expect immediate availability.',
  },
];

const modeLabels = {
  IN_PERSON: 'In person',
  VIRTUAL: 'Virtual',
  HYBRID: 'Hybrid',
};

const toneClasses = {
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  slate: 'border-border/70 bg-muted/30 text-muted-foreground',
};

const defaultOfficeHourForm = {
  dayOfWeek: 1,
  startTime: '10:00',
  endTime: '11:00',
  location: '',
  mode: 'IN_PERSON',
  maxQueue: 20,
};

const defaultAnnouncementForm = {
  title: '',
  message: '',
  linkUrl: '',
  scope: 'CAMPUS',
  targetId: '',
};

const defaultStatusState = {
  status: 'AVAILABLE',
  note: '',
  display: 'Available',
};

const defaultProfileDraft = {
  displayName: '',
  title: '',
  department: '',
  officeLocation: '',
  phone: '',
  bio: '',
  tags: [],
};

const defaultEventForm = {
  title: '',
  description: '',
  date: '',
  time: '12:00',
  location: '',
  category: 'OTHER',
  maxAttendees: '',
  buildingId: '',
};

const scopeLabels = {
  CAMPUS: 'Whole campus',
  BUILDING: 'Building update',
  SERVICE: 'Service update',
};

function getErrorMessage(error, fallback) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function formatTo12Hour(time24) {
  const [hoursRaw, minutes] = time24.split(':').map(Number);
  const isPm = hoursRaw >= 12;
  const hours = hoursRaw % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}

function toDateInput(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInput(value) {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return '12:00';
  }

  const [, rawHours, minutes, period] = match;
  let hours = Number(rawHours);

  if (period.toUpperCase() === 'AM') {
    if (hours === 12) {
      hours = 0;
    }
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function formatAnnouncementTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getEventSuccessMessage(label, notifiedCount) {
  if (!notifiedCount) {
    return label;
  }

  return `${label} and notified ${notifiedCount} student${notifiedCount === 1 ? '' : 's'}.`;
}

function WorkspaceCard({ title, description, icon: Icon, iconClassName, children, headerAction }) {
  return (
    <section className="rounded-[26px] border border-border/60 bg-card p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

function FeedbackMessage({ tone = 'success', children }) {
  if (!children) {
    return null;
  }

  return (
    <p
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm font-medium',
        tone === 'success'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
      )}
    >
      {children}
    </p>
  );
}

export function FacultyDashboard() {
  const [workspace, setWorkspace] = React.useState(null);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(true);
  const [workspaceError, setWorkspaceError] = React.useState(null);

  const [profileDraft, setProfileDraft] = React.useState(defaultProfileDraft);
  const [tagInput, setTagInput] = React.useState('');
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileError, setProfileError] = React.useState(null);
  const [profileSuccess, setProfileSuccess] = React.useState(null);

  const [officeHours, setOfficeHours] = React.useState([]);
  const [officeHoursLoading, setOfficeHoursLoading] = React.useState(true);
  const [officeHoursError, setOfficeHoursError] = React.useState(null);
  const [officeHourForm, setOfficeHourForm] = React.useState(defaultOfficeHourForm);
  const [editingOfficeHourId, setEditingOfficeHourId] = React.useState(null);
  const [savingOfficeHour, setSavingOfficeHour] = React.useState(false);

  const [statusState, setStatusState] = React.useState(defaultStatusState);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusError, setStatusError] = React.useState(null);
  const [statusSuccess, setStatusSuccess] = React.useState(null);

  const [facultyEvents, setFacultyEvents] = React.useState([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState(null);
  const [eventSuccess, setEventSuccess] = React.useState(null);
  const [eventForm, setEventForm] = React.useState(defaultEventForm);
  const [editingEventId, setEditingEventId] = React.useState(null);
  const [savingEvent, setSavingEvent] = React.useState(false);
  const [updatingEventId, setUpdatingEventId] = React.useState(null);

  const [announcementState, setAnnouncementState] = React.useState(null);
  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true);
  const [announcementForm, setAnnouncementForm] = React.useState(defaultAnnouncementForm);
  const [announcementSaving, setAnnouncementSaving] = React.useState(false);
  const [announcementError, setAnnouncementError] = React.useState(null);
  const [announcementSuccess, setAnnouncementSuccess] = React.useState(null);

  const loadWorkspace = React.useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const result = await apiRequest('/api/faculty/me');
      setWorkspace(result);
    } catch (error) {
      setWorkspace(null);
      setWorkspaceError(getErrorMessage(error, 'Unable to load faculty workspace'));
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const loadOfficeHours = React.useCallback(async () => {
    setOfficeHoursLoading(true);
    setOfficeHoursError(null);

    try {
      const result = await apiRequest('/api/office-hours');
      setOfficeHours(result);
    } catch (error) {
      setOfficeHours([]);
      setOfficeHoursError(getErrorMessage(error, 'Unable to load office hours'));
    } finally {
      setOfficeHoursLoading(false);
    }
  }, []);

  const loadStatus = React.useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);

    try {
      const result = await apiRequest('/api/faculty/me/status');
      setStatusState(result);
    } catch (error) {
      setStatusState(defaultStatusState);
      setStatusError(getErrorMessage(error, 'Unable to load availability status'));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadEvents = React.useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);

    try {
      const result = await apiRequest('/api/faculty/me/events');
      setFacultyEvents(result);
    } catch (error) {
      setFacultyEvents([]);
      setEventsError(getErrorMessage(error, 'Unable to load your events'));
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadAnnouncements = React.useCallback(async () => {
    setAnnouncementsLoading(true);
    setAnnouncementError(null);

    try {
      const result = await apiRequest('/api/announcements');
      setAnnouncementState(result);
      setAnnouncementForm((current) => {
        const nextScope = current.scope === 'CAMPUS' && !result.permissions.canPublishCampus
          ? result.permissions.canPublishBuildings
            ? 'BUILDING'
            : result.permissions.canPublishServices
              ? 'SERVICE'
              : 'CAMPUS'
          : current.scope;

        return {
          ...current,
          scope: nextScope,
          targetId: nextScope === 'BUILDING'
            ? current.targetId || result.availableBuildings[0]?.id || ''
            : nextScope === 'SERVICE'
              ? current.targetId || result.availableServices[0]?.id || ''
              : '',
        };
      });
    } catch (error) {
      setAnnouncementState(null);
      setAnnouncementError(getErrorMessage(error, 'Unable to load announcement tools'));
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void Promise.all([
      loadWorkspace(),
      loadOfficeHours(),
      loadStatus(),
      loadEvents(),
      loadAnnouncements(),
    ]);
  }, [loadAnnouncements, loadEvents, loadOfficeHours, loadStatus, loadWorkspace]);

  React.useEffect(() => {
    if (!workspace) {
      return;
    }

    setProfileDraft({
      displayName: workspace.name ?? '',
      title: workspace.title ?? '',
      department: workspace.department ?? '',
      officeLocation: workspace.officeLocation ?? '',
      phone: workspace.phone ?? '',
      bio: workspace.bio ?? '',
      tags: workspace.tags ?? [],
    });
  }, [workspace]);

  const announcementPermissions = announcementState?.permissions;
  const currentTargets = React.useMemo(() => {
    if (announcementForm.scope === 'BUILDING') {
      return announcementState?.availableBuildings ?? [];
    }

    if (announcementForm.scope === 'SERVICE') {
      return announcementState?.availableServices ?? [];
    }

    return [];
  }, [announcementForm.scope, announcementState?.availableBuildings, announcementState?.availableServices]);

  React.useEffect(() => {
    if (announcementForm.scope === 'BUILDING' && currentTargets.length > 0 && !currentTargets.some((item) => item.id === announcementForm.targetId)) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: currentTargets[0]?.id ?? '',
      }));
    }

    if (announcementForm.scope === 'SERVICE' && currentTargets.length > 0 && !currentTargets.some((item) => item.id === announcementForm.targetId)) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: currentTargets[0]?.id ?? '',
      }));
    }

    if (announcementForm.scope === 'CAMPUS' && announcementForm.targetId) {
      setAnnouncementForm((current) => ({
        ...current,
        targetId: '',
      }));
    }
  }, [announcementForm.scope, announcementForm.targetId, currentTargets]);

  const activeSlots = officeHours.filter((slot) => slot.isActive).length;
  const upcomingEventsCount = facultyEvents.filter((event) => !event.isCancelled).length;
  const totalAnnouncementAccess = (announcementPermissions?.canPublishCampus ? 1 : 0)
    + (announcementPermissions?.canPublishBuildings ? 1 : 0)
    + (announcementPermissions?.canPublishServices ? 1 : 0);
  const availabilityTone = toneClasses[getStudentFacingFacultyAvailabilityTone(workspace?.studentAvailabilityState ?? 'TBD')];

  const resetOfficeHourForm = () => {
    setOfficeHourForm(defaultOfficeHourForm);
    setEditingOfficeHourId(null);
  };

  const resetEventForm = React.useCallback(() => {
    setEventForm(defaultEventForm);
    setEditingEventId(null);
  }, []);

  const addTag = React.useCallback(() => {
    const nextTag = tagInput.trim().replace(/\s+/g, ' ');

    if (!nextTag) {
      return;
    }

    setProfileDraft((current) => {
      if (current.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase()) || current.tags.length >= 12) {
        return current;
      }

      return {
        ...current,
        tags: [...current.tags, nextTag],
      };
    });
    setTagInput('');
  }, [tagInput]);

  const removeTag = (tagToRemove) => {
    setProfileDraft((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await apiRequest('/api/faculty/me', {
        method: 'PATCH',
        body: profileDraft,
      });

      await loadWorkspace();
      setProfileSuccess('Faculty contact information saved.');
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Unable to save faculty details'));
    } finally {
      setProfileSaving(false);
    }
  };

  const onSubmitOfficeHour = async (event) => {
    event.preventDefault();
    setSavingOfficeHour(true);
    setOfficeHoursError(null);

    try {
      const payload = {
        ...officeHourForm,
        maxQueue: Number(officeHourForm.maxQueue),
      };

      if (editingOfficeHourId) {
        await apiRequest(`/api/office-hours/${editingOfficeHourId}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await apiRequest('/api/office-hours', {
          method: 'POST',
          body: payload,
        });
      }

      resetOfficeHourForm();
      await Promise.all([loadOfficeHours(), loadWorkspace()]);
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to save office hour'));
    } finally {
      setSavingOfficeHour(false);
    }
  };

  const onEditOfficeHour = (slot) => {
    setEditingOfficeHourId(slot.id);
    setOfficeHourForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      mode: slot.mode,
      maxQueue: slot.maxQueue,
    });
  };

  const onDeleteOfficeHour = async (slotId) => {
    setOfficeHoursError(null);

    try {
      await apiRequest(`/api/office-hours/${slotId}`, { method: 'DELETE' });

      if (editingOfficeHourId === slotId) {
        resetOfficeHourForm();
      }

      await Promise.all([loadOfficeHours(), loadWorkspace()]);
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to delete office hour'));
    }
  };

  const onToggleOfficeHour = async (slotId) => {
    setOfficeHoursError(null);

    try {
      const updated = await apiRequest(`/api/office-hours/${slotId}/toggle`, {
        method: 'PATCH',
      });

      setOfficeHours((current) => current.map((slot) => (slot.id === slotId ? updated : slot)));
    } catch (error) {
      setOfficeHoursError(getErrorMessage(error, 'Unable to update office hour status'));
    }
  };

  const onSubmitStatus = async (event) => {
    event.preventDefault();
    setStatusSaving(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const updated = await apiRequest('/api/faculty/me/status', {
        method: 'PATCH',
        body: {
          status: statusState.status,
          note: statusState.note.trim() || undefined,
        },
      });

      setStatusState(updated);
      setStatusSuccess('Availability saved.');
      await loadWorkspace();
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Unable to save availability'));
    } finally {
      setStatusSaving(false);
    }
  };

  const onEditEvent = (eventItem) => {
    setEditingEventId(eventItem.id);
    setEventSuccess(null);
    setEventsError(null);
    setEventForm({
      title: eventItem.title,
      description: eventItem.description,
      date: toDateInput(eventItem.date),
      time: toTimeInput(eventItem.time),
      location: eventItem.location,
      category: eventItem.category,
      maxAttendees: eventItem.maxAttendees ? String(eventItem.maxAttendees) : '',
      buildingId: eventItem.buildingId ?? '',
    });
  };

  const onSubmitEvent = async (event) => {
    event.preventDefault();
    setSavingEvent(true);
    setEventsError(null);
    setEventSuccess(null);

    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        time: eventForm.time,
        location: eventForm.location,
        category: eventForm.category,
        maxAttendees: eventForm.maxAttendees ? Number(eventForm.maxAttendees) : editingEventId ? null : undefined,
        buildingId: eventForm.buildingId || (editingEventId ? null : undefined),
      };

      const result = editingEventId
        ? await apiRequest(`/api/faculty/me/events/${editingEventId}`, {
          method: 'PATCH',
          body: payload,
        })
        : await apiRequest('/api/faculty/me/events', {
          method: 'POST',
          body: payload,
        });

      resetEventForm();
      await loadEvents();
      setEventSuccess(getEventSuccessMessage(editingEventId ? 'Event updated' : 'Event published', result.notifiedCount));
    } catch (error) {
      setEventsError(getErrorMessage(error, 'Unable to save event'));
    } finally {
      setSavingEvent(false);
    }
  };

  const onToggleCancelEvent = async (eventItem) => {
    setUpdatingEventId(eventItem.id);
    setEventsError(null);
    setEventSuccess(null);

    try {
      const result = await apiRequest(`/api/faculty/me/events/${eventItem.id}`, {
        method: 'PATCH',
        body: {
          isCancelled: !eventItem.isCancelled,
        },
      });

      await loadEvents();
      setEventSuccess(
        eventItem.isCancelled
          ? 'Event restored.'
          : getEventSuccessMessage('Event canceled', result.notifiedCount),
      );
    } catch (error) {
      setEventsError(getErrorMessage(error, 'Unable to update event status'));
    } finally {
      setUpdatingEventId(null);
    }
  };

  const onSubmitAnnouncement = async (event) => {
    event.preventDefault();
    setAnnouncementSaving(true);
    setAnnouncementError(null);
    setAnnouncementSuccess(null);

    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: {
          title: announcementForm.title,
          message: announcementForm.message,
          linkUrl: announcementForm.linkUrl.trim() || undefined,
          scope: announcementForm.scope,
          buildingId: announcementForm.scope === 'BUILDING' ? announcementForm.targetId : undefined,
          serviceId: announcementForm.scope === 'SERVICE' ? announcementForm.targetId : undefined,
        },
      });

      setAnnouncementForm((current) => ({
        ...current,
        title: '',
        message: '',
        linkUrl: '',
      }));
      setAnnouncementSuccess('Announcement published.');
      await loadAnnouncements();
    } catch (error) {
      setAnnouncementError(getErrorMessage(error, 'Unable to publish announcement'));
    } finally {
      setAnnouncementSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-card px-6 py-6 md:px-8 md:py-8 animate-in-up">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-6 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
                Faculty Workspace
              </Badge>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                  {workspaceLoading ? 'Loading your workspace...' : `Manage ${workspace?.name ?? 'your faculty workspace'}`}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Keep contact details current, publish clean office hours, and manage student-facing events from one calm dashboard.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs">
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                  {workspace?.officeLocation ?? 'No office location'}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-xs">
                  <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                  {workspace?.officeHours ?? 'No office hours posted'}
                </Badge>
                <Badge className={cn('rounded-full border px-3 py-1.5 text-xs', availabilityTone)}>
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  {workspace?.studentAvailabilityLabel ?? 'Availability unavailable'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Availability</p>
                <p className="mt-2 text-sm font-semibold">
                  {statusLoading ? 'Loading...' : formatFacultyAvailability(statusState.status, statusState.note)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Office hours</p>
                <p className="mt-2 text-lg font-semibold">{officeHours.length}</p>
                <p className="text-sm text-muted-foreground">{activeSlots} live slot{activeSlots === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Events</p>
                <p className="mt-2 text-lg font-semibold">{upcomingEventsCount}</p>
                <p className="text-sm text-muted-foreground">Active student-facing event{upcomingEventsCount === 1 ? '' : 's'}</p>
              </div>
            </div>
          </div>

          <FeedbackMessage tone="error">{workspaceError}</FeedbackMessage>
        </div>
      </section>

      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="grid h-auto grid-cols-2 rounded-[24px] border border-border/60 bg-card p-1 md:grid-cols-4">
          <TabsTrigger value="contact" className="rounded-2xl px-4 py-3">Contact</TabsTrigger>
          <TabsTrigger value="office-hours" className="rounded-2xl px-4 py-3">Office Hours</TabsTrigger>
          <TabsTrigger value="events" className="rounded-2xl px-4 py-3">Events</TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-2xl px-4 py-3">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="contact" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <form onSubmit={onSaveProfile} className="space-y-6">
              <WorkspaceCard
                title="Student-facing details"
                description="These details power the faculty directory card and the student profile view."
                icon={UserRound}
                iconClassName="bg-primary/10 text-primary"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Name</span>
                    <Input value={profileDraft.displayName} onChange={(event) => setProfileDraft((current) => ({ ...current, displayName: event.target.value }))} placeholder="Dr. Maya Thompson" required />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Title</span>
                    <Input value={profileDraft.title} onChange={(event) => setProfileDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Associate Professor" required />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Department</span>
                    <Input value={profileDraft.department} onChange={(event) => setProfileDraft((current) => ({ ...current, department: event.target.value }))} placeholder="Computer Science" required />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Office location</span>
                    <Input value={profileDraft.officeLocation} onChange={(event) => setProfileDraft((current) => ({ ...current, officeLocation: event.target.value }))} placeholder="Engineering Hall 314" required />
                  </label>
                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Phone</span>
                    <Input value={profileDraft.phone} onChange={(event) => setProfileDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 555-0148" />
                  </label>
                  <label className="space-y-2 text-sm font-medium md:col-span-2">
                    <span>Short bio</span>
                    <Textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Share what kinds of questions or projects students should come to you for." className="min-h-36 resize-none" />
                  </label>
                </div>
              </WorkspaceCard>

              <WorkspaceCard
                title="Routing tags"
                description="Tags help students and the AI assistant route office-hour and advising requests to you quickly."
                icon={CheckCircle2}
                iconClassName="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add tags like internships, degree planning, research"
                    />
                    <Button type="button" variant="outline" className="rounded-xl" onClick={addTag}>
                      Add tag
                    </Button>
                  </div>

                  <div className="flex min-h-14 flex-wrap gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-3">
                    {profileDraft.tags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tags yet. Add a few so students know what you can help with.</p>
                    ) : (
                      profileDraft.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="rounded-full text-muted-foreground transition-colors hover:text-foreground" aria-label={`Remove ${tag}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" className="rounded-2xl px-5" disabled={profileSaving || workspaceLoading}>
                      {profileSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save contact details
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">Students see contact and directory updates right after save.</p>
                  </div>
                </div>
              </WorkspaceCard>

              <FeedbackMessage tone="error">{profileError}</FeedbackMessage>
              <FeedbackMessage>{profileSuccess}</FeedbackMessage>
            </form>

            <aside className="space-y-6">
              <WorkspaceCard
                title="Student preview"
                description="A quick read on how your profile currently scans from the student side."
                icon={UserRoundCheck}
                iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{profileDraft.department || 'Department'}</p>
                    <h3 className="font-display text-2xl font-extrabold tracking-tight">{profileDraft.displayName || 'Faculty name'}</h3>
                    <p className="text-sm text-muted-foreground">{profileDraft.title || 'Faculty title'}</p>
                  </div>

                  <div className={cn('rounded-2xl border px-3 py-2 text-sm font-medium', availabilityTone)}>
                    {workspace?.studentAvailabilityLabel ?? 'Availability unavailable'}
                  </div>

                  <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm">
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {workspace?.email ?? 'faculty@university.edu'}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {profileDraft.officeLocation || 'No office location yet'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {profileDraft.phone || 'No phone added'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">About</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {profileDraft.bio || 'Add a short bio so students know what kinds of questions you can help with.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Office hours summary</p>
                    <p className="text-sm text-muted-foreground">{workspace?.officeHours || 'No office hours posted yet.'}</p>
                  </div>
                </div>
              </WorkspaceCard>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="office-hours" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <WorkspaceCard
              title="Availability status"
              description="Set whether students should expect normal access, slower replies, or no office-hours coverage."
              icon={ShieldCheck}
              iconClassName="bg-primary/10 text-primary"
            >
              <form onSubmit={onSubmitStatus} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {availabilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusState((current) => ({ ...current, status: option.value }))}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition-colors',
                        statusState.status === option.value
                          ? 'border-primary bg-primary/8 shadow-sm'
                          : 'border-border/60 bg-muted/10 hover:bg-muted/20',
                      )}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>

                <label className="space-y-2 text-sm font-medium">
                  <span>Status note</span>
                  <Textarea
                    value={statusState.note}
                    onChange={(event) => setStatusState((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Optional context like conference travel, delayed responses, or alternate contact timing."
                    className="min-h-28 resize-none"
                    disabled={statusLoading}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" size="lg" className="rounded-2xl px-5" disabled={statusLoading || statusSaving}>
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
                  <p className="text-sm text-muted-foreground">{statusState.display}</p>
                </div>
              </form>
            </WorkspaceCard>

            <WorkspaceCard
              title="Office-hour editor"
              description="Add or adjust the weekly slots students can see and join."
              icon={PencilLine}
              iconClassName="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            >
              <form onSubmit={onSubmitOfficeHour} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Day</span>
                    <select value={officeHourForm.dayOfWeek} onChange={(event) => setOfficeHourForm((current) => ({
                      ...current,
                      dayOfWeek: Number(event.target.value),
                    }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm" required>
                      {weekdays.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>Mode</span>
                    <select value={officeHourForm.mode} onChange={(event) => setOfficeHourForm((current) => ({
                      ...current,
                      mode: event.target.value,
                    }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm" required>
                      <option value="IN_PERSON">In person</option>
                      <option value="VIRTUAL">Virtual</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>Start time</span>
                    <Input type="time" value={officeHourForm.startTime} onChange={(event) => setOfficeHourForm((current) => ({ ...current, startTime: event.target.value }))} required />
                  </label>

                  <label className="space-y-2 text-sm font-medium">
                    <span>End time</span>
                    <Input type="time" value={officeHourForm.endTime} onChange={(event) => setOfficeHourForm((current) => ({ ...current, endTime: event.target.value }))} required />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium">
                  <span>Location</span>
                  <Input value={officeHourForm.location} onChange={(event) => setOfficeHourForm((current) => ({ ...current, location: event.target.value }))} placeholder="Engineering Hall 314 or Zoom room" required />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Max queue</span>
                  <Input type="number" min={1} value={officeHourForm.maxQueue} onChange={(event) => setOfficeHourForm((current) => ({ ...current, maxQueue: Number(event.target.value) }))} required />
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" className="rounded-xl" disabled={savingOfficeHour}>
                    {savingOfficeHour ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingOfficeHourId ? 'Update slot' : 'Add slot'}
                      </>
                    )}
                  </Button>

                  {editingOfficeHourId ? (
                    <Button type="button" variant="outline" className="rounded-xl" onClick={resetOfficeHourForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </WorkspaceCard>
          </div>

          <WorkspaceCard
            title="Published office hours"
            description="Toggle slots live when you begin meeting with students and keep the list concise."
            icon={Clock3}
            iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            <div className="space-y-4">
              <FeedbackMessage tone="error">{officeHoursError}</FeedbackMessage>
              <FeedbackMessage tone="error">{statusError}</FeedbackMessage>
              <FeedbackMessage>{statusSuccess}</FeedbackMessage>

              {officeHoursLoading ? (
                <p className="text-sm text-muted-foreground">Loading office hours...</p>
              ) : officeHours.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-5 py-10 text-center">
                  <p className="text-sm font-medium">No office hours yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use the editor above to add your first slot.</p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {officeHours.map((slot) => (
                    <div key={slot.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold">{formatFacultySlotLabel(slot)}</p>
                            <Badge variant={slot.isActive ? 'default' : 'outline'} className="rounded-full">
                              {slot.isActive ? 'Live' : 'Scheduled'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full">
                              {modeLabels[slot.mode]}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {slot.location}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-4 w-4" />
                              {formatTo12Hour(slot.startTime)} - {formatTo12Hour(slot.endTime)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4" />
                              Max queue {slot.maxQueue}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" onClick={() => onEditOfficeHour(slot)} className="rounded-xl">
                            <PencilLine className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void onToggleOfficeHour(slot.id)} className="rounded-xl">
                            {slot.isActive ? 'Pause slot' : 'Go live'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void onDeleteOfficeHour(slot.id)} className="rounded-xl text-red-600 hover:text-red-600 dark:text-red-300">
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </WorkspaceCard>
        </TabsContent>

        <TabsContent value="events" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <WorkspaceCard
              title="Managed events"
              description="Create, edit, or cancel faculty events. Favoriting students are alerted when key event details change."
              icon={CalendarDays}
              iconClassName="bg-primary/10 text-primary"
            >
              <div className="space-y-4">
                <FeedbackMessage tone="error">{eventsError}</FeedbackMessage>
                <FeedbackMessage>{eventSuccess}</FeedbackMessage>

                {eventsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading your events...</p>
                ) : facultyEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-5 py-10 text-center">
                    <p className="text-sm font-medium">No faculty events yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Use the composer to publish your first student-facing event.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {facultyEvents.map((eventItem) => (
                      <article key={eventItem.id} className={cn('rounded-2xl border p-4', eventItem.isCancelled ? 'border-rose-500/25 bg-rose-500/5' : 'border-border/60 bg-muted/10')}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold">{eventItem.title}</p>
                              <Badge variant={eventItem.isCancelled ? 'outline' : 'default'} className="rounded-full">
                                {eventItem.isCancelled ? 'Canceled' : 'Published'}
                              </Badge>
                              <Badge variant="outline" className="rounded-full">
                                {eventItem.category}
                              </Badge>
                              {eventItem.building?.name ? (
                                <Badge variant="outline" className="rounded-full">
                                  {eventItem.building.name}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{formatEventDate(eventItem.date)} · {eventItem.time}</p>
                            <p className="text-sm text-muted-foreground">{eventItem.location}</p>
                            <p className="text-sm leading-6 text-muted-foreground">{eventItem.description}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onEditEvent(eventItem)}>
                              <PencilLine className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button type="button" variant="outline" className={cn('rounded-xl', eventItem.isCancelled ? '' : 'text-red-600 hover:text-red-600 dark:text-red-300')} onClick={() => void onToggleCancelEvent(eventItem)} disabled={updatingEventId === eventItem.id}>
                              {updatingEventId === eventItem.id
                                ? 'Updating...'
                                : eventItem.isCancelled
                                  ? 'Restore'
                                  : 'Cancel event'}
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </WorkspaceCard>

            <WorkspaceCard
              title={editingEventId ? 'Edit event' : 'Publish an event'}
              description="Use building linkage when the event belongs to a managed location. Students who favorite you will be notified on publish and update."
              icon={BellRing}
              iconClassName="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            >
              <form onSubmit={onSubmitEvent} className="space-y-4">
                <label className="space-y-2 text-sm font-medium">
                  <span>Title</span>
                  <Input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Midterm review session" required />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Description</span>
                  <Textarea value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} placeholder="Share who it is for, what changed, and what students should bring or do next." className="min-h-32 resize-none" required />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Date</span>
                    <Input type="date" value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} required />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Time</span>
                    <Input type="time" value={eventForm.time} onChange={(event) => setEventForm((current) => ({ ...current, time: event.target.value }))} required />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium">
                  <span>Location</span>
                  <Input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} placeholder="Engineering Hall 220" required />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    <span>Category</span>
                    <select value={eventForm.category} onChange={(event) => setEventForm((current) => ({ ...current, category: event.target.value }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm" required>
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
                    <span>Max attendees</span>
                    <Input type="number" min={1} value={eventForm.maxAttendees} onChange={(event) => setEventForm((current) => ({ ...current, maxAttendees: event.target.value }))} placeholder="Optional" />
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium">
                  <span>Managed building link</span>
                  <select value={eventForm.buildingId} onChange={(event) => setEventForm((current) => ({
                    ...current,
                    buildingId: event.target.value,
                    location: current.location || workspace?.availableBuildings?.find((item) => item.id === event.target.value)?.name || '',
                  }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm">
                    <option value="">No building link</option>
                    {(workspace?.availableBuildings ?? []).map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} · {building.type}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" className="rounded-xl" disabled={savingEvent}>
                    {savingEvent ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {editingEventId ? 'Save event changes' : 'Publish event'}
                      </>
                    )}
                  </Button>
                  {editingEventId ? (
                    <Button type="button" variant="outline" className="rounded-xl" onClick={resetEventForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </WorkspaceCard>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <WorkspaceCard
              title="Announcement composer"
              description="Publish whole-campus updates if you have permission, or target buildings and services you manage."
              icon={Megaphone}
              iconClassName="bg-rose-500/10 text-rose-700 dark:text-rose-300"
            >
              <div className="space-y-4">
                <FeedbackMessage tone="error">{announcementError}</FeedbackMessage>
                <FeedbackMessage>{announcementSuccess}</FeedbackMessage>

                {announcementsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading announcement access...</p>
                ) : !announcementPermissions
                || (!announcementPermissions.canPublishCampus
                  && !announcementPermissions.canPublishBuildings
                  && !announcementPermissions.canPublishServices) ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
                      <p className="text-sm font-medium">No announcement permissions</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You can still manage contact details, office hours, and faculty events here.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={onSubmitAnnouncement} className="space-y-4">
                      <label className="space-y-2 text-sm font-medium">
                        <span>Audience</span>
                        <select value={announcementForm.scope} onChange={(event) => setAnnouncementForm((current) => ({
                          ...current,
                          scope: event.target.value,
                          targetId: event.target.value === 'BUILDING'
                            ? announcementState?.availableBuildings[0]?.id ?? ''
                            : event.target.value === 'SERVICE'
                              ? announcementState?.availableServices[0]?.id ?? ''
                              : '',
                        }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm">
                          {announcementPermissions.canPublishCampus ? <option value="CAMPUS">{scopeLabels.CAMPUS}</option> : null}
                          {announcementPermissions.canPublishBuildings ? <option value="BUILDING">{scopeLabels.BUILDING}</option> : null}
                          {announcementPermissions.canPublishServices ? <option value="SERVICE">{scopeLabels.SERVICE}</option> : null}
                        </select>
                      </label>

                      {announcementForm.scope !== 'CAMPUS' ? (
                        <label className="space-y-2 text-sm font-medium">
                          <span>{announcementForm.scope === 'BUILDING' ? 'Building' : 'Service'}</span>
                          <select value={announcementForm.targetId} onChange={(event) => setAnnouncementForm((current) => ({ ...current, targetId: event.target.value }))} className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm" required>
                            {currentTargets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {'location' in target ? `${target.name} · ${target.location}` : `${target.name} · ${target.type}`}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      <label className="space-y-2 text-sm font-medium">
                        <span>Title</span>
                        <Input value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} placeholder="Library elevator maintenance on Tuesday" required />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Message</span>
                        <Textarea value={announcementForm.message} onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))} placeholder="Share what changed, who it affects, and what students should do next." className="min-h-32 resize-none" required />
                      </label>

                      <label className="space-y-2 text-sm font-medium">
                        <span>Link URL (optional)</span>
                        <Input type="url" value={announcementForm.linkUrl} onChange={(event) => setAnnouncementForm((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="https://..." />
                      </label>

                      <Button type="submit" className="rounded-xl" disabled={announcementSaving}>
                        {announcementSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Publish announcement
                          </>
                        )}
                      </Button>
                    </form>
                  )}
              </div>
            </WorkspaceCard>

            <WorkspaceCard
              title="Recent updates"
              description="Recent items you published and the channels currently available to you."
              icon={BellRing}
              iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Publishing channels</p>
                  <p className="mt-2 text-sm font-semibold">{totalAnnouncementAccess} active channel{totalAnnouncementAccess === 1 ? '' : 's'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Campus, building, and service access stay permission-aware.</p>
                </div>

                {!announcementState || announcementState.items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
                    No announcements published yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {announcementState.items.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {item.audienceLabel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatAnnouncementTime(item.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                        {item.linkUrl ? (
                          <a href={item.linkUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                            Open link
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WorkspaceCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
