import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { getAiCopilotAdvice } from '@/lib/gemini';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const { eventData, question, context } = await req.json();
    const advice = await getAiCopilotAdvice(eventData, question, context);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error('Copilot error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI advice.' },
      { status: 500 }
    );
  }
}
