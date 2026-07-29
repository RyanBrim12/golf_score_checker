'use client';

import { useMemo, useState } from 'react';
import GolferScoreCard from './GolferScoreCard';
import { ManualMatchModal, type ManualMatchData } from './ManualMatchModal';
import ScoreboardSkeleton from './ScoreboardSkeleton';
import type { GhinGolfer, GolferScore } from '@/lib/types';

const today = new Date();
const yesterdayDate = new Date(today);
yesterdayDate.setDate(today.getDate() - 1);
const yesterday = yesterdayDate.toISOString().slice(0, 10);

export default function Dashboard() {
  const [date, setDate] = useState(yesterday);
  const [state, setState] = useState('');
  const [club, setClub] = useState('');
  const [scores, setScores] = useState<GolferScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [activeGolfer, setActiveGolfer] = useState<GolferScore | null>(null);
  const [matchModalInitialValues, setMatchModalInitialValues] = useState<ManualMatchData | null>(null);
  const [updatingGolferName, setUpdatingGolferName] = useState<string | null>(null);

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

      const result = await response.json();
      setScores(result?.scores);
      setState(result?.state);
      setClub(result?.club);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const matchedCount = useMemo(
    () => (scores ? scores.length - scores.filter((item) => item.status === 'unmatched').length : 0),
    [scores]
  );

  const scoreCount = useMemo(() => (scores ? scores.filter((item) => item.status === 'matched').length : 0), [scores]);

  const handleOpenMatchModal = (golfer: GolferScore) => {
    setActiveGolfer(golfer);
    setMatchModalInitialValues({
      firstName: golfer.matchedFirstName ?? golfer.firstName ?? '',
      lastName: golfer.matchedLastName ?? golfer.lastName ?? '',
      ghinNumber: golfer.ghinNumber ? String(golfer.ghinNumber) : '',
      state: state ?? '',
      club: club ?? '',
    });
    setIsMatchModalOpen(true);
  };

  const handleMatchSubmit = async (data: ManualMatchData | null) => {
    if (!activeGolfer || !date) {
      return;
    }

    const targetGolferName = activeGolfer.clubCaddieName;
    const parsedGhin = data ? Number.parseInt(data.ghinNumber, 10) : null;

    setIsMatchModalOpen(false);
    setActiveGolfer(null);
    setMatchModalInitialValues(null);
    setUpdatingGolferName(targetGolferName);

    try {
      const response = await fetch('/api/db', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetGolferName,
          ghin: parsedGhin,
        }),
      });

      if (!response.ok) {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: targetGolferName,
            ghin: parsedGhin,
          }),
        });
      }

      if (!parsedGhin) {
        setScores((currentScores) =>
          currentScores
            ? currentScores.map((golfer) =>
                golfer.clubCaddieName === targetGolferName
                  ? {
                      ...golfer,
                      matchedFirstName: undefined,
                      matchedLastName: undefined,
                      ghinNumber: undefined,
                      status: 'unmatched',
                      score: undefined,
                    }
                  : golfer
              )
            : currentScores
        );
      } else {
        const response = await fetch(`/api/scoreboard/${parsedGhin}?date=${encodeURIComponent(date)}`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result?.message || 'Failed to refresh scoreboard data.');
        }

        const body = await response.json();
        const refreshedScore = body.score;

        setScores((currentScores) =>
          currentScores
            ? currentScores.map((golfer) =>
                golfer.clubCaddieName === targetGolferName
                  ? {
                      ...golfer,
                      matchedFirstName: data?.firstName,
                      matchedLastName: data?.lastName,
                      ghinNumber: Number.isNaN(parsedGhin) ? undefined : parsedGhin,
                      status: refreshedScore ? 'matched' : 'no-score',
                      score: refreshedScore ?? undefined,
                    }
                  : golfer
              )
            : currentScores
        );
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unknown error occurred while refreshing scores.');
    } finally {
      setUpdatingGolferName(null);
    }
  };

  const handleMatchModalOpenChange = (open: boolean) => {
    setIsMatchModalOpen(open);

    if (!open) {
      setActiveGolfer(null);
      setMatchModalInitialValues(null);
    }
  };

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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500 disabled:opacity-80 md:w-auto shadow-xs"
            type="button"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Fetching Scores...</span>
              </>
            ) : (
              'Fetch Scores'
            )}
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <ScoreboardSkeleton />
      ) : scores ? (
        <div className="mt-6">
          <p className="mb-4 text-sm text-slate-700">
            <span className="font-semibold">{scores.length}</span> golfers found,{' '}
            <span className="font-semibold">{matchedCount}</span> matched,{' '}
            <span className="font-semibold">{scoreCount}</span> with scores.
          </p>
          <div className="grid gap-3">
            {scores.map((golfer) => (
              <GolferScoreCard
                key={golfer.clubCaddieName}
                golfer={golfer}
                isUpdating={golfer.clubCaddieName === updatingGolferName}
                onMatchClick={handleOpenMatchModal}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">Select a date and click Fetch Scores to load the scoreboard.</p>
      )}

      <ManualMatchModal
        open={isMatchModalOpen}
        onOpenChange={handleMatchModalOpenChange}
        onSubmit={handleMatchSubmit}
        initialValues={matchModalInitialValues}
      />
    </div>
  );
}
