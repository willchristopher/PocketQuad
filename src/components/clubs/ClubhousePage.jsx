'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Mail,
  MapPin,
  Search,
  Shuffle,
  Sparkles,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ApiClientError, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { useUniversityTheme } from '@/lib/theme';
import { cn, formatEnumLabel } from '@/lib/utils';

const ALL_CLUBS_FILTER = 'All clubs';

function buildCategorySummary(clubs) {
  const counts = new Map();

  for (const club of clubs) {
    const category = club.category?.trim() || 'General';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function getClubInitials(name) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (words.length === 0) {
    return 'CQ';
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function getSingleEmail(value) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const matches = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  return matches.length === 1 ? matches[0] : null;
}

function ContactLine({ label, name, email, text }) {
  if (!name && !email && !text) {
    return null;
  }

  const singleEmail = getSingleEmail(email ?? text);

  return (
    <div className="grid gap-1 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 space-y-1 text-sm text-foreground">
        {name ? <p>{name}</p> : null}
        {email ? (
          singleEmail ? (
            <a
              href={`mailto:${singleEmail}`}
              className="inline-flex max-w-full items-center gap-1.5 text-primary underline-offset-4 hover:underline"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          ) : (
            <p className="break-words text-muted-foreground">{email}</p>
          )
        ) : null}
        {text && text !== email ? (
          <p className="break-words text-muted-foreground">{text}</p>
        ) : null}
      </div>
    </div>
  );
}

function ClubContactDetails({ club }) {
  if (
    !club.presidentName &&
    !club.presidentEmail &&
    !club.advisorName &&
    !club.advisorEmail &&
    !club.publicContactInfo &&
    !club.contactEmail
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/15 p-4">
      <ContactLine
        label="President"
        name={club.presidentName}
        email={club.presidentEmail}
      />
      <ContactLine
        label="Advisor"
        name={club.advisorName}
        email={club.advisorEmail}
      />
      <ContactLine
        label="General contact"
        email={club.publicContactInfo ? null : club.contactEmail}
        text={club.publicContactInfo}
      />
    </div>
  );
}

function DirectoryRow({ club, isFollowed, onToggleInterest, saving }) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between md:gap-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{club.name}</h3>
          <Badge variant="subtle" className="rounded-full px-3 py-1 text-[10px] normal-case tracking-normal">
            {formatEnumLabel(club.category)}
          </Badge>
          {isFollowed ? (
            <Badge variant="section" className="rounded-full px-3 py-1 text-[10px] tracking-[0.16em]">
              In your circle
            </Badge>
          ) : null}
        </div>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {club.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-2.5 text-xs text-muted-foreground">
          {club.meetingInfo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {club.meetingInfo}
            </span>
          ) : null}

          {club.contactEmail ? (
            <a
              href={`mailto:${club.contactEmail}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 transition-colors hover:border-primary/20 hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              {club.contactEmail}
            </a>
          ) : null}
        </div>

        <ClubContactDetails club={club} />
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button
          type="button"
          size="sm"
          variant={isFollowed ? 'secondary' : 'default'}
          onClick={() => void onToggleInterest(club)}
          disabled={saving}
          className="rounded-full"
        >
          {isFollowed ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Following
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Add to circle
            </>
          )}
        </Button>

        {club.websiteUrl ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <a href={club.websiteUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function ClubhousePage({ initialClubs = null }) {
  const { profile, refreshProfile } = useAuth();
  const { universityName } = useUniversityTheme();
  const shouldReduceMotion = useReducedMotion();
  const [clubs, setClubs] = React.useState(initialClubs ?? []);
  const [loading, setLoading] = React.useState(!initialClubs);
  const [loadError, setLoadError] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState(ALL_CLUBS_FILTER);
  const [activeView, setActiveView] = React.useState(null);
  const [introStage, setIntroStage] = React.useState('welcome');
  const [clubInterestIds, setClubInterestIds] = React.useState(
    profile?.notificationPreferences?.clubInterestIds ?? [],
  );
  const [savingClubIds, setSavingClubIds] = React.useState([]);
  const [actionNotice, setActionNotice] = React.useState(null);
  const [actionError, setActionError] = React.useState(null);
  const [matchLoading, setMatchLoading] = React.useState(false);
  const [matchError, setMatchError] = React.useState(null);
  const [matchOverview, setMatchOverview] = React.useState('');
  const [matchCards, setMatchCards] = React.useState([]);
  const [matchIndex, setMatchIndex] = React.useState(0);
  const [hasLoadedMatch, setHasLoadedMatch] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query);
  const [, startTransition] = React.useTransition();
  const clubInterestIdsRef = React.useRef(profile?.notificationPreferences?.clubInterestIds ?? []);

  React.useEffect(() => {
    const nextClubIds = profile?.notificationPreferences?.clubInterestIds ?? [];

    clubInterestIdsRef.current = nextClubIds;
    setClubInterestIds(nextClubIds);
  }, [profile?.notificationPreferences?.clubInterestIds]);

  React.useEffect(() => {
    if (initialClubs) {
      return undefined;
    }

    let isActive = true;

    const loadClubs = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const result = await apiRequest('/api/clubs');

        if (!isActive) {
          return;
        }

        setClubs(Array.isArray(result) ? result : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setLoadError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load the Clubhouse directory right now.',
        );
        setClubs([]);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadClubs();

    return () => {
      isActive = false;
    };
  }, [initialClubs]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIntroStage('details');
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, []);

  React.useEffect(() => {
    if (!actionNotice && !actionError) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setActionNotice(null);
      setActionError(null);
    }, 3600);

    return () => window.clearTimeout(timeout);
  }, [actionError, actionNotice]);

  const loadClubMatch = React.useCallback(
    async (forceRefresh = false) => {
      if (matchLoading) {
        return;
      }

      if (!forceRefresh && hasLoadedMatch) {
        return;
      }

      setMatchLoading(true);
      setMatchError(null);

      try {
        const result = await apiRequest('/api/clubs/match');
        setMatchOverview(result.overview ?? '');
        setMatchCards(Array.isArray(result.cards) ? result.cards : []);
        setMatchIndex(0);
        setHasLoadedMatch(true);
      } catch (error) {
        setMatchError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to load Club Match right now.',
        );
        setMatchOverview('');
        setMatchCards([]);
      } finally {
        setMatchLoading(false);
      }
    },
    [hasLoadedMatch, matchLoading],
  );

  const handleToggleInterest = React.useCallback(
    async (club) => {
      if (!profile || savingClubIds.includes(club.id)) {
        return false;
      }

      const previousClubIds = clubInterestIdsRef.current;
      const isFollowing = previousClubIds.includes(club.id);
      const nextClubIds = isFollowing
        ? previousClubIds.filter((clubId) => clubId !== club.id)
        : [...previousClubIds, club.id];

      clubInterestIdsRef.current = nextClubIds;
      setClubInterestIds(nextClubIds);
      setSavingClubIds((current) => [...current, club.id]);
      setActionError(null);
      setActionNotice(
        isFollowing
          ? `${club.name} left your Clubhouse circle.`
          : `${club.name} joined your Clubhouse circle.`,
      );

      try {
        await apiRequest('/api/users/me/preferences', {
          method: 'PATCH',
          body: { clubInterestIds: nextClubIds },
        });

        startTransition(() => {
          void refreshProfile();
        });

        setHasLoadedMatch(false);

        return true;
      } catch (error) {
        clubInterestIdsRef.current = previousClubIds;
        setClubInterestIds(previousClubIds);
        setActionNotice(null);
        setActionError(
          error instanceof ApiClientError
            ? error.message
            : 'Unable to update your Clubhouse circle right now.',
        );

        return false;
      } finally {
        setSavingClubIds((current) => current.filter((clubId) => clubId !== club.id));
      }
    },
    [profile, refreshProfile, savingClubIds, startTransition],
  );

  const handleSelectView = React.useCallback(
    (nextView) => {
      setActiveView(nextView);

      if (nextView === 'match') {
        void loadClubMatch();
      }
    },
    [loadClubMatch],
  );

  const handleMatchDecision = React.useCallback(
    (decision) => {
      const currentCard = matchCards[matchIndex];

      if (!currentCard) {
        return;
      }

      setMatchIndex((current) => current + 1);

      if (decision === 'interested') {
        void handleToggleInterest(currentCard.club);
      }
    },
    [handleToggleInterest, matchCards, matchIndex],
  );

  const categorySummary = React.useMemo(() => buildCategorySummary(clubs), [clubs]);
  const categories = React.useMemo(
    () => [ALL_CLUBS_FILTER, ...categorySummary.map((category) => category.label)],
    [categorySummary],
  );
  const followedClubIdSet = React.useMemo(() => new Set(clubInterestIds), [clubInterestIds]);

  const filteredClubs = React.useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return clubs
      .filter((club) => {
        const matchesCategory =
          activeCategory === ALL_CLUBS_FILTER || club.category?.trim() === activeCategory;

        if (!matchesCategory) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          club.name,
          club.category,
          club.description,
          club.meetingInfo,
          club.contactEmail,
          club.presidentName,
          club.presidentEmail,
          club.advisorName,
          club.advisorEmail,
          club.publicContactInfo,
          club.sourceUrls,
          club.importNotes,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const followedDifference =
          Number(followedClubIdSet.has(right.id)) - Number(followedClubIdSet.has(left.id));

        if (followedDifference !== 0) {
          return followedDifference;
        }

        return left.name.localeCompare(right.name);
      });
  }, [activeCategory, clubs, deferredQuery, followedClubIdSet]);

  const activeMatchCard = matchCards[matchIndex] ?? null;
  const matchRemaining = Math.max(matchCards.length - matchIndex, 0);
  const campusLabel = universityName ?? 'Murray State University';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-6">
      <section className="panel-card rounded-xl p-6 md:p-8">
        <div className="mx-auto flex min-h-[220px] max-w-3xl items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {introStage === 'welcome' ? (
              <motion.div
                key="welcome"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="poster-label">Clubhouse</p>
                <h2 className="mt-3 font-display text-4xl leading-none text-foreground md:text-5xl">
                  Welcome to the Clubhouse.
                </h2>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3 }}
	              >
	                <p className="poster-label">{campusLabel}</p>
	                <h2 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-4xl">
	                  Welcome to the Clubhouse.
	                </h2>

	                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
	                  <Button
                    type="button"
                    onClick={() => handleSelectView('directory')}
                    className="rounded-full"
                  >
                    Browse the club directory
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSelectView('match')}
                    className="rounded-full"
                  >
                    Try Club Match
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {actionNotice || actionError ? (
        <section
          className={cn(
            'rounded-xl border px-4 py-3 text-sm shadow-sm',
            actionError
              ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          {actionError ?? actionNotice}
        </section>
      ) : null}

      {activeView === 'directory' ? (
        <section className="panel-card overflow-hidden rounded-xl">
          <div className="border-b border-border/60 px-5 py-5 md:px-6">
	            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
	              <div className="max-w-2xl">
	                <p className="poster-label">Club Directory</p>
	                <p className="mt-3 text-sm leading-6 text-muted-foreground">
	                  Search the directory, filter by category, and keep clubs close by adding them to
	                  your Clubhouse circle.
                </p>
              </div>

              <div className="w-full md:max-w-md">
                <label htmlFor="clubhouse-search" className="sr-only">
                  Search clubs
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
	                  <Input
	                    id="clubhouse-search"
	                    value={query}
	                    onChange={(event) => setQuery(event.target.value)}
	                    placeholder="Search clubs"
	                    variant="soft"
	                    inputSize="lg"
	                    className="pl-11"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-border/70 bg-card text-xs font-semibold text-foreground"
                  >
                    {activeCategory === ALL_CLUBS_FILTER ? 'All tags' : formatEnumLabel(activeCategory)}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        'flex items-center justify-between gap-3',
                        activeCategory === category ? 'bg-accent text-accent-foreground' : '',
                      )}
                    >
                      <span>{category === ALL_CLUBS_FILTER ? 'All tags' : formatEnumLabel(category)}</span>
                      {category !== ALL_CLUBS_FILTER ? (
                        <span className="text-xs text-muted-foreground">
                          {categorySummary.find((item) => item.label === category)?.count ?? 0}
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {loadError ? (
            <div className="px-5 py-4 text-sm text-red-700 dark:text-red-300 md:px-6">
              {loadError}
            </div>
          ) : null}

          {loading ? (
            <div className="divide-y divide-border/60">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="px-5 py-5 md:px-6">
                  <div className="h-24 animate-pulse rounded-xl bg-muted/35" />
                </div>
              ))}
            </div>
          ) : filteredClubs.length > 0 ? (
            <div className="divide-y divide-border/60">
              {filteredClubs.map((club) => (
                <DirectoryRow
                  key={club.id}
                  club={club}
                  isFollowed={followedClubIdSet.has(club.id)}
                  onToggleInterest={handleToggleInterest}
                  saving={savingClubIds.includes(club.id)}
                />
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center md:px-6">
              <p className="text-sm font-semibold text-foreground">No clubs match that search.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different keyword or switch back to all clubs.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {activeView === 'match' ? (
        <section className="panel-card rounded-xl p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="poster-label">Club Match</p>
              <h2 className="mt-2 font-display text-3xl leading-none text-foreground">
                AI recommendations for clubs you may want to explore.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Club Match works by looking at your PocketQuad calendar and the interests you have
                already marked. We use the same AI recommendation path already in the app to suggest
                new clubs you may be interested in. Press Interested if you want to learn more about
                a club, or No thanks to move on.
              </p>
              {matchOverview ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {matchOverview}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSelectView('directory')}
                className="rounded-full"
              >
                Browse directory
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadClubMatch(true)}
                disabled={matchLoading}
                className="rounded-full"
              >
                <Shuffle className="h-3.5 w-3.5" />
                {matchLoading ? 'Refreshing...' : 'Refresh suggestions'}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            {matchLoading && !hasLoadedMatch ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-6">
                <div className="h-56 animate-pulse rounded-xl bg-muted/35" />
              </div>
            ) : matchError ? (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {matchError}
              </div>
            ) : activeMatchCard ? (
              <AnimatePresence mode="wait">
                <motion.article
                  key={`${activeMatchCard.club.id}-${matchIndex}`}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.22 }}
                  className="rounded-xl border border-border/60 bg-card px-5 py-5 shadow-sm md:px-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
                    <Avatar className="h-14 w-14 rounded-xl border border-primary/15 bg-muted">
                      <AvatarFallback className="rounded-xl bg-muted text-base font-semibold text-primary">
                        {getClubInitials(activeMatchCard.club.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="subtle"
                          className="rounded-full px-3 py-1 text-[10px] normal-case tracking-normal"
                        >
                          {formatEnumLabel(activeMatchCard.club.category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {matchRemaining} suggestion{matchRemaining === 1 ? '' : 's'} left
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-3xl leading-none text-foreground">
                        {activeMatchCard.club.name}
                      </h3>

                      {activeMatchCard.hook ? (
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          {activeMatchCard.hook}
                        </p>
                      ) : null}

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {activeMatchCard.club.description}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {activeMatchCard.reason}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2.5 text-xs text-muted-foreground">
                        {activeMatchCard.club.meetingInfo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {activeMatchCard.club.meetingInfo}
                          </span>
                        ) : null}

                        {activeMatchCard.club.contactEmail ? (
                          <a
                            href={`mailto:${activeMatchCard.club.contactEmail}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 transition-colors hover:border-primary/20 hover:text-foreground"
                          >
                            <Mail className="h-3.5 w-3.5 text-primary" />
                            {activeMatchCard.club.contactEmail}
                          </a>
                        ) : null}
                      </div>

                      <ClubContactDetails club={activeMatchCard.club} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleMatchDecision('interested')}
                      disabled={savingClubIds.includes(activeMatchCard.club.id)}
                      className="rounded-full"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Interested
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleMatchDecision('no-thanks')}
                      className="rounded-full"
                    >
                      <X className="h-3.5 w-3.5" />
                      No thanks
                    </Button>

                    {activeMatchCard.club.websiteUrl ? (
                      <Button asChild variant="outline" className="rounded-full">
                        <a href={activeMatchCard.club.websiteUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Learn more
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </motion.article>
              </AnimatePresence>
            ) : hasLoadedMatch ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  You have worked through the current Club Match stack.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Refresh suggestions to pull a fresh set of recommendations from the current club
                  roster.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Open Club Match to load your first recommendation set.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
