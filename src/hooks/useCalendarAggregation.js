'use client';

import React from 'react';
import { apiRequest, ApiClientError } from '@/lib/api/client';

/**
 * useCalendarAggregation - Server-side aggregated calendar data
 * Replaces 3+ separate API calls with a single optimized request
 * 
 * Returns unified events with server-computed stats and grouping
 */
export function useCalendarAggregation({ start, end, groupBy = 'date' } = {}) {
  const [events, setEvents] = React.useState([]);
  const [grouped, setGrouped] = React.useState(null);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    if (!start || !end) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: start instanceof Date ? start.toISOString() : start,
        end: end instanceof Date ? end.toISOString() : end,
        groupBy,
      });

      const response = await apiRequest(`/api/calendar/aggregated?${params.toString()}`);

      setEvents(response.events || []);
      setGrouped(response.grouped || null);
      setStats(response.stats || null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Unable to load calendar data';
      setError(message);
      setEvents([]);
      setGrouped(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [start, end, groupBy]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    events,
    grouped,
    stats,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for quick dashboard calendar summary
 * Reduces 3 API calls to 1
 */
export function useCalendarSummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return useCalendarAggregation({
    start: monthStart,
    end: monthEnd,
    groupBy: 'type',
  });
}
