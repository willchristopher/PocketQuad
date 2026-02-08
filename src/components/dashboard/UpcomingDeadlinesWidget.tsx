'use client'
import React from 'react'
import { CheckCircle2, Circle, AlertTriangle, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { differenceInHours, differenceInDays } from 'date-fns'

const mockDeadlines = [
  { id: '1', title: 'Algorithm Analysis Paper', course: 'CS 301', dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), completed: false, priority: 'high' as const },
  { id: '2', title: 'Database Project Phase 1', course: 'CS 402', dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), completed: false, priority: 'medium' as const },
  { id: '3', title: 'Weekly Quiz', course: 'MATH 201', dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), completed: true, priority: 'low' as const },
  { id: '4', title: 'Research Paper Draft', course: 'ENG 302', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), completed: false, priority: 'medium' as const },
]

const priorityConfig = {
  high: { color: 'text-red-500', bg: 'bg-red-500/10', icon: Flame },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle },
  low: { color: 'text-muted-foreground', bg: 'bg-muted', icon: null },
}

export function UpcomingDeadlinesWidget() {
  const [deadlines, setDeadlines] = React.useState(mockDeadlines)

  const toggleComplete = (id: string) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, completed: !d.completed } : d))
  }

  const sorted = [...deadlines].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  return (
    <div className="space-y-1">
      {sorted.map(d => {
        const daysLeft = differenceInDays(d.dueDate, new Date())
        const hoursLeft = differenceInHours(d.dueDate, new Date())
        const isUrgent = hoursLeft < 24 && !d.completed
        const config = priorityConfig[d.priority]

        return (
          <div
            key={d.id}
            onClick={() => toggleComplete(d.id)}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group/dl",
              d.completed ? "opacity-40" : "hover:bg-muted/50"
            )}
          >
            <button className={cn("flex-shrink-0 transition-all", d.completed ? "text-emerald-500" : "text-muted-foreground group-hover/dl:text-primary")}>
              {d.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>

            <div className="flex-1 min-w-0">
              <h4 className={cn("text-sm font-medium truncate", d.completed && "line-through text-muted-foreground")}>
                {d.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground/70">{d.course}</span>
                <span className="text-border">•</span>
                <span className={cn(isUrgent && "text-red-500 font-bold")}>
                  {daysLeft === 0 ? (hoursLeft < 0 ? 'Overdue' : 'Due Today') : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                </span>
              </div>
            </div>

            {d.priority === 'high' && !d.completed && (
              <div className={cn("p-1 rounded-lg", config.bg)}>
                <Flame className={cn("w-3.5 h-3.5", config.color)} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
