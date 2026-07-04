export type ClubCaddieGolfer = {
  clubCaddieName: string;
  firstName: string;
  lastName: string;
};

export type GhinGolfer = {
  first_name: string;
  last_name: string;
  ghin: number;
};

export type GolferScore = {
  clubCaddieName: string;
  firstName: string;
  lastName: string;
  matchedFirstName?: string;
  matchedLastName?: string;
  ghinNumber?: number;
  score?: number | null;
  status: 'matched' | 'unmatched' | 'no-score' | 'error';
  message?: string;
};

export type GhinScoreResponse = {
  scores?: Array<{
    adjusted_gross_score?: number | null;
    course_id?: string | null;
  }>;
};