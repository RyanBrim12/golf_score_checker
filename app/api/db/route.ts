import { NextResponse } from "next/server";
import { getAllMatches, initDb, createMatch, updateMatch } from "@/lib/database";

export async function GET() {
  initDb();
  const users = getAllMatches();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' ? body.ghin : undefined;
    
    if (!name || !ghin) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const result = createMatch({ghin, name});
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
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' ? body.ghin : undefined;
    
    if (!name || !ghin) {
      return NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
    }

    const result = updateMatch(name, ghin);
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