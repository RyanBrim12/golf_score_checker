import { NextResponse } from 'next/server';
import { GhinClient } from '@spicygolf/ghin';
import { parseGhinScoreError } from '@/lib/ghin';
import { authenticate } from '@/lib/auth';

const REQUIRED_ENV = ['GHIN_USERNAME', 'GHIN_PASSWORD'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export async function GET(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;

  try {
    validateEnv();

    const { searchParams } = new URL(request.url);
    const ghinNumber = searchParams.get('ghin');
    const date = searchParams.get('date');

    if (!ghinNumber || !date) {
      return NextResponse.json({ message: 'Missing required query parameters: ghin and date' }, { status: 400 });
    }

    const client = new GhinClient({
      username: process.env.GHIN_USERNAME!,
      password: process.env.GHIN_PASSWORD!,
    });

    const scoreResponse = await client.golfers.getScores(Number(ghinNumber), {
      from_date_played: new Date(date),
      to_date_played: new Date(date),
    }).catch((error: unknown) => parseGhinScoreError(error));

    const courseId = process.env.GHIN_COURSE_ID;
    const scoreEntry = scoreResponse?.scores?.[0];

    if (!scoreEntry || scoreEntry.adjusted_gross_score === undefined || scoreEntry.adjusted_gross_score === null) {
      return NextResponse.json({ score: null, status: 'no-score' });
    }

    if (courseId && scoreEntry.course_id && scoreEntry.course_id !== courseId) {
      return NextResponse.json({ score: null, status: 'no-score' });
    }

    return NextResponse.json({ score: scoreEntry.adjusted_gross_score, status: 'matched' });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
