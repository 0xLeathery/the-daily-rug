export default function SkeletonCard() {
  return (
    <div className="border border-brand-red/20 bg-brand-black">
      {/* Image placeholder with shimmer */}
      <div
        className="aspect-[16/9] w-full"
        style={{
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      {/* Text placeholder lines */}
      <div className="p-3 space-y-2">
        <div className="h-4 w-16 bg-brand-red/20 rounded-sm" />
        <div className="h-5 w-full bg-brand-white/10 rounded-sm" />
        <div className="h-5 w-3/4 bg-brand-white/10 rounded-sm" />
      </div>
    </div>
  )
}
