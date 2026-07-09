import { NextResponse } from 'next/server';
import { GhinClient } from '@spicygolf/ghin';
import type { GhinGolfer } from '@/lib/types';
import { parseGhinGolferError } from '@/lib/ghin';

const REQUIRED_ENV = ['GHIN_USERNAME', 'GHIN_PASSWORD'];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export async function POST(request: Request) {
  try {
    validateEnv();

    const body = await request.json();
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
    const ghinNumber = typeof body?.ghinNumber === 'string' ? body.ghinNumber.trim() : '';
    const state = typeof body?.state === 'string' ? body.state.trim() : '';
    const club = typeof body?.club === 'string' ? body.club.trim() : '';

    if (!firstName && !lastName && !ghinNumber) {
      return NextResponse.json(
        { message: 'Provide at least a first name, last name, or GHIN number.' },
        { status: 400 }
      );
    }

    const client = new GhinClient({
      username: process.env.GHIN_USERNAME!,
      password: process.env.GHIN_PASSWORD!,
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
      if (process.env.GHIN_COUNTRY) query.country = process.env.GHIN_COUNTRY;
      searchQueries.push(query);
    }

    for (const query of searchQueries) {
      const golfers = await client.golfers.search(query as Record<string, string>).catch((error: unknown) => parseGhinGolferError(error));
      if (Array.isArray(golfers) && golfers.length > 0) {
        const clubFilteredGolfers = golfers.filter((golfer) => {
          if (!club) return true;
          return golfer.club_name == club;
        });
        return NextResponse.json({ golfers: clubFilteredGolfers as GhinGolfer[] });
      }
    }

    return NextResponse.json({ golfers: [] });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
