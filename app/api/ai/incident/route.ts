import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { generateIncidentResponse } from '@/lib/gemini';
import { searchYouCom } from '@/lib/you';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const { eventData, incident, lang = 'en' } = await req.json();

    // ── You.com Search API — parallel with Gemini incident response ───────────
    // Fetch industry SOP references to supplement AI's response.
    // No livecrawl: speed is critical during live incidents (snippets are enough).
    const sopSearchPromise = searchYouCom(
      lang === 'id'
        ? `SOP penanganan insiden "${incident}" saat event tips profesional`
        : `incident response SOP "${incident}" at live events professional guide`,
      { count: 4 }
    ).catch(() => []); // fail silently — incident response must be instant

    // Run both in parallel: web SOP search + Gemini response generation
    const [sopResults, response] = await Promise.all([
      sopSearchPromise,
      generateIncidentResponse(eventData, incident, lang),
    ]);

    // Format industry SOP references for UI
    const industrySOP = sopResults
      .filter((r) => r.url && r.title)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippets?.[0]?.slice(0, 200) ?? '',
        favicon: r.favicon_url,
      }));

    return NextResponse.json({ response, industrySOP });
  } catch (error) {
    console.error('Incident response error:', error);
    return NextResponse.json(
      { error: 'Failed to generate incident response.' },
      { status: 500 }
    );
  }
}
