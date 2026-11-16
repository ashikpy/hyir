import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * Returns `false` during SSR and hydration, `true` once rendering on the client.
 * Replaces the `useEffect(() => setMounted(true), [])` pattern.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
