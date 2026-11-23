import { NextResponse } from "next/server";
import { getAllMatches, createMatch, updateMatch } from "@/lib/database";
import { parseNameInput } from "@/lib/validation";
import { withApiHandler } from "@/lib/request";

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
    const body = await request.json();
    const name = parseNameInput(body?.name);
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;

    if (name === null || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
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
    const body = await request.json();
    const name = parseNameInput(body?.name);
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;

    if (name === null || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
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