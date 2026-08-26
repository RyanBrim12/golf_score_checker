import { NextResponse } from 'next/server';

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function internalServerError(requestId: string, error: unknown): NextResponse {
  console.error('Unhandled API error', { requestId, error });

  return NextResponse.json(
    { message: 'An unexpected server error occurred.', requestId },
    { status: 500, headers: { 'X-Request-ID': requestId } },
  );
}