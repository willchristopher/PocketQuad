'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  LogOut,
  Save,
  X,
} from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { useFacultyPages, ALL_FACULTY_PAGES, PAGE_LABELS } from './FacultyPagesContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const defaultDraft = {
  displayName: '',
  title: '',
  department: '',
  officeLocation: '',
  phone: '',
  bio: '',
  tags: [],
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

export function FacultySettings() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { visiblePages, togglePage } = useFacultyPages();

  const [workspace, setWorkspace] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState(defaultDraft);
  const [tagInput, setTagInput] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);

  const loadWorkspace = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/api/faculty/me');
      setWorkspace(result);
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to load profile') });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  React.useEffect(() => {
    if (!workspace) return;
    setDraft({
      displayName: workspace.name ?? '',
      title: workspace.title ?? '',
      department: workspace.department ?? '',
      officeLocation: workspace.officeLocation ?? '',
      phone: workspace.phone ?? '',
      bio: workspace.bio ?? '',
      tags: workspace.tags ?? [],
    });
  }, [workspace]);

  const addTag = () => {
    const tag = tagInput.trim().replace(/\s+/g, ' ');
    if (!tag) return;
    setDraft((c) => {
      if (c.tags.some((t) => t.toLowerCase() === tag.toLowerCase()) || c.tags.length >= 12) return c;
      return { ...c, tags: [...c.tags, tag] };
    });
    setTagInput('');
  };

  const removeTag = (tag) => {
    setDraft((c) => ({ ...c, tags: c.tags.filter((t) => t !== tag) }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await apiRequest('/api/faculty/me', { method: 'PATCH', body: draft });
      await loadWorkspace();
      setFeedback({ tone: 'success', msg: 'Contact information saved.' });
    } catch (error) {
      setFeedback({ tone: 'error', msg: errMsg(error, 'Unable to save') });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="space-y-8 animate-in-soft">
      <header className="space-y-1 pt-2">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your contact info, manage tags, and choose which pages to show.
        </p>
      </header>

      {/* ── Contact Information ─────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Contact information
        </h2>

        <Feedback tone={feedback?.tone}>{feedback?.msg}</Feedback>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Name</span>
                <Input
                  value={draft.displayName}
                  onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))}
                  placeholder="Dr. Maya Thompson"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Title</span>
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Associate Professor"
                  required
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm font-medium">
              <span>Email</span>
              <Input value={workspace?.email ?? profile?.email ?? ''} disabled />
              <p className="text-xs text-muted-foreground">
                Email is managed by your university account.
              </p>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Department</span>
                <Input
                  value={draft.department}
                  onChange={(e) => setDraft((c) => ({ ...c, department: e.target.value }))}
                  placeholder="Computer Science"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Office location</span>
                <Input
                  value={draft.officeLocation}
                  onChange={(e) => setDraft((c) => ({ ...c, officeLocation: e.target.value }))}
                  placeholder="Engineering Hall 314"
                  required
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm font-medium">
              <span>Phone</span>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((c) => ({ ...c, phone: e.target.value }))}
                placeholder="(270) 809-0000"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium">
              <span>Short bio</span>
              <Textarea
                value={draft.bio}
                onChange={(e) => setDraft((c) => ({ ...c, bio: e.target.value }))}
                placeholder="What kinds of questions or projects should students come to you for?"
                className="min-h-28 resize-none"
              />
            </label>

            {/* Tags */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="internships, research, advising"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-xl"
                  onClick={addTag}
                >
                  Add tag
                </Button>
              </div>
              <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-3">
                {draft.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tags yet. Add a few so students know what you can help with.
                  </p>
                ) : (
                  draft.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <Button type="submit" className="rounded-xl" disabled={saving || loading}>
              {saving ? (
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
          </form>
        )}
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Page Visibility ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Visible pages
        </h2>
        <p className="text-sm text-muted-foreground">
          Hide pages that are not relevant to you. Hidden pages are removed from the tab bar and the home screen.
        </p>

        <div className="divide-y divide-border/60 rounded-xl border border-border/60">
          {ALL_FACULTY_PAGES.map((pageId) => {
            const enabled = visiblePages.includes(pageId);
            return (
              <button
                key={pageId}
                type="button"
                onClick={() => togglePage(pageId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <span className="text-sm font-medium">{PAGE_LABELS[pageId]}</span>
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                    enabled
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/60',
                  )}
                >
                  {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-border/60" />

      {/* ── Account ─────────────────────────────────────────── */}
      <section className="space-y-4 pb-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Account</h2>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => void handleLogout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </section>
    </div>
  );
}
