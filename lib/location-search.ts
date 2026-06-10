/** Shared helpers for ranking location search results by query relevance. */

export interface LocationSuggestion {
  placeId?: string;
  description: string;
  mainText: string;
  secondaryText?: string;
  lat?: number;
  lng?: number;
  score?: number;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

export function scoreLocationMatch(query: string, ...fields: (string | undefined)[]): number {
  const q = normalizeSearchQuery(query).toLowerCase();
  if (!q) return 0;

  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return 0;

  let score = 0;
  if (haystack.includes(q)) score += 120;

  const tokens = q.split(' ').filter(t => t.length > 1);
  let matched = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      matched += 1;
      score += 24;
      if (haystack.startsWith(token)) score += 8;
    }
  }
  if (tokens.length > 0) {
    score += Math.round((matched / tokens.length) * 40);
  }

  if (/\bindonesia\b|\bjakarta\b|\bjawa\b|\bsurabaya\b|\bbandung\b/i.test(haystack)) {
    score += 6;
  }

  return score;
}

export function rankByQuery<T extends { displayName?: string; description?: string; mainText?: string; secondaryText?: string }>(
  query: string,
  items: T[]
): (T & { score: number })[] {
  return items
    .map(item => ({
      ...item,
      score: scoreLocationMatch(
        query,
        item.displayName,
        item.description,
        item.mainText,
        item.secondaryText
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

export function pickBestMatch<T extends { score?: number }>(items: T[]): T | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
}
