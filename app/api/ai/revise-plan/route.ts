import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { reviseEventMasterPlan } from '@/lib/gemini';
import type { MasterPlan } from '@/store/eventStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;

  try {
    const { masterPlan, eventData, delta, lang } = await req.json();

    if (!masterPlan || !eventData || !delta?.description) {
      return NextResponse.json(
        { error: 'Missing required fields: masterPlan, eventData, delta.description' },
        { status: 400 }
      );
    }

    const { diff, revisedMasterPlan } = await reviseEventMasterPlan(
      masterPlan as MasterPlan,
      eventData,
      delta,
      lang || 'id'
    );

    return NextResponse.json({ diff, revisedMasterPlan });
  } catch (error: unknown) {
    console.error('[API] revise-plan error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to revise plan';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
