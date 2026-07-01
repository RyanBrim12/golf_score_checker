import { GhinClient } from '@spicygolf/ghin'
import { parse } from 'node-html-parser'
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

console.log(await response.text());

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

// console.log(golferWords);

console.log('Fetching scores for golfers on tee sheet');

// Initialize the client
const ghin = new GhinClient({
  password: process.env.GHIN_PASSWORD!,
  username: process.env.GHIN_USERNAME!,
})

// const scores: number[] = [];
for (const golfer of golferWords) {
  const firstName = golfer[0];
  const lastName = golfer[1];

// // Get a golfer's handicap
  const golfers = await ghin.golfers.search({last_name: lastName, state: 'NJ', club_id: '10642', first_name: firstName})
  if (golfers.length === 0) {
    console.log(`No golfers found for ${firstName} ${lastName}`);
    continue;
  }
  const num = golfers[0].ghin

console.log(num)

  try {
    const scores = await ghin.golfers.getScores(num, { from_date_played: new Date('2026-06-28'), to_date_played: new Date('2026-06-28') })

    if (!scores || !scores['scores'] || scores['scores'].length === 0) {
      console.log(`No score found for ${firstName} ${lastName}`);
      continue;
    }
    console.log(`Score for ${firstName} ${lastName}:`, scores['scores'][0]['adjusted_gross_score'])
  }
  catch (error) {
    console.error(`Error fetching scores for ${firstName} ${lastName}:`);
  }
}
// console.log(scores)