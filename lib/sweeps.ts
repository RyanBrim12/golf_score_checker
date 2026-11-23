import type { GolferScore } from '@/lib/types';
import { createSweepsMatch, getSweepsMatchByName } from './database';
import { findBestNameMatch, normalizeName, normalizeNamePart } from './nameMatching';
import type { SweepsRound } from './sweepsApi';

export { fetchAllSweepsPlayers, fetchGameByDate, fetchRoundsByGameId } from './sweepsApi';
export type { SweepsGame, SweepsRound } from './sweepsApi';

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
      : await getSweepsMatchByName(golfer.clubCaddieName);
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
      const bestMatch = findBestNameMatch(
        nameParts.firstName,
        sameLastName,
        (candidate) => candidate.nameParts.firstName,
      );
      if (!bestMatch) continue;

      sweepsGrossTotal = bestMatch.round.grossTotal ?? null;
      sweepsPlayerId = bestMatch.round.playerId;
      sweepsPlayerName = bestMatch.round.playerName;
      break;
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