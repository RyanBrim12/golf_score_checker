import Fuse from 'fuse.js';
import type { GolferScore } from '@/lib/types';
import { createSweepsMatch, getCachedSweepsMatchByName } from './database';
import type { SweepsRound } from './sweepsApi';

export { fetchAllSweepsPlayers, fetchGameByDate, fetchRoundsByGameId } from './sweepsApi';
export type { SweepsGame, SweepsRound } from './sweepsApi';

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
      // A concurrent request may have already created this match; other database errors still propagate.
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