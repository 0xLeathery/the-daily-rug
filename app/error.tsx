'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-brand-black flex items-center justify-center p-8">
      <div className="text-center px-4">
        <div className="text-9xl font-black font-display text-brand-red uppercase tracking-tight leading-none mb-4">
          ERROR
        </div>
        <h1 className="text-2xl font-black font-display text-brand-yellow uppercase tracking-widest mb-8">
          SOMETHING WENT WRONG
        </h1>
        <p className="text-brand-white/60 font-mono text-sm mb-10">
          The rug got pulled on this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block bg-brand-red text-brand-white font-display font-black uppercase tracking-wider px-8 py-3 text-sm hover:opacity-90 transition-opacity"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="inline-block bg-brand-yellow text-brand-black font-display font-black uppercase tracking-wider px-8 py-3 text-sm hover:bg-yellow-400 transition-colors"
          >
            BACK TO THE RUG
          </Link>
        </div>
      </div>
    </main>
  )
}
