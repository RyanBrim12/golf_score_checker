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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="mb-4 md:mb-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="date">
            Tee sheet date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm outline-none ring-0 focus:border-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            type="button"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Fetch Scores'}
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {scores ? (
        <div className="mt-6">
          <p className="mb-4 text-sm text-slate-700">
            <span className="font-semibold">{scores.length}</span> golfers found,{' '}
            <span className="font-semibold">{matchedCount}</span> matched.
          </p>
          <div className="grid gap-4">
            {scores.map((golfer) => (
              <GolferScoreCard key={golfer.clubCaddieName} golfer={golfer} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">Select a date and click Fetch Scores to load the scoreboard.</p>
      )}
    </div>
  );
}
