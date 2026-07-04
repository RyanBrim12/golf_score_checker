import Fuse from 'fuse.js';
import { GhinClient } from '@spicygolf/ghin';
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

async function searchGolfers(ghin: ReturnType<typeof createGhinClient>, lastName: string, firstName: string, state?: string, clubId?: string, country?: string): Promise<GhinGolfer[]> {
  let golfers, bestMatch;
  
  golfers = await ghin.golfers.search({last_name: lastName, state: state, club_id: clubId, first_name: firstName});
  if (golfers.length === 1) {
    return golfers;
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state, club_id: clubId});
  bestMatch = findBestMatch(firstName, golfers);
  if (bestMatch) {
    return [bestMatch];
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state, first_name: firstName});
  if (golfers.length === 1) {
    return golfers;
  }

  golfers = await ghin.golfers.search({last_name: lastName, state: state});
  bestMatch = findBestMatch(firstName, golfers);
  if (bestMatch) {
    return [bestMatch];
  }

  golfers = await ghin.golfers.search({last_name: lastName, country: country, first_name: firstName});
  if (golfers.length === 1) {
    return golfers;
  }
  
  return [];
}

function formatScoreResult(golfer: ClubCaddieGolfer, bestMatch?: GhinGolfer, score?: number | null, message?: string): GolferScore {
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
    status: 'matched',
  };
}

export async function fetchGolferScores(date: string, golfers: ClubCaddieGolfer[], username: string, password: string, state?: string, clubId?: string, country?: string, courseId?: string): Promise<GolferScore[]> {
  const ghin = createGhinClient(username, password);
  const results: GolferScore[] = [];

  for (const golfer of golfers) {
    const matchedGolfers = await searchGolfers(ghin, golfer.lastName, golfer.firstName, state, clubId, country).catch((error: unknown) => {
      const message = parseGhinError(error);
      results.push({
        clubCaddieName: golfer.clubCaddieName,
        firstName: golfer.firstName,
        lastName: golfer.lastName,
        status: 'error',
        message,
      });
      return [] as GhinGolfer[];
    });

    if (matchedGolfers.length === 0) {
      if (results.some((result) => result.clubCaddieName === golfer.clubCaddieName && result.status === 'error')) {
        continue;
      }
      results.push(formatScoreResult(golfer));
      continue;
    }

    const bestMatch = matchedGolfers[0];
    const ghinNumber = bestMatch.ghin;

    try {
      const scoreResponse = await ghin.golfers.getScores(ghinNumber, {
        from_date_played: new Date(date),
        to_date_played: new Date(date),
      });
      
      if (scoreResponse?.scores?.[0].course_id !== courseId) {
        results.push(formatScoreResult(golfer, bestMatch, null, 'Score found, but course ID does not match.'));
        continue;
      }
      const score = scoreResponse?.scores?.[0]?.adjusted_gross_score ?? null;
      results.push(formatScoreResult(golfer, bestMatch, score));
    } catch (error: unknown) {
      const parsedScoreResponse = extractScoreFromGhinError(error);
      if (parsedScoreResponse !== undefined) {
        if (parsedScoreResponse?.scores?.[0].course_id !== courseId) {
          results.push(formatScoreResult(golfer, bestMatch, null, 'Score found, but course ID does not match.'));
        }
        
        const score = parsedScoreResponse?.scores?.[0]?.adjusted_gross_score ?? null;
        results.push(
          formatScoreResult(
            golfer,
            bestMatch,
            score,
            'Score extracted from GHIN validation response.'
          )
        );
        continue;
      }

      const message = parseGhinError(error);
      results.push({
        clubCaddieName: golfer.clubCaddieName,
        firstName: golfer.firstName,
        lastName: golfer.lastName,
        matchedFirstName: bestMatch.first_name,
        matchedLastName: bestMatch.last_name,
        ghinNumber: bestMatch.ghin,
        status: 'error',
        message,
      });
    }
  }

  return results;
}

function extractScoreFromGhinError(error: unknown): GhinScoreResponse | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const anyError = error as Record<string, unknown>;
  if (anyError.code !== 'VALIDATION_ERROR' || !anyError.response) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(String(anyError.response)) as GhinScoreResponse;
    const score = parsed?.scores?.[0]?.adjusted_gross_score;
    return typeof score === 'number' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseGhinError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const anyError = error as Record<string, unknown>;
    if (anyError.code === 'VALIDATION_ERROR' && anyError.response) {
      try {
        const parsed = JSON.parse(String(anyError.response));
        if (parsed?.scores?.length) {
          return 'Score parsed from validation response.';
        }
      } catch {
        return 'GHIN validation error returned unexpected payload.';
      }
    }
    if (typeof anyError.message === 'string') {
      return anyError.message;
    }
    if (typeof anyError.toString === 'function') {
      return anyError.toString();
    }
  }

  return 'Unknown GHIN error occurred.';
}
