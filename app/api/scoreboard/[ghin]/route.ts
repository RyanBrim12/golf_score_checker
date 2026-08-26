import { NextRequest, NextResponse } from 'next/server';
import { fetchScoreByGhin } from '@/lib/ghin';
import { authenticate } from '@/lib/auth';

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

  try {
    validateEnv();

    const ghinParam = (await params).ghin;
    const ghin = Number(ghinParam);

    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ message: 'Missing required query parameter: date' }, { status: 400 });
    }

    const ghinUsername = process.env.GHIN_USERNAME!;
    const ghinPassword = process.env.GHIN_PASSWORD!;
    const ghinCourseId = process.env.GHIN_COURSE_ID!;
    const score = await fetchScoreByGhin(ghin, date, ghinUsername, ghinPassword, ghinCourseId);
    return NextResponse.json({score});
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
