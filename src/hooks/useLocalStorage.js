import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'

const LOCAL_STORAGE_CHANGE_EVENT = 'pocketquad-local-storage-change'
const NOOP = () => {}

function resolveInitialValue(initialValue) {
  return initialValue instanceof Function ? initialValue() : initialValue
}

function readStoredValue(key, initialValue) {
  if (typeof window === 'undefined') {
    return JSON.stringify(resolveInitialValue(initialValue))
  }

  try {
    const item = window.localStorage.getItem(key)
    return item ?? JSON.stringify(resolveInitialValue(initialValue))
  } catch (error) {
    console.log(error)
    return JSON.stringify(resolveInitialValue(initialValue))
  }
}

export function useLocalStorage(key, initialValue) {
  const [stableInitialValue] = useState(() => resolveInitialValue(initialValue))

  const subscribe = useCallback(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return NOOP
      }

      const handleChange = (event) => {
        if (event.type === 'storage' && event.key !== key) {
          return
        }

        if (event.type === LOCAL_STORAGE_CHANGE_EVENT && event.detail?.key !== key) {
          return
        }

        onStoreChange()
      }

      window.addEventListener('storage', handleChange)
      window.addEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleChange)

      return () => {
        window.removeEventListener('storage', handleChange)
        window.removeEventListener(LOCAL_STORAGE_CHANGE_EVENT, handleChange)
      }
    },
    [key],
  )

  const getSnapshot = useCallback(
    () => readStoredValue(key, stableInitialValue),
    [key, stableInitialValue],
  )
  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => JSON.stringify(stableInitialValue),
  )

  const parsedValue = useMemo(() => {
    try {
      return JSON.parse(storedValue)
    } catch (error) {
      console.log(error)
      return stableInitialValue
    }
  }, [stableInitialValue, storedValue])

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(parsedValue) : value

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          window.dispatchEvent(
            new CustomEvent(LOCAL_STORAGE_CHANGE_EVENT, {
              detail: { key },
            }),
          )
        }
      } catch (error) {
        console.log(error)
      }
    },
    [key, parsedValue],
  )

  return [parsedValue, setValue]
}
