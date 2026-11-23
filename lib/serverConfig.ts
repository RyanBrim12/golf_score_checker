function getRequiredEnvValues<const Keys extends readonly string[]>(
  keys: Keys,
): { [Key in Keys[number]]: string } {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return Object.fromEntries(keys.map((key) => [key, process.env[key]])) as {
    [Key in Keys[number]]: string;
  };
}

function getOptionalEnvValue(key: string): string | undefined {
  return process.env[key] || undefined;
}

export type GhinConfig = {
  username: string;
  password: string;
  country?: string;
  courseId?: string;
};

export function getGhinConfig(): GhinConfig {
  const required = getRequiredEnvValues(['GHIN_USERNAME', 'GHIN_PASSWORD'] as const);
  return {
    username: required.GHIN_USERNAME,
    password: required.GHIN_PASSWORD,
    country: getOptionalEnvValue('GHIN_COUNTRY'),
    courseId: getOptionalEnvValue('GHIN_COURSE_ID'),
  };
}

export type GhinScoringConfig = {
  username: string;
  password: string;
  courseId: string;
};

export function getGhinScoringConfig(): GhinScoringConfig {
  const required = getRequiredEnvValues(['GHIN_USERNAME', 'GHIN_PASSWORD', 'GHIN_COURSE_ID'] as const);
  return {
    username: required.GHIN_USERNAME,
    password: required.GHIN_PASSWORD,
    courseId: required.GHIN_COURSE_ID,
  };
}

export type SweepsConfig = {
  apiKey: string;
};

export function getSweepsConfig(): SweepsConfig {
  const required = getRequiredEnvValues(['SWEEPS_API_KEY'] as const);
  return { apiKey: required.SWEEPS_API_KEY };
}

export type ScoreboardConfig = {
  clubCaddie: {
    clubId: string;
    username: string;
    password: string;
    sheetId: string;
  };
  ghin: {
    username: string;
    password: string;
    state: string;
    country: string;
    clubId: string;
    courseId: string;
    club?: string;
  };
  sweeps: SweepsConfig;
};

export function getScoreboardConfig(): ScoreboardConfig {
  const required = getRequiredEnvValues([
    'CLUB_CADDIE_CLUB_ID',
    'CLUB_CADDIE_USERNAME',
    'CLUB_CADDIE_PASSWORD',
    'CLUB_CADDIE_SHEET_ID',
    'GHIN_USERNAME',
    'GHIN_PASSWORD',
    'GHIN_STATE',
    'GHIN_COUNTRY',
    'GHIN_CLUB_ID',
    'GHIN_COURSE_ID',
    'SWEEPS_API_KEY',
  ] as const);

  return {
    clubCaddie: {
      clubId: required.CLUB_CADDIE_CLUB_ID,
      username: required.CLUB_CADDIE_USERNAME,
      password: required.CLUB_CADDIE_PASSWORD,
      sheetId: required.CLUB_CADDIE_SHEET_ID,
    },
    ghin: {
      username: required.GHIN_USERNAME,
      password: required.GHIN_PASSWORD,
      state: required.GHIN_STATE,
      country: required.GHIN_COUNTRY,
      clubId: required.GHIN_CLUB_ID,
      courseId: required.GHIN_COURSE_ID,
      club: getOptionalEnvValue('GHIN_CLUB'),
    },
    sweeps: { apiKey: required.SWEEPS_API_KEY },
  };
}

export type DatabaseConfig = {
  connectionString: string;
};

export function getDatabaseConfig(): DatabaseConfig {
  const required = getRequiredEnvValues(['DATABASE_URL'] as const);
  return { connectionString: required.DATABASE_URL };
}
