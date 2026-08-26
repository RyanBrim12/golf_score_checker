import { NextResponse } from "next/server";
import { getAllMatches, createMatch, updateMatch } from "@/lib/database";
import { authenticate } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";

export async function GET(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;

  const users = await getAllMatches();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const authError = authenticate(request, 'admin');
  if (authError) return authError;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;
    
    if (!name || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const result = await createMatch({ ghin, name });
    if (result) {
      return NextResponse.json(
        { message: 'Match entry created' },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: `Match for ${name} already exists` },
      { status: 409 }
    );
}

export async function PATCH(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const authError = authenticate(request, 'admin');
  if (authError) return authError;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;
    
    if (!name || ghin === undefined) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const result = await updateMatch(name, ghin);
    if (result) {
      return NextResponse.json(
        { message: 'Match entry updated' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: `No existing match for ${name}` },
      { status: 404 }
    );
}