import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { generateEventMasterPlan } from '@/lib/gemini';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const { lang, marketContext, ...eventData } = await req.json();
    const masterPlan = await generateEventMasterPlan(eventData, lang || 'en', marketContext);
    return NextResponse.json({ masterPlan });
  } catch (error) {
    console.error('MasterPlan generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate master plan. Please check your API key.' },
      { status: 500 }
    );
  }
}

