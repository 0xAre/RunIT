import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { translateMasterPlan } from '@/lib/gemini';
export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
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
