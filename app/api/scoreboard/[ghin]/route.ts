import { NextRequest, NextResponse } from 'next/server';
import { fetchScoreByGhin } from '@/lib/ghin';
import { authenticate } from '@/lib/auth';
import { createRequestId, internalServerError } from '@/lib/request';
import { isValidScoreDate, parsePositiveGhin } from '@/lib/validation';

const REQUIRED_ENV = [
  'GHIN_USERNAME',
  'GHIN_PASSWORD',
  'GHIN_COURSE_ID'
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ ghin: string }> }) {
  const authError = authenticate(request);
  if (authError) return authError;
  const requestId = createRequestId();

  try {
    const ghinParam = (await params).ghin;
    const ghin = parsePositiveGhin(ghinParam);

    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date');

    if (ghin === null || !isValidScoreDate(date)) {
      return NextResponse.json({ message: 'Invalid ghin or date. Use a positive integer GHIN and a valid date within the last 10 years.' }, { status: 400 });
    }

    validateEnv();

    const ghinUsername = process.env.GHIN_USERNAME!;
    const ghinPassword = process.env.GHIN_PASSWORD!;
    const ghinCourseId = process.env.GHIN_COURSE_ID!;
    const scoreResult = await fetchScoreByGhin(ghin, date, ghinUsername, ghinPassword, ghinCourseId);
    return NextResponse.json({ score: scoreResult?.score ?? null, postedAt: scoreResult?.postedAt ?? null, scoreType: scoreResult?.scoreType ?? null });
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}
