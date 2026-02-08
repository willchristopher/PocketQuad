'use client'
import React from 'react'
import { MapPin, Heart, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const mockEvents = [
  { id: '1', title: 'Career Fair 2026', date: new Date(new Date().setDate(new Date().getDate() + 2)), location: 'Student Union', category: 'career', interestedCount: 234, isInterested: false },
  { id: '2', title: 'Basketball vs. State', date: new Date(new Date().setDate(new Date().getDate() + 4)), location: 'Arena', category: 'sports', interestedCount: 512, isInterested: true },
  { id: '3', title: 'CS Hackathon', date: new Date(new Date().setDate(new Date().getDate() + 7)), location: 'Engineering', category: 'academic', interestedCount: 89, isInterested: false },
]

const catColors: Record<string, string> = {
  career: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sports: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  academic: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  social: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  arts: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

export function CampusEventsWidget() {
  const [events, setEvents] = React.useState(mockEvents)

  const toggleInterest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, isInterested: !ev.isInterested, interestedCount: ev.isInterested ? ev.interestedCount - 1 : ev.interestedCount + 1 } : ev))
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <a href={`/events/${event.id}`} key={event.id} className="flex gap-3.5 p-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer group/ev">
          {/* Date pill */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover/ev:bg-primary group-hover/ev:text-white transition-colors">
            <span className="text-[10px] font-bold uppercase leading-none">{format(event.date, 'MMM')}</span>
            <span className="text-lg font-extrabold leading-none">{format(event.date, 'd')}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate group-hover/ev:text-primary transition-colors">{event.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.interestedCount}</span>
            </div>
          </div>

          <button
            onClick={(e) => toggleInterest(event.id, e)}
            className={cn("p-1.5 rounded-lg transition-all self-center", event.isInterested ? "text-red-500" : "text-muted-foreground hover:text-red-500")}
          >
            <Heart className={cn("w-4 h-4", event.isInterested && "fill-current")} />
          </button>
        </a>
      ))}
    </div>
  )
}
