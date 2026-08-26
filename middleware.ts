import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'golf_score_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const decoded = atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const secret = process.env.AUTH_SESSION_SECRET;
  const sessionVersion = process.env.AUTH_SESSION_VERSION;
  const value = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!secret || !sessionVersion || !value) return false;

  const [role, issuedAt, version, signature] = value.split('.');
  const issuedAtNumber = Number(issuedAt);
  const age = Date.now() - issuedAtNumber;
  if ((role !== 'viewer' && role !== 'admin') || version !== sessionVersion || !Number.isInteger(issuedAtNumber) || age < 0 || age > SESSION_MAX_AGE_MS) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encodeText(secret) as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify('HMAC', key, decodeBase64Url(signature) as BufferSource, encodeText(`${role}.${issuedAt}.${version}`) as BufferSource);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/signin' || request.nextUrl.pathname === '/api/auth/signin' || request.nextUrl.pathname === '/api/auth/logout') {
    return NextResponse.next();
  }

  if (!await hasValidSession(request)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/:path*'],
};