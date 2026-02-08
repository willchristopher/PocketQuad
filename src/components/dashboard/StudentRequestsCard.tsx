'use client'

import React from 'react'
import { Users2, CalendarDays, MessageSquare, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const requests = [
  { id: '1', student: 'Jordan Kim', type: 'appointment', detail: 'Wants to discuss project proposal', time: '30 min ago', initials: 'JK' },
  { id: '2', student: 'Taylor Brown', type: 'message', detail: 'Question about midterm format', time: '1 hour ago', initials: 'TB' },
  { id: '3', student: 'Casey Lee', type: 'appointment', detail: 'Office hours booking for Thursday', time: '2 hours ago', initials: 'CL' },
]

const typeIcons: Record<string, React.ElementType> = { appointment: CalendarDays, message: MessageSquare }
const typeColors: Record<string, string> = {
  appointment: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  message: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}
const avatarColors = ['bg-blue-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500']

export function StudentRequestsCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Users2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="font-display font-bold text-sm">Student Requests</h3>
        </div>
        <span className="pill-btn text-[10px] bg-primary text-primary-foreground font-bold">{requests.length}</span>
      </div>

      <div className="divide-y divide-border/40">
        {requests.map((req, i) => {
          const TypeIcon = typeIcons[req.type] || MessageSquare
          return (
            <div key={req.id} className="p-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", avatarColors[i % avatarColors.length])}>
                {req.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{req.student}</span>
                  <span className={cn("pill-btn text-[9px] font-bold px-1.5 py-0", typeColors[req.type])}>{req.type}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{req.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{req.time}</span>
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t border-border/60">
        <button className="w-full text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1.5">
          View All Requests →
        </button>
      </div>
    </div>
  )
}
