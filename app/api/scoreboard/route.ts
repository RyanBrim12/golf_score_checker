import { NextResponse } from 'next/server';
import { createClubCaddieSession, fetchTeeSheetHtml, parseGolfersFromTeeSheet } from '@/lib/clubCaddie';
import { fetchGolferScores } from '@/lib/ghin';
import { authenticate } from '@/lib/auth';
import { createRequestId, internalServerError } from '@/lib/request';
import { isValidScoreDate } from '@/lib/validation';
import { applySweepsScores, fetchAllSweepsPlayers, fetchGameByDate, fetchRoundsByGameId } from '@/lib/sweeps';
import { getAllSweepsMatches } from '@/lib/database';

const REQUIRED_ENV = [
  'CLUB_CADDIE_CLUB_ID',
  'CLUB_CADDIE_USERNAME',
  'CLUB_CADDIE_PASSWORD',
  'CLUB_CADDIE_SHEET_ID',
  'GHIN_USERNAME',
  'GHIN_PASSWORD',
  'GHIN_STATE',
  'GHIN_COUNTRY',
  'GHIN_CLUB_ID',
  'GHIN_COURSE_ID',
  'SWEEPS_API_KEY'
];

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
      return NextResponse.json({ message: 'Invalid date. Use a valid date within the last 10 years.' }, { status: 400 });
    }

    validateEnv();

    const clubId = process.env.CLUB_CADDIE_CLUB_ID!;
    const clubUsername = process.env.CLUB_CADDIE_USERNAME!;
    const clubPassword = process.env.CLUB_CADDIE_PASSWORD!;
    const sheetId = process.env.CLUB_CADDIE_SHEET_ID!;
    const ghinUsername = process.env.GHIN_USERNAME!;
    const ghinPassword = process.env.GHIN_PASSWORD!;
    const ghinState = process.env.GHIN_STATE!;
    const ghinCountry = process.env.GHIN_COUNTRY!;
    const ghinClubId = process.env.GHIN_CLUB_ID!;
    const ghinClub = process.env.GHIN_CLUB!;
    const ghinCourseId = process.env.GHIN_COURSE_ID!;
    const session = await createClubCaddieSession(clubId, clubUsername, clubPassword);
    const html = await fetchTeeSheetHtml(session, sheetId, date);
    const golfers = parseGolfersFromTeeSheet(html);
    const scores = await fetchGolferScores(date, golfers, ghinUsername, ghinPassword, ghinState, ghinClubId, ghinCountry, ghinCourseId, requestId);
    const game = await fetchGameByDate(date);
    const rounds = game?.id ? await fetchRoundsByGameId(String(game.id)) : [];
    const sweepsPlayers = await fetchAllSweepsPlayers();
    const sweepsMatches = await getAllSweepsMatches();
    const scoresWithSweeps = await applySweepsScores(scores, rounds, new Map(sweepsMatches.map((match) => [match.name, match.sweepsId])));
    return NextResponse.json({
      scores: scoresWithSweeps,
      state: ghinState,
      club: ghinClub,
      sweepsGolfers: sweepsPlayers
        .sort((a, b) => a.playerName.localeCompare(b.playerName))
        .map((player) => ({ playerId: player.playerId, playerName: player.playerName, handicap: player.handicap ?? player.handicapCalculated })),
    });
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}
