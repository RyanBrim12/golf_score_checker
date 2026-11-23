'use client';

import { useState } from 'react';
import type { GolferScore, SweepsPlayerOption } from '@/lib/types';
import type { GhinMatchData } from '@/lib/dashboardApi';
import {
  fetchScoreboard,
  refreshGhinScore,
  saveGhinMatch,
  saveSweepsMatch,
} from '@/lib/dashboardApi';
import { updateGolferByName } from '@/lib/scoreboardView';

export function useScoreboard() {
  const [scores, setScores] = useState<GolferScore[] | null>(null);
  const [state, setState] = useState('');
  const [club, setClub] = useState('');
  const [sweepsGolfers, setSweepsGolfers] = useState<SweepsPlayerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingGolferName, setUpdatingGolferName] = useState<string | null>(null);

  const load = async (date: string) => {
    setLoading(true);
    setError(null);
    setScores(null);

    try {
      const result = await fetchScoreboard(date);
      setScores(result.scores);
      setState(result.state);
      setClub(result.club);
      setSweepsGolfers(result.sweepsGolfers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const submitGhinMatch = async (targetName: string, date: string, data: GhinMatchData | null) => {
    const parsedGhin = data ? Number.parseInt(data.ghinNumber, 10) : null;
    setUpdatingGolferName(targetName);

    try {
      await saveGhinMatch(targetName, parsedGhin);

      if (!parsedGhin) {
        setScores((current) => updateGolferByName(current, targetName, (golfer) => ({
          ...golfer,
          matchedFirstName: undefined,
          matchedLastName: undefined,
          ghinNumber: undefined,
          status: 'unmatched',
          score: undefined,
        })));
        return;
      }

      const refreshed = await refreshGhinScore(parsedGhin, date);
      setScores((current) => updateGolferByName(current, targetName, (golfer) => ({
        ...golfer,
        matchedFirstName: data?.firstName,
        matchedLastName: data?.lastName,
        ghinNumber: parsedGhin,
        status: refreshed.score !== null ? 'matched' : 'no-score',
        score: refreshed.score,
        used: refreshed.used,
        postedAt: refreshed.postedAt,
        scoreType: refreshed.scoreType,
      })));
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : 'Unknown error occurred while refreshing scores.');
    } finally {
      setUpdatingGolferName(null);
    }
  };

  const submitSweepsMatch = async (targetName: string, date: string, sweepsId: number | null) => {
    setUpdatingGolferName(targetName);

    try {
      const match = await saveSweepsMatch(targetName, sweepsId, date);
      setScores((current) => updateGolferByName(current, targetName, (golfer) => ({
        ...golfer,
        sweepsPlayerId: match?.sweepsPlayerId ?? (sweepsId === null ? null : golfer.sweepsPlayerId),
        sweepsPlayerName: match?.sweepsPlayerName ?? (sweepsId === null ? null : golfer.sweepsPlayerName),
        sweepsGrossTotal: match?.sweepsGrossTotal ?? (sweepsId === null ? undefined : golfer.sweepsGrossTotal),
      })));
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : 'Unknown error occurred while saving sweeps match.');
    } finally {
      setUpdatingGolferName(null);
    }
  };

  return {
    scores,
    state,
    club,
    sweepsGolfers,
    loading,
    error,
    updatingGolferName,
    load,
    submitGhinMatch,
    submitSweepsMatch,
  };
}
