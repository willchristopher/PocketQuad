import { useCallback, useSyncExternalStore } from 'react'

const LOCAL_STORAGE_CHANGE_EVENT = 'pocketquad-local-storage-change'
const NOOP = () => {}

function resolveInitialValue(initialValue) {
  return initialValue instanceof Function ? initialValue() : initialValue
}

function readStoredValue(key, initialValue) {
  if (typeof window === 'undefined') {
    return resolveInitialValue(initialValue)
  }

  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : resolveInitialValue(initialValue)
  } catch (error) {
    console.log(error)
    return resolveInitialValue(initialValue)
  }
}

export function useLocalStorage(key, initialValue) {
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

  const getSnapshot = useCallback(() => readStoredValue(key, initialValue), [initialValue, key])
  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => resolveInitialValue(initialValue),
  )

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value

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
    [key, storedValue],
  )

  return [storedValue, setValue]
}
