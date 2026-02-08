'use client'

import React from 'react'
import { Zap, CalendarPlus, FileText, Upload, Settings, BookOpen, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const actions = [
  { label: 'Schedule OH', icon: CalendarPlus, href: '/faculty/office-hours', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { label: 'Post Announcement', icon: FileText, href: '#', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { label: 'Upload Material', icon: Upload, href: '#', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'View Analytics', icon: BarChart3, href: '#', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Course Settings', icon: Settings, href: '#', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  { label: 'Resources', icon: BookOpen, href: '#', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
]

export function QuickActionsCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-display font-bold text-sm">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {actions.map(action => (
          <Link key={action.label} href={action.href}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer text-center"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", action.color)}>
              <action.icon className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
