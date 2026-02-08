'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth/context'
import { apiRequest } from '@/lib/api/client'

export type ThemeMode = 'system' | 'light' | 'dark' | 'university'

type UniversityColors = {
  mainColor: string
  accentColor: string
}

type UniversityThemeContextValue = {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  universityColors: UniversityColors | null
  universityName: string | null
}

const UniversityThemeContext = React.createContext<UniversityThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'myquad-theme-mode'
const UNI_COLORS_STORAGE_KEY = 'myquad-uni-colors'
const UNI_NAME_STORAGE_KEY = 'myquad-uni-name'

function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function adjustHexLightness(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)

  r = Math.min(255, Math.max(0, r + amount))
  g = Math.min(255, Math.max(0, g + amount))
  b = Math.min(255, Math.max(0, b + amount))

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function applyUniversityColors(colors: UniversityColors) {
  const root = document.documentElement
  const primaryHSL = hexToHSL(colors.mainColor)
  const accentHSL = hexToHSL(colors.accentColor)
  const primaryIsLight = getLuminance(colors.mainColor) > 0.5
  const accentIsLight = getLuminance(colors.accentColor) > 0.5

  root.style.setProperty('--primary', primaryHSL)
  root.style.setProperty('--primary-foreground', primaryIsLight ? '224 71% 4%' : '0 0% 100%')
  root.style.setProperty('--ring', primaryHSL)

  // Build gradient from main color
  const lighterMain = adjustHexLightness(colors.mainColor, 40)
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, ${colors.mainColor} 0%, ${lighterMain} 100%)`,
  )
  root.style.setProperty(
    '--gradient-cool',
    `linear-gradient(135deg, ${colors.mainColor} 0%, ${colors.accentColor} 100%)`,
  )

  // Set accent as a custom property for components that use it
  root.style.setProperty('--uni-accent', accentHSL)
  root.style.setProperty('--uni-accent-fg', accentIsLight ? '224 71% 4%' : '0 0% 100%')
  root.style.setProperty('--uni-main-hex', colors.mainColor)
  root.style.setProperty('--uni-accent-hex', colors.accentColor)

  root.setAttribute('data-university-theme', 'true')
}

function removeUniversityColors() {
  const root = document.documentElement
  const props = [
    '--primary',
    '--primary-foreground',
    '--ring',
    '--gradient-primary',
    '--gradient-cool',
    '--uni-accent',
    '--uni-accent-fg',
    '--uni-main-hex',
    '--uni-accent-hex',
  ]
  props.forEach((prop) => root.style.removeProperty(prop))
  root.removeAttribute('data-university-theme')
}

type ThemeResponse = {
  name: string
  themeMainColor: string | null
  themeAccentColor: string | null
}

export function UniversityThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme: setNextTheme } = useTheme()
  const { profile } = useAuth()

  const [themeMode, setThemeModeState] = React.useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'system'
  })

  const [universityColors, setUniversityColors] = React.useState<UniversityColors | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = localStorage.getItem(UNI_COLORS_STORAGE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  const [universityName, setUniversityName] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(UNI_NAME_STORAGE_KEY)
  })

  // Sync theme mode from profile once loaded (only if no localStorage override)
  React.useEffect(() => {
    if (!profile?.notificationPreferences?.theme) return
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (!stored) {
      const mode = profile.notificationPreferences.theme as ThemeMode
      setThemeModeState(mode)
    }
  }, [profile?.notificationPreferences?.theme])

  // Fetch university colors
  React.useEffect(() => {
    const universityId = (profile as Record<string, unknown> | null)?.universityId as string | null | undefined
    if (!universityId) return

    apiRequest<ThemeResponse>(`/api/admin/universities/${universityId}`)
      .then((data) => {
        if (data.themeMainColor && data.themeAccentColor) {
          const colors = { mainColor: data.themeMainColor, accentColor: data.themeAccentColor }
          setUniversityColors(colors)
          localStorage.setItem(UNI_COLORS_STORAGE_KEY, JSON.stringify(colors))
        }
        setUniversityName(data.name)
        localStorage.setItem(UNI_NAME_STORAGE_KEY, data.name)
      })
      .catch(() => {
        // If fetch fails, use cached colors
      })
  }, [(profile as Record<string, unknown> | null)?.universityId])

  // Apply the theme whenever mode or colors change
  React.useEffect(() => {
    if (themeMode === 'university' && universityColors) {
      setNextTheme('system')
      applyUniversityColors(universityColors)
    } else {
      removeUniversityColors()
      setNextTheme(themeMode === 'university' ? 'system' : themeMode)
    }
  }, [themeMode, universityColors, setNextTheme])

  const setThemeMode = React.useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode)
      localStorage.setItem(THEME_STORAGE_KEY, mode)

      if (profile) {
        apiRequest('/api/users/me/preferences', {
          method: 'PATCH',
          body: { theme: mode },
        }).catch(() => {})
      }
    },
    [profile],
  )

  const value = React.useMemo<UniversityThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode,
      universityColors,
      universityName,
    }),
    [themeMode, setThemeMode, universityColors, universityName],
  )

  return <UniversityThemeContext.Provider value={value}>{children}</UniversityThemeContext.Provider>
}

export function useUniversityTheme() {
  const context = React.useContext(UniversityThemeContext)
  if (!context) {
    throw new Error('useUniversityTheme must be used inside UniversityThemeProvider')
  }
  return context
}
