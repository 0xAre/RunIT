import { NextResponse } from 'next/server';
import { resolveTaskWithAi } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { task, eventData } = await req.json();

    if (!task || !eventData) {
      return NextResponse.json(
        { error: 'Missing task or eventData parameter' },
        { status: 400 }
      );
    }

    const result = await resolveTaskWithAi(task, eventData);

    return NextResponse.json({
      steps: result.steps,
      draftMessage: result.draftMessage || null,
      sourcingSummary: result.sourcingSummary,
      category: result.category || null,
      recommendations: result.recommendations || null,
      estimatedCost: result.estimatedCost || null,
      confidenceScore: result.confidenceScore ?? null,
      negotiationTip: result.negotiationTip || null,
    });
  } catch (error: any) {
    console.error('[API] resolve-task error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve task' },
      { status: 500 }
    );
  }
}
