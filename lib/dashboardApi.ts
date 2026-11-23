import type { GolferScore, SweepsPlayerOption } from './types';

export type ScoreboardResponse = {
  scores: GolferScore[];
  state: string;
  club: string;
  sweepsGolfers: SweepsPlayerOption[];
};

export type GhinMatchData = {
  firstName: string;
  lastName: string;
  ghinNumber: string;
  state: string;
  club: string;
};

export type GhinScoreResult = {
  score: number | null;
  postedAt: string | null;
  scoreType: string | null;
  used: boolean | null;
};

export type SweepsMatchResult = {
  sweepsPlayerId: number | null;
  sweepsPlayerName: string | null;
  sweepsGrossTotal: number | null;
};

async function readError(response: Response, fallback: string): Promise<never> {
  const result = await response.json().catch(() => null);
  throw new Error(result?.message || fallback);
}

export async function fetchScoreboard(date: string): Promise<ScoreboardResponse> {
  const response = await fetch(`/api/scoreboard?date=${encodeURIComponent(date)}`);
  if (!response.ok) await readError(response, 'Failed to load scoreboard data.');

  const result = await response.json();
  return {
    scores: result?.scores ?? [],
    state: result?.state ?? '',
    club: result?.club ?? '',
    sweepsGolfers: result?.sweepsGolfers ?? [],
  };
}

export async function saveGhinMatch(name: string, ghin: number | null): Promise<void> {
  const body = JSON.stringify({ name, ghin });
  let response = await fetch('/api/db', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  if (!response.ok) await readError(response, 'Failed to save GHIN match.');
}

export async function refreshGhinScore(ghin: number, date: string): Promise<GhinScoreResult> {
  const response = await fetch(`/api/scoreboard/${ghin}?date=${encodeURIComponent(date)}`);
  if (!response.ok) await readError(response, 'Failed to refresh scoreboard data.');

  const result = await response.json();
  return {
    score: result?.score ?? null,
    postedAt: result?.postedAt ?? null,
    scoreType: result?.scoreType ?? null,
    used: result?.used ?? null,
  };
}

export async function saveSweepsMatch(
  name: string,
  sweepsId: number | null,
  date: string,
): Promise<SweepsMatchResult | null> {
  const body = JSON.stringify({ name, sweepsId, date });
  let response = await fetch('/api/sweeps', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    response = await fetch('/api/sweeps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  if (!response.ok) await readError(response, 'Failed to save sweeps match.');

  const result = await response.json();
  const match = result?.match;
  return match
    ? {
        sweepsPlayerId: match.sweepsPlayerId ?? null,
        sweepsPlayerName: match.sweepsPlayerName ?? null,
        sweepsGrossTotal: match.sweepsGrossTotal ?? null,
      }
    : null;
}
