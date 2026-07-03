import type { GolferScore } from '@/lib/types';

export default function GolferScoreCard({ golfer }: { golfer: GolferScore }) {
  const statusClass =
    golfer.status === 'matched'
      ? ''
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
    <div className={`rounded-xl border border-slate-200 p-3 shadow-sm ${statusClass}`}>
      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{golfer.clubCaddieName}</h2>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Match:</span>{' '}
            {golfer.matchedFirstName ? `${golfer.matchedFirstName} ${golfer.matchedLastName}` : 'No match'}
          </p>
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
          {golfer.score !== undefined ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Score:</span> {golfer.score}
            </p>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div className="flex min-h-5 items-center justify-end">
          {statusText ? <p className={`text-sm font-medium ${statusTextClass}`}>{statusText}</p> : null}
        </div>
      </div>
    </div>
  );
}
