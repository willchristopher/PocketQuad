'use client';
import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Search } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
function FacultyCard({ entry, pending, onToggleFavorite }) {
    return (<article className="group py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{entry.department}</p>

          <Link href={`/faculty-directory/${entry.id}`} className="mt-2 block space-y-1">
            <h2 className="font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{entry.name}</h2>
            <p className="text-sm text-muted-foreground">{entry.title}</p>
          </Link>
        </div>

        <button type="button" onClick={() => void onToggleFavorite(entry.id)} disabled={pending} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', entry.isFavorited
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/35')} aria-pressed={entry.isFavorited} aria-label={entry.isFavorited ? `Remove ${entry.name} from favorites` : `Save ${entry.name} to favorites`}>
          <Heart className={cn('h-3.5 w-3.5', entry.isFavorited && 'fill-current')}/>
          {entry.isFavorited ? 'Saved' : 'Save'}
        </button>
      </div>

      <Link href={`/faculty-directory/${entry.id}`} className="mt-3 block">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4"/>
            {entry.officeLocation}
          </span>
        </div>

        <div className="mt-4 inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80">
          View full profile
        </div>
      </Link>
    </article>);
}
export default function FacultyDirectoryPage() {
    const [query, setQuery] = React.useState('');
    const [department, setDepartment] = React.useState('All');
    const deferredQuery = React.useDeferredValue(query.trim());
    const [entries, setEntries] = React.useState([]);
    const [allEntries, setAllEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [pendingFacultyId, setPendingFacultyId] = React.useState(null);
    React.useEffect(() => {
        const controller = new AbortController();
        let active = true;
        const params = new URLSearchParams();
        if (department !== 'All') {
            params.set('department', department);
        }
        if (deferredQuery) {
            params.set('search', deferredQuery);
        }
        const endpoint = params.size > 0 ? `/api/faculty?${params.toString()}` : '/api/faculty';
        const loadFaculty = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await apiRequest(endpoint, {
                    signal: controller.signal,
                });
                if (!active) {
                    return;
                }
                setEntries(result);
                if (department === 'All' && !deferredQuery) {
                    setAllEntries(result);
                }
            }
            catch (err) {
                if (!active || (err instanceof DOMException && err.name === 'AbortError')) {
                    return;
                }
                const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty directory';
                setError(message);
                setEntries([]);
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        };
        void loadFaculty();
        return () => {
            active = false;
            controller.abort();
        };
    }, [deferredQuery, department]);
    const departments = React.useMemo(() => ['All', ...Array.from(new Set(allEntries.map((entry) => entry.department))).sort()], [allEntries]);
    const favoriteEntries = React.useMemo(() => entries.filter((entry) => entry.isFavorited), [entries]);
    const totalFavorites = React.useMemo(() => allEntries.filter((entry) => entry.isFavorited).length, [allEntries]);
    const updateFavoriteState = React.useCallback((facultyId, isFavorited) => {
        const applyUpdate = (collection) => collection.map((entry) => (entry.id === facultyId ? { ...entry, isFavorited } : entry));
        setEntries(applyUpdate);
        setAllEntries(applyUpdate);
    }, []);
    const onToggleFavorite = React.useCallback(async (facultyId) => {
        const current = entries.find((entry) => entry.id === facultyId) ?? allEntries.find((entry) => entry.id === facultyId);
        if (!current || pendingFacultyId === facultyId)
            return;
        const nextState = !current.isFavorited;
        setPendingFacultyId(facultyId);
        setError(null);
        updateFavoriteState(facultyId, nextState);
        try {
            const result = await apiRequest(`/api/faculty/${facultyId}/favorite`, {
                method: 'POST',
            });
            updateFavoriteState(facultyId, result.isFavorited);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update favorite';
            setError(message);
            updateFavoriteState(facultyId, current.isFavorited);
        }
        finally {
            setPendingFacultyId((previous) => (previous === facultyId ? null : previous));
        }
    }, [allEntries, entries, pendingFacultyId, updateFavoriteState]);
    return (<div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,220px)]">
          <div className="min-w-0 flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/50">
            <Search className="h-4 w-4 text-muted-foreground"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by faculty name, role, tag, or office" className="h-11 w-full bg-transparent text-sm outline-none"/>
          </div>

          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="min-w-0 w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm transition-colors hover:bg-muted/50">
            {departments.map((item) => (<option key={item} value={item}>
                {item}
              </option>))}
          </select>
        </div>
      </section>

      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">All faculty</h2>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading faculty...</p>}

          {!loading && entries.length > 0 ? (<section className="rounded-[1.5rem] border border-border/60 bg-card px-4 py-2 sm:px-5">
              <div className="divide-y divide-border/60">
                {entries.map((entry) => (<FacultyCard key={entry.id} entry={entry} pending={pendingFacultyId === entry.id} onToggleFavorite={onToggleFavorite}/>))}
              </div>
            </section>) : null}
        </div>

        <aside className="xl:sticky xl:top-6">
          <div className="rounded-[1.5rem] border border-border/60 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your saved faculty</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{favoriteEntries.length}</h2>
              </div>
              <div className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                {totalFavorites} total
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Keep quick-access contacts here while you browse the full directory.
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (<p className="text-sm text-muted-foreground">Loading favorites...</p>) : favoriteEntries.length === 0 ? (<div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-8 text-center">
                  <p className="text-sm font-semibold">No saved faculty yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap Save on any faculty card to pin them here.
                  </p>
                </div>) : (<div className="divide-y divide-border/60 rounded-[1.25rem] border border-border/60 bg-background/80 px-4 py-1">
                    {favoriteEntries.map((entry) => (<article key={entry.id} className="py-4 first:pt-3 last:pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{entry.department}</p>
                          <Link href={`/faculty-directory/${entry.id}`} className="block font-semibold tracking-tight hover:text-primary">
                            {entry.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">{entry.title}</p>
                        </div>

                        <button type="button" onClick={() => void onToggleFavorite(entry.id)} disabled={pendingFacultyId === entry.id} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400" aria-label={`Remove ${entry.name} from favorites`}>
                          <Heart className="h-4 w-4 fill-current"/>
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5"/>
                          {entry.officeLocation}
                        </span>
                      </div>
                    </article>))}
                  </div>)}
            </div>
          </div>
        </aside>
      </section>

      {!loading && entries.length === 0 && (<section className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-base font-semibold">No faculty matched that search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a department filter, a broader keyword, or a tag like advising, tutoring, or scholarships.
          </p>
        </section>)}
    </div>);
}
