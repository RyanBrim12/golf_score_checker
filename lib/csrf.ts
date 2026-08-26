import { NextResponse } from 'next/server';

export function requireSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) {
    return NextResponse.json({ message: 'Origin header required.' }, { status: 403 });
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    if (origin !== requestOrigin) {
      return NextResponse.json({ message: 'Cross-origin request rejected.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 });
  }

  return null;
}