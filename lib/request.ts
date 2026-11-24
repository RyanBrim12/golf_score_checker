import { NextResponse } from 'next/server';
import { authenticate } from './auth';
import type { AuthRole } from './session';
import { requireSameOrigin } from './csrf';
export { readJsonObject } from './requestBody';

export function createRequestId(): string {
  return crypto.randomUUID();
}

export type ApiRequestContext = {
  requestId: string;
};

export type ApiHandlerOptions = {
  auth: AuthRole | null;
  requireSameOrigin?: boolean;
};

function addRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export async function withApiHandler(
  request: Request,
  options: ApiHandlerOptions,
  handler: (context: ApiRequestContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = createRequestId();

  try {
    if (options.requireSameOrigin) {
      const csrfError = requireSameOrigin(request);
      if (csrfError) return addRequestId(csrfError, requestId);
    }

    if (options.auth) {
      const authError = await authenticate(request, options.auth);
      if (authError) return addRequestId(authError, requestId);
    }

    return addRequestId(await handler({ requestId }), requestId);
  } catch (error: unknown) {
    return internalServerError(requestId, error);
  }
}

export function internalServerError(requestId: string, error: unknown): NextResponse {
  console.error('Unhandled API error', { requestId, error });

  return NextResponse.json(
    { message: 'An unexpected server error occurred.', requestId },
    { status: 500, headers: { 'X-Request-ID': requestId } },
  );
}