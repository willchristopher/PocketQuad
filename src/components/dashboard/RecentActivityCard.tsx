'use client'

import React from 'react'
import { Activity, MessageSquare, FileText, Users2, BookOpen, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const activities = [
  { id: '1', action: 'Graded', detail: 'Assignment 4 — CS 301', time: '25 min ago', icon: Check, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { id: '2', action: 'Replied to', detail: 'Jordan Kim — project question', time: '1 hour ago', icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: '3', action: 'Posted', detail: 'Lecture slides — Week 10', time: '2 hours ago', icon: FileText, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: '4', action: 'Updated', detail: 'Office hours schedule', time: '3 hours ago', icon: BookOpen, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: '5', action: 'Met with', detail: '4 students in office hours', time: 'Yesterday', icon: Users2, color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
]

export function RecentActivityCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border/60 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="font-display font-bold text-sm">Recent Activity</h3>
      </div>

      <div className="divide-y divide-border/40">
        {activities.map(item => (
          <div key={item.id} className="p-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.color)}>
              <item.icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs"><span className="font-semibold">{item.action}</span> <span className="text-muted-foreground">{item.detail}</span></p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
