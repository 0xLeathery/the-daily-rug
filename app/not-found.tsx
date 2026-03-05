import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-9xl font-black font-display text-brand-yellow uppercase tracking-tight leading-none mb-4">
          404
        </div>
        <h1 className="text-2xl font-black font-display text-brand-red uppercase tracking-widest mb-8">
          NOTHING TO SEE HERE
        </h1>
        <p className="text-brand-white text-sm uppercase tracking-wider mb-10 font-bold">
          THIS STORY HAS BEEN BURIED
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-yellow text-brand-black font-display font-black uppercase tracking-wider px-8 py-3 text-lg hover:bg-yellow-400 transition-colors"
        >
          BACK TO THE RUG
        </Link>
      </div>
    </div>
  )
}
