'use client'

import React from 'react'
import { Clock, Users2, Play, Pause, ChevronRight, Video, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfficeHoursStatusCard() {
  const isActive = true
  const queueCount = 3
  const maxQueue = 8

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden transition-all",
      isActive ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-card" : "border-border/60 bg-card"
    )}>
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isActive ? "bg-emerald-500/15" : "bg-muted")}>
              <Clock className={cn("w-4 h-4", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            </div>
            <h3 className="font-display font-bold text-sm">Office Hours</h3>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
            </div>
          )}
        </div>

        {isActive ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />2:00 – 4:00 PM</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />SH 312</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(queueCount / maxQueue) * 100}%` }} />
              </div>
              <span className="text-xs font-bold">{queueCount}/{maxQueue}</span>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
                <Users2 className="w-3.5 h-3.5" /> View Queue
              </button>
              <button className="px-3 py-2.5 rounded-xl border border-border/60 text-xs font-semibold hover:bg-muted transition-colors">
                <Pause className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-3">No active office hours session</p>
            <button className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
              <Play className="w-3.5 h-3.5" /> Start Session
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
