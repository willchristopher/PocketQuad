'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock3, Copy, Heart, Mail, MapPin, Navigation, Phone } from 'lucide-react';
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

function ProfileRow({ icon: Icon, label, children, action }) {
    return (<div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(var(--msu-blue-rgb),0.06)] text-primary">
        <Icon className="h-4 w-4"/>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm leading-6 text-foreground">
          {children}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>);
}

export default function FacultyDetailPage({ params }) {
    const { id } = React.use(params);
    const [faculty, setFaculty] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
  const [actionMessage, setActionMessage] = React.useState(null);
    React.useEffect(() => {
        let active = true;
        const loadFaculty = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await apiRequest(`/api/faculty/${id}`);
                if (active) {
                    setFaculty(data);
                }
            }
            catch (err) {
                const message = err instanceof ApiClientError ? err.message : 'Unable to load faculty details';
                if (active) {
                    setError(message);
                    setFaculty(null);
                }
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
        };
    }, [id]);
    const onToggleFavorite = async () => {
        if (!faculty)
            return;
        setError(null);
      setActionMessage(null);
        try {
            const result = await apiRequest(`/api/faculty/${faculty.id}/favorite`, {
                method: 'POST',
            });
            setFaculty((previous) => previous
                ? {
                    ...previous,
                    isFavorited: result.isFavorited,
                }
                : previous);
        }
        catch (err) {
            const message = err instanceof ApiClientError ? err.message : 'Unable to update favorite';
            setError(message);
        }
    };
      const copyEmail = async () => {
        if (!faculty)
          return;
        try {
          await navigator.clipboard.writeText(faculty.email);
          setActionMessage('Email copied to clipboard');
          setError(null);
        }
        catch {
          setError('Unable to copy email right now');
          setActionMessage(null);
        }
      };
    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading faculty profile...</p>;
    }
    if (!faculty) {
        return (<div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">Faculty member not found.</p>
        <Link href="/faculty-directory" className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Back to Faculty Directory
        </Link>
      </div>);
    }
    const tone = toneClasses[getStudentFacingFacultyAvailabilityTone(faculty.studentAvailabilityState)];
    const hasOfficeLocation = faculty.officeLocation && faculty.officeLocation.trim().toUpperCase() !== 'TBD';
    const mapUrl = hasOfficeLocation
        ? `https://maps.google.com/?q=${encodeURIComponent(faculty.officeLocation)}`
        : null;
    return (<div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <Link href="/faculty-directory" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4"/>
        Back to Faculty Directory
      </Link>

      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card">
        <div className="border-b border-border/50 bg-[linear-gradient(180deg,rgba(var(--msu-blue-rgb),0.08),rgba(255,255,255,0))] px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:gap-8">
            <div className="space-y-5">
              <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{faculty.department}</p>
              <h1 className="font-display text-[2.2rem] font-semibold tracking-tight md:text-[3rem]">{faculty.name}</h1>
              <p className="text-base text-muted-foreground">{faculty.title}</p>
            </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={cn('inline-flex rounded-full border px-4 py-2 text-sm font-semibold', tone)}>
                  {faculty.studentAvailabilityLabel}
                </div>
                {faculty.tags.length === 0 ? (<Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  General faculty support
                </Badge>) : (faculty.tags.map((tag) => (<Badge key={tag} variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {tag}
                  </Badge>)))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <a href={`mailto:${faculty.email}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  <Mail className="h-4 w-4"/>
                  Email faculty
                </a>

                <button onClick={() => void onToggleFavorite()} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200', faculty.isFavorited
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border/60 hover:bg-muted/35')}>
                  <Heart className={cn('h-4 w-4', faculty.isFavorited && 'fill-red-600 dark:fill-red-400')}/>
                {faculty.isFavorited ? 'Saved to favorites' : 'Save to favorites'}
                </button>
              </div>

              {actionMessage && (<p className="text-sm text-emerald-700 dark:text-emerald-300">{actionMessage}</p>)}

              <div className="space-y-2 rounded-[1.4rem] border border-border/60 bg-background/75 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">About</p>
                <p className="text-sm leading-7 text-muted-foreground">
                  {faculty.bio ?? 'This faculty member has not added a bio yet. Use the contact details below to reach out directly.'}
                </p>
              </div>
            </div>

            <aside className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-background/80 shadow-sm">
              <div className="px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Profile details</p>
              </div>
              <div className="divide-y divide-border/60">
                <ProfileRow icon={Mail} label="Email" action={<button type="button" onClick={() => void copyEmail()} className="inline-flex min-h-11 items-center rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"><Copy className="mr-1.5 h-3.5 w-3.5"/>Copy</button>}>
                  <a href={`mailto:${faculty.email}`} className="font-medium text-primary hover:text-primary/80">
                    {faculty.email}
                  </a>
                </ProfileRow>

                {faculty.phone ? (<ProfileRow icon={Phone} label="Phone" action={<a href={`tel:${faculty.phone}`} className="inline-flex min-h-11 items-center rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground">Call</a>}>
                    {faculty.phone}
                  </ProfileRow>) : null}

                <ProfileRow icon={MapPin} label="Office" action={mapUrl ? (<a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground">Map</a>) : null}>
                  {faculty.officeLocation}
                </ProfileRow>

                <ProfileRow icon={Clock3} label="Office hours" action={mapUrl ? (<a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"><Navigation className="mr-1.5 h-3.5 w-3.5"/>Directions</a>) : null}>
                  {faculty.officeHours}
                </ProfileRow>
              </div>
            </aside>
          </div>
        </div>
      </section>

    </div>);
}
