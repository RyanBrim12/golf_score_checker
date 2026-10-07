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

type PasswordVerification =
  | { verified: true }
  | {
      verified: false;
      reason: 'malformed_hash' | 'derivation_failed' | 'password_mismatch';
      hashIssue?: 'unsupported_algorithm' | 'invalid_cost' | 'invalid_block_size' | 'invalid_parallelization' | 'invalid_salt' | 'invalid_derived_key_length';
      errorName?: string;
    };

async function verifyPassword(password: string, encodedHash: string): Promise<PasswordVerification> {
  const [algorithm, cost, blockSize, parallelization, salt, expectedHash] = encodedHash.split('$');
  const workFactor = Number(cost);
  const blockSizeValue = Number(blockSize);
  const parallelizationValue = Number(parallelization);
  const saltBuffer = salt ? Buffer.from(salt, 'base64url') : Buffer.alloc(0);
  const expectedKey = expectedHash ? Buffer.from(expectedHash, 'base64url') : Buffer.alloc(0);
  let hashIssue: Extract<PasswordVerification, { verified: false }>['hashIssue'];
  if (algorithm !== 'scrypt') hashIssue = 'unsupported_algorithm';
  else if (!Number.isSafeInteger(workFactor) || workFactor < 2 || (workFactor & (workFactor - 1)) !== 0) hashIssue = 'invalid_cost';
  else if (!Number.isSafeInteger(blockSizeValue) || blockSizeValue < 1) hashIssue = 'invalid_block_size';
  else if (!Number.isSafeInteger(parallelizationValue) || parallelizationValue < 1) hashIssue = 'invalid_parallelization';
  else if (saltBuffer.length === 0) hashIssue = 'invalid_salt';
  else if (expectedKey.length !== SCRYPT_KEY_LENGTH) hashIssue = 'invalid_derived_key_length';
  if (hashIssue) return { verified: false, reason: 'malformed_hash', hashIssue };

  try {
    const derivedKey = await deriveKey(password, saltBuffer, {
      N: workFactor,
      r: blockSizeValue,
      p: parallelizationValue,
    });
    return timingSafeEqual(derivedKey, expectedKey)
      ? { verified: true }
      : { verified: false, reason: 'password_mismatch' };
  } catch (error) {
    return {
      verified: false,
      reason: 'derivation_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
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

  const missingSettings = [
    ...credentials.flatMap(({ role, username, passwordHash }) => [
      ...(!username ? [`AUTH_${role.toUpperCase()}_USERNAME`] : []),
      ...(!passwordHash ? [`AUTH_${role.toUpperCase()}_PASSWORD_HASH`] : []),
    ]),
    ...(!getSessionSecret() ? ['AUTH_SESSION_SECRET'] : []),
    ...(!getSessionVersion() ? ['AUTH_SESSION_VERSION'] : []),
  ];

  return { credentials, missingSettings };
}

export type CredentialAuthenticationResult =
  | { authenticated: true; role: AuthRole }
  | {
      authenticated: false;
      reason: 'configuration_missing' | 'username_not_found' | 'malformed_hash' | 'derivation_failed' | 'password_mismatch';
      missingSettings?: string[];
      credentialRole?: AuthRole;
      hashIssue?: Extract<PasswordVerification, { verified: false }>['hashIssue'];
      errorName?: string;
    };

export async function authenticateCredentials(username: string, password: string): Promise<CredentialAuthenticationResult> {
  const { credentials, missingSettings } = configuredCredentials();
  if (missingSettings.length > 0) {
    return { authenticated: false, reason: 'configuration_missing', missingSettings };
  }

  for (const credential of credentials) {
    if (safeEqual(username, credential.username!)) {
      const verification = await verifyPassword(password, credential.passwordHash!);
      if (verification.verified) {
        return { authenticated: true, role: credential.role };
      }
      return {
        authenticated: false,
        reason: verification.reason,
        credentialRole: credential.role,
        ...('hashIssue' in verification && verification.hashIssue ? { hashIssue: verification.hashIssue } : {}),
        ...('errorName' in verification ? { errorName: verification.errorName } : {}),
      };
    }
  }

  return { authenticated: false, reason: 'username_not_found' };
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
