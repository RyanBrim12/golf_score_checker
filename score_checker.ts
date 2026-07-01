import { GhinClient } from '@spicygolf/ghin'
import { parse } from 'node-html-parser'
import Fuse from 'fuse.js'
import dotenv from 'dotenv'

dotenv.config()

console.log('Getting club caddie cookie');
const cookieUrl = `https://customer-cc18.clubcaddie.com/login?clubid=${encodeURIComponent(process.env.CLUB_CADDIE_CLUB_ID!)}`;
let response = await fetch(cookieUrl, {
  method: 'GET',
  headers: {}
});
const cookies = response.headers.get('set-cookie');

console.log('Logging in to club caddie');
const loginUrl = 'https://customer-cc18.clubcaddie.com/login';
response = await fetch(loginUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: cookies!,
  },
  body: `ClubId=${encodeURIComponent(process.env.CLUB_CADDIE_CLUB_ID!)}&Username=${encodeURIComponent(process.env.CLUB_CADDIE_USERNAME!)}&Password=${encodeURIComponent(process.env.CLUB_CADDIE_PASSWORD!)}`,
});

console.log('Reading tee sheet')

const url = 'https://customer-cc18.clubcaddie.com/TeeSheet/view/cffdabab/sheet?date=2026-06-28'
response = await fetch(url, {
    headers: {
      Cookie: cookies!,
    },
  });
const html = await response.text();

const parsed = parse(html).querySelectorAll('.Green');

// Remove duplicates while preserving order
const golfers = Array.from(new Set(parsed.map((el) => el.textContent?.trim()).filter((v): v is string => !!v)));

// Split each golfer string into words
const golferWords: string[][] = golfers.map((g) => g.split(/\s+/));

console.log('Fetching scores for golfers on tee sheet');

// Initialize the client
const ghin = new GhinClient({
  password: process.env.GHIN_PASSWORD!,
  username: process.env.GHIN_USERNAME!,
})

const scores: number[] = [];
for (const golfer of golferWords) {
  let output = '';
  const firstName = golfer[0];
  const lastName = golfer[1];

  let golfers = await ghin.golfers.search({last_name: lastName, state: 'NJ', club_id: '10642', first_name: firstName})
  if (golfers.length === 0) {
    golfers = await ghin.golfers.search({last_name: lastName, state: 'NJ', club_id: '10642'})
    if (golfers.length === 0) {
      console.log(`No golfer found for ${firstName} ${lastName}`);
      continue;
    }
    if (golfers.length !== 1) {
      const fuse = new Fuse(golfers, { keys: ['first_name'], includeScore: true });
      const result = fuse.search(firstName);
      
      if (result.length > 0) {
        const bestMatch = result.reduce((bestGolfer, currentGolfer) => {
          if (!bestGolfer) return currentGolfer;

          const bestScore = bestGolfer.score ?? Number.POSITIVE_INFINITY;
          const currentScore = currentGolfer.score ?? Number.POSITIVE_INFINITY;

          return currentScore < bestScore ? currentGolfer : bestGolfer;
        }, result[0]);
        golfers = [bestMatch.item];
        output += ` as ${bestMatch.item.first_name} ${bestMatch.item.last_name}`;
      }
      else {
        console.log(`No golfer found for ${firstName} ${lastName}`);
        continue;
      }
    }
  }
  const num = golfers[0].ghin

  try {
    const scores = await ghin.golfers.getScores(num, { from_date_played: new Date('2026-06-28'), to_date_played: new Date('2026-06-28') });

    if (!scores || !scores['scores'] || scores['scores'].length === 0) {
      console.log(`No score found for ${firstName} ${lastName}${output}`);
      continue;
    }
    console.log(`Score for ${firstName} ${lastName}${output}:`, scores['scores'][0]['adjusted_gross_score'])
  }
  catch (e: any) {
    const rawResponse = e?.response;
    if (e.code === 'VALIDATION_ERROR' && rawResponse) {
      const parsed = JSON.parse(rawResponse);
      if (parsed.scores?.length) {
        console.log(`Score for ${firstName} ${lastName}${output}:`, parsed.scores[0].adjusted_gross_score);
      } else {
        console.log(`No score found for ${firstName} ${lastName}${output}`);
      }
    } else {
      console.error(`Error fetching scores for ${firstName} ${lastName}${output}`);
    }
  }
}
