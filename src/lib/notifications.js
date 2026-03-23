import {
  Bell,
  BellRing,
  CalendarClock,
  CalendarX2,
  Megaphone,
  TimerReset,
} from 'lucide-react'

export const notificationFilters = [
  'All',
  'Unread',
  'Announcements',
  'Events',
  'Office Hours',
  'Deadlines',
  'System',
]

const notificationMeta = {
  ANNOUNCEMENT: {
    label: 'Announcement',
    filter: 'Announcements',
    icon: Megaphone,
    badgeClassName: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconClassName: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  NEW_EVENT: {
    label: 'New event',
    filter: 'Events',
    icon: CalendarClock,
    badgeClassName: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    iconClassName: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  EVENT_UPDATED: {
    label: 'Event update',
    filter: 'Events',
    icon: BellRing,
    badgeClassName: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    iconClassName: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  EVENT_CANCELLED: {
    label: 'Event canceled',
    filter: 'Events',
    icon: CalendarX2,
    badgeClassName: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    iconClassName: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  OFFICE_HOUR: {
    label: 'Office hours',
    filter: 'Office Hours',
    icon: TimerReset,
    badgeClassName: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    iconClassName: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  DEADLINE: {
    label: 'Deadline',
    filter: 'Deadlines',
    icon: CalendarClock,
    badgeClassName: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    iconClassName: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  SYSTEM: {
    label: 'System',
    filter: 'System',
    icon: Bell,
    badgeClassName: 'border-border/70 bg-muted/40 text-foreground',
    iconClassName: 'bg-muted text-muted-foreground',
  },
}

export function getNotificationMeta(type) {
  return notificationMeta[type] ?? notificationMeta.SYSTEM
}

export function getNotificationFilter(type) {
  return getNotificationMeta(type).filter
}

export function formatNotificationTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function isExternalNotificationUrl(url) {
  return typeof url === 'string' && /^https?:\/\//.test(url)
}
