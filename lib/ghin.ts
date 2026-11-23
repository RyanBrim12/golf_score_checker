import Fuse from 'fuse.js';
import { GhinClient } from '@spicygolf/ghin';
import { createMatch, getAllMatches } from './database';
import type { Match } from './database';
import type { ClubCaddieGolfer, GhinGolfer, GolferScore, GhinScoreResponse } from './types';

const MAX_CONCURRENT_GOLFERS = 4;

function createGhinClient(username: string, password: string) {
  return new GhinClient({ username, password });
}

function normalizeUsedFlag(value: boolean | 'true' | 'false' | null | undefined): boolean | null {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
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

async function searchGolfers(
  ghin: ReturnType<typeof createGhinClient>,
  name: string,
  lastName: string,
  firstName: string,
  storedMatch: Match | undefined,
  state?: string,
  clubId?: string,
  country?: string,
): Promise<GhinGolfer | null> {
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

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  let hasFailed = false;
  let firstError: unknown;

  async function runWorker() {
    while (!hasFailed) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;

      try {
        results[index] = await mapper(values[index], index);
      } catch (error: unknown) {
        if (!hasFailed) {
          hasFailed = true;
          firstError = error;
        }
      }
    }
  }

  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  if (hasFailed) throw firstError;
  return results;
}

async function fetchScoreForDate(
  ghin: ReturnType<typeof createGhinClient>,
  ghinNumber: number,
  date: string,
  courseId?: string,
): Promise<NonNullable<GhinScoreResponse['scores']>[number] | null> {
  const scoreResponse = await ghin.golfers.getScores(ghinNumber, {
    from_date_played: new Date(date),
    to_date_played: new Date(date),
  }).catch((error: unknown) => parseGhinScoreError(error));

  const score = scoreResponse?.scores?.[0];
  if (!score || score.course_id !== courseId) return null;
  return score;
}

async function persistGolferMatch(golfer: ClubCaddieGolfer, matchedGolfer: GhinGolfer): Promise<void> {
  // A concurrent request may have already created this match; other database errors still propagate.
  await createMatch({ ghin: matchedGolfer.ghin, name: golfer.name });
}

function formatScoreResult(golfer: ClubCaddieGolfer, bestMatch?: GhinGolfer, score?: number | null, message?: string, postedAt?: string | Date | null, scoreType?: string | null, used?: boolean | null): GolferScore {  
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
      used: used ?? null,
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
    used: used ?? null,
    postedAt: postedAt instanceof Date ? postedAt.toISOString() : postedAt,
    scoreType: scoreType ?? null,
    status: 'matched',
  };
}

export async function fetchGolferScores(date: string, golfers: ClubCaddieGolfer[], username: string, password: string, state?: string, clubId?: string, country?: string, courseId?: string, requestId?: string): Promise<GolferScore[]> {
  if (golfers.length === 0) return [];

  const ghin = createGhinClient(username, password);
  const cachedMatches = new Map((await getAllMatches()).map((match) => [match.name, match]));

  return mapWithConcurrency(golfers, MAX_CONCURRENT_GOLFERS, async (golfer, golferIndex) => {
    const matchedGolfer = await searchGolfers(
      ghin,
      golfer.name,
      golfer.lastName,
      golfer.firstName,
      cachedMatches.get(golfer.name),
      state,
      clubId,
      country,
    ).catch((error: unknown) => {
      console.error('Error thrown while matching golfer', { requestId, golferIndex, error });
      return null;
    });

    if (!matchedGolfer) {
      return formatScoreResult(golfer);
    }

    await persistGolferMatch(golfer, matchedGolfer);

    const scoreResult = await fetchScoreForDate(ghin, matchedGolfer.ghin, date, courseId);
    if (!scoreResult) return formatScoreResult(golfer, matchedGolfer, null);

    return formatScoreResult(
      golfer,
      matchedGolfer,
      scoreResult.adjusted_gross_score ?? null,
      undefined,
      scoreResult.posted_at ?? null,
      scoreResult.score_type_display_full ?? scoreResult.score_type ?? null,
      normalizeUsedFlag(scoreResult.used),
    );
  });
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

export async function fetchScoreByGhin(ghin: number, date: string, username: string, password: string, courseId?: string): Promise<{ score: number; postedAt: string | null, scoreType: string | null, used: boolean | null } | null> {
  const ghinClient = createGhinClient(username, password);
  const scoreResult = await fetchScoreForDate(ghinClient, ghin, date, courseId);
  if (!scoreResult) return null;

  const score = scoreResult.adjusted_gross_score ?? null;
  if (score === null) return null;

  return {
    score,
    postedAt: scoreResult.posted_at instanceof Date
      ? scoreResult.posted_at.toISOString()
      : scoreResult.posted_at ?? null,
    scoreType: scoreResult.score_type_display_full ?? null,
    used: normalizeUsedFlag(scoreResult.used),
  };
}