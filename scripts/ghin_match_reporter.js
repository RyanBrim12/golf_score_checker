import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { GhinClient } from '@spicygolf/ghin';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable');
}

const ghinUsername = process.env.GHIN_USERNAME;
const ghinPassword = process.env.GHIN_PASSWORD;
if (!ghinUsername || !ghinPassword) {
  throw new Error('Missing GHIN_USERNAME or GHIN_PASSWORD environment variable');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const ghin = new GhinClient({ username: ghinUsername, password: ghinPassword });

async function getAllMatches() {
  return prisma.ghinNameMatch.findMany({ orderBy: { name: 'asc' } });
}

async function addGolferDetails(matches) {
  return Promise.all(matches.map(async (match) => {
    if (match.ghin === null) {
      return { ...match, golfer: null };
    }

    try {
      return { ...match, golfer: await ghin.golfers.getOne(match.ghin) };
    } catch (error) {
      console.error(`Could not fetch GHIN details for ${match.name}:`, error);
      return { ...match, golfer: null };
    }
  }));
}

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatReport(matches) {
  const lines = [['Group', 'Name', 'GHIN', 'State', 'Club']];

  for (const match of matches) {
    const isMountTabor = match.golfer?.club_name === 'Mount Tabor Country Club';
    lines.push([
      isMountTabor ? 'Mount Tabor' : 'Non-Mount Tabor',
      match.name,
      match.ghin ?? 'Not assigned',
      match.golfer?.state ?? 'Unknown',
      match.golfer?.club_name ?? 'Unknown',
    ]);
  }

  return `${lines.map((line) => line.map(csvValue).join(',')).join('\n')}\n`;
}

async function main() {
  const matches = (await addGolferDetails(await getAllMatches())).sort((a, b) => {
    const aIsMountTabor = a.golfer?.club_name === 'Mount Tabor Country Club';
    const bIsMountTabor = b.golfer?.club_name === 'Mount Tabor Country Club';

    if (aIsMountTabor !== bIsMountTabor) {
      return aIsMountTabor ? 1 : -1;
    }

    return a.name.localeCompare(b.name);
  });

  const outputPath = path.resolve(process.cwd(), 'scripts', 'output', 'ghin-matches.csv');

  await writeFile(outputPath, formatReport(matches), 'utf8');
  console.log(`Wrote ${matches.length} matches to ${outputPath}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}