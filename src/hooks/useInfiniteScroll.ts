import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

export function useInfiniteScroll(
  callback: () => void,
  enabled: boolean = true
) {
  const { ref, inView } = useInView({ threshold: 0.1 })

  useEffect(() => {
    if (inView && enabled) callback()
  }, [inView, enabled, callback])

  return ref
}
