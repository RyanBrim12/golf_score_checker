import { NextResponse } from 'next/server';
import { GhinClient } from '@spicygolf/ghin';
import type { GhinGolfer } from '@/lib/types';
import { parseGhinGolferError } from '@/lib/ghin';
import { withApiHandler } from '@/lib/request';
import { getGhinConfig } from '@/lib/serverConfig';

export async function POST(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const config = getGhinConfig();
    const body = await request.json();
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
    const ghinNumber = typeof body?.ghinNumber === 'string' ? body.ghinNumber.trim() : '';
    const state = typeof body?.state === 'string' ? body.state.trim() : '';
    const club = typeof body?.club === 'string' ? body.club.trim() : '';

    const page = typeof body?.page === 'number' && body.page > 0 ? Math.floor(body.page) : 1;
    const perPage = typeof body?.per_page === 'number' && body.per_page > 0 && body.per_page <= 100 ? Math.floor(body.per_page) : 100;

    if (!firstName && !lastName && !ghinNumber) {
      return NextResponse.json(
        { message: 'Provide at least a first name, last name, or GHIN number.' },
        { status: 400 }
      );
    }

    const client = new GhinClient({
      username: config.username,
      password: config.password,
    });

    const searchQueries: Array<Record<string, string>> = [];

    if (ghinNumber) {
      const golfers = [await client.golfers.getOne(ghinNumber)];
      if (golfers[0])
        return NextResponse.json({ golfers: golfers});
    }
    else if (firstName || lastName) {
      const query: Record<string, string> = {};
      if (firstName) query.first_name = firstName;
      if (lastName) query.last_name = lastName;
      if (state) query.state = state;
      if (config.country) query.country = config.country;
      query.per_page = String(perPage);
      query.page = String(page);
      searchQueries.push(query);
    }

    for (const query of searchQueries) {
      const golfers = await client.golfers.search(query as Record<string, string>).catch((error: unknown) => parseGhinGolferError(error));
      if (Array.isArray(golfers) && golfers.length > 0) {
        const clubFilteredGolfers = golfers.filter((golfer) => {
          if (!club) return true;
          return golfer.club_name?.toLowerCase() == club.toLowerCase();
        });
        return NextResponse.json({ golfers: clubFilteredGolfers as GhinGolfer[] });
      }
    }

    return NextResponse.json({ golfers: [] });
  });
}
