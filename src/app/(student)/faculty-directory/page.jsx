'use client';
import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Search } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { getStudentFacingFacultyAvailabilityTone } from '@/lib/faculty';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
const toneClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    slate: 'border-border/60 bg-muted/20 text-muted-foreground',
};
function FacultyCard({ entry, pending, onToggleFavorite }) {
    const tone = toneClasses[getStudentFacingFacultyAvailabilityTone(entry.studentAvailabilityState)];
    return (<article className="rounded-[24px] border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href={`/faculty-directory/${entry.id}`} className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{entry.department}</p>
          <h2 className="font-display text-xl font-bold tracking-tight">{entry.name}</h2>
          <p className="text-sm text-muted-foreground">{entry.title}</p>
        </Link>

        <button type="button" onClick={() => void onToggleFavorite(entry.id)} disabled={pending} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', entry.isFavorited
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/35')} aria-pressed={entry.isFavorited} aria-label={entry.isFavorited ? `Remove ${entry.name} from favorites` : `Save ${entry.name} to favorites`}>
          <Heart className={cn('h-3.5 w-3.5', entry.isFavorited && 'fill-current')}/>
          {entry.isFavorited ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className={cn('rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
          {entry.studentAvailabilityLabel}
        </div>
        {entry.tags.slice(0, 3).map((tag) => (<Badge key={tag} variant="outline" className="rounded-full px-3 py-1 text-[11px]">
            {tag}
          </Badge>))}
        {entry.tags.length === 0 && (<Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
            Faculty contact
          </Badge>)}
      </div>

      <Link href={`/faculty-directory/${entry.id}`} className="mt-4 block">
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {entry.bio ?? 'No bio yet. Open the profile for office hours, office location, and contact details.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4"/>
            {entry.officeLocation}
          </span>
          <span>{entry.officeHours}</span>
        </div>

        <div className="mt-5 inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary/80">
          View full profile
        </div>
      </Link>
    </article>);
}
export default function FacultyDirectoryPage() {
    const [query, setQuery] = React.useState('');
    const [department, setDepartment] = React.useState('All');
    const [entries, setEntries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [pendingFacultyId, setPendingFacultyId] = React.useState(null);
    const loadFaculty = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiRequest('/api/faculty');
            setEntries(result);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty directory';
            setError(message);
            setEntries([]);
        }
        finally {
            setLoading(false);
        }
    }, []);
    React.useEffect(() => {
        void loadFaculty();
    }, [loadFaculty]);
    const departments = React.useMemo(() => ['All', ...Array.from(new Set(entries.map((entry) => entry.department))).sort()], [entries]);
    const filteredEntries = React.useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return entries.filter((entry) => {
            const matchesDepartment = department === 'All' || entry.department === department;
            if (!matchesDepartment)
                return false;
            if (!normalizedQuery)
                return true;
            const searchable = [
                entry.name,
                entry.title,
                entry.department,
                entry.officeLocation,
                entry.bio ?? '',
                ...entry.tags,
            ].join(' ').toLowerCase();
            return searchable.includes(normalizedQuery);
        });
    }, [department, entries, query]);
    const favoriteEntries = React.useMemo(() => filteredEntries.filter((entry) => entry.isFavorited), [filteredEntries]);
    const totalFavorites = React.useMemo(() => entries.filter((entry) => entry.isFavorited).length, [entries]);
    const onToggleFavorite = React.useCallback(async (facultyId) => {
        const current = entries.find((entry) => entry.id === facultyId);
        if (!current || pendingFacultyId === facultyId)
            return;
        const nextState = !current.isFavorited;
        setPendingFacultyId(facultyId);
        setError(null);
        setEntries((previous) => previous.map((entry) => (entry.id === facultyId ? { ...entry, isFavorited: nextState } : entry)));
        try {
            const result = await apiRequest(`/api/faculty/${facultyId}/favorite`, {
                method: 'POST',
            });
            setEntries((previous) => previous.map((entry) => entry.id === facultyId ? { ...entry, isFavorited: result.isFavorited } : entry));
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update favorite';
            setError(message);
            setEntries((previous) => previous.map((entry) => entry.id === facultyId ? { ...entry, isFavorited: current.isFavorited } : entry));
        }
        finally {
            setPendingFacultyId((previous) => (previous === facultyId ? null : previous));
        }
    }, [entries, pendingFacultyId]);
    return (<div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card px-6 py-6 md:px-7 md:py-7">
        <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl"/>
        <div className="pointer-events-none absolute right-0 top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl"/>
        <div className="relative max-w-2xl space-y-1.5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Faculty, all in one place.</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Search by name, department, office, or support area, then save the people you want quick access to.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-border/60 bg-card/90 p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by faculty name, role, tag, or office" className="h-11 w-full bg-transparent text-sm outline-none"/>
          </div>

          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-11 rounded-2xl border border-border/60 bg-muted/20 px-3 text-sm transition-colors hover:bg-muted/35">
            {departments.map((item) => (<option key={item} value={item}>
                {item}
              </option>))}
          </select>
        </div>
      </section>

      {error && (<p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">All faculty</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading directory...' : `${filteredEntries.length} match${filteredEntries.length === 1 ? '' : 'es'}`}
              </p>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading faculty...</p>}

          {!loading &&
            filteredEntries.map((entry) => (<FacultyCard key={entry.id} entry={entry} pending={pendingFacultyId === entry.id} onToggleFavorite={onToggleFavorite}/>))}
        </div>

        <aside className="xl:sticky xl:top-6">
          <div className="rounded-[24px] border border-border/60 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your saved faculty</p>
                <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{favoriteEntries.length}</h2>
              </div>
              <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {totalFavorites} total
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Keep quick-access contacts here while you browse the full directory.
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (<p className="text-sm text-muted-foreground">Loading favorites...</p>) : favoriteEntries.length === 0 ? (<div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
                  <p className="text-sm font-semibold">No saved faculty yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap Save on any faculty card to pin them here.
                  </p>
                </div>) : (favoriteEntries.map((entry) => {
            const tone = toneClasses[getStudentFacingFacultyAvailabilityTone(entry.studentAvailabilityState)];
            return (<article key={entry.id} className="rounded-[20px] border border-border/60 bg-muted/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{entry.department}</p>
                          <Link href={`/faculty-directory/${entry.id}`} className="block font-semibold tracking-tight hover:text-primary">
                            {entry.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">{entry.title}</p>
                        </div>

                        <button type="button" onClick={() => void onToggleFavorite(entry.id)} disabled={pendingFacultyId === entry.id} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400" aria-label={`Remove ${entry.name} from favorites`}>
                          <Heart className="h-4 w-4 fill-current"/>
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', tone)}>
                          {entry.studentAvailabilityLabel}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5"/>
                          {entry.officeLocation}
                        </span>
                      </div>
                    </article>);
        }))}
            </div>
          </div>
        </aside>
      </section>

      {!loading && filteredEntries.length === 0 && (<section className="rounded-[24px] border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-base font-semibold">No faculty matched that search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a department filter, a broader keyword, or a tag like advising, tutoring, or scholarships.
          </p>
        </section>)}
    </div>);
}
