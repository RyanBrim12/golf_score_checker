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

    if (firstName || lastName) {
      const query: Record<string, string> = {};
      if (firstName) query.first_name = firstName;
      if (lastName) query.last_name = lastName;
      if (process.env.GHIN_COUNTRY) query.country = process.env.GHIN_COUNTRY;
      searchQueries.push(query);
    }

    if (ghinNumber) {
      searchQueries.push({ ghin: ghinNumber });
    }

    for (const query of searchQueries) {
      const golfers = await client.golfers.search(query as Record<string, string>).catch((error: unknown) => parseGhinGolferError(error));
      if (Array.isArray(golfers) && golfers.length > 0) {
        return NextResponse.json({ golfers: golfers as GhinGolfer[] });
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
