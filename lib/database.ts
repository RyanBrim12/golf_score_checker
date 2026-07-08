import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Match {
  ghin: number;
  name: string;
}

const DB_DIR = path.resolve(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "app.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH, { verbose: console.log });

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ghin_name_matches (
      ghin  INTEGER,
      name  TEXT NOT NULL PRIMARY KEY
    );
  `);
}

export function createMatch(match: Match): boolean {
  const stmt = db.prepare(
    `INSERT INTO ghin_name_matches (ghin, name) VALUES (@ghin, @name)`
  );
  try {
    stmt.run(match);
  }
  catch (error: unknown) {
    return false;
  }
  return true;
}

export function createMatches(matches: Match[]): void {
  const insert = db.prepare(
    `INSERT INTO ghin_name_matches (ghin, name) VALUES (@ghin, @name)`
  );
  const insertMany = db.transaction((rows: Match[]) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(matches);
}

export function getMatchByGhin(ghin: number): Match | undefined {
  return db.prepare(`SELECT * FROM ghin_name_matches WHERE ghin = ?`).get(ghin) as
    | Match
    | undefined;
}

export function getMatchByName(name: string): Match | undefined {
  return db.prepare(`SELECT * FROM ghin_name_matches WHERE name = ?`).get(name) as
    | Match
    | undefined;
}

export function getAllMatches(): Match[] {
  return db.prepare(`SELECT * FROM ghin_name_matches ORDER BY name`).all() as Match[];
}

export function updateMatch(
  name: string,
  newGhin: number
): boolean {
  const existing = getMatchByName(name);
  if (!existing) return false;

  db.prepare(`UPDATE ghin_name_matches SET ghin = @ghin WHERE name = @name`).run({
    name,
    ghin: newGhin,
  });

  return true;
}

export function deleteMatch(name: string): boolean {
  const info = db.prepare(`DELETE FROM ghin_name_matches WHERE name = ?`).run(name);
  return info.changes > 0;
}

export function closeDb(): void {
  db.close();
}

const isMain = process.argv[1] === __filename;

if (isMain) {
  initDb();
}
