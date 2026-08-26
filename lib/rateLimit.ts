type RateLimitEntry = {
  requests: number[];
  windowMs: number;
};

const entries = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10_000;

function removeExpiredEntries(now: number): void {
  for (const [entryKey, entry] of entries) {
    if (entry.requests.length === 0 || now - entry.requests[entry.requests.length - 1] >= entry.windowMs) {
      entries.delete(entryKey);
    }
  }
}

function evictOldestEntry(): void {
  const oldestEntryKey = entries.keys().next().value;
  if (oldestEntryKey !== undefined) entries.delete(oldestEntryKey);
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  removeExpiredEntries(now);
  let entry = entries.get(key);
  if (!entry || entry.windowMs !== windowMs) {
    if (!entry && entries.size >= MAX_ENTRIES) evictOldestEntry();
    entry = { requests: [], windowMs };
    entries.set(key, entry);
  }
  entry.requests = entry.requests.filter((timestamp) => now - timestamp < windowMs);

  const oldestRequest = entry.requests[0];
  const retryAfterSeconds = oldestRequest === undefined
    ? 0
    : Math.max(1, Math.ceil((oldestRequest + windowMs - now) / 1000));

  if (entry.requests.length >= limit) {
    entries.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  entry.requests.push(now);
  entries.set(key, entry);

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.requests.length),
    retryAfterSeconds: 0,
  };
}