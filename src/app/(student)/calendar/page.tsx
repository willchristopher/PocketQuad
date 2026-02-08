'use client'

import { UnifiedCalendar } from '@/components/calendar/UnifiedCalendar'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="animate-in-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Unified Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregated academic calendar items, campus events, and deadlines with filtering.
        </p>
      </div>
      <UnifiedCalendar />
    </div>
  )
}
