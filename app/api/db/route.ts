import { NextResponse } from "next/server";
import { getAllMatches, createMatch, updateMatch } from "@/lib/database";
import { parseNameInput, parseNullableGhin } from "@/lib/validation";
import { readJsonObject, withApiHandler } from "@/lib/request";

export const runtime = 'nodejs';
export const preferredRegion = 'home';

export async function GET(request: Request) {
  return withApiHandler(request, { auth: 'viewer' }, async () => {
    const users = await getAllMatches();
    return NextResponse.json(users);
  });
}

export async function POST(request: Request) {
  return withApiHandler(request, { auth: 'admin', requireSameOrigin: true }, async () => {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const name = parseNameInput(body?.name);
    const ghin = parseNullableGhin(body.ghin);

    if (name === null || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide a valid name and a positive integer GHIN number or null.' },
        { status: 400 }
      );
    }

    const result = await createMatch({ ghin, name });
    if (result === 'created') {
      return NextResponse.json(
        { message: 'Match entry created' },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: `Match for ${name} already exists` },
      { status: 409 }
    );
  });
}

export async function PATCH(request: Request) {
  return withApiHandler(request, { auth: 'admin', requireSameOrigin: true }, async () => {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const name = parseNameInput(body?.name);
    const ghin = parseNullableGhin(body.ghin);

    if (name === null || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide a valid name and a positive integer GHIN number or null.' },
        { status: 400 }
      );
    }

    const result = await updateMatch(name, ghin);
    if (result === 'updated') {
      return NextResponse.json(
        { message: 'Match entry updated' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: `No existing match for ${name}` },
      { status: 404 }
    );
  });
}