import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { runDisruptionSimulation } from '@/lib/gemini';
import { deepResearch } from '@/lib/you';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;
  try {
    const { eventData, scenario, customScenario, lang } = await req.json();
    const scenarioText = customScenario || scenario;

    // ── You.com Research API (lite) — run PARALLEL with Gemini ──────────────
    // Fetch real-world precedent to ground the simulation with actual events.
    // "lite" effort: fast (~2-4s), cheap (~$0.012/call), good enough for precedent.
    const precedentPromise = deepResearch(
      lang === 'id'
        ? `contoh kejadian nyata "${scenarioText}" pada event besar dan cara penanganan operasionalnya`
        : `real-world incident "${scenarioText}" at large events and how it was handled operationally`,
      'lite'
    ).catch(() => null); // fail silently — simulation must never block

    // Run research + simulation in parallel (research informs simulation prompt)
    const [precedent, result] = await Promise.all([
      precedentPromise,
      runDisruptionSimulation(eventData, scenario, customScenario, lang || 'en', precedentPromise),
    ]);

    // Attach web sources to response for UI display
    const sources = precedent?.sources?.slice(0, 4).map((s) => ({
      title: s.title ?? 'Untitled',
      url: s.url,
    })) ?? [];

    return NextResponse.json({ result, sources });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation. Please check your API key.' },
      { status: 500 }
    );
  }
}
