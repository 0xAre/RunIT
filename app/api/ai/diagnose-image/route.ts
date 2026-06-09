import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DagTask } from '@/lib/dag-engine';
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const { imageBase64, tasks } = await req.json() as { imageBase64: string, tasks: DagTask[] };

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Ensure it's base64 data only, remove data:image/png;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a 20-year veteran Stage Manager and Operations Director. 
Look at this photo from an event site. Diagnose the crisis.

Here are the current pending or in-progress tasks in our DAG engine:
${tasks.map(t => `- ID: ${t.id} | Title: ${t.title} | Status: ${t.status}`).join('\n')}

Based on the photo, provide:
1. "taskId": The ID of the single task most directly delayed by this issue (choose the best match from the list above).
2. "delayMinutes": A realistic estimate of how many minutes this will delay the task (e.g., 15, 30, 45, 60, 120).
3. "description": A short, punchy 1-sentence description of the crisis (e.g., "Main stage truss collapsed", "Catering truck has a flat tire").
4. "severity": Choose one of: "low", "medium", "high", "critical".

Return ONLY a valid JSON object matching this schema exactly:
{
  "taskId": "string",
  "delayMinutes": number,
  "description": "string",
  "severity": "string"
}`;

    const aiResult = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
    ]);

    const text = aiResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const result = JSON.parse(text);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('[AI Diagnose] Parse error:', text);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  } catch (error) {
    console.error('[AI Diagnose] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
