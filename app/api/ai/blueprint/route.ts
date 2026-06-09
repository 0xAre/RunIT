import { NextRequest, NextResponse } from 'next/server';
import { generateEventBlueprint } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { lang, marketContext, ...eventData } = await req.json();
    const blueprint = await generateEventBlueprint(eventData, lang || 'en', marketContext);
    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error('Blueprint generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate blueprint. Please check your API key.' },
      { status: 500 }
    );
  }
}

