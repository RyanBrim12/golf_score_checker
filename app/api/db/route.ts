import { NextResponse } from "next/server";
import { getAllMatches, createMatch, updateMatch } from "@/lib/database";
import { validateStringInput, sanitizeName } from "@/lib/validation";
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
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;

    if (!validateStringInput(name, 1, 100) || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeName(name);

    const result = await createMatch({ ghin, name: sanitizedName });
    if (result === 'created') {
      return NextResponse.json(
        { message: 'Match entry created' },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: `Match for ${sanitizedName} already exists` },
      { status: 409 }
    );
  });
}

export async function PATCH(request: Request) {
  return withApiHandler(request, { auth: 'admin', requireSameOrigin: true }, async () => {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;

    if (!validateStringInput(name, 1, 100) || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeName(name);

    const result = await updateMatch(sanitizedName, ghin);
    if (result === 'updated') {
      return NextResponse.json(
        { message: 'Match entry updated' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: `No existing match for ${sanitizedName}` },
      { status: 404 }
    );
  });
}