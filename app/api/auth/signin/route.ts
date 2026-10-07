import { NextResponse } from 'next/server';
import { authenticateCredentials, createSessionCookie } from '@/lib/auth';
import { requireSameOrigin } from '@/lib/csrf';
import { createRequestId } from '@/lib/request';
import { validateStringInput } from '@/lib/validation';

const logger = {
  info: (message: string, data?: Record<string, unknown>) => console.log(JSON.stringify({ level: 'info', message, ...data })),
  error: (message: string, data?: Record<string, unknown>) => console.error(JSON.stringify({ level: 'error', message, ...data })),
};

function getAuthConfigDiagnostics(includeValues: boolean) {
  const diagnostics = {
    viewerUsernameConfigured: Boolean(process.env.AUTH_VIEWER_USERNAME),
    viewerPasswordHashConfigured: Boolean(process.env.AUTH_VIEWER_PASSWORD_HASH),
    adminUsernameConfigured: Boolean(process.env.AUTH_ADMIN_USERNAME),
    adminPasswordHashConfigured: Boolean(process.env.AUTH_ADMIN_PASSWORD_HASH),
    sessionSecretConfigured: Boolean(process.env.AUTH_SESSION_SECRET),
    sessionVersionConfigured: Boolean(process.env.AUTH_SESSION_VERSION),
  };

  return includeValues
    ? {
        ...diagnostics,
        values: {
          AUTH_VIEWER_USERNAME: process.env.AUTH_VIEWER_USERNAME ?? null,
          AUTH_VIEWER_PASSWORD_HASH: process.env.AUTH_VIEWER_PASSWORD_HASH ?? null,
          AUTH_ADMIN_USERNAME: process.env.AUTH_ADMIN_USERNAME ?? null,
          AUTH_ADMIN_PASSWORD_HASH: process.env.AUTH_ADMIN_PASSWORD_HASH ?? null,
          AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET ?? null,
          AUTH_SESSION_VERSION: process.env.AUTH_SESSION_VERSION ?? null,
        },
      }
    : diagnostics;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  let stage = 'csrf_validation';
  const includeDiagnosticValues = process.env.AUTH_DIAGNOSTICS_LOG_VALUES === 'true';

  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      logger.info('Signin rejected', { requestId, stage, reason: 'origin_validation_failed' });
      return csrfError;
    }

    logger.info('Signin attempt received', {
      requestId,
      stage: 'attempt_received',
      diagnosticValuesEnabled: includeDiagnosticValues,
      authConfig: getAuthConfigDiagnostics(includeDiagnosticValues),
    });

    stage = 'request_body_parse';
    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    stage = 'input_validation';
    if (!validateStringInput(username, 1, 100) || !validateStringInput(password, 1, 256)) {
      logger.info('Signin rejected', {
        requestId,
        stage,
        usernamePresent: username.length > 0,
        passwordPresent: password.length > 0,
      });
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    stage = 'credential_authentication';
    const result = await authenticateCredentials(username, password);

    if (!result.authenticated) {
      logger.info('Authentication failed', {
        requestId,
        stage,
        reason: result.reason,
        ...(result.missingSettings ? { missingSettings: result.missingSettings } : {}),
        ...(result.credentialRole ? { credentialRole: result.credentialRole } : {}),
        ...(result.hashIssue ? { hashIssue: result.hashIssue } : {}),
        ...(result.errorName ? { errorName: result.errorName } : {}),
        ...(includeDiagnosticValues ? { submittedUsername: username } : {}),
      });
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    logger.info('User authenticated successfully', { requestId, stage, role: result.role });

    stage = 'session_cookie_creation';
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(createSessionCookie(result.role));
    return response;
  } catch (error) {
    logger.error('Signin processing failed', {
      requestId,
      stage,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { message: 'An unexpected server error occurred.', requestId },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    );
  }
}
