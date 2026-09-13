import prisma from './prisma';
import { revalidateTag, unstable_cache } from 'next/cache';

export interface Match {
  ghin: number | null;
  name: string;
}

export interface SweepsMatch {
  name: string;
  sweepsId: number | null;
}

export async function initDb(): Promise<void> {
  await prisma.$connect();
}

export async function createMatch(match: Match): Promise<boolean> {
  try {
    await prisma.ghinNameMatch.create({
      data: match,
    });
    revalidateTag('ghin-name-matches');
    return true;
  } catch (error: unknown) {
    return false;
  }
}

export async function createMatches(matches: Match[]): Promise<void> {
  await prisma.$transaction(
    matches.map((match) => prisma.ghinNameMatch.create({ data: match }))
  );
}

export async function getMatchByGhin(ghin: number): Promise<Match | null> {
  const record = await prisma.ghinNameMatch.findFirst({ where: { ghin } });
  return record ? { ghin: record.ghin, name: record.name } : null;
}

export async function getMatchByName(name: string): Promise<Match | null> {
  const record = await prisma.ghinNameMatch.findUnique({ where: { name } });
  return record ? { ghin: record.ghin, name: record.name } : null;
}

const getCachedMatchByName = unstable_cache(
  async (name: string) => getMatchByName(name),
  ['ghin-name-match-by-name'],
  {
    revalidate: 60 * 60,
    tags: ['ghin-name-matches'],
  }
);

export { getCachedMatchByName };

export async function getAllMatches(): Promise<Match[]> {
  const records = await prisma.ghinNameMatch.findMany({ orderBy: { name: 'asc' } });
  return records.map((record) => ({ ghin: record.ghin, name: record.name }));
}

export async function updateMatch(name: string, newGhin: number): Promise<boolean> {
  const existing = await getMatchByName(name);
  if (!existing) return false;

  await prisma.ghinNameMatch.update({
    where: { name },
    data: { ghin: newGhin },
  });
  revalidateTag('ghin-name-matches');

  return true;
}

export async function deleteMatch(name: string): Promise<boolean> {
  const record = await prisma.ghinNameMatch.deleteMany({ where: { name } });
  if (record.count > 0) revalidateTag('ghin-name-matches');
  return record.count > 0;
}

export async function createSweepsMatch(match: SweepsMatch): Promise<boolean> {
  try {
    await prisma.sweepsNameMatch.create({ data: match });
    revalidateTag('sweeps-name-matches');
    return true;
  } catch (error: unknown) {
    return false;
  }
}

export async function updateSweepsMatch(name: string, sweepsId: number | null): Promise<boolean> {
  const existing = await prisma.sweepsNameMatch.findUnique({ where: { name } });
  if (!existing) return false;

  await prisma.sweepsNameMatch.update({ where: { name }, data: { sweepsId } });
  revalidateTag('sweeps-name-matches');
  return true;
}

export async function getAllSweepsMatches(): Promise<SweepsMatch[]> {
  const records = await prisma.sweepsNameMatch.findMany({ orderBy: { name: 'asc' } });
  return records.map((record) => ({ name: record.name, sweepsId: record.sweepsId }));
}

const getCachedSweepsMatchByName = unstable_cache(
  async (name: string) => {
    const record = await prisma.sweepsNameMatch.findUnique({ where: { name } });
    return record ? { name: record.name, sweepsId: record.sweepsId } : null;
  },
  ['sweeps-name-match-by-name'],
  {
    revalidate: 60 * 60,
    tags: ['sweeps-name-matches'],
  }
);

export { getCachedSweepsMatchByName };

export async function deleteSweepsMatch(name: string): Promise<boolean> {
  const record = await prisma.sweepsNameMatch.deleteMany({ where: { name } });
  if (record.count > 0) revalidateTag('sweeps-name-matches');
  return record.count > 0;
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
