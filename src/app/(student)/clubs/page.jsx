'use client';
import React from 'react';
import { ExternalLink, Mail } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
export default function ClubsPage() {
    const [clubs, setClubs] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        const loadClubs = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await apiRequest('/api/clubs');
                setClubs(result);
            }
            catch (err) {
                const message = err instanceof ApiClientError ? err.message : 'Unable to load clubs and organizations';
                setError(message);
                setClubs([]);
            }
            finally {
                setLoading(false);
            }
        };
        void loadClubs();
    }, []);
    return (<div className="space-y-6">
      {error && (<p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>)}

      <section className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading organizations...</p>}

        {!loading && clubs.map((club, index) => (<article key={club.id} className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/30 animate-in-up" style={{ animationDelay: `${0.04 * (index + 1)}s` }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="shrink-0 sm:w-36">
                <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{club.category}</p>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-lg font-bold leading-tight">{club.name}</h2>
                <p className="text-sm text-muted-foreground">{club.description}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {club.meetingInfo && <p>{club.meetingInfo}</p>}
                  {club.contactEmail && (<p className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 shrink-0"/>
                      {club.contactEmail}
                    </p>)}
                </div>
              </div>

              {club.websiteUrl && (<div className="shrink-0 sm:self-start">
                  <a href={club.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/35">
                    <ExternalLink className="h-3.5 w-3.5"/>
                    Visit Website
                  </a>
                </div>)}
            </div>
          </article>))}
      </section>

      {!loading && clubs.length === 0 && (<section className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No clubs are available for your university yet.
        </section>)}
    </div>);
}
