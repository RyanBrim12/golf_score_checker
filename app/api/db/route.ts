import { NextResponse } from "next/server";
import { getAllMatches, createMatch, updateMatch } from "@/lib/database";
import { authenticate } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";
import { validateName, validateStringInput, sanitizeName } from "@/lib/validation";
import { createRequestId, internalServerError } from "@/lib/request";

export async function GET(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;

  const users = await getAllMatches();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;

    const authError = authenticate(request, 'admin');
    if (authError) return authError;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;
    
    // Input validation with length checks
    if (!validateStringInput(name, 1, 100) || ghin === undefined) {
      const response = NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
      response.headers.set('X-Request-ID', requestId);
      return response;
    }

    // Sanitize name to prevent injection
    const sanitizedName = sanitizeName(name);

    const result = await createMatch({ ghin, name: sanitizedName });
    if (result) {
      const response = NextResponse.json(
        { message: 'Match entry created' },
        { status: 201 }
      );
      response.headers.set('X-Request-ID', requestId);
      return response;
    }

    const response = NextResponse.json(
      { message: `Match for ${sanitizedName} already exists` },
      { status: 409 }
    );
    response.headers.set('X-Request-ID', requestId);
    return response;
  } catch (error) {
    return internalServerError(requestId, error);
  }
}

export async function PATCH(request: Request) {
  const requestId = createRequestId();
  
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) return csrfError;

    const authError = authenticate(request, 'admin');
    if (authError) return authError;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const ghin = typeof body?.ghin === 'number' || body?.ghin === null ? body.ghin : undefined;
    
    // Input validation with length checks
    if (!validateStringInput(name, 1, 100) || ghin === undefined) {
      const response = NextResponse.json(
        { message: 'Provide both name and GHIN number.' },
        { status: 400 }
      );
      response.headers.set('X-Request-ID', requestId);
      return response;
    }

    // Sanitize name to prevent injection
    const sanitizedName = sanitizeName(name);

    const result = await updateMatch(sanitizedName, ghin);
    if (result) {
      const response = NextResponse.json(
        { message: 'Match entry updated' },
        { status: 200 }
      );
      response.headers.set('X-Request-ID', requestId);
      return response;
    }

    const response = NextResponse.json(
      { message: `No existing match for ${sanitizedName}` },
      { status: 404 }
    );
    response.headers.set('X-Request-ID', requestId);
    return response;
  } catch (error) {
    return internalServerError(requestId, error);
  }
}