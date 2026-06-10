import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { translateMasterPlan } from '@/lib/gemini';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;
  try {
    const { masterPlan, targetLang } = await req.json();
    if (!masterPlan || !targetLang) {
      return NextResponse.json({ error: 'Missing masterPlan or targetLang' }, { status: 400 });
    }
    
    const translatedMasterPlan = await translateMasterPlan(masterPlan, targetLang);
    return NextResponse.json({ masterPlan: translatedMasterPlan });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate data. Please check your API key.' },
      { status: 500 }
    );
  }
}
