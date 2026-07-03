import { NextResponse } from 'next/server';
import { createClubCaddieSession, fetchTeeSheetHtml, parseGolfersFromTeeSheet } from '@/lib/clubCaddie';
import { fetchGolferScores } from '@/lib/ghin';

const REQUIRED_ENV = [
  'CLUB_CADDIE_CLUB_ID',
  'CLUB_CADDIE_USERNAME',
  'CLUB_CADDIE_PASSWORD',
  'CLUB_CADDIE_SHEET_ID',
  'GHIN_USERNAME',
  'GHIN_PASSWORD',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export async function GET(request: Request) {
  try {
    validateEnv();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Missing required query parameter: date' }, { status: 400 });
    }

    const clubId = process.env.CLUB_CADDIE_CLUB_ID!;
    const clubUsername = process.env.CLUB_CADDIE_USERNAME!;
    const clubPassword = process.env.CLUB_CADDIE_PASSWORD!;
    const sheetId = process.env.CLUB_CADDIE_SHEET_ID!;
    const ghinUsername = process.env.GHIN_USERNAME!;
    const ghinPassword = process.env.GHIN_PASSWORD!;

    const session = await createClubCaddieSession(clubId, clubUsername, clubPassword);
    const html = await fetchTeeSheetHtml(session, sheetId, date);
    const golfers = parseGolfersFromTeeSheet(html);
    const scores = await fetchGolferScores(date, golfers, ghinUsername, ghinPassword);

    return NextResponse.json(scores);
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
