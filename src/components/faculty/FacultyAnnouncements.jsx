'use client';

import React from 'react';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn, formatDateTimeLocalInput, toAbsoluteDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const scopeLabels = {
  CAMPUS: 'Whole campus',
  BUILDING: 'Building update',
  SERVICE: 'Service update',
};

const defaultForm = {
  title: '',
  message: '',
  linkUrl: '',
  expiresAt: '',
  scope: 'CAMPUS',
  targetId: '',
};

function errMsg(error, fallback) {
  return error instanceof ApiClientError ? error.message : fallback;
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
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

export function FacultyAnnouncements({ initialState = null }) {
  const [state, setState] = React.useState(initialState);
  const [loading, setLoading] = React.useState(!initialState);
  const [form, setForm] = React.useState(defaultForm);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);

  const expirationMin = React.useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return formatDateTimeLocalInput(now);
  }, []);

  const loadAnnouncements = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/api/announcements');
      setState(result);
      setForm((current) => {
        let nextScope = current.scope;
        if (nextScope === 'CAMPUS' && !result.permissions.canPublishCampus) {
          nextScope = result.permissions.canPublishBuildings
            ? 'BUILDING'
            : result.permissions.canPublishServices
              ? 'SERVICE'
              : 'CAMPUS';
        }
        return {
          ...current,
          scope: nextScope,
          targetId:
            nextScope === 'BUILDING'
              ? current.targetId || result.availableBuildings[0]?.id || ''
              : nextScope === 'SERVICE'
                ? current.targetId || result.availableServices[0]?.id || ''
                : '',
        };
      });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to load announcements') });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (initialState) {
      return;
    }

    void loadAnnouncements();
  }, [initialState, loadAnnouncements]);

  const permissions = state?.permissions;

  const currentTargets = React.useMemo(() => {
    if (form.scope === 'BUILDING') return state?.availableBuildings ?? [];
    if (form.scope === 'SERVICE') return state?.availableServices ?? [];
    return [];
  }, [form.scope, state?.availableBuildings, state?.availableServices]);

  React.useEffect(() => {
    if (form.scope !== 'CAMPUS' && currentTargets.length > 0 && !currentTargets.some((t) => t.id === form.targetId)) {
      setForm((c) => ({ ...c, targetId: currentTargets[0]?.id ?? '' }));
    }
    if (form.scope === 'CAMPUS' && form.targetId) {
      setForm((c) => ({ ...c, targetId: '' }));
    }
  }, [form.scope, form.targetId, currentTargets]);

  const hasPermission =
    permissions?.canPublishCampus ||
    permissions?.canPublishBuildings ||
    permissions?.canPublishServices;

  const submitAnnouncement = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await apiRequest('/api/announcements', {
        method: 'POST',
        body: {
          title: form.title,
          message: form.message,
          linkUrl: form.linkUrl.trim() || undefined,
          expiresAt: toAbsoluteDateTime(form.expiresAt),
          scope: form.scope,
          buildingId: form.scope === 'BUILDING' ? form.targetId : undefined,
          serviceId: form.scope === 'SERVICE' ? form.targetId : undefined,
        },
      });
      setForm((c) => ({ ...c, title: '', message: '', linkUrl: '', expiresAt: '' }));
      setFeedback({ tone: 'success', msg: 'Announcement published.' });
      await loadAnnouncements();
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to publish') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in-soft">
      <header className="space-y-1 pt-2">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight">
          Announcements
        </h1>
        <p className="text-sm text-muted-foreground">
          Send campus, building, or service updates to students.
        </p>
      </header>

      {/* ── Composer ───────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Compose announcement
        </h2>

        <Feedback tone={feedback?.tone}>{feedback?.msg}</Feedback>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading announcement access...
          </p>
        ) : !hasPermission ? (
          <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
            <p className="text-sm font-medium">No announcement permissions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact your administrator to request publishing access.
            </p>
          </div>
        ) : (
          <form onSubmit={submitAnnouncement} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>Audience</span>
              <select
                value={form.scope}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    scope: e.target.value,
                    targetId:
                      e.target.value === 'BUILDING'
                        ? state?.availableBuildings[0]?.id ?? ''
                        : e.target.value === 'SERVICE'
                          ? state?.availableServices[0]?.id ?? ''
                          : '',
                  }))
                }
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {permissions.canPublishCampus ? (
                  <option value="CAMPUS">{scopeLabels.CAMPUS}</option>
                ) : null}
                {permissions.canPublishBuildings ? (
                  <option value="BUILDING">{scopeLabels.BUILDING}</option>
                ) : null}
                {permissions.canPublishServices ? (
                  <option value="SERVICE">{scopeLabels.SERVICE}</option>
                ) : null}
              </select>
            </label>

            {form.scope !== 'CAMPUS' ? (
              <label className="block space-y-2 text-sm font-medium">
                <span>{form.scope === 'BUILDING' ? 'Building' : 'Service'}</span>
                <select
                  value={form.targetId}
                  onChange={(e) => setForm((c) => ({ ...c, targetId: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                >
                  {currentTargets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {'location' in t ? `${t.name} · ${t.location}` : `${t.name} · ${t.type}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block space-y-2 text-sm font-medium">
              <span>Title</span>
              <Input
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="Library elevator maintenance on Tuesday"
                required
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Message</span>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
                placeholder="What changed, who it affects, and what students should do."
                className="min-h-28 resize-none"
                required
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Link URL (optional)</span>
              <Input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm((c) => ({ ...c, linkUrl: e.target.value }))}
                placeholder="https://..."
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Ends at (optional)</span>
              <Input
                type="datetime-local"
                min={expirationMin}
                step={60}
                value={form.expiresAt}
                onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
              />
            </label>

            <Button type="submit" className="rounded-xl" disabled={saving}>
              {saving ? (
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
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Recent ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Recent announcements
        </h2>

        {!state || state.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 px-5 py-10 text-center">
            <Megaphone className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No announcements yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Published announcements will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {state.items.slice(0, 8).map((item) => (
              <div key={item.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    {item.audienceLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
                {item.expiresAt ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Ends {formatTime(item.expiresAt)}
                  </p>
                ) : null}
                {item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    Open link
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
