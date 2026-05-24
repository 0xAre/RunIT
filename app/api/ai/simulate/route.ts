import { NextRequest, NextResponse } from 'next/server';
import { runDisruptionSimulation } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { eventData, scenario, customScenario, lang } = await req.json();
    const result = await runDisruptionSimulation(eventData, scenario, customScenario, lang || 'en');
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation. Please check your API key.' },
      { status: 500 }
    );
  }
}
