'use client'
import React, { useEffect, useState } from 'react'
import { Clock, MapPin, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const mockEvents = [
  { id: '1', title: 'Intro to Computer Science', startTime: new Date(new Date().setHours(9, 0)), endTime: new Date(new Date().setHours(10, 30)), type: 'campus' as const, location: 'Science Hall 101', instructor: 'Dr. Smith' },
  { id: '2', title: 'Lunch Break', startTime: new Date(new Date().setHours(12, 0)), endTime: new Date(new Date().setHours(13, 0)), type: 'personal' as const },
  { id: '3', title: 'Web Dev Lab', startTime: new Date(new Date().setHours(14, 0)), endTime: new Date(new Date().setHours(16, 0)), type: 'campus' as const, location: 'Tech Lab 3B', instructor: 'Prof. Jones' },
  { id: '4', title: 'Study Group', startTime: new Date(new Date().setHours(17, 0)), endTime: new Date(new Date().setHours(18, 30)), type: 'personal' as const, location: 'Library Room 4' },
]

const typeColors = {
  campus: 'bg-blue-500',
  personal: 'bg-emerald-500',
  officeHours: 'bg-amber-500',
  deadline: 'bg-red-500',
}

export function TodayScheduleWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  return (
    <div className="space-y-3 min-h-[240px]">
      {mockEvents.map((event, i) => {
        const start = new Date(event.startTime)
        const end = new Date(event.endTime)
        const isNow = now >= start && now <= end
        const isPast = now > end

        return (
          <div
            key={event.id}
            className={cn(
              "flex gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer group/item",
              isNow ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50",
              isPast && "opacity-40"
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Time column */}
            <div className="flex flex-col items-center gap-1 min-w-[52px]">
              <span className={cn("text-xs font-bold tabular-nums", isNow ? "text-primary" : "text-muted-foreground")}>
                {format(start, 'h:mm a')}
              </span>
              <div className={cn("w-1.5 h-1.5 rounded-full", typeColors[event.type])} />
              <span className="text-[10px] text-muted-foreground tabular-nums">{format(end, 'h:mm a')}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn("text-sm font-semibold truncate", isNow && "text-primary")}>
                  {event.title}
                </h4>
                {isNow && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                    <Zap className="w-2.5 h-2.5" /> NOW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.round((end.getTime() - start.getTime()) / 60000)}m
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
