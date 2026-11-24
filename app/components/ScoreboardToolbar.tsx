interface ScoreboardToolbarProps {
  shownCount: number;
  totalCount: number;
  matchedCount: number;
  scoreCount: number;
  search: string;
  onSearchChange: (search: string) => void;
}

export default function ScoreboardToolbar({
  shownCount,
  totalCount,
  matchedCount,
  scoreCount,
  search,
  onSearchChange,
}: ScoreboardToolbarProps) {
  return (
    <div className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row sm:items-center">
      <p className="text-xs md:text-sm text-slate-700">
        <span className="font-semibold">{shownCount}</span> golfers shown
        {search ? (
          <>
            {' '}
            of <span className="font-semibold">{totalCount}</span>
          </>
        ) : null}
        , <span className="font-semibold">{matchedCount}</span> matched,{' '}
        <span className="font-semibold">{scoreCount}</span> with scores.
      </p>
      <div className="w-full md:w-[280px]">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg
              className="h-4 w-4 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.386a1 1 0 01-1.414 1.415l-4.387-4.387zm-4.9.68a6 6 0 100-12 6 6 0 000 12z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name..."
            className="w-full py-1 rounded-xl border border-slate-200 bg-slate-50 px-4 pl-11 pr-4 text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
