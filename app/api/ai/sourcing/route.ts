import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const { query, locationContext, taskTitle } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `You are an Autonomous Procurement and Logistics Agent for an event organizing committee.
Your job is to replace the human effort of searching Google Maps, contacting vendors, and writing booking emails.

The user needs help with a task: "${taskTitle || 'Logistics Sourcing'}"
User's specific query: "${query}"
Context/City: "${locationContext || 'Unknown'}"

Based on your world knowledge, provide 3 highly realistic, specific recommendations for real places, venues, or stores that fit this query. 
Act as if you just searched Google Maps. Provide estimated distances or specific areas.

Then, draft TWO communication scripts:
1. "whatsappDraft": A polite, professional WhatsApp message to inquire about pricing and availability.
2. "emailDraft": A formal email draft for booking or official quotation request.

Return ONLY a JSON object matching this schema exactly:
{
  "recommendations": [
    {
      "name": "string (Name of the place/vendor)",
      "address": "string (General area or specific address)",
      "reasoning": "string (Why this is a good fit)",
      "rating": "string (e.g. 4.8/5.0 based on general knowledge)"
    }
  ],
  "whatsappDraft": "string",
  "emailDraft": "string"
}`;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const result = JSON.parse(text);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('[AI Sourcing] Parse error:', text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

  } catch (error) {
    console.error('[AI Sourcing] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
