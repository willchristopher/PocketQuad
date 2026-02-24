'use client'

import React from 'react'

const SIDEBAR_COLLAPSED_KEY = 'myquad-sidebar-collapsed'

type SidebarContextValue = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ sidebarCollapsed, toggleSidebar }),
    [sidebarCollapsed, toggleSidebar],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebarCollapsed() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebarCollapsed must be used inside SidebarProvider')
  }
  return context
}
