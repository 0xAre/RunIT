import { NextRequest, NextResponse } from 'next/server';
import { generateIncidentResponse } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { eventData, incident } = await req.json();
    const response = await generateIncidentResponse(eventData, incident);
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Incident response error:', error);
    return NextResponse.json(
      { error: 'Failed to generate incident response.' },
      { status: 500 }
    );
  }
}
