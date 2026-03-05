import type { FavoriteItem } from '@/lib/studentData'

const FAVORITES_KEY = 'pocketquad-favorites'
const ALLOWED_KINDS: FavoriteItem['kind'][] = ['building', 'resource', 'club']

function safeParseFavorites(value: string | null): FavoriteItem[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as FavoriteItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item) =>
        typeof item?.id === 'string' &&
        typeof item?.kind === 'string' &&
        ALLOWED_KINDS.includes(item.kind as FavoriteItem['kind']) &&
        typeof item?.label === 'string' &&
        typeof item?.subtitle === 'string' &&
        typeof item?.href === 'string',
    )
  } catch {
    return []
  }
}

export function readFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return []
  return safeParseFavorites(window.localStorage.getItem(FAVORITES_KEY))
}

export function writeFavorites(items: FavoriteItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
}

export function toggleFavoriteItem(target: FavoriteItem): FavoriteItem[] {
  const current = readFavorites()
  const exists = current.some((item) => item.id === target.id)
  const next = exists ? current.filter((item) => item.id !== target.id) : [target, ...current]
  writeFavorites(next)
  return next
}

export function isFavorite(id: string): boolean {
  return readFavorites().some((item) => item.id === id)
}
