export default function ScoreboardSkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-fade-in">

      {/* Summary and Search Row Skeleton */}
      <div className="mb-4 flex flex-col items-center justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-24 rounded-md bg-slate-200 animate-pulse" />
          <span>•</span>
          <div className="h-4 w-20 rounded-md bg-slate-200 animate-pulse" />
          <span>•</span>
          <div className="h-4 w-28 rounded-md bg-slate-200 animate-pulse" />
        </div>

        <div className="w-full sm:w-auto">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <div className="h-4 w-4 rounded-full bg-slate-200 animate-pulse" />
            </div>
            <div className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pl-11 sm:w-64" />
          </div>
        </div>
      </div>

      {/* Scorecard Skeleton Items */}
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((id) => (
          <div
            key={id}
            className="rounded-xl border border-slate-200/80 bg-white/60 p-3 shadow-xs backdrop-blur-xs transition-all"
          >
            <div className="md:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-32 rounded-md bg-slate-200 animate-pulse" />
                <div className="h-4 w-24 rounded-md bg-slate-200/80 animate-pulse" />
              </div>
            </div>

            <div className="hidden md:grid md:items-center md:gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="h-4 w-36 rounded-md bg-slate-200 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="h-8 w-full rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="h-4 w-24 rounded-md bg-slate-200/80 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="h-4 w-16 rounded-md bg-slate-200/80 animate-pulse" />
              </div>
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
