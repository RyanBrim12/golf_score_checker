export type AuthRole = 'viewer' | 'admin';

export const AUTH_COOKIE_NAME = 'golf_score_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_MAX_AGE_MS = SESSION_TTL_SECONDS * 1000;

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const base64 = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const decoded = atob(base64);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function getSessionCookie(request: Request): string | null {
  const cookie = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}

export async function getAuthenticatedRoleFromCookie(value: string | null | undefined): Promise<AuthRole | null> {
  const secret = process.env.AUTH_SESSION_SECRET;
  const sessionVersion = process.env.AUTH_SESSION_VERSION;
  if (!secret || !sessionVersion || !value) return null;

  const parts = value.split('.');
  if (parts.length !== 4) return null;

  const [role, issuedAt, version, encodedSignature] = parts;
  if ((role !== 'viewer' && role !== 'admin') || !/^\d+$/.test(issuedAt) || version !== sessionVersion) {
    return null;
  }

  const issuedAtNumber = Number(issuedAt);
  const age = Date.now() - issuedAtNumber;
  const signature = decodeBase64Url(encodedSignature);
  if (!Number.isSafeInteger(issuedAtNumber) || age < 0 || age > SESSION_MAX_AGE_MS || !signature) {
    return null;
  }

  try {
    const signatureBuffer = new ArrayBuffer(signature.byteLength);
    new Uint8Array(signatureBuffer).set(signature);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(`${role}.${issuedAt}.${version}`),
    );
    return isValid ? role : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedRole(request: Request): Promise<AuthRole | null> {
  return getAuthenticatedRoleFromCookie(getSessionCookie(request));
}
