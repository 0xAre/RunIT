import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { runLiveSourcing } from '@/lib/sourcing-pipeline';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { query, locationContext, taskTitle, eventData, lat, lng, category } = body;

    if (!query && !taskTitle) {
      return NextResponse.json({ error: 'Missing search query or taskTitle' }, { status: 400 });
    }

    const result = await runLiveSourcing({
      query: query || taskTitle,
      taskTitle,
      locationContext,
      eventData,
      lat,
      lng,
      category,
    });

    return NextResponse.json({
      recommendations: result.recommendations,
      whatsappDraft: result.whatsappDraft,
      emailDraft: result.emailDraft,
      sourcingSummary: result.sourcingSummary,
      category: result.category,
      places: result.places,
      sources: result.sources,
    });
  } catch (error) {
    console.error('[AI Sourcing] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
