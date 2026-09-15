import Fuse from 'fuse.js';
import type { GolferScore, SweepsPlayer } from '@/lib/types';
import { createSweepsMatch, getCachedSweepsMatchByName } from './database';

const BASE_URL = 'https://sweeps.teecrew.app/api/v1';

export type SweepsRound = {
  id?: number | null;
  gameId?: number | null;
  playerId?: number | null;
  playerName?: string | null;
  grossTotal?: number | null;
  netTotal?: number | null;
  stablefordPoints?: number | null;
  status?: string | null;
  date?: string | null;
};

function normalizeSweepsPlayer(player: Record<string, unknown>): SweepsPlayer | null {
  if (typeof player.playerId !== 'number' || typeof player.playerName !== 'string') return null;

  return {
    membershipId: typeof player.membershipId === 'string' || typeof player.membershipId === 'number' ? player.membershipId : null,
    playerId: player.playerId,
    playerName: player.playerName,
    handicap: typeof player.handicap === 'number' ? player.handicap : null,
    handicapCalculated: typeof player.handicapCalculated === 'number' ? player.handicapCalculated : null,
    handicapStatus: typeof player.handicapStatus === 'string' ? player.handicapStatus : null,
    role: typeof player.role === 'string' ? player.role : null,
    isActive: typeof player.isActive === 'boolean' ? player.isActive : null,
  };
}

export async function fetchAllSweepsPlayers(): Promise<SweepsPlayer[]> {
  const players: SweepsPlayer[] = [];
  let offset = 0;

  while (true) {
    const response = await fetch(`${BASE_URL}/players?limit=200&offset=${offset}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.SWEEPS_API_KEY}` },
    });
    if (!response.ok) throw new Error(`Sweeps players request failed with status ${response.status}.`);

    const jsonResponse = await response.json();
    const page = (jsonResponse.data ?? [])
      .map((player: Record<string, unknown>) => normalizeSweepsPlayer(player))
      .filter((player: SweepsPlayer | null): player is SweepsPlayer => player !== null);
    players.push(...page);

    if (!jsonResponse.pagination?.hasMore || page.length === 0) break;
    offset += 200;
  }

  return players;
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
}

function normalizeNamePart(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getNameParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: normalizeNamePart(parts[0] ?? ''),
    lastName: normalizeNamePart(parts[parts.length - 1] ?? ''),
  };
}

function normalizeRound(round: Record<string, unknown>): SweepsRound {
  return {
    id: typeof round.id === 'number' ? round.id : null,
    gameId: typeof round.gameId === 'number' ? round.gameId : null,
    playerId: typeof round.playerId === 'number' ? round.playerId : null,
    playerName: typeof round.playerName === 'string' ? round.playerName : null,
    grossTotal: typeof round.grossTotal === 'number' ? round.grossTotal : null,
    netTotal: typeof round.netTotal === 'number' ? round.netTotal : null,
    stablefordPoints: typeof round.stablefordPoints === 'number' ? round.stablefordPoints : null,
    status: typeof round.status === 'string' ? round.status : null,
    date: typeof round.date === 'string' ? round.date : null,
  };
}

export async function fetchGameByDate(date: string) {
  let offset = 0;

  while (true) {
    const response = await fetch(`${BASE_URL}/games?offset=${offset}&limit=200`, { method: 'GET', headers: { 'Authorization': `Bearer ${process.env.SWEEPS_API_KEY}` } });
    const jsonResponse = await response.json();
    const games = jsonResponse.data ?? [];
    const game = games.find((g: any) => g.date === date);
    if (game) return game;

    const oldestGameDate = games[games.length - 1]?.date;
    if (oldestGameDate < date) return null;

    const pagination = jsonResponse.pagination;
    if (!pagination?.hasMore) return null;
    offset += 200;
  }
}

export async function fetchRoundsByGameId(gameId: string): Promise<SweepsRound[]> {
  let response = await fetch(`${BASE_URL}/rounds?game_id=${gameId}&limit=200`, { method: 'GET', headers: { 'Authorization': `Bearer ${process.env.SWEEPS_API_KEY}` } });
  let jsonResponse = await response.json();
  let rounds = (jsonResponse.data ?? []).map((round: Record<string, unknown>) => normalizeRound(round));
  let pagination = jsonResponse['pagination'];
  while (pagination?.hasMore) {
    const offset = rounds.length;
    response = await fetch(`${BASE_URL}/rounds?game_id=${gameId}&limit=200&offset=${offset}`, { method: 'GET', headers: { 'Authorization': `Bearer ${process.env.SWEEPS_API_KEY}` } });
    jsonResponse = await response.json();
    rounds = [...rounds, ...(jsonResponse.data ?? []).map((round: Record<string, unknown>) => normalizeRound(round))];
    pagination = jsonResponse['pagination'];
  }
  return rounds;
}

