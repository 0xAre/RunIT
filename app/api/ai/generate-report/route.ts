import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { eventData } = await req.json();

    if (!eventData || !eventData.execution || !eventData.blueprint) {
      return NextResponse.json({ error: 'Missing complete event data for report generation.' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const blueprint = eventData.blueprint;
    const execution = eventData.execution;

    // Compile execution statistics
    const totalTasks = execution.dagTasks.length;
    const completedTasks = execution.dagTasks.filter((t: any) => t.status === 'done').length;
    const delayedTasks = execution.dagTasks.filter((t: any) => t.status === 'delayed' || t.delayMinutes > 0).length;
    
    const overloadedDivisions = execution.divisionLoads.filter((d: any) => d.isOverloaded).map((d: any) => d.name).join(', ') || 'None';
    
    const ocsScore = execution.ocs.score;

    const prompt = `You are a high-level Event Operations Consultant.
Write a professional, executive-level Post-Event Intelligence Report based on the following execution data.
The report should be formatted in clean, elegant Markdown.
Do not use generic fluff. Be analytical, pragmatic, and highlight the operational friction points.

## Event Details
- Name: ${eventData.name}
- Type: ${eventData.type}
- Final Operational Confidence Score (OCS): ${ocsScore}/100

## Execution Statistics
- Total Tasks: ${totalTasks}
- Tasks Completed: ${completedTasks}
- Tasks Delayed/Disrupted: ${delayedTasks}
- Overloaded Divisions during event: ${overloadedDivisions}
- Final Timeline Extension: ${execution.timelineExtensionMinutes} minutes

## Instructions
Write a report containing:
1. **Executive Summary**: A brief paragraph summarizing the overall execution success and the final OCS.
2. **Operational Bottlenecks**: Analyze the delayed tasks and overloaded divisions. Why did the timeline extend by ${execution.timelineExtensionMinutes} mins?
3. **Division Performance**: A brief review of the workload distribution.
4. **Key Recommendations for Next Year**: 3-4 pragmatic bullet points on how to improve this specific event next time (e.g., "Increase logistics personnel by 2 to prevent overload," "Buffer the keynote by 30 mins").

Use Markdown formatting (Headers, bold text, bullet points). Make it look like a PDF export from a premium B2B SaaS platform.`;

    const aiResult = await model.generateContent(prompt);
    const reportText = aiResult.response.text();

    return NextResponse.json({ report: reportText });
  } catch (error) {
    console.error('[AI Generate Report] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
