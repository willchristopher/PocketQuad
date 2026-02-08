'use client'

import React from 'react'
import { Clock, MapPin, Users2, Video, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const schedule = [
  { id: '1', title: 'CS 301 — Algorithms', time: '9:00 – 10:30 AM', location: 'Science Hall 101', students: 45, type: 'lecture', current: false },
  { id: '2', title: 'Office Hours', time: '2:00 – 4:00 PM', location: 'Science Hall 312', students: 3, type: 'office-hours', current: true },
  { id: '3', title: 'CS 480 — Machine Learning', time: '4:30 – 6:00 PM', location: 'Science Hall 205', students: 32, type: 'lecture', current: false },
  { id: '4', title: 'Faculty Meeting', time: '6:30 – 7:30 PM', location: 'Zoom', students: 12, type: 'meeting', current: false },
]

const typeColors: Record<string, string> = {
  lecture: 'bg-blue-500', 'office-hours': 'bg-emerald-500', meeting: 'bg-sky-500',
}

export function TodayOverviewCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-display font-bold text-sm">Today&apos;s Schedule</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{schedule.length} items</span>
      </div>

      <div className="divide-y divide-border/40">
        {schedule.map(item => (
          <div key={item.id} className={cn(
            "p-4 flex items-center gap-3.5 hover:bg-muted/20 transition-colors cursor-pointer",
            item.current && "bg-primary/[0.03]"
          )}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn("w-2.5 h-2.5 rounded-full", typeColors[item.type])} />
              {item.current && <span className="text-[9px] font-bold text-primary">NOW</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{item.title}</h4>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                <span className="flex items-center gap-1">
                  {item.location === 'Zoom' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  {item.location}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users2 className="w-3.5 h-3.5" />
              <span className="font-medium">{item.students}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </div>
        ))}
      </div>
    </div>
  )
}
