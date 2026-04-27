'use client';

import React from 'react';
import { AlertCircle, Bell, Building2, Loader2, MessageSquare, Send, Trash2, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const scopeConfig = {
  CAMPUS: { label: 'Campus-wide', icon: Bell, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  BUILDING: { label: 'Building', icon: Building2, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  SERVICE: { label: 'Service', icon: Wrench, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
};

function formatAnnouncementTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function getErrorMessage(error, fallback) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const defaultForm = {
  scope: 'CAMPUS',
  buildingId: '',
  serviceId: '',
  title: '',
  message: '',
  linkUrl: '',
  expiresAt: '',
};

export function AdminAnnouncementsTab() {
  const [announcements, setAnnouncements] = React.useState([]);
  const [buildings, setBuildings] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  const [form, setForm] = React.useState(defaultForm);
  const [deleting, setDeleting] = React.useState(null);

  // Load announcements and target options
  React.useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const result = await apiRequest('/api/announcements');
        setAnnouncements(result.items ?? []);
        setBuildings(result.availableBuildings ?? []);
        setServices(result.availableServices ?? []);
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load announcements'));
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const now = new Date();
      const expiresAt = form.expiresAt ? new Date(form.expiresAt) : null;

      const payload = {
        scope: form.scope,
        title: form.title.trim(),
        message: form.message.trim(),
        linkUrl: form.linkUrl.trim() || undefined,
        ...(expiresAt && expiresAt > now ? { expiresAt } : {}),
        ...(form.scope === 'BUILDING' && form.buildingId ? { buildingId: form.buildingId } : {}),
        ...(form.scope === 'SERVICE' && form.serviceId ? { serviceId: form.serviceId } : {}),
      };

      const result = await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setAnnouncements((prev) => [result, ...prev]);
      setForm(defaultForm);
      setSuccess('Announcement published successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to publish announcement'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcementId) => {
    try {
      setDeleting(announcementId);
      await apiRequest(`/api/announcements/${announcementId}`, { method: 'DELETE' });
      setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId));
      setSuccess('Announcement deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete announcement'));
    } finally {
      setDeleting(null);
    }
  };

  const targetOptions = form.scope === 'BUILDING' ? buildings : form.scope === 'SERVICE' ? services : [];
  const expirationMin = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Editor */}
        <Card className="border-border/60 p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Create Announcement
          </h3>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Audience/Scope */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience</label>
              <select
                value={form.scope}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    scope: e.target.value,
                    buildingId: '',
                    serviceId: '',
                  }))
                }
                className="w-full h-10 rounded-lg border border-border/60 bg-background px-3 text-sm"
              >
                <option value="CAMPUS">Campus-wide</option>
                <option value="BUILDING">Specific Building</option>
                <option value="SERVICE">Specific Service</option>
              </select>
            </div>

            {/* Target Selection */}
            {form.scope !== 'CAMPUS' && targetOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {form.scope === 'BUILDING' ? 'Building' : 'Service'}
                </label>
                <select
                  value={form.scope === 'BUILDING' ? form.buildingId : form.serviceId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [form.scope === 'BUILDING' ? 'buildingId' : 'serviceId']: e.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-lg border border-border/60 bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select one...</option>
                  {targetOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.type ? `· ${item.type}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Library closure this weekend"
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">{form.title.length}/120</p>
            </div>

            {/* Message - Rich Text Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Explain what changed, who it affects, and next steps. Markdown-style formatting is supported: *bold* or **bold**, _italic_ or __italic__, `code`, [link text](url)"
                className="min-h-40 resize-none font-mono text-xs"
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground">{form.message.length}/2000</p>
              <p className="text-xs text-muted-foreground">
                Tip: Use *text* for emphasis, `code` for technical details
              </p>
            </div>

            {/* Link URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Related Link (optional)</label>
              <Input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Auto-remove at (optional)</label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                min={expirationMin}
              />
              <p className="text-xs text-muted-foreground">Leave blank to keep visible indefinitely</p>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish Announcement
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Recent Announcements */}
        <Card className="border-border/60 p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Updates
          </h3>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : announcements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
              No announcements yet
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {announcements.slice(0, 8).map((item) => {
                const config = scopeConfig[item.scope] ?? scopeConfig.CAMPUS;
                const Icon = config.icon;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('rounded p-1.5', config.color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete announcement"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <p className="font-semibold line-clamp-2">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatAnnouncementTime(item.createdAt)}
                      </span>
                      {item.expiresAt && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Ends {formatAnnouncementTime(item.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
