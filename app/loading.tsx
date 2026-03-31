export default function Loading() {
  return (
    <div className="min-h-screen pt-32 px-6 max-w-7xl mx-auto space-y-24 animate-pulse">
      {/* Hero Skeleton */}
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-2/3 h-16 md:h-24 bg-slate-800 rounded-lg" />
        <div className="w-1/2 h-8 bg-slate-800 rounded-lg" />
        <div className="w-full max-w-md h-12 bg-slate-800 rounded-full mt-8" />
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-8">
        <div className="w-48 h-10 bg-slate-800 rounded-md" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] w-full bg-slate-800 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-slate-800 via-slate-700/50 to-slate-800 animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
