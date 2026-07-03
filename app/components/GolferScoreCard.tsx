import type { GolferScore } from '@/lib/types';

export default function GolferScoreCard({ golfer }: { golfer: GolferScore }) {
  const statusClass = golfer.status === 'matched' ? 'status-ok' : golfer.status === 'unmatched' ? 'status-warning' : 'status-error';

  return (
    <div className="card">
      <h2>{golfer.clubCaddieName}</h2>
      <p>
        <strong>Match:</strong>{' '}
        {golfer.matchedFirstName ? `${golfer.matchedFirstName} ${golfer.matchedLastName}` : 'No match'}
      </p>
      <p>
        <strong>GHIN:</strong> {golfer.ghinNumber ?? 'N/A'}
      </p>
      <p>
        <strong>Score:</strong> {golfer.score ?? 'N/A'}
      </p>
      <p className={statusClass}>
        <strong>Status:</strong> {golfer.status}
      </p>
      {golfer.message ? <p>{golfer.message}</p> : null}
    </div>
  );
}
