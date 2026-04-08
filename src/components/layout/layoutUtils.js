import { Moon, Palette, Sun } from 'lucide-react'

const currentDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function getCurrentDateLabel() {
  return currentDateFormatter.format(new Date())
}

export function getThemeCycle(universityColors) {
  return universityColors ? ['light', 'dark', 'university'] : ['light', 'dark']
}

export function getNextThemeMode(themeMode, universityColors) {
  const cycle = getThemeCycle(universityColors)
  const currentIndex = cycle.indexOf(themeMode)
  return cycle[(currentIndex + 1) % cycle.length]
}

export function getThemeModeLabel({ mounted, themeMode, universityName }) {
  if (!mounted) {
    return 'Theme'
  }

  if (themeMode === 'light') {
    return 'Light'
  }

  if (themeMode === 'dark') {
    return 'Dark'
  }

  return `${universityName ?? 'University'} colors`
}

export function renderThemeModeIcon({ mounted, themeMode, className }) {
  if (!mounted || themeMode === 'light') {
    return <Sun className={className} />
  }

  if (themeMode === 'dark') {
    return <Moon className={className} />
  }

  return <Palette className={className} />
}

export function dispatchPaletteShortcut() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}
