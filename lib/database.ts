import prisma from './prisma';

export interface Match {
  ghin: number | null;
  name: string;
}

export async function initDb(): Promise<void> {
  await prisma.$connect();
}

export async function createMatch(match: Match): Promise<boolean> {
  try {
    await prisma.ghinNameMatch.create({
      data: match,
    });
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

  return true;
}

export async function deleteMatch(name: string): Promise<boolean> {
  const record = await prisma.ghinNameMatch.deleteMany({ where: { name } });
  return record.count > 0;
}

export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
