import { NextResponse } from 'next/server';
import { resolveAllTasksBatch } from '@/lib/gemini';

export const maxDuration = 300; // 5 minutes for batch processing

export async function POST(req: Request) {
  try {
    const { tasks, eventData } = await req.json();

    if (!tasks || !Array.isArray(tasks) || !eventData) {
      return NextResponse.json(
        { error: 'Missing required parameters: tasks (array), eventData' },
        { status: 400 }
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json({ results: [], summary: { total: 0, resolved: 0, failed: 0 } });
    }

    if (tasks.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tasks per batch request' },
        { status: 400 }
      );
    }

    const results = await resolveAllTasksBatch(tasks, eventData);

    const summary = {
      total: results.length,
      resolved: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };

    return NextResponse.json({ results, summary });
  } catch (error: any) {
    console.error('[API] resolve-all-tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve tasks' },
      { status: 500 }
    );
  }
}