export async function applySweepsScores(golfers: GolferScore[], rounds: SweepsRound[], manualMatches: Map<string, number | null> = new Map()): Promise<GolferScore[]> {
  const scoresByName = new Map<string, number | null>();
  const fuzzyRounds = rounds
    .filter((round) => round.playerName)
    .map((round) => ({
      round,
      nameParts: getNameParts(round.playerName as string),
    }));

  for (const round of rounds) {
    if (!round.playerName) continue;
    scoresByName.set(normalizeName(round.playerName), round.grossTotal ?? null);
  }

  return Promise.all(golfers.map(async (golfer) => {
    const storedMatch = manualMatches.has(golfer.clubCaddieName)
      ? { sweepsId: manualMatches.get(golfer.clubCaddieName) ?? null }
      : await getCachedSweepsMatchByName(golfer.clubCaddieName);
    if (storedMatch) {
      if (storedMatch.sweepsId === null) return { ...golfer, sweepsPlayerId: null, sweepsPlayerName: null, sweepsGrossTotal: undefined };
      const manualRound = rounds.find((round) => round.playerId === storedMatch.sweepsId);
      return manualRound ? { ...golfer, sweepsPlayerId: manualRound.playerId, sweepsPlayerName: manualRound.playerName, sweepsGrossTotal: manualRound.grossTotal ?? null } : golfer;
    }

    const names = [
      `${golfer.firstName} ${golfer.lastName}`,
      `${golfer.matchedFirstName ?? ''} ${golfer.matchedLastName ?? ''}`,
    ];
    let sweepsGrossTotal: number | null | undefined;
    let sweepsPlayerId: number | null | undefined;
    let sweepsPlayerName: string | null | undefined;
    for (const name of names) {
      const normalizedName = normalizeName(name);
      const exactScore = scoresByName.get(normalizedName);
      if (exactScore !== undefined) {
        sweepsGrossTotal = exactScore;
        sweepsPlayerId = roundId(rounds, normalizedName);
        sweepsPlayerName = roundName(rounds, normalizedName);
        break;
      }

      if (!normalizedName) continue;
      const nameParts = getNameParts(name);
      const sameLastName = fuzzyRounds.filter((candidate) => candidate.nameParts.lastName === nameParts.lastName);
      const fuse = new Fuse(sameLastName, { keys: ['nameParts.firstName'], includeScore: true });
      const results = fuse.search(nameParts.firstName);
      console.log(results);
      if (results.length === 0) continue;
      const bestMatch = results.reduce((best, current) => {
        const bestScore = best.score ?? Number.POSITIVE_INFINITY;
        const currentScore = current.score ?? Number.POSITIVE_INFINITY;
        return currentScore < bestScore ? current : best;
      }, results[0]);
      
      if (bestMatch.score !== undefined && bestMatch.score < 0.5) {
        sweepsGrossTotal = bestMatch.item.round.grossTotal ?? null;
        sweepsPlayerId = bestMatch.item.round.playerId;
        sweepsPlayerName = bestMatch.item.round.playerName;
        break;
      }
    }

    if (sweepsGrossTotal !== undefined && sweepsPlayerId !== null && sweepsPlayerId !== undefined) {
      await createSweepsMatch({ name: golfer.clubCaddieName, sweepsId: sweepsPlayerId });
    }
    return sweepsGrossTotal === undefined ? golfer : { ...golfer, sweepsPlayerId, sweepsPlayerName, sweepsGrossTotal };
  }));
}

function roundName(rounds: SweepsRound[], normalizedName: string) {
  return rounds.find((round) => round.playerName && normalizeName(round.playerName) === normalizedName)?.playerName ?? null;
}

export function serializeSweepsRound(round: SweepsRound, gameId: number | string | null, date: string) {
  return {
    id: round.id ?? null,
    gameId: round.gameId ?? gameId ?? null,
    playerId: round.playerId ?? null,
    playerName: round.playerName ?? null,
    grossTotal: round.grossTotal ?? null,
    netTotal: round.netTotal ?? null,
    stablefordPoints: round.stablefordPoints ?? null,
    status: round.status ?? null,
    date: round.date ?? date,
  };
}

function roundId(rounds: SweepsRound[], normalizedName: string) {
  return rounds.find((round) => round.playerName && normalizeName(round.playerName) === normalizedName)?.playerId ?? null;
}