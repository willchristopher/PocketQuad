'use client';

import React from 'react';

const STORAGE_KEY = 'pq-faculty-visible-pages';
const ALL_FACULTY_PAGES = ['office-hours', 'events', 'announcements', 'buildings'];

const PAGE_LABELS = {
  'office-hours': 'Office Hours',
  events: 'Events',
  announcements: 'Announcements',
  buildings: 'Buildings',
};

const FacultyPagesContext = React.createContext(undefined);

export function FacultyPagesProvider({ children }) {
  const [visiblePages, setVisiblePagesRaw] = React.useState(ALL_FACULTY_PAGES);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setVisiblePagesRaw(parsed.filter((p) => ALL_FACULTY_PAGES.includes(p)));
        }
      }
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  const setVisiblePages = React.useCallback((pages) => {
    const filtered = pages.filter((p) => ALL_FACULTY_PAGES.includes(p));
    setVisiblePagesRaw(filtered);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      /* noop */
    }
  }, []);

  const togglePage = React.useCallback((pageId) => {
    setVisiblePagesRaw((current) => {
      const next = current.includes(pageId)
        ? current.filter((p) => p !== pageId)
        : [...current, pageId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const isPageVisible = React.useCallback(
    (pageId) => visiblePages.includes(pageId),
    [visiblePages],
  );

  const value = React.useMemo(
    () => ({
      visiblePages,
      setVisiblePages,
      togglePage,
      isPageVisible,
      allPages: ALL_FACULTY_PAGES,
      pageLabels: PAGE_LABELS,
      hydrated,
    }),
    [visiblePages, setVisiblePages, togglePage, isPageVisible, hydrated],
  );

  return (
    <FacultyPagesContext.Provider value={value}>
      {children}
    </FacultyPagesContext.Provider>
  );
}

export function useFacultyPages() {
  const context = React.useContext(FacultyPagesContext);
  if (!context) {
    throw new Error('useFacultyPages must be used inside FacultyPagesProvider');
  }
  return context;
}

export { ALL_FACULTY_PAGES, PAGE_LABELS };
