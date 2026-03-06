import SkeletonCard from '@/components/public/SkeletonCard'

export default function Loading() {
  return (
    <main className="min-h-screen bg-brand-black">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}
