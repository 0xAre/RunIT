import { NextRequest, NextResponse } from 'next/server';
import { translateMasterPlan } from '@/lib/gemini';

export async function POST(req: NextRequest) {
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
