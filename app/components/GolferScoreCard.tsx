import type { GolferScore } from '@/lib/types';

interface GolferScoreCardProps {
  golfer: GolferScore;
  isUpdating?: boolean;
  onMatchClick?: (golfer: GolferScore) => void;
}

export default function GolferScoreCard({ golfer, isUpdating = false, onMatchClick }: GolferScoreCardProps) {
  const statusClass = isUpdating
    ? 'border-blue-400 bg-blue-50/40 animate-pulse'
    : golfer.status === 'matched'
      ? 'border-slate-200 bg-white'
      : golfer.status === 'unmatched'
        ? 'border-amber-200 bg-amber-50'
        : 'border-rose-200 bg-rose-50';

  const statusTextClass =
    golfer.status === 'matched'
      ? ''
      : golfer.status === 'unmatched'
        ? 'text-amber-700'
        : 'text-rose-700';

  const statusText =
    golfer.status === 'matched'
      ? ''
      : golfer.status === 'unmatched'
        ? 'No GHIN golfer found'
        : 'No Score found';

  return (
    <div className={`rounded-xl border p-3 shadow-sm transition-all ${statusClass}`}>
      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{golfer.clubCaddieName}</p>
        </div>
        <div className="min-w-0">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onMatchClick?.(golfer)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="font-semibold">Match:</span>{' '}
            {golfer.matchedFirstName ? `${golfer.matchedFirstName} ${golfer.matchedLastName}` : 'No match'}
          </button>
        </div>
        <div className="min-w-0">
          {golfer.ghinNumber ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">GHIN:</span> {golfer.ghinNumber}
            </p>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div className="min-w-0">
          {isUpdating ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Updating...</span>
            </div>
          ) : golfer.score !== undefined ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Score:</span> {golfer.score}
            </p>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div className="flex min-h-5 items-center justify-end">
          {isUpdating ? (
            <span className="text-xs text-slate-400">Fetching score...</span>
          ) : statusText ? (
            <p className={`text-sm font-medium ${statusTextClass}`}>{statusText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
