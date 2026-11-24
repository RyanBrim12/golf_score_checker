import Fuse from 'fuse.js';

export const NAME_MATCH_THRESHOLD = 0.5;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
}

export function normalizeNamePart(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isNameMatchScore(
  score: number | undefined,
  threshold = NAME_MATCH_THRESHOLD,
): boolean {
  return score !== undefined && score < threshold;
}

export function findBestNameMatch<T>(
  query: string,
  candidates: readonly T[],
  getCandidateName: (candidate: T) => string,
): T | null {
  const normalizedQuery = normalizeNamePart(query);
  if (!normalizedQuery) return null;

  const searchableCandidates = candidates
    .map((candidate) => ({
      name: normalizeNamePart(getCandidateName(candidate)),
      candidate,
    }))
    .filter((candidate) => candidate.name.length > 0);
  if (searchableCandidates.length === 0) return null;

  const fuse = new Fuse(searchableCandidates, { keys: ['name'], includeScore: true });
  const results = fuse.search(normalizedQuery);
  if (results.length === 0) return null;

  const bestMatch = results.reduce((best, current) => {
    const bestScore = best.score ?? Number.POSITIVE_INFINITY;
    const currentScore = current.score ?? Number.POSITIVE_INFINITY;
    return currentScore < bestScore ? current : best;
  }, results[0]);

  return isNameMatchScore(bestMatch.score) ? bestMatch.item.candidate : null;
}
