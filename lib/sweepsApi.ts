import type { SweepsPlayer } from '@/lib/types';
import { getSweepsConfig } from './serverConfig';

const BASE_URL = 'https://sweeps.teecrew.app/api/v1';
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

export type SweepsGame = {
  id: number;
  date: string;
};

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

type SweepsPage = {
  data: unknown[];
  hasMore: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, endpoint: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Sweeps ${endpoint} response contains an invalid record.`);
  }
  return value;
}

function parsePage(value: unknown, endpoint: string): SweepsPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !isRecord(value.pagination) ||
    typeof value.pagination.hasMore !== 'boolean'
  ) {
    throw new Error(`Sweeps ${endpoint} response has an invalid page format.`);
  }

  return { data: value.data, hasMore: value.pagination.hasMore };
}

async function* fetchSweepsPages(
  endpoint: string,
  query: Record<string, string> = {},
): AsyncGenerator<unknown[]> {
  const { apiKey } = getSweepsConfig();

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(pageNumber * PAGE_SIZE));

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Sweeps ${endpoint} request failed with status ${response.status}.`);
    }

    const page = parsePage(await response.json(), endpoint);
    yield page.data;
    if (!page.hasMore) return;
  }

  throw new Error(`Sweeps ${endpoint} pagination exceeded the limit of ${MAX_PAGES} pages.`);
}

function normalizeSweepsPlayer(player: Record<string, unknown>): SweepsPlayer | null {
  if (typeof player.playerId !== 'number' || typeof player.playerName !== 'string') return null;

  return {
    membershipId:
      typeof player.membershipId === 'string' || typeof player.membershipId === 'number'
        ? player.membershipId
        : null,
    playerId: player.playerId,
    playerName: player.playerName,
    handicap: typeof player.handicap === 'number' ? player.handicap : null,
    handicapCalculated:
      typeof player.handicapCalculated === 'number' ? player.handicapCalculated : null,
    handicapStatus: typeof player.handicapStatus === 'string' ? player.handicapStatus : null,
    role: typeof player.role === 'string' ? player.role : null,
    isActive: typeof player.isActive === 'boolean' ? player.isActive : null,
  };
}

export async function fetchAllSweepsPlayers(): Promise<SweepsPlayer[]> {
  const players: SweepsPlayer[] = [];

  for await (const rows of fetchSweepsPages('/players')) {
    for (const row of rows) {
      const player = normalizeSweepsPlayer(requireRecord(row, '/players'));
      if (player) players.push(player);
    }
  }

  return players;
}

export async function fetchGameByDate(date: string): Promise<SweepsGame | null> {
  for await (const rows of fetchSweepsPages('/games')) {
    for (const row of rows) {
      const game = requireRecord(row, '/games');
      if (typeof game.date !== 'string') {
        throw new Error('Sweeps /games response contains a game with an invalid date.');
      }
      if (game.date !== date) continue;
      if (typeof game.id !== 'number' || !Number.isInteger(game.id)) {
        throw new Error('Sweeps /games response contains a game with an invalid ID.');
      }
      return { id: game.id, date: game.date };
    }
  }

  return null;
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

export async function fetchRoundsByGameId(gameId: number | string): Promise<SweepsRound[]> {
  const rounds: SweepsRound[] = [];

  for await (const rows of fetchSweepsPages('/rounds', { game_id: String(gameId) })) {
    for (const row of rows) {
      rounds.push(normalizeRound(requireRecord(row, '/rounds')));
    }
  }

  return rounds;
}
