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
  const [search, setSearch] = useState('');
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

  const filteredScores = useMemo(() => {
    if (!scores) return [];
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return scores;

    return scores.filter((golfer) => {
      const firstName = golfer.firstName ?? '';
      const lastName = golfer.lastName ?? '';
      const matchedName = `${golfer.matchedFirstName ?? ''} ${golfer.matchedLastName ?? ''}`.trim();
      const searchableValues = [firstName, lastName, matchedName];

      return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [scores, search]);

  const sortedScores = useMemo(() => {
  return [...filteredScores].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'no-score') return -1;
      if (b.status === 'no-score') return 1;
      if (a.status === 'matched') return -1;
      return 1;
    }
    if (a.lastName !== b.lastName) return a.lastName < b.lastName ? -1 : 1;
    if (a.firstName !== b.firstName) return a.firstName < b.firstName ? -1 : 1;
    return 0;
  });
}, [filteredScores]);

  const matchedCount = useMemo(
    () => filteredScores.length - filteredScores.filter((item) => item.status === 'unmatched').length,
    [filteredScores]
  );

  const scoreCount = useMemo(
    () => filteredScores.filter((item) => item.status === 'matched').length,
    [filteredScores]
  );

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
      <div className="grid md:gap-4 md:grid-cols-2">
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
            className="flex min-h-[48px] w-full min-w-[144px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-500 disabled:opacity-80 md:w-auto"
            type="button"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? (
              <div className="flex h-5 w-5 items-center justify-center">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
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
          <div className="mb-4 flex flex-col items-center justify-between gap-2 md:flex-row sm:items-center">
            <p className="text-xs md:text-sm text-slate-700">
              <span className="font-semibold">{filteredScores.length}</span> golfers shown
              {search ? (
                <>
                  {' '}of <span className="font-semibold">{scores.length}</span>
                </>
              ) : null}
              , <span className="font-semibold">{matchedCount}</span> matched,{' '}
              <span className="font-semibold">{scoreCount}</span> with scores.
            </p>
            <div className="w-full md:w-auto">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.386a1 1 0 01-1.414 1.415l-4.387-4.387zm-4.9.68a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name..."
                  className="w-full py-1 rounded-xl border border-slate-200 bg-slate-50 px-4 pl-11 pr-4 text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          {filteredScores.length > 0 ? (
            <div className="grid gap-3">
                {sortedScores.map((golfer) => (
                  <GolferScoreCard
                    key={golfer.clubCaddieName}
                    golfer={golfer}
                    isUpdating={golfer.clubCaddieName === updatingGolferName}
                    onMatchClick={handleOpenMatchModal}
                  />
                ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600">No golfers match your search.</p>
          )}
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
