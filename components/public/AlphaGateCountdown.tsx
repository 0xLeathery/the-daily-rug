'use client'

import { useState, useEffect } from 'react'
import { formatCountdown } from '@/lib/articles/gate'

interface AlphaGateCountdownProps {
  alphaGateUntil: string
  onExpired: () => void
}

export function AlphaGateCountdown({ alphaGateUntil, onExpired }: AlphaGateCountdownProps) {
  // Lazy initializer prevents re-lock-on-rerender: time is computed once at mount
  const [timeLeft, setTimeLeft] = useState<number>(
    () => Math.max(0, new Date(alphaGateUntil).getTime() - Date.now())
  )

  useEffect(() => {
    // If already expired at mount, fire immediately
    if (timeLeft <= 0) {
      onExpired()
      return
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(alphaGateUntil).getTime() - Date.now())
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onExpired()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [alphaGateUntil, onExpired])

  // Parent handles the unlocked state; return null when done
  if (timeLeft <= 0) return null

  return (
    <div className="text-brand-yellow font-bold text-sm">
      Free in {formatCountdown(timeLeft)}
    </div>
  )
}
