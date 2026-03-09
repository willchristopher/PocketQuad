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

const THEME_STORAGE_KEY = 'pocketquad-theme-mode'
const UNI_COLORS_STORAGE_KEY = 'pocketquad-uni-colors'
const UNI_NAME_STORAGE_KEY = 'pocketquad-uni-name'

function getScopedStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`
}

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

function hexToRGB(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `${r}, ${g}, ${b}`
}

function applyUniversityColors(colors: UniversityColors) {
  const root = document.documentElement
  const mainHSL = hexToHSL(colors.mainColor)
  const accentHSL = hexToHSL(colors.accentColor)
  const accentIsLight = getLuminance(colors.accentColor) > 0.5
  const mainRgb = hexToRGB(colors.mainColor)
  const accentRgb = hexToRGB(colors.accentColor)

  // Use accent color (e.g. gold) as the primary so toggles, tabs, badges, etc. show it
  root.style.setProperty('--primary', accentHSL)
  root.style.setProperty('--primary-foreground', accentIsLight ? '222 47% 11%' : '0 0% 100%')
  root.style.setProperty('--ring', accentHSL)
  root.style.setProperty('--brand-primary', colors.mainColor)
  root.style.setProperty('--brand-secondary', colors.accentColor)

  // Build brand gradients that keep the school's main color present.
  const lighterMain = adjustHexLightness(colors.mainColor, 32)
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, ${colors.mainColor} 0%, ${colors.accentColor} 100%)`,
  )
  root.style.setProperty(
    '--gradient-cool',
    `linear-gradient(135deg, ${colors.mainColor} 0%, ${colors.accentColor} 100%)`,
  )
  root.style.setProperty(
    '--gradient-surface',
    `linear-gradient(180deg, rgba(${mainRgb}, 0.08) 0%, rgba(${accentRgb}, 0.03) 100%)`,
  )
  root.style.setProperty('--shadow-accent', `0 10px 24px rgba(${accentRgb}, 0.24)`)
  root.style.setProperty('--shadow-accent-lg', `0 18px 36px rgba(${accentRgb}, 0.32)`)

  // Keep uni-specific custom properties for components that need the raw values
  root.style.setProperty('--uni-accent', accentHSL)
  root.style.setProperty('--uni-accent-fg', accentIsLight ? '222 47% 11%' : '0 0% 100%')
  root.style.setProperty('--uni-main', mainHSL)
  root.style.setProperty('--uni-main-hex', colors.mainColor)
  root.style.setProperty('--uni-accent-hex', colors.accentColor)
  root.style.setProperty('--uni-main-soft', lighterMain)

  root.setAttribute('data-university-theme', 'true')
}

function removeUniversityColors() {
  const root = document.documentElement
  const props = [
    '--primary',
    '--primary-foreground',
    '--ring',
    '--brand-primary',
    '--brand-secondary',
    '--gradient-primary',
    '--gradient-cool',
    '--gradient-surface',
    '--shadow-accent',
    '--shadow-accent-lg',
    '--uni-accent',
    '--uni-accent-fg',
    '--uni-main',
    '--uni-main-hex',
    '--uni-accent-hex',
    '--uni-main-soft',
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
  const profileId = profile?.id ?? null
  const universityId = (profile as Record<string, unknown> | null)?.universityId as string | null | undefined

  const [themeMode, setThemeModeState] = React.useState<ThemeMode>('system')
  const [universityColors, setUniversityColors] = React.useState<UniversityColors | null>(null)
  const [universityName, setUniversityName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.removeItem(THEME_STORAGE_KEY)
    localStorage.removeItem(UNI_COLORS_STORAGE_KEY)
    localStorage.removeItem(UNI_NAME_STORAGE_KEY)

    if (!profileId) {
      setThemeModeState('system')
      setUniversityColors(null)
      setUniversityName(null)
      return
    }

    const storedTheme = localStorage.getItem(getScopedStorageKey(THEME_STORAGE_KEY, profileId)) as ThemeMode | null
    const storedName = localStorage.getItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId))

    setThemeModeState(storedTheme ?? (profile?.notificationPreferences?.theme as ThemeMode | undefined) ?? 'system')
    setUniversityName(storedName)

    try {
      const cachedColors = localStorage.getItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId))
      setUniversityColors(cachedColors ? (JSON.parse(cachedColors) as UniversityColors) : null)
    } catch {
      setUniversityColors(null)
    }
  }, [profileId, profile?.notificationPreferences?.theme])

  // Fetch university colors
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    if (!profileId) {
      return
    }

    if (!universityId) {
      setUniversityColors(null)
      setUniversityName(null)
      localStorage.removeItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId))
      localStorage.removeItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId))
      return
    }

    apiRequest<ThemeResponse>(`/api/universities/${universityId}/theme`)
      .then((data) => {
        if (data.themeMainColor && data.themeAccentColor) {
          const colors = { mainColor: data.themeMainColor, accentColor: data.themeAccentColor }
          setUniversityColors(colors)
          localStorage.setItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId), JSON.stringify(colors))
        } else {
          setUniversityColors(null)
          localStorage.removeItem(getScopedStorageKey(UNI_COLORS_STORAGE_KEY, profileId))
        }
        setUniversityName(data.name)
        localStorage.setItem(getScopedStorageKey(UNI_NAME_STORAGE_KEY, profileId), data.name)
      })
      .catch(() => {
        // If fetch fails, use cached colors
      })
  }, [profileId, universityId])

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
      if (profileId) {
        localStorage.setItem(getScopedStorageKey(THEME_STORAGE_KEY, profileId), mode)
      }

      if (profile) {
        apiRequest('/api/users/me/preferences', {
          method: 'PATCH',
          body: { theme: mode },
        }).catch(() => {})
      }
    },
    [profile, profileId],
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
