import { NextResponse } from 'next/server';
import { fetchGameByDate, fetchRoundsByGameId, serializeSweepsRound } from '@/lib/sweeps';
import { createSweepsMatch, deleteSweepsMatch, getAllSweepsMatches, updateSweepsMatch } from '@/lib/database';
import { authenticate } from '@/lib/auth';
import { requireSameOrigin } from '@/lib/csrf';
import { createRequestId, internalServerError } from '@/lib/request';
import { isValidScoreDate, validateStringInput, sanitizeName } from '@/lib/validation';

const REQUIRED_ENV = ['SWEEPS_API_KEY'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export async function GET(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;
  const requestId = createRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!isValidScoreDate(date)) {
      return NextResponse.json({ message: 'Invalid ghin or date. Use a positive integer GHIN and a valid date within the last 10 years.' }, { status: 400 });
    }

    validateEnv();

    const game = await fetchGameByDate(date as string);
    const gameId = game?.id;
    const rounds = gameId ? await fetchRoundsByGameId(gameId) : [];

    return NextResponse.json({
      gameId: gameId ?? null,
      date,
      rounds: rounds.map((round) => serializeSweepsRound(round, gameId ?? null, date)),
      matches: await getAllSweepsMatches(),
    });
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}

async function saveMatch(request: Request, update: boolean) {
  const requestId = createRequestId();
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;
    const authError = authenticate(request, 'admin');
    if (authError) return authError;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const date = typeof body?.date === 'string' ? body.date : null;
    const sweepsId = body?.sweepsId === null ? null : typeof body?.sweepsId === 'number' && Number.isInteger(body.sweepsId) && body.sweepsId > 0 ? body.sweepsId : undefined;
    if (!validateStringInput(name, 1, 100) || sweepsId === undefined) {
      return NextResponse.json({ message: 'Provide both golfer names.' }, { status: 400 });
    }

    const sanitizedName = sanitizeName(name);
    const saved = update
      ? await updateSweepsMatch(sanitizedName, sweepsId)
      : await createSweepsMatch({ name: sanitizedName, sweepsId });
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
      { status: saved ? (update ? 200 : 201) : update ? 404 : 409 },
    );
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}

export async function POST(request: Request) {
  return saveMatch(request, false);
}

export async function PATCH(request: Request) {
  return saveMatch(request, true);
}

export async function DELETE(request: Request) {
  const requestId = createRequestId();
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;
    const authError = authenticate(request, 'admin');
    if (authError) return authError;
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!validateStringInput(name, 1, 100)) {
      return NextResponse.json({ message: 'Provide a golfer name.' }, { status: 400 });
    }
    const deleted = await deleteSweepsMatch(sanitizeName(name));
    return NextResponse.json({ message: deleted ? 'Sweeps match removed' : 'No sweeps match found' }, { status: deleted ? 200 : 404 });
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}
