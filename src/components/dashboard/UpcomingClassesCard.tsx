'use client'

import React from 'react'
import { BookOpen, Users2, Clock, MapPin, ChevronRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const classes = [
  { id: '1', name: 'CS 301 — Algorithms', day: 'Mon / Wed / Fri', time: '9:00 – 10:30 AM', location: 'Science Hall 101', students: 45, trend: '+3 this week' },
  { id: '2', name: 'CS 480 — Machine Learning', day: 'Tue / Thu', time: '4:30 – 6:00 PM', location: 'Science Hall 205', students: 32, trend: '+1 this week' },
  { id: '3', name: 'CS 590 — NLP Seminar', day: 'Wednesday', time: '1:00 – 2:30 PM', location: 'Research Lab 104', students: 12, trend: 'No change' },
]

const colors = ['border-l-blue-500', 'border-l-sky-500', 'border-l-emerald-500']

export function UpcomingClassesCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border/60 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="font-display font-bold text-sm">Your Courses</h3>
      </div>

      <div className="divide-y divide-border/40">
        {classes.map((cls, i) => (
          <div key={cls.id} className={cn("p-4 border-l-[3px] hover:bg-muted/20 transition-colors cursor-pointer", colors[i])}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{cls.name}</h4>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.day}, {cls.time}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.location}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-[11px]">
              <span className="flex items-center gap-1 text-muted-foreground"><Users2 className="w-3 h-3" />{cls.students} students</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-3 h-3" />{cls.trend}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
