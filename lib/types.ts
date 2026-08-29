export type ClubCaddieGolfer = {
  clubCaddieName: string;
  name: string;
  firstName: string;
  lastName: string;
};

export type GhinGolfer = {
  first_name: string;
  last_name: string;
  ghin: number;
  club_name: string | null;
};

export type GolferScore = {
  clubCaddieName: string;
  firstName: string;
  lastName: string;
  matchedFirstName?: string;
  matchedLastName?: string;
  ghinNumber?: number;
  score?: number | null;
  postedAt?: string | null;
  scoreType?: string | null;
  status: 'matched' | 'unmatched' | 'no-score' | 'error';
  message?: string;
};

export type GhinScoreResponse = {
  scores?: Array<{
    adjusted_gross_score?: number | null;
    course_id?: string | null;
    posted_at?: string | Date | null;
    score_type?: string | null;
    score_type_display_full?: string | null;
  }>;
};