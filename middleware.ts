import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rateLimit';
import { getAuthenticatedRole } from '@/lib/session';

function getClientAddress(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0];
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0];

  return [forwardedFor, realIp, cfIp, vercelIp]
    .map((address) => address?.trim())
    .find((address): address is string => Boolean(address)) ?? null;
}

function rateLimit(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const isSignIn = pathname === '/api/auth/signin';
  const isApiRequest = pathname.startsWith('/api/');
  if (!isSignIn && !isApiRequest) return null;

  const limit = isSignIn ? 10 : 120;
  const windowMs = isSignIn ? 15 * 60 * 1000 : 60 * 1000;
  const bucket = isSignIn ? 'signin' : 'api';
  const clientAddress = getClientAddress(request)
    ?? (process.env.NODE_ENV !== 'production' ? 'local-development' : null);

  if (!clientAddress) {
    console.error('Rate limiting unavailable: client IP address is missing. Configure proxy forwarding headers.');
    return NextResponse.json(
      { message: 'Rate limiting is unavailable. Check the server proxy configuration.' },
      { status: 503 },
    );
  }

  const result = consumeRateLimit(`${clientAddress}:${bucket}`, limit, windowMs);
  if (result.allowed) return null;

  const response = NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
  response.headers.set('Retry-After', String(result.retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return response;
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

  if (!await getAuthenticatedRole(request)) {
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