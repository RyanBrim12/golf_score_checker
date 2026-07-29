export default function ScoreboardSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-fade-in">

      {/* Summary Row Skeleton */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <div className="h-4 w-24 rounded-md bg-slate-200 animate-pulse" />
        <span>•</span>
        <div className="h-4 w-20 rounded-md bg-slate-200 animate-pulse" />
        <span>•</span>
        <div className="h-4 w-28 rounded-md bg-slate-200 animate-pulse" />
      </div>

      {/* Scorecard Skeleton Items */}
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((id) => (
          <div
            key={id}
            className="rounded-xl border border-slate-200/80 bg-white/60 p-3 shadow-xs backdrop-blur-xs transition-all"
          >
            <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.1fr)]">
              {/* Golfer Name */}
              <div className="min-w-0">
                <div className="h-4 w-32 rounded-md bg-slate-200 animate-pulse" />
              </div>
              {/* Match Button */}
              <div className="min-w-0">
                <div className="h-8 w-full rounded-lg border border-slate-100 bg-slate-100/70 animate-pulse" />
              </div>
              {/* GHIN Number */}
              <div className="min-w-0">
                <div className="h-4 w-24 rounded-md bg-slate-200/80 animate-pulse" />
              </div>
              {/* Score */}
              <div className="min-w-0">
                <div className="h-4 w-16 rounded-md bg-slate-200/80 animate-pulse" />
              </div>
              {/* Status */}
              <div className="flex min-h-5 items-center justify-end">
                <div className="h-4 w-28 rounded-md bg-slate-200/60 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
