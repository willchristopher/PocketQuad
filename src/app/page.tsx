'use client'

import Link from 'next/link'
import { GraduationCap, School, ShieldCheck, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const portals = [
  {
    title: 'Student Portal',
    description: 'Classes, events, campus life, and everything in between.',
    icon: GraduationCap,
    href: '/login?redirect=%2Fdashboard',
    gradient: 'from-blue-600 to-sky-500',
    shadow: 'shadow-blue-500/20',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    tag: 'Most Popular',
  },
  {
    title: 'Faculty Portal',
    description: 'Office hours, student management, and course tools.',
    icon: School,
    href: '/login?redirect=%2Ffaculty%2Fdashboard',
    gradient: 'from-emerald-600 to-teal-500',
    shadow: 'shadow-emerald-500/20',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    tag: 'Instructors',
  },
  {
    title: 'Admin Portal',
    description: 'System settings, analytics, and campus configuration.',
    icon: ShieldCheck,
    href: '/login?redirect=%2Fadmin',
    gradient: 'from-slate-700 to-slate-500',
    shadow: 'shadow-slate-500/20',
    iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    tag: 'Restricted',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-background to-blue-50/50 dark:from-slate-950/40 dark:via-background dark:to-blue-950/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-400/8 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl w-full text-center space-y-5 mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter text-foreground">
          MyQuad
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Your all-in-one campus experience. Events, schedules, connections — all in one place.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full px-2"
      >
        {portals.map((portal) => {
          const Icon = portal.icon
          return (
            <motion.div key={portal.title} variants={item}>
              <Link href={portal.href} className="block group">
                <div className="relative bg-card rounded-xl border border-border/60 p-6 h-full transition-all duration-200 hover:border-border hover:-translate-y-0.5 hover:shadow-lg overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg ${portal.iconBg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {portal.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-display font-bold mb-1.5 group-hover:text-primary transition-colors">
                      {portal.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      {portal.description}
                    </p>

                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${portal.gradient} text-white text-sm font-medium shadow-md ${portal.shadow} group-hover:shadow-lg transition-all duration-200`}>
                      Enter Portal
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 text-xs text-muted-foreground"
      >
        Select a role to get started.
      </motion.p>
    </div>
  )
}
