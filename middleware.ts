import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rateLimit';

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

function getClientAddress(request: NextRequest): string {
  return request.headers.get('x-real-ip')?.trim() || 'shared-client-address';
}

function rateLimit(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const isSignIn = pathname === '/api/auth/signin';
  const isApiRequest = pathname.startsWith('/api/');
  if (!isSignIn && !isApiRequest) return null;

  const limit = isSignIn ? 10 : 120;
  const windowMs = isSignIn ? 15 * 60 * 1000 : 60 * 1000;
  const bucket = isSignIn ? 'signin' : 'api';
  const result = consumeRateLimit(`${getClientAddress(request)}:${bucket}`, limit, windowMs);
  if (result.allowed) return null;

  const response = NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return response;
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
  const pathname = request.nextUrl.pathname;

  if (pathname === '/api/auth/signin') {
    const rateLimitResponse = rateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    return NextResponse.next();
  }

  if (pathname === '/signin' || pathname === '/api/auth/logout') {
    return NextResponse.next();
  }

  if (!await hasValidSession(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    return NextResponse.redirect(new URL('/signin', request.url));
  }

  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/:path*'],
};