/** One day on the contributions calendar. Level is GitHub's 0–4 bucket. */
export interface Day {
  readonly date: string;
  readonly count: number;
  readonly level: number;
}

export interface Contributions {
  readonly user: string;
  readonly total: number;
  readonly days: ReadonlyArray<Day>;
}

const levelFor = (count: number, max: number) =>
  count === 0
    ? 0
    : Math.min(4, 1 + Math.floor((count / Math.max(1, max)) * 3.999));

/**
 * Parse the public calendar fragment GitHub serves at
 * `github.com/users/<user>/contributions`: day cells carry `data-date` and
 * `data-level`, and each has a tooltip ("3 contributions on …").
 */
export const parseContributionsHtml = (
  user: string,
  html: string,
): Contributions => {
  const tips = new Map<string, number>();
  for (const m of html.matchAll(
    /<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g,
  )) {
    const [, id, text] = m;
    if (!id || text === undefined) continue;
    const n = /^(\d[\d,]*) contribution/.exec(text.trim());
    tips.set(id, n?.[1] ? Number(n[1].replaceAll(",", "")) : 0);
  }
  const days: Day[] = [];
  for (const m of html.matchAll(
    /<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g,
  )) {
    const tag = m[0];
    const date = m[1];
    if (!date) continue;
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] ?? "";
    const level = Number(/\bdata-level="(\d)"/.exec(tag)?.[1] ?? 0);
    days.push({ date, level, count: tips.get(id) ?? Math.max(level, 0) });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const heading = /([\d,]+)\s+contributions?\s+in the last year/.exec(
    html,
  )?.[1];
  const total = heading
    ? Number(heading.replaceAll(",", ""))
    : days.reduce((s, d) => s + d.count, 0);
  return { user, total, days };
};

/** Shape GitHub's GraphQL calendar (used when a token is configured). */
export const fromGraphql = (
  user: string,
  weeks: ReadonlyArray<{
    contributionDays: ReadonlyArray<{
      date: string;
      contributionCount: number;
    }>;
  }>,
  total: number,
): Contributions => {
  const flat = weeks.flatMap((w) => w.contributionDays);
  const max = Math.max(1, ...flat.map((d) => d.contributionCount));
  return {
    user,
    total,
    days: flat.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: levelFor(d.contributionCount, max),
    })),
  };
};

/** Group days into Sunday-first week columns, padding the first week. */
export const toWeeks = (days: ReadonlyArray<Day>): Array<Array<Day | null>> => {
  const weeks: Array<Array<Day | null>> = [];
  let week: Array<Day | null> = [];
  days.forEach((d, i) => {
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (i === 0) week = Array.from({ length: dow }, () => null);
    week.push(d);
    if (dow === 6) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length) weeks.push(week);
  return weeks;
};
