import type { ArticleStatus } from '@/lib/supabase/types'

interface StatusBadgeProps {
  status: ArticleStatus
  alphaGateUntil: string | null
}

/**
 * Server Component — renders LIVE, TOKEN GATED, or REDACTED badge.
 * Note: Token gate transition from TOKEN GATED to LIVE happens via client
 * revalidation. This component reflects the state at render time.
 */
export default function StatusBadge({ status, alphaGateUntil }: StatusBadgeProps) {
  let label: string
  let className: string

  if (status === 'redacted') {
    label = 'REDACTED'
    className = 'bg-brand-red text-brand-white'
  } else if (
    status === 'published' &&
    alphaGateUntil !== null &&
    new Date(alphaGateUntil) > new Date()
  ) {
    label = 'TOKEN GATED'
    className = 'bg-brand-yellow text-brand-black'
  } else {
    label = 'LIVE'
    className = 'bg-[#00cc44] text-brand-white'
  }

  return (
    <span
      className={`inline-block font-display font-bold uppercase tracking-widest text-xs px-2 py-0.5 ${className}`}
    >
      {label}
    </span>
  )
}
