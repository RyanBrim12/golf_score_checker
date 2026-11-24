import type { GolferScore } from './types';

export function getInitialScoreboardDate(now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

export function filterGolfers(golfers: GolferScore[], search: string): GolferScore[] {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return golfers;

  return golfers.filter((golfer) => {
    const searchableValues = [
      golfer.firstName ?? '',
      golfer.lastName ?? '',
      `${golfer.matchedFirstName ?? ''} ${golfer.matchedLastName ?? ''}`.trim(),
    ];

    return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
  });
}

export function sortGolfers(golfers: GolferScore[]): GolferScore[] {
  return [...golfers].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'no-score') return -1;
      if (b.status === 'no-score') return 1;
      if (a.status === 'matched') return -1;
      return 1;
    }
    if (a.lastName !== b.lastName) return a.lastName < b.lastName ? -1 : 1;
    if (a.firstName !== b.firstName) return a.firstName < b.firstName ? -1 : 1;
    return 0;
  });
}

export function countMatchedGolfers(golfers: GolferScore[]): number {
  return golfers.length - golfers.filter((golfer) => golfer.status === 'unmatched').length;
}

export function countGolfersWithScores(golfers: GolferScore[]): number {
  return golfers.filter((golfer) => golfer.status === 'matched').length;
}

export function updateGolferByName(
  golfers: GolferScore[] | null,
  targetName: string,
  update: (golfer: GolferScore) => GolferScore,
): GolferScore[] | null {
  return golfers
    ? golfers.map((golfer) => (golfer.clubCaddieName === targetName ? update(golfer) : golfer))
    : null;
}
