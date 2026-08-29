import Fuse from 'fuse.js';
import { GhinClient } from '@spicygolf/ghin';
import { createMatch, getCachedMatchByName } from './database';
import type { ClubCaddieGolfer, GhinGolfer, GolferScore, GhinScoreResponse } from './types';

function createGhinClient(username: string, password: string) {
  return new GhinClient({ username, password });
}

function findBestMatch(firstName: string, golfers: GhinGolfer[]): GhinGolfer | null {
  const fuse = new Fuse(golfers, { keys: ['first_name'], includeScore: true });
  const results = fuse.search(firstName);

  if (results.length === 0) return null;
  const bestMatch = results.reduce((best, current) => {
    const bestScore = best.score ?? Number.POSITIVE_INFINITY;
    const currentScore = current.score ?? Number.POSITIVE_INFINITY;
    return currentScore < bestScore ? current : best;
  }, results[0]);

  return bestMatch.score !== undefined && bestMatch.score < 0.5 ? bestMatch.item : null;
}

async function searchGolfers(ghin: ReturnType<typeof createGhinClient>, name: string, lastName: string, firstName: string, state?: string, clubId?: string, country?: string): Promise<GhinGolfer | null> {
  const storedMatch = await getCachedMatchByName(name);
  if (storedMatch && storedMatch.ghin !== null) {
    const golfer = await ghin.golfers.getOne(storedMatch.ghin);
    if (golfer) {
      return golfer;
    }
  }
  
  let golfers: GhinGolfer[], bestMatch;
  
  golfers = await ghin.golfers.search({last_name: lastName, state: state, club_id: clubId, first_name: firstName}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  if (golfers.length === 1) {
    return golfers[0];
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state, club_id: clubId}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  bestMatch = findBestMatch(firstName, golfers);
  if (bestMatch) {
    return bestMatch;
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state, first_name: firstName}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  if (golfers.length === 1) {
    return golfers[0];
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  bestMatch = findBestMatch(firstName, golfers);
  if (bestMatch) {
    return bestMatch;
  }

  golfers = await ghin.golfers.search({last_name: lastName, country: country, first_name: firstName}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  if (golfers.length === 1) {
    return golfers[0];
  }

  golfers = await ghin.golfers.search({last_name: lastName, country: country}).catch((error: unknown) => {
    return parseGhinGolferError(error);
  });
  bestMatch = findBestMatch(firstName, golfers);
  if (bestMatch) {
    return bestMatch;
  }
  
  return null;
}

function formatScoreResult(golfer: ClubCaddieGolfer, bestMatch?: GhinGolfer, score?: number | null, message?: string, postedAt?: string | Date | null, scoreType?: string | null): GolferScore {  
  if (!bestMatch) {
    return {
      clubCaddieName: golfer.clubCaddieName,
      firstName: golfer.firstName,
      lastName: golfer.lastName,
      status: 'unmatched',
      message: message ?? 'No GHIN golfer match found.',
    };
  }

  if (score === undefined || score === null) {
    return {
      clubCaddieName: golfer.clubCaddieName,
      firstName: golfer.firstName,
      lastName: golfer.lastName,
      matchedFirstName: bestMatch.first_name,
      matchedLastName: bestMatch.last_name,
      ghinNumber: bestMatch.ghin,
      status: 'no-score',
      message: message ?? 'No score found for selected date.',
    };
  }

  return {
    clubCaddieName: golfer.clubCaddieName,
    firstName: golfer.firstName,
    lastName: golfer.lastName,
    matchedFirstName: bestMatch.first_name,
    matchedLastName: bestMatch.last_name,
    ghinNumber: bestMatch.ghin,
    score,
    postedAt: postedAt instanceof Date ? postedAt.toISOString() : postedAt,
    scoreType: scoreType ?? null,
    status: 'matched',
  };
}

export async function fetchGolferScores(date: string, golfers: ClubCaddieGolfer[], username: string, password: string, state?: string, clubId?: string, country?: string, courseId?: string, requestId?: string): Promise<GolferScore[]> {
  const ghin = createGhinClient(username, password);
  const results: GolferScore[] = [];

  for (const [golferIndex, golfer] of golfers.entries()) {
    const matchedGolfer = await searchGolfers(ghin, golfer.name, golfer.lastName, golfer.firstName, state, clubId, country).catch((error: unknown) => {
      console.error('Error thrown while matching golfer', { requestId, golferIndex, error });
      return null;
    });

    if (!matchedGolfer) {
      results.push(formatScoreResult(golfer));
      continue;
    }

    const ghinNumber = matchedGolfer.ghin;
    await createMatch({ ghin: ghinNumber, name: golfer.name });

    const scoreResponse = await ghin.golfers.getScores(ghinNumber, {
      from_date_played: new Date(date),
      to_date_played: new Date(date),
    }).catch((error: unknown) => {
      return parseGhinScoreError(error);
    });
    
    if (scoreResponse?.scores?.length === 0 || scoreResponse?.scores?.[0].course_id !== courseId) {
      results.push(formatScoreResult(golfer, matchedGolfer, null));
      continue;
    }

    const score = scoreResponse?.scores?.[0]?.adjusted_gross_score ?? null;
    const postedAt = scoreResponse?.scores?.[0]?.posted_at ?? null;
    const scoreType = scoreResponse?.scores?.[0]?.score_type_display_full ?? scoreResponse?.scores?.[0]?.score_type ?? null;
    results.push(formatScoreResult(golfer, matchedGolfer, score, undefined, postedAt, scoreType));
  }

  return results;
}

export function parseGhinGolferError(error: unknown): GhinGolfer[] {
  if (typeof error === 'object' && error !== null) {
    const anyError = error as Record<string, unknown>;
    if (anyError.code === 'VALIDATION_ERROR' && anyError.response) {
      try {
        const parsed = JSON.parse(String(anyError.response));
        if (parsed) {
          return parsed;
        }
      } catch {
        return [];
      }
    }
  }

  return [];
}

export function parseGhinScoreError(error: unknown): GhinScoreResponse | undefined {
  if (typeof error === 'object' && error !== null) {
    const anyError = error as Record<string, unknown>;
    if (anyError.code === 'VALIDATION_ERROR' && anyError.response) {
      try {
        const parsed = JSON.parse(String(anyError.response));
        if (parsed?.scores?.length) {
          return parsed;
        }
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

export async function fetchScoreByGhin(ghin: number, date: string, username: string, password: string, courseId?: string): Promise<{ score: number; postedAt: string | null, scoreType: string | null } | null> {
  const ghinClient = createGhinClient(username, password);
  const scoreResponse = await ghinClient.golfers.getScores(ghin, {
      from_date_played: new Date(date),
      to_date_played: new Date(date),
    }).catch((error: unknown) => {
      return parseGhinScoreError(error);
    });
    
    if (scoreResponse?.scores?.length === 0 || scoreResponse?.scores?.[0].course_id !== courseId)
      return null

    const score = scoreResponse?.scores?.[0]?.adjusted_gross_score ?? null;
    if (score === null) return null;

    return {
      score,
      postedAt: scoreResponse?.scores?.[0]?.posted_at instanceof Date
        ? scoreResponse.scores[0].posted_at.toISOString()
        : scoreResponse?.scores?.[0]?.posted_at ?? null,
      scoreType: scoreResponse?.scores?.[0]?.score_type_display_full ?? null,
    };
}