'use client';

import { useMemo, useState } from 'react';
import GolferScoreCard from './GolferScoreCard';
import type { GolferScore } from '@/lib/types';

const today = new Date();
const yesterdayDate = new Date(today);
yesterdayDate.setDate(today.getDate() - 1);
const yesterday = yesterdayDate.toISOString().slice(0, 10);

export default function Dashboard() {
  const [date, setDate] = useState(yesterday);
  const [scores, setScores] = useState<GolferScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setScores(null);

    try {
      const response = await fetch(`/api/scoreboard?date=${encodeURIComponent(date)}`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result?.message || 'Failed to load scoreboard data.');
      }

      const result: GolferScore[] = await response.json();
      setScores(result);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const matchedCount = useMemo(
    () => scores?.filter((item) => item.status === 'matched').length ?? 0,
    [scores]
  );

  return (
    <div className="card">
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="date">Tee sheet date</label>
          <input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <button className="button" type="button" onClick={handleFetch} disabled={loading}>
            {loading ? 'Loading…' : 'Fetch Scores'}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {scores ? (
        <div>
          <p>
            <strong>{scores.length}</strong> golfers found, <strong>{matchedCount}</strong> matched.
          </p>
          <div className="grid">
            {scores.map((golfer) => (
              <GolferScoreCard key={golfer.clubCaddieName} golfer={golfer} />
            ))}
          </div>
        </div>
      ) : (
        <p>Select a date and click Fetch Scores to load the scoreboard.</p>
      )}
    </div>
  );
}
