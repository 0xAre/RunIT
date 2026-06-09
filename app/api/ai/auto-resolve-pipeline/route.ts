import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { runAutoResolvePipeline } from '@/lib/gemini';
export const runtime = 'nodejs';


export const maxDuration = 300;

export async function POST(req: Request) {
  const authError = await requireApiAuth(req as any);
  if (authError) return authError;
  try {
    const { tasks, eventData } = await req.json();

    if (!tasks || !Array.isArray(tasks) || !eventData) {
      return NextResponse.json(
        { error: 'Missing required parameters: tasks (array), eventData' },
        { status: 400 }
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json({ results: [], summary: { total: 0, autoResolved: 0, needsApproval: 0, failed: 0 } });
    }

    const results = await runAutoResolvePipeline(tasks, eventData);

    const summary = {
      total: results.length,
      autoResolved: results.filter(r => r.autoResolved).length,
      needsApproval: results.filter(r => r.needsApproval).length,
      failed: results.filter(r => !r.autoResolved && !r.needsApproval).length,
    };

    return NextResponse.json({ results, summary });
  } catch (error: any) {
    console.error('[API] auto-resolve-pipeline error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-resolve pipeline failed' },
      { status: 500 }
    );
  }
}
