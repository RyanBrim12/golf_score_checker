import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { requireSameOrigin } from '@/lib/csrf';
import { createRequestId } from '@/lib/request';

const logger = {
  info: (message: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ level: 'info', message, ...data })),
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  
  // CSRF Protection
  const csrfError = requireSameOrigin(request);
  if (csrfError) {
    logger.info('CSRF validation failed for logout', { requestId });
    return csrfError;
  }

  logger.info('User logged out', { requestId });
  
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(clearSessionCookie());
  return response;
}