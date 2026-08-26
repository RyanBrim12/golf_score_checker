import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';
import { NextResponse } from 'next/server';

export type AuthRole = 'viewer' | 'admin';

export const AUTH_COOKIE_NAME = 'golf_score_session';
const SCRYPT_KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEY_LENGTH, options, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey as Buffer);
      }
    });
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret(): string | null {
  return process.env.AUTH_SESSION_SECRET || null;
}

function getSessionVersion(): string | null {
  return process.env.AUTH_SESSION_VERSION || null;
}

async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, salt, expectedHash] = encodedHash.split('$');
  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !expectedHash) return false;

  try {
    const derivedKey = await deriveKey(password, Buffer.from(salt, 'base64url'), {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    }) as Buffer;
    const expectedKey = Buffer.from(expectedHash, 'base64url');
    return expectedKey.length === derivedKey.length && timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

function signSession(role: AuthRole, issuedAt: number): string {
  const payload = `${role}.${issuedAt}.${getSessionVersion()}`;
  const signature = createHmac('sha256', getSessionSecret()!).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function createSessionCookie(role: AuthRole) {
  return {
    name: AUTH_COOKIE_NAME,
    value: signSession(role, Date.now()),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  };
}

export function clearSessionCookie() {
  return {
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}

function configuredCredentials() {
  const credentials = [
    { role: 'viewer' as const, username: process.env.AUTH_VIEWER_USERNAME, passwordHash: process.env.AUTH_VIEWER_PASSWORD_HASH },
    { role: 'admin' as const, username: process.env.AUTH_ADMIN_USERNAME, passwordHash: process.env.AUTH_ADMIN_PASSWORD_HASH },
  ];

  if (credentials.some(({ username, passwordHash }) => !username || !passwordHash || !getSessionSecret() || !getSessionVersion())) {
    throw new Error('Authentication credentials are not configured.');
  }

  return credentials;
}

export async function authenticateCredentials(username: string, password: string): Promise<AuthRole | null> {
  try {
    const credentials = configuredCredentials();
    for (const credential of credentials) {
      if (safeEqual(username, credential.username!) && await verifyPassword(password, credential.passwordHash!)) {
        return credential.role;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getAuthenticatedRole(request: Request): AuthRole | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) return null;

  let value: string;
  try {
    value = decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }

  const [role, issuedAt, version, signature] = value.split('.');
  if ((role !== 'viewer' && role !== 'admin') || !issuedAt || !version || !signature || version !== getSessionVersion()) return null;

  const issuedAtNumber = Number(issuedAt);
  const maxAge = 60 * 60 * 8 * 1000;
  const age = Date.now() - issuedAtNumber;
  if (!Number.isInteger(issuedAtNumber) || age < 0 || age > maxAge) return null;

  const expectedSignature = createHmac('sha256', secret).update(`${role}.${issuedAt}.${version}`).digest('base64url');
  return safeEqual(signature, expectedSignature) ? role : null;
}

export function authenticate(request: Request, requiredRole: AuthRole = 'viewer'): NextResponse | null {
  const role = getAuthenticatedRole(request);
  if (!role || (requiredRole === 'admin' && role !== 'admin')) {
    return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
  }

  return null;
}
