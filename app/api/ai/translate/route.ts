import { NextRequest, NextResponse } from 'next/server';
import { translateBlueprint } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { blueprint, targetLang } = await req.json();
    if (!blueprint || !targetLang) {
      return NextResponse.json({ error: 'Missing blueprint or targetLang' }, { status: 400 });
    }
    
    const translatedBlueprint = await translateBlueprint(blueprint, targetLang);
    return NextResponse.json({ blueprint: translatedBlueprint });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate data. Please check your API key.' },
      { status: 500 }
    );
  }
}
