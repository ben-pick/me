export interface FuzzyMatch {
  readonly score: number;
  /** Indices of matched characters in the haystack, for highlighting. */
  readonly indices: ReadonlyArray<number>;
}

const isBoundary = (text: string, i: number) => {
  if (i === 0) return true;
  const prev = text[i - 1] ?? "";
  return /[\s\-_/·.@]/.test(prev);
};

/**
 * Subsequence match with bonuses for word starts and consecutive runs.
 * Returns `null` when not every query character appears in order.
 */
export const fuzzyMatch = (query: string, text: string): FuzzyMatch | null => {
  const q = query.trim().toLowerCase();
  if (q === "") return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) return null;
    let at = found;
    // Prefer a later word-boundary hit when it's close, e.g. "gh" → "GitHub".
    for (let j = found; j < Math.min(t.length, found + 24); j++) {
      if (t[j] === ch && isBoundary(t, j) && j !== prev + 1) {
        if (found !== prev + 1) at = j;
        break;
      }
    }
    score += 1;
    if (at === prev + 1) score += 4;
    if (isBoundary(t, at)) score += 6;
    score -= Math.min(3, (at - ti) * 0.05);
    indices.push(at);
    prev = at;
    ti = at + 1;
  }
  if (t.startsWith(q)) score += 10;
  score -= t.length * 0.01;
  return { score, indices };
};

export const fuzzyFilter = <T>(
  items: ReadonlyArray<T>,
  query: string,
  text: (item: T) => string,
): Array<{ item: T; match: FuzzyMatch }> =>
  items
    .flatMap((item) => {
      const match = fuzzyMatch(query, text(item));
      return match ? [{ item, match }] : [];
    })
    .sort((a, b) => (query.trim() === "" ? 0 : b.match.score - a.match.score));
