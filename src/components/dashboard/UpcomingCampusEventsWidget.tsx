'use client'

import Link from 'next/link'
import { MapPin, MoveRight } from 'lucide-react'

type EventItem = {
  id: string
  title: string
  startsAt: Date
  location: string
  category: 'Career' | 'Academic' | 'Community' | 'Wellness'
}

const eventItems: EventItem[] = [
  {
    id: '2',
    title: 'Career Fair - Tech and Engineering',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    location: 'Student Union Ballroom',
    category: 'Career',
  },
  {
    id: '6',
    title: 'Study Abroad Information Session',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    location: 'Global Center 201',
    category: 'Academic',
  },
  {
    id: '4',
    title: 'Hackathon: Build for Good',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    location: 'Innovation Hub',
    category: 'Community',
  },
  {
    id: '3',
    title: 'Outdoor Movie Night',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    location: 'Main Lawn',
    category: 'Wellness',
  },
]

function getDateLabel(date: Date): { day: string; month: string; weekday: string; time: string } {
  const day = new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date)
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date).toUpperCase()
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  return { day, month, weekday, time }
}

const categoryStyles: Record<EventItem['category'], string> = {
  Career: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Academic: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Community: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Wellness: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
}

export function UpcomingCampusEventsWidget() {
  return (
    <div className="space-y-2.5">
      {eventItems.map((event) => {
        const date = getDateLabel(event.startsAt)
        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group flex items-center gap-3 rounded-xl border border-border/50 px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="text-[10px] font-bold leading-none">{date.month}</span>
              <span className="text-lg font-extrabold leading-none">{date.day}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {date.weekday} at {date.time}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {event.location}
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${categoryStyles[event.category]}`}>
                {event.category}
              </span>
              <MoveRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
