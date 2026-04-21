'use client';
import React from 'react';
import { Check, ChevronDown, ExternalLink, Search, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { cn, formatEnumLabel } from '@/lib/utils';
const categories = [
    'All',
    'LEARNING',
    'COMMUNICATION',
    'STUDENT_SERVICES',
    'FINANCE',
    'CAMPUS_LIFE',
    'OTHER',
];
function getCategoryLabel(category) {
    return category === 'All' ? 'All' : formatEnumLabel(category);
}
export default function LinksDirectoryPage() {
    const { profile, refreshProfile } = useAuth();
    const [query, setQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('All');
    const [links, setLinks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [pinnedIds, setPinnedIds] = React.useState([]);
    const [savingLinkId, setSavingLinkId] = React.useState(null);
    React.useEffect(() => {
        setPinnedIds(profile?.notificationPreferences?.resourceLinkIds ?? []);
    }, [profile?.notificationPreferences?.resourceLinkIds]);
    const loadLinks = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
            ...(query ? { search: query } : {}),
            ...(activeCategory !== 'All' ? { category: activeCategory } : {}),
        });
        try {
            const result = await apiRequest(`/api/resource-links?${params.toString()}`);
            setLinks(result);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to load resource links';
            setError(message);
            setLinks([]);
        }
        finally {
            setLoading(false);
        }
    }, [activeCategory, query]);
    React.useEffect(() => {
        void loadLinks();
    }, [loadLinks]);
    const toggleLinkPin = async (link) => {
        if (savingLinkId === link.id)
            return;
        const wasPinned = pinnedIds.includes(link.id);
        const nextPinnedIds = wasPinned
            ? pinnedIds.filter((id) => id !== link.id)
            : [link.id, ...pinnedIds.filter((id) => id !== link.id)];
        setPinnedIds(nextPinnedIds);
        setSavingLinkId(link.id);
        setError(null);
        try {
            const result = await apiRequest(`/api/resource-links/${link.id}/favorite`, {
                method: 'POST',
            });
            setPinnedIds(result.resourceLinkIds ?? []);
            await refreshProfile();
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update pinned link';
            setError(message);
            setPinnedIds(pinnedIds);
        }
        finally {
            setSavingLinkId((current) => current === link.id ? null : current);
        }
    };
    return (<div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card/90 p-4 md:p-5 animate-in-up stagger-1">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search links" className="h-10 w-full bg-transparent text-sm outline-none"/>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-muted/20">
                {getCategoryLabel(activeCategory)}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {categories.map((category) => (<DropdownMenuItem key={category} onClick={() => setActiveCategory(category)} className="flex items-center justify-between gap-3">
                  <span>{getCategoryLabel(category)}</span>
                  {activeCategory === category ? <Check className="h-3.5 w-3.5 text-foreground"/> : null}
                </DropdownMenuItem>))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading links...</p>}

        {!loading && links.map((link, index) => (<article key={link.id} className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30 animate-in-up" style={{ animationDelay: `${0.04 * (index + 1)}s` }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="shrink-0 sm:w-40">
                <p className="text-xs font-semibold text-primary/80">{getCategoryLabel(link.category)}</p>
              </div>

              <div className="min-w-0 flex-1">
                <a href={link.href} target="_blank" rel="noreferrer" className="text-lg font-bold leading-tight text-foreground underline-offset-2 hover:underline">
                  {link.label}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
              </div>

              <div className="shrink-0 sm:self-center">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={() => void toggleLinkPin(link)} disabled={savingLinkId === link.id} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', pinnedIds.includes(link.id)
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/35 hover:text-foreground')}>
                    <Star className={cn('h-3.5 w-3.5', pinnedIds.includes(link.id) && 'fill-current')}/>
                    {savingLinkId === link.id
                        ? 'Saving...'
                        : pinnedIds.includes(link.id)
                            ? 'Pinned to dashboard'
                            : 'Pin to dashboard'}
                  </button>
                  <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/35">
                    Open portal
                    <ExternalLink className="h-3.5 w-3.5"/>
                  </a>
                </div>
              </div>
            </div>
          </article>))}
      </section>

      {!loading && links.length === 0 && (<section className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No links matched your query.
        </section>)}
    </div>);
}
