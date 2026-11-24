import { NextResponse } from 'next/server';
import {
  createClubCaddieSession,
  fetchTeeSheetHtml,
  parseGolfersFromTeeSheet,
} from '@/lib/clubCaddie';
import { fetchGolferScores } from '@/lib/ghin';
import { withApiHandler } from '@/lib/request';
import { isValidScoreDate } from '@/lib/validation';
import {
  applySweepsScores,
  fetchAllSweepsPlayers,
  fetchGameByDate,
  fetchRoundsByGameId,
} from '@/lib/sweeps';
import { getAllSweepsMatches } from '@/lib/database';
import { getScoreboardConfig } from '@/lib/serverConfig';

export const runtime = 'nodejs';
export const preferredRegion = 'home';

export async function GET(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async ({ requestId }) => {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!isValidScoreDate(date)) {
      return NextResponse.json(
        { message: 'Invalid date. Use a valid date within the last 10 years.' },
        { status: 400 },
      );
    }

    const config = getScoreboardConfig();
    const session = await createClubCaddieSession(
      config.clubCaddie.clubId,
      config.clubCaddie.username,
      config.clubCaddie.password,
    );
    const html = await fetchTeeSheetHtml(session, config.clubCaddie.sheetId, date);
    const golfers = parseGolfersFromTeeSheet(html);
    const scores = await fetchGolferScores(
      date,
      golfers,
      config.ghin.username,
      config.ghin.password,
      config.ghin.state,
      config.ghin.clubId,
      config.ghin.country,
      config.ghin.courseId,
      requestId,
    );
    const game = await fetchGameByDate(date);
    const rounds = game?.id ? await fetchRoundsByGameId(String(game.id)) : [];
    const sweepsPlayers = await fetchAllSweepsPlayers();
    const sweepsMatches = await getAllSweepsMatches();
    const scoresWithSweeps = await applySweepsScores(
      scores,
      rounds,
      new Map(sweepsMatches.map((match) => [match.name, match.sweepsId])),
    );
    return NextResponse.json({
      scores: scoresWithSweeps,
      state: config.ghin.state,
      club: config.ghin.club,
      sweepsGolfers: sweepsPlayers
        .sort((a, b) => a.playerName.localeCompare(b.playerName))
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          handicap: player.handicap ?? player.handicapCalculated,
        })),
    });
  });
}
