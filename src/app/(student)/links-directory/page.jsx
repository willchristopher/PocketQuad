'use client';
import React from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/utils';
const categories = [
    'All',
    'LEARNING',
    'COMMUNICATION',
    'STUDENT_SERVICES',
    'FINANCE',
    'CAMPUS_LIFE',
    'OTHER',
];
export default function LinksDirectoryPage() {
    const [query, setQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState('All');
    const [links, setLinks] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
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
    return (<div className="space-y-6">
      <section className="rounded-xl border border-border/60 bg-card/90 p-4 md:p-5 animate-in-up stagger-1">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 transition-colors focus-within:border-primary/40 focus-within:bg-muted/35">
            <Search className="h-4 w-4 text-muted-foreground"/>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search links" className="h-10 w-full bg-transparent text-sm outline-none"/>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (<button key={category} type="button" onClick={() => setActiveCategory(category)} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', activeCategory === category
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border/60 text-muted-foreground hover:bg-muted/40')}>
                {category === 'All' ? 'All' : category.replaceAll('_', ' ')}
              </button>))}
          </div>
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
                <p className="text-xs font-bold uppercase tracking-wide text-primary/80">{link.category.replaceAll('_', ' ')}</p>
              </div>

              <div className="min-w-0 flex-1">
                <a href={link.href} target="_blank" rel="noreferrer" className="text-lg font-bold leading-tight text-foreground underline-offset-2 hover:underline">
                  {link.label}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
              </div>

              <div className="shrink-0 sm:self-center">
                <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/35">
                  Open portal
                  <ExternalLink className="h-3.5 w-3.5"/>
                </a>
              </div>
            </div>
          </article>))}
      </section>

      {!loading && links.length === 0 && (<section className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center text-sm text-muted-foreground animate-in-up">
          No links matched your query.
        </section>)}
    </div>);
}
