import { NextResponse } from 'next/server';
import { GhinClient } from '@spicygolf/ghin';
import { parseGhinScoreError } from '@/lib/ghin';
import { withApiHandler } from '@/lib/request';
import { isValidScoreDate, parsePositiveGhin } from '@/lib/validation';
import { getGhinConfig } from '@/lib/serverConfig';

export async function GET(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const { searchParams } = new URL(request.url);
    const ghinNumber = searchParams.get('ghin');
    const date = searchParams.get('date');

    const parsedGhin = parsePositiveGhin(ghinNumber);
    if (parsedGhin === null || !isValidScoreDate(date)) {
      return NextResponse.json({ message: 'Invalid ghin or date. Use a positive integer GHIN and a valid date within the last 10 years.' }, { status: 400 });
    }

    const config = getGhinConfig();

    const client = new GhinClient({
      username: config.username,
      password: config.password,
    });

    const scoreResponse = await client.golfers.getScores(parsedGhin, {
      from_date_played: new Date(date),
      to_date_played: new Date(date),
    }).catch((error: unknown) => parseGhinScoreError(error));

    const courseId = config.courseId;
    const scoreEntry = scoreResponse?.scores?.[0];

    if (!scoreEntry || scoreEntry.adjusted_gross_score === undefined || scoreEntry.adjusted_gross_score === null) {
      return NextResponse.json({ score: null, status: 'no-score' });
    }

    if (courseId && scoreEntry.course_id && scoreEntry.course_id !== courseId) {
      return NextResponse.json({ score: null, status: 'no-score' });
    }

    const postedAt = scoreEntry.posted_at instanceof Date ? scoreEntry.posted_at.toISOString() : scoreEntry.posted_at ?? null;
    const scoreType = scoreEntry.score_type_display_full ?? null;
    const used = scoreEntry.used === true || scoreEntry.used === 'true' ? true : scoreEntry.used === false || scoreEntry.used === 'false' ? false : null;
    return NextResponse.json({ score: scoreEntry.adjusted_gross_score, postedAt, scoreType, used, status: 'matched' });
  });
}
