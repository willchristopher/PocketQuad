import { useCallback, useSyncExternalStore } from 'react'

const NOOP = () => {}

function getMatches(query) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(query).matches
}

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return NOOP
      }

      const mediaQueryList = window.matchMedia(query)
      const handleChange = () => onStoreChange()

      mediaQueryList.addEventListener('change', handleChange)

      return () => mediaQueryList.removeEventListener('change', handleChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => getMatches(query), [query])

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
