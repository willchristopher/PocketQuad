import { Moon, Sun } from 'lucide-react'

const currentDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function getCurrentDateLabel() {
  return currentDateFormatter.format(new Date())
}

export function getThemeCycle() {
  return ['light', 'dark']
}

export function getNextThemeMode(themeMode) {
  const cycle = getThemeCycle()
  const currentIndex = cycle.indexOf(themeMode)
  return cycle[(currentIndex + 1) % cycle.length]
}

export function getThemeModeLabel({ mounted, themeMode }) {
  if (!mounted) {
    return 'Theme'
  }

  if (themeMode === 'dark') {
    return 'Dark'
  }

  return 'Light'
}

export function renderThemeModeIcon({ mounted, themeMode, className }) {
  if (!mounted || themeMode === 'light') {
    return <Sun className={className} />
  }

  return <Moon className={className} />
}

export function dispatchPaletteShortcut() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
}
