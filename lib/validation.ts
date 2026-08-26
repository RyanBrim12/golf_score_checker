const MAX_GHIN = 999_999_999;
const DATE_LOOKBACK_YEARS = 10;

function getUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
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
