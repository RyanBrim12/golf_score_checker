import { NextResponse } from 'next/server';
import { fetchGameByDate, fetchRoundsByGameId, serializeSweepsRound } from '@/lib/sweeps';
import {
  createSweepsMatch,
  deleteSweepsMatch,
  getAllSweepsMatches,
  updateSweepsMatch,
} from '@/lib/database';
import { readJsonObject, withApiHandler } from '@/lib/request';
import { isValidScoreDate, parseNameInput, parseNullableSweepsId } from '@/lib/validation';

export const runtime = 'nodejs';
export const preferredRegion = 'home';

export async function GET(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!isValidScoreDate(date)) {
      return NextResponse.json(
        { message: 'Invalid date. Use a valid date within the last 10 years.' },
        { status: 400 },
      );
    }

    const game = await fetchGameByDate(date);
    const gameId = game?.id;
    const rounds = gameId ? await fetchRoundsByGameId(gameId) : [];

    return NextResponse.json({
      gameId: gameId ?? null,
      date,
      rounds: rounds.map((round) => serializeSweepsRound(round, gameId ?? null, date)),
      matches: await getAllSweepsMatches(),
    });
  });
}

async function saveMatch(request: Request, update: boolean) {
  return withApiHandler(request, { auth: 'admin', requireSameOrigin: true }, async () => {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const name = parseNameInput(body?.name);
    const date = body.date === undefined || body.date === null ? null : body.date;
    const sweepsId = parseNullableSweepsId(body.sweepsId);
    if (name === null || sweepsId === undefined) {
      return NextResponse.json(
        { message: 'Provide a valid golfer name and a positive integer Sweeps ID or null.' },
        { status: 400 },
      );
    }
    if (date !== null && !isValidScoreDate(date)) {
      return NextResponse.json(
        { message: 'Invalid date. Use a valid date within the last 10 years.' },
        { status: 400 },
      );
    }

    const result = update
      ? await updateSweepsMatch(name, sweepsId)
      : await createSweepsMatch({ name, sweepsId });
    const saved = result === 'updated' || result === 'created';
    let match = null;
    if (saved && sweepsId !== null && isValidScoreDate(date)) {
      const game = await fetchGameByDate(date);
      const rounds = game?.id ? await fetchRoundsByGameId(String(game.id)) : [];
      const round = rounds.find((candidate) => candidate.playerId === sweepsId);
      match = round
        ? {
            sweepsPlayerId: round.playerId,
            sweepsPlayerName: round.playerName,
            sweepsGrossTotal: round.grossTotal ?? null,
          }
        : null;
    }
    return NextResponse.json(
      { message: saved ? 'Sweeps match saved' : 'Sweeps match could not be saved', match },
      {
        status:
          result === 'created'
            ? 201
            : result === 'updated'
              ? 200
              : result === 'not-found'
                ? 404
                : 409,
      },
    );
  });
}

export async function POST(request: Request) {
  return saveMatch(request, false);
}

export async function PATCH(request: Request) {
  return saveMatch(request, true);
}

export async function DELETE(request: Request) {
  return withApiHandler(request, { auth: 'admin', requireSameOrigin: true }, async () => {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const name = parseNameInput(body?.name);
    if (name === null) {
      return NextResponse.json({ message: 'Provide a golfer name.' }, { status: 400 });
    }
    const result = await deleteSweepsMatch(name);
    const deleted = result === 'deleted';
    return NextResponse.json(
      { message: deleted ? 'Sweeps match removed' : 'No sweeps match found' },
      { status: deleted ? 200 : 404 },
    );
  });
}
