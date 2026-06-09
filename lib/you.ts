// ────────────────────────────────────────────────────────────
// RunIT × You.com API Client
// Supports: Search API (with livecrawl), Research API, Contents API
// Endpoint reference: https://you.com/docs/quickstart
// ────────────────────────────────────────────────────────────

const SEARCH_BASE  = "https://ydc-index.io/v1";
const RESEARCH_URL = "https://api.you.com/v1/research";
const CONTENTS_URL = "https://ydc-index.io/v1/contents";

function getApiKey(): string | null {
  const key = process.env.YOU_API_KEY;
  if (!key) {
    console.warn("[you.ts] YOU_API_KEY is not set.");
    return null;
  }
  return key;
}

// ── Types ────────────────────────────────────────────────────

export interface YouWebResult {
  url: string;
  title: string;
  description?: string;
  snippets?: string[];
  page_age?: string;
  favicon_url?: string;
  // Present when livecrawl=all
  contents?: {
    markdown?: string;
    html?: string;
  };
}

export interface YouSearchResponse {
  results: {
    web?: YouWebResult[];
  };
  metadata?: {
    query: string;
    latency: number;
  };
}

export interface YouResearchSource {
  url: string;
  title?: string;
  snippets?: string[];
}

export interface YouResearchResponse {
  output: {
    content: string;       // Markdown with inline citations
    content_type: string;
    sources: YouResearchSource[];
  };
}

export interface YouContentsPage {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  metadata?: {
    site_name?: string;
    favicon_url?: string;
  };
}

// ── 1. Search API (with optional livecrawl) ──────────────────

export async function searchYouCom(
  query: string,
  options?: {
    count?: number;
    livecrawl?: "none" | "always" | "fallback" | "all";
    livecrawlFormats?: "markdown" | "html";
  }
): Promise<YouWebResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query,
    count: String(options?.count ?? 5),
  });
  if (options?.livecrawl) params.set("livecrawl", options.livecrawl);
  if (options?.livecrawlFormats) params.set("livecrawl_formats", options.livecrawlFormats);

  try {
    const response = await fetch(`${SEARCH_BASE}/search?${params}`, {
      method: "GET",
      headers: { "X-API-Key": apiKey },
      // Server-side only — no caching for fresh results
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[you.ts] Search API error:", response.status, await response.text());
      return [];
    }

    const data: YouSearchResponse = await response.json();
    return data.results?.web ?? [];
  } catch (err) {
    console.error("[you.ts] Search fetch failed:", err);
    return [];
  }
}

// ── 2. Research API ──────────────────────────────────────────

export type ResearchEffort = "lite" | "standard" | "deep" | "exhaustive";

export async function deepResearch(
  question: string,
  effort: ResearchEffort = "standard"
): Promise<YouResearchResponse["output"] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(RESEARCH_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        input: question,
        research_effort: effort,
      }),
    });

    if (!response.ok) {
      console.error("[you.ts] Research API error:", response.status, await response.text());
      return null;
    }

    const data: YouResearchResponse = await response.json();
    return data.output;
  } catch (err) {
    console.error("[you.ts] Research fetch failed:", err);
    return null;
  }
}

// ── 3. Contents API ──────────────────────────────────────────

export async function fetchContents(
  urls: string[],
  format: "markdown" | "html" = "markdown"
): Promise<YouContentsPage[]> {
  const apiKey = getApiKey();
  if (!apiKey || urls.length === 0) return [];

  // Contents API accepts max 10 URLs per request
  const batch = urls.slice(0, 10);

  try {
    const response = await fetch(CONTENTS_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ urls: batch, formats: [format] }),
    });

    if (!response.ok) {
      console.error("[you.ts] Contents API error:", response.status, await response.text());
      return [];
    }

    const data: YouContentsPage[] = await response.json();
    return data;
  } catch (err) {
    console.error("[you.ts] Contents fetch failed:", err);
    return [];
  }
}

// ── Utility helpers ──────────────────────────────────────────

/**
 * Search for venue/vendor info and return a prompt-ready context string.
 * Uses livecrawl for richer content.
 */
export async function researchVenueOrVendor(
  query: string,
  useLivecrawl = false
): Promise<string> {
  const hits = await searchYouCom(query, {
    count: 5,
    livecrawl: useLivecrawl ? "all" : "none",
    livecrawlFormats: "markdown",
  });

  if (!hits || hits.length === 0) {
    return "Tidak ada hasil riset yang ditemukan.";
  }

  let context = "Hasil Pencarian Web:\n";
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    context += `- [${hit.title}](${hit.url})\n`;

    // Prefer full livecrawl content, fall back to snippet
    if (hit.contents?.markdown) {
      context += `  ${hit.contents.markdown.slice(0, 600)}...\n\n`;
    } else if (hit.snippets?.length) {
      context += `  ${hit.snippets.join(" ").slice(0, 400)}...\n\n`;
    }
  }
  return context;
}

  /**
   * Fetch and summarize a list of sponsor URLs using Contents API.
   * Returns a structured text block ready for Gemini to process.
   */
  export async function profileSponsorURLs(urls: string[]): Promise<string> {
    const pages = await fetchContents(urls, "markdown");
    if (!pages || pages.length === 0) {
      return "Tidak ada konten yang berhasil diambil dari URL yang diberikan.";
    }

    let context = "Profil Calon Sponsor (dari website mereka):\n\n";
    for (const page of pages) {
      context += `### ${page.title ?? page.url}\n`;
      context += `URL: ${page.url}\n`;
      if (page.markdown) {
        // Take first 1000 chars to stay within token budget
        context += page.markdown.slice(0, 1000) + "\n";
      }
      context += "\n---\n\n";
    }
    return context;
  }

  // ── 5. Task-Category Sourcing (livecrawl-aware) ─────────────────

  export async function sourceForTaskCategory(
    query: string,
    category?: string,
  ): Promise<{ context: string; results: YouWebResult[] }> {
    const shouldLivecrawl = ['venue', 'vendor', 'sponsor', 'speaker', 'logistics'].includes(category || '');

    const results = await searchYouCom(query, {
      count: 5,
      livecrawl: shouldLivecrawl ? 'all' : 'none',
      livecrawlFormats: 'markdown',
    });

    if (!results || results.length === 0) {
      return { context: 'Tidak ada hasil web ditemukan.', results: [] };
    }

    let context = '';
    for (const r of results) {
      context += `\n### ${r.title}\nURL: ${r.url}\n`;
      if (r.contents?.markdown) {
        context += `${r.contents.markdown.slice(0, 800)}\n`;
      } else if (r.snippets?.length) {
        context += `${r.snippets.join(' ').slice(0, 500)}\n`;
      }
      if (r.description) {
        context += `> ${r.description.slice(0, 300)}\n`;
      }
      context += '---\n';
    }

    return { context, results };
  }

// ── 4. Event Intelligence Brief ─────────────────────────────────

export interface EventIntelligenceBrief {
  trends: YouWebResult[];
  budgetBenchmarks: YouWebResult[];
  bestPractices: YouWebResult[];
  rawContext: string;       // Prompt-ready block for Gemini
  fetchedAt: string;        // ISO timestamp
}

/**
 * Fetches real-time market intelligence for an event type using 3 parallel
 * Search API queries: trends, budget benchmarks, and best practices.
 *
 * Designed for the onboarding flow (Stage 1) to ground Gemini blueprint
 * generation with fresh, web-sourced context.
 *
 * Cost: ~3× $0.005 = $0.015 per call (no livecrawl — speed over depth).
 */
export async function getEventIntelligenceBrief(
  eventType: string,
  scale: "small" | "medium" | "large" | "massive" = "medium",
  lang: "id" | "en" = "id"
): Promise<EventIntelligenceBrief | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const year = new Date().getFullYear();
  const isId = lang === "id";

  // 3 parallel Search API queries
  const [trends, budgetBenchmarks, bestPractices] = await Promise.all([
    searchYouCom(
      isId
        ? `tren ${eventType} Indonesia ${year} tips sukses`
        : `${eventType} event trends ${year} success tips`,
      { count: 3 }
    ),
    searchYouCom(
      isId
        ? `estimasi biaya anggaran ${eventType} skala ${scale} Indonesia`
        : `${eventType} event budget cost estimate ${scale} scale`,
      { count: 3 }
    ),
    searchYouCom(
      isId
        ? `best practice manajemen ${eventType} panduan operasional`
        : `${eventType} event management best practices operational guide`,
      { count: 3 }
    ),
  ]);

  // Build prompt-ready context string
  const formatResults = (label: string, results: YouWebResult[]): string => {
    if (!results.length) return "";
    let block = `\n### ${label}\n`;
    for (const r of results) {
      block += `- **${r.title}** (${r.url})\n`;
      if (r.snippets?.length) {
        block += `  ${r.snippets[0].slice(0, 300)}\n`;
      }
    }
    return block;
  };

  const rawContext = [
    `## Market Intelligence: ${eventType} (${year})`,
    formatResults(isId ? "Tren & Insight Terkini" : "Recent Trends & Insights", trends),
    formatResults(isId ? "Benchmark Anggaran" : "Budget Benchmarks", budgetBenchmarks),
    formatResults(isId ? "Best Practice Operasional" : "Operational Best Practices", bestPractices),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    trends,
    budgetBenchmarks,
    bestPractices,
    rawContext,
    fetchedAt: new Date().toISOString(),
  };
}
