import type { GhinGolfer, GolferScore, SweepsPlayerOption } from './types';

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

export type GhinSearchParams = {
  firstName: string;
  lastName: string;
  ghinNumber: string;
  state: string;
  club: string;
  page: number;
  perPage: number;
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

class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNullableNumber(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'number';
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isGolferScore(value: unknown): value is GolferScore {
  if (!isRecord(value)) return false;
  const validStatuses = ['matched', 'unmatched', 'no-score', 'error'];

  return (
    typeof value.clubCaddieName === 'string' &&
    typeof value.firstName === 'string' &&
    typeof value.lastName === 'string' &&
    validStatuses.includes(String(value.status)) &&
    isOptionalString(value.matchedFirstName) &&
    isOptionalString(value.matchedLastName) &&
    isOptionalNullableNumber(value.ghinNumber) &&
    isOptionalNullableNumber(value.score) &&
    (value.used === undefined || value.used === null || typeof value.used === 'boolean') &&
    isOptionalNullableString(value.postedAt) &&
    isOptionalNullableString(value.scoreType) &&
    isOptionalNullableNumber(value.sweepsGrossTotal) &&
    isOptionalNullableNumber(value.sweepsPlayerId) &&
    isOptionalNullableString(value.sweepsPlayerName) &&
    isOptionalString(value.message)
  );
}

function parseGhinSearchResponse(payload: unknown): GhinGolfer[] {
  if (!isRecord(payload) || !Array.isArray(payload.golfers)) {
    throw new Error('The GHIN search response has an invalid format.');
  }

  return payload.golfers.map((golfer): GhinGolfer => {
    if (
      !isRecord(golfer) ||
      typeof golfer.first_name !== 'string' ||
      typeof golfer.last_name !== 'string' ||
      typeof golfer.ghin !== 'number' ||
      (golfer.club_name !== undefined &&
        golfer.club_name !== null &&
        typeof golfer.club_name !== 'string')
    ) {
      throw new Error('The GHIN search response contains an invalid golfer.');
    }

    return {
      first_name: golfer.first_name,
      last_name: golfer.last_name,
      ghin: golfer.ghin,
      club_name: typeof golfer.club_name === 'string' ? golfer.club_name : null,
    };
  });
}

function parseScoreboardResponse(payload: unknown): ScoreboardResponse {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.scores) ||
    !payload.scores.every(isGolferScore) ||
    !Array.isArray(payload.sweepsGolfers) ||
    !payload.sweepsGolfers.every(
      (golfer) =>
        isRecord(golfer) &&
        typeof golfer.playerId === 'number' &&
        typeof golfer.playerName === 'string' &&
        (golfer.handicap === null || typeof golfer.handicap === 'number'),
    ) ||
    typeof payload.state !== 'string' ||
    (payload.club !== undefined && payload.club !== null && typeof payload.club !== 'string')
  ) {
    throw new Error('The scoreboard response has an invalid format.');
  }

  return {
    scores: payload.scores,
    state: payload.state,
    club: typeof payload.club === 'string' ? payload.club : '',
    sweepsGolfers: payload.sweepsGolfers,
  };
}

async function readError(response: Response, fallback: string): Promise<never> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const message =
    isRecord(payload) && typeof payload.message === 'string' ? payload.message : fallback;
  throw new ApiResponseError(message || fallback, response.status);
}

async function fetchApiResponse(
  input: RequestInfo | URL,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.ok) await readError(response, fallback);
  return response;
}

async function readJson(response: Response, errorMessage: string): Promise<unknown> {
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    throw new Error(errorMessage);
  }
}

async function fetchWithNotFoundFallback(
  url: string,
  body: string,
  fallback: string,
): Promise<Response> {
  const init = (method: 'PATCH' | 'POST'): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  try {
    return await fetchApiResponse(url, init('PATCH'), fallback);
  } catch (error: unknown) {
    if (!(error instanceof ApiResponseError) || error.status !== 404) throw error;
  }

  return fetchApiResponse(url, init('POST'), fallback);
}

export async function searchGhin(
  params: GhinSearchParams,
  signal: AbortSignal,
): Promise<GhinGolfer[]> {
  const response = await fetchApiResponse(
    '/api/ghin',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        firstName: params.firstName,
        lastName: params.lastName,
        ghinNumber: params.ghinNumber,
        state: params.state,
        club: params.club,
        page: params.page,
        per_page: params.perPage,
      }),
    },
    'Failed to fetch GHIN golfers.',
  );

  return parseGhinSearchResponse(
    await readJson(response, 'The GHIN search response was not valid JSON.'),
  );
}

export async function fetchScoreboard(date: string): Promise<ScoreboardResponse> {
  const response = await fetchApiResponse(
    `/api/scoreboard?date=${encodeURIComponent(date)}`,
    {},
    'Failed to load scoreboard data.',
  );

  return parseScoreboardResponse(
    await readJson(response, 'The scoreboard response was not valid JSON.'),
  );
}

export async function saveGhinMatch(name: string, ghin: number | null): Promise<void> {
  const body = JSON.stringify({ name, ghin });
  await fetchWithNotFoundFallback('/api/db', body, 'Failed to save GHIN match.');
}

export async function refreshGhinScore(ghin: number, date: string): Promise<GhinScoreResult> {
  const response = await fetchApiResponse(
    `/api/scoreboard/${ghin}?date=${encodeURIComponent(date)}`,
    {},
    'Failed to refresh scoreboard data.',
  );

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
  const response = await fetchWithNotFoundFallback(
    '/api/sweeps',
    body,
    'Failed to save sweeps match.',
  );

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
