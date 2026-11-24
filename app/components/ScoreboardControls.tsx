interface ScoreboardControlsProps {
  date: string;
  loading: boolean;
  onDateChange: (date: string) => void;
  onFetch: () => void;
}

export default function ScoreboardControls({
  date,
  loading,
  onDateChange,
  onFetch,
}: ScoreboardControlsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="date">
          Tee sheet date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm outline-none ring-0 focus:border-blue-500"
        />
      </div>
      <div>
        <button
          className="flex min-h-[48px] w-full min-w-[168px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500 disabled:opacity-80 md:w-auto"
          type="button"
          onClick={onFetch}
          disabled={loading}
        >
          {loading ? (
            <div className="flex h-5 w-5 items-center justify-center">
              <svg
                className="h-4 w-4 animate-spin text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          ) : (
            'Fetch Scores'
          )}
        </button>
      </div>
    </div>
  );
}
