import { NextResponse } from 'next/server';
import { GhinClient } from '@spicygolf/ghin';
import type { GhinGolfer } from '@/lib/types';
import { parseGhinGolferError } from '@/lib/ghin';
import { readJsonObject, withApiHandler } from '@/lib/request';
import { getGhinConfig } from '@/lib/serverConfig';
import { parsePositiveGhin } from '@/lib/validation';

export async function POST(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const stringFields = ['firstName', 'lastName', 'ghinNumber', 'state', 'club'] as const;
    if (stringFields.some((field) => body[field] !== undefined && typeof body[field] !== 'string')) {
      return NextResponse.json({ message: 'GHIN search fields must be strings.' }, { status: 400 });
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const ghinNumber = typeof body.ghinNumber === 'string' ? body.ghinNumber.trim() : '';
    const state = typeof body.state === 'string' ? body.state.trim() : '';
    const club = typeof body.club === 'string' ? body.club.trim() : '';
    const parsedGhin = ghinNumber ? parsePositiveGhin(ghinNumber) : null;

    if (ghinNumber && parsedGhin === null) {
      return NextResponse.json({ message: 'GHIN number must be a positive integer.' }, { status: 400 });
    }

    const page = body.page === undefined ? 1 : body.page;
    const perPage = body.per_page === undefined ? 100 : body.per_page;
    if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json({ message: 'Page must be a positive integer.' }, { status: 400 });
    }
    if (typeof perPage !== 'number' || !Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100) {
      return NextResponse.json({ message: 'per_page must be an integer between 1 and 100.' }, { status: 400 });
    }

    const config = getGhinConfig();

    if (!firstName && !lastName && parsedGhin === null) {
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

    if (parsedGhin !== null) {
      const golfers = [await client.golfers.getOne(parsedGhin)];
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
