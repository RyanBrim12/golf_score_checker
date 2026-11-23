const MAX_GHIN = 999_999_999;
const DATE_LOOKBACK_YEARS = 10;
const MAX_NAME_LENGTH = 100;
const MAX_STRING_LENGTH = 256;

function getUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Validate string input length and type
 * @param value - The string to validate
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @returns True if valid, false otherwise
 */
export function validateStringInput(value: unknown, minLength: number = 1, maxLength: number = MAX_STRING_LENGTH): value is string {
  if (typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= minLength && length <= maxLength;
}

export function parseNameInput(value: unknown): string | null {
  if (typeof value !== 'string' || /[\u0000-\u001F\u007F-\u009F]/.test(value)) return null;

  const name = value.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;

  return name;
}

export function isValidScoreDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || getUtcDateString(parsed) !== value) return false;

  const today = new Date();
  const earliest = new Date(Date.UTC(
    today.getUTCFullYear() - DATE_LOOKBACK_YEARS,
    today.getUTCMonth(),
    today.getUTCDate(),
  ));

  return parsed >= earliest && parsed <= new Date(`${getUtcDateString(today)}T23:59:59.999Z`);
}

export function parsePositiveGhin(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_GHIN ? parsed : null;
}
