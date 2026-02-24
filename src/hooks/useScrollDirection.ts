'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Returns `true` when the user is actively scrolling down
 * (and has scrolled past the initial threshold of 50 px).
 * Returns `false` when scrolling up or at the top.
 */
export function useScrollDirection(threshold = 10) {
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - lastScrollY.current) < threshold) return
      setIsScrollingDown(y > lastScrollY.current && y > 50)
      lastScrollY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return isScrollingDown
}
