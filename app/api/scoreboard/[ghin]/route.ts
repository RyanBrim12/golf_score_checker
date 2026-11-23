import { NextRequest, NextResponse } from 'next/server';
import { fetchScoreByGhin } from '@/lib/ghin';
import { withApiHandler } from '@/lib/request';
import { isValidScoreDate, parsePositiveGhin } from '@/lib/validation';
import { getGhinScoringConfig } from '@/lib/serverConfig';

export async function GET(request: NextRequest, { params }: { params: Promise<{ ghin: string }> }) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const ghinParam = (await params).ghin;
    const ghin = parsePositiveGhin(ghinParam);

    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date');

    if (ghin === null || !isValidScoreDate(date)) {
      return NextResponse.json({ message: 'Invalid ghin or date. Use a positive integer GHIN and a valid date within the last 10 years.' }, { status: 400 });
    }

    const config = getGhinScoringConfig();
    const scoreResult = await fetchScoreByGhin(ghin, date, config.username, config.password, config.courseId);
    return NextResponse.json({ score: scoreResult?.score ?? null, postedAt: scoreResult?.postedAt ?? null, scoreType: scoreResult?.scoreType ?? null, used: scoreResult?.used ?? null });
  });
}
