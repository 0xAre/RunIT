import { NextResponse } from 'next/server';
import { classifyAllTasks } from '@/lib/task-agents';

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
      return NextResponse.json({ classifications: [], summary: { total: 0, categorized: 0, internal: 0 } });
    }

    const classifications = classifyAllTasks(tasks, eventData);

    const summary = {
      total: classifications.length,
      categorized: classifications.filter(c => c.category !== 'internal').length,
      internal: classifications.filter(c => c.category === 'internal').length,
    };

    return NextResponse.json({ classifications, summary });
  } catch (error: any) {
    console.error('[API] classify-tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to classify tasks' },
      { status: 500 }
    );
  }
}
