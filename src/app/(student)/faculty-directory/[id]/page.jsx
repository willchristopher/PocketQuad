'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Heart, Mail, MapPin, Navigation, Phone } from 'lucide-react';
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
    return (<div className="mx-auto max-w-5xl space-y-6">
      <Link href="/faculty-directory" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4"/>
        Back to Faculty Directory
      </Link>

      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="rounded-xl border border-border/60 bg-card p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{faculty.department}</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{faculty.name}</h1>
              <p className="text-base text-muted-foreground">{faculty.title}</p>
            </div>

            <div className={cn('inline-flex rounded-full border px-4 py-2 text-sm font-semibold', tone)}>
              {faculty.studentAvailabilityLabel}
            </div>

            <div className="flex flex-wrap gap-2">
              {faculty.tags.length === 0 ? (<Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  General faculty support
                </Badge>) : (faculty.tags.map((tag) => (<Badge key={tag} variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {tag}
                  </Badge>)))}
            </div>

            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {faculty.bio ?? 'This faculty member has not added a bio yet. Use the office hours and contact details to reach out directly.'}
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => void onToggleFavorite()} className={cn('inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all duration-200', faculty.isFavorited
            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            : 'border-border/60 hover:bg-muted/35')}>
                <Heart className={cn('h-4 w-4', faculty.isFavorited && 'fill-red-600 dark:fill-red-400')}/>
                {faculty.isFavorited ? 'Saved to favorites' : 'Save to favorites'}
              </button>

              {mapUrl ? (<a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/35">
                  <MapPin className="h-4 w-4"/>
                  Get directions
                </a>) : (<div className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3.5 py-2.5 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4"/>
                  Office location not posted yet
                </div>)}
            </div>

            {actionMessage && (<p className="text-sm text-emerald-700 dark:text-emerald-300">{actionMessage}</p>)}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/45 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground"/>
                  <a href={`mailto:${faculty.email}`} className="font-medium text-primary hover:text-primary/80">
                    {faculty.email}
                  </a>
                </p>
                {faculty.phone && (<p className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground"/>
                    {faculty.phone}
                  </p>)}
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground"/>
                  {faculty.officeLocation}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/45 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Office hours</p>
              <p className="mt-3 text-sm text-muted-foreground">{faculty.officeHours}</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/45 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Actions</p>
              <div className="mt-3 grid gap-2">
                <a href={`mailto:${faculty.email}`} className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/35">
                  <Mail className="h-4 w-4"/>
                  Email faculty
                </a>

                {faculty.phone ? (<a href={`tel:${faculty.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/35">
                    <Phone className="h-4 w-4"/>
                    Call office
                  </a>) : null}

                <button type="button" onClick={() => void copyEmail()} className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/35">
                  <Copy className="h-4 w-4"/>
                  Copy email address
                </button>

                {mapUrl ? (<a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/35">
                    <Navigation className="h-4 w-4"/>
                    Open office in Maps
                  </a>) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>);
}
