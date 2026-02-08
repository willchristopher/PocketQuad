'use client'

import React from 'react'
import { MapPin, Clock, Heart, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Event } from '@/types'

const categoryColors: Record<string, string> = {
  Entertainment: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Academic: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  Career: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  Sports: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  Social: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
}

interface EventListProps {
  events: Event[]
  compact?: boolean
}

export function EventList({ events, compact }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No events to display.
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {events.map((event) => {
        const date = new Date(event.date)
        const day = date.toLocaleDateString('en', { day: 'numeric' })
        const month = date.toLocaleDateString('en', { month: 'short' }).toUpperCase()

        return (
          <Link key={event.id} href={`/events/${event.id}`} className="group block">
            <div className={cn(
              "flex items-start gap-3.5 rounded-2xl border border-border/60 bg-card hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all",
              compact ? "p-3" : "p-4"
            )}>
              <div className={cn(
                "rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0",
                compact ? "w-10 h-10" : "w-12 h-12"
              )}>
                <span className={cn("font-extrabold text-primary leading-none", compact ? "text-sm" : "text-base")}>{day}</span>
                <span className="text-[8px] font-bold text-primary/60">{month}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("pill-btn text-[10px] font-bold", categoryColors[event.category] || 'bg-muted')}>
                    {event.category}
                  </span>
                </div>
                <h3 className={cn(
                  "font-display font-bold group-hover:text-primary transition-colors line-clamp-1 mt-0.5",
                  compact ? "text-xs" : "text-sm"
                )}>{event.title}</h3>
                {!compact && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{event.time}</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{event.location}</span>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
