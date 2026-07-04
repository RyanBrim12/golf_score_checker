import { parse } from 'node-html-parser';
import type { ClubCaddieGolfer } from './types';

const CLUB_CADDIE_BASE = 'https://customer-cc18.clubcaddie.com';

export type ClubCaddieSession = {
  cookie: string;
};

export async function createClubCaddieSession(clubId: string, username: string, password: string): Promise<ClubCaddieSession> {
  const cookieUrl = `${CLUB_CADDIE_BASE}/login?clubid=${encodeURIComponent(clubId)}`;
  const initialResponse = await fetch(cookieUrl, { method: 'GET' });
  const cookie = initialResponse.headers.get('set-cookie');

  if (!cookie) {
    throw new Error('Unable to obtain Club Caddie session cookie.');
  }

  const loginUrl = `${CLUB_CADDIE_BASE}/login`;
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: `ClubId=${encodeURIComponent(clubId)}&Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`,
  });

  if (!loginResponse.ok) {
    throw new Error('Club Caddie login failed.');
  }

  return { cookie };
}

export async function fetchTeeSheetHtml(session: ClubCaddieSession, sheetId: string, date: string): Promise<string> {
  const url = `${CLUB_CADDIE_BASE}/TeeSheet/view/${encodeURIComponent(sheetId)}/sheet?date=${encodeURIComponent(date)}`;
  const response = await fetch(url, { headers: { Cookie: session.cookie } });

  if (!response.ok) {
    throw new Error(`Unable to fetch Club Caddie tee sheet for ${date}.`);
  }

  return response.text();
}

export function parseGolfersFromTeeSheet(html: string): ClubCaddieGolfer[] {
  const parsed = parse(html).querySelectorAll('.Green');
  const golferTexts = Array.from(
    new Set(parsed.map((element) => element.textContent?.trim()).filter((value): value is string => Boolean(value)))
  );

  return golferTexts.map((value) => {
    const parts = value.split(/\s+/).filter(Boolean);
    return {
      clubCaddieName: value,
      firstName: parts[0] ?? '',
      lastName: parts[1] ?? '',
    };
  });
}
