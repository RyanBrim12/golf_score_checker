import type { GolferScore } from '@/lib/types';

export default function GolferScoreCard({ golfer }: { golfer: GolferScore }) {
  const statusClass =
    golfer.status === 'matched'
      ? 'text-emerald-600'
      : golfer.status === 'unmatched'
        ? 'text-amber-600'
        : 'text-rose-600';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold text-slate-900">{golfer.clubCaddieName}</h2>
      <p className="mb-2 text-sm text-slate-700">
        <span className="font-semibold">Match:</span>{' '}
        {golfer.matchedFirstName ? `${golfer.matchedFirstName} ${golfer.matchedLastName}` : 'No match'}
      </p>
      <p className="mb-2 text-sm text-slate-700">
        <span className="font-semibold">GHIN:</span> {golfer.ghinNumber ?? 'N/A'}
      </p>
      <p className="mb-2 text-sm text-slate-700">
        <span className="font-semibold">Score:</span> {golfer.score ?? 'N/A'}
      </p>
      <p className={`text-sm font-medium ${statusClass}`}>
        <span className="font-semibold">Status:</span> {golfer.status}
      </p>
      {golfer.message ? <p className="mt-3 text-sm text-slate-600">{golfer.message}</p> : null}
    </div>
  );
}
