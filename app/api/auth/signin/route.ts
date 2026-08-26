import { NextResponse } from 'next/server';
import { authenticateCredentials, createSessionCookie } from '@/lib/auth';
import { requireSameOrigin } from '@/lib/csrf';
import { createRequestId, internalServerError } from '@/lib/request';
import { validateStringInput } from '@/lib/validation';

const logger = {
  info: (message: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ level: 'info', message, ...data })),
  error: (message: string, data?: Record<string, unknown>) => console.error(JSON.stringify({ level: 'error', message, ...data })),
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  
  try {
    // CSRF Protection
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      logger.info('CSRF validation failed', { requestId, ip: request.headers.get('x-forwarded-for') });
      return csrfError;
    }

    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    // Input validation
    if (!validateStringInput(username, 1, 100) || !validateStringInput(password, 1, 256)) {
      logger.info('Invalid input format for signin', { requestId });
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    const role = await authenticateCredentials(username, password);

    if (!role) {
      logger.info('Authentication failed', { requestId, username });
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    logger.info('User authenticated successfully', { requestId, role });

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(createSessionCookie(role));
    return response;
  } catch (error) {
    return internalServerError(requestId, error);
  }
}
