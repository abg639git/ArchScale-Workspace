import * as React from "react"

export function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    const fallback = typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue

    if (typeof window === "undefined") return fallback

    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? fallback : JSON.parse(saved) as T
    } catch {
      return fallback
    }
  })

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }, [key, value])

  return [value, setValue]
}