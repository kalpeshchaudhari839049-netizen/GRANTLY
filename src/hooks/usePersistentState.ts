import { useEffect, useState } from 'react'
import { readStorage, writeStorage } from '../utils/storage'

export function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStorage(key, initialValue))

  useEffect(() => {
    writeStorage(key, value)
  }, [key, value])

  return [value, setValue]
}
