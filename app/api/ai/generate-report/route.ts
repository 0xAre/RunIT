import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { deepResearch } from '@/lib/you';
import {
  generateSponsorReport,
  generateSurvey,
  generateThankYouMessages,
  generateReconciliation,
  generateLessonsLearned,
  generateEventTemplate,
} from '@/lib/post-event';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { eventData, modules } = await req.json();

    if (!eventData) {
      return NextResponse.json({ error: 'Missing eventData' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const execution = eventData.execution;
    const requestedModules: string[] = modules || ['report', 'sponsor-report', 'survey', 'thank-you', 'reconciliation', 'lessons', 'template'];

    const result: Record<string, any> = {};

    // Run all requested modules in parallel
    const promises: Promise<void>[] = [];

    if (requestedModules.includes('report') && execution) {
      promises.push((async () => {
        const totalTasks = execution.dagTasks?.length || 0;
        const completedTasks = execution.dagTasks?.filter((t: any) => t.status === 'done').length || 0;
        const delayedTasks = execution.dagTasks?.filter((t: any) => t.status === 'delayed' || t.delayMinutes > 0).length || 0;
        const overloadedDivisions = execution.divisionLoads?.filter((d: any) => d.isOverloaded).map((d: any) => d.name).join(', ') || 'None';
        const ocsScore = execution.ocs?.score || 0;

        const benchmark = await deepResearch(
          `industry benchmark KPI "${eventData.type}" event management success metrics best practices`,
          'lite'
        ).catch(() => null);

        const benchmarkContext = benchmark?.content
          ? `\n\n## Industry Benchmarks\n${benchmark.content.slice(0, 1000)}\n`
          : '';

        const prompt = `You are a high-level Event Operations Consultant. Write a professional Post-Event Intelligence Report in Bahasa Indonesia.

${benchmarkContext}
Event: ${eventData.name} (${eventData.type})
OCS: ${ocsScore}/100 | Tasks: ${completedTasks}/${totalTasks} done | Delayed: ${delayedTasks}
Overloaded Divisions: ${overloadedDivisions} | Timeline Extension: ${execution.timelineExtensionMinutes || 0}m

Include: Executive Summary, Operational Bottlenecks, Division Performance, Recommendations for Next Event.
Format as clean Markdown.`;

        const aiResult = await model.generateContent(prompt);
        result.report = aiResult.response.text();
      })());
    }

    if (requestedModules.includes('sponsor-report')) {
      promises.push((async () => {
        result.sponsorReport = await generateSponsorReport(eventData);
      })());
    }

    if (requestedModules.includes('survey')) {
      promises.push((async () => {
        result.survey = await generateSurvey(eventData);
      })());
    }

    if (requestedModules.includes('thank-you')) {
      promises.push((async () => {
        result.thankYou = await generateThankYouMessages(eventData);
      })());
    }

    if (requestedModules.includes('reconciliation') && eventData.budgetTracker) {
      promises.push((async () => {
        result.reconciliation = generateReconciliation(eventData.budgetTracker);
      })());
    }

    if (requestedModules.includes('lessons')) {
      promises.push((async () => {
        result.lessons = await generateLessonsLearned(eventData);
      })());
    }

    if (requestedModules.includes('template')) {
      promises.push((async () => {
        result.template = generateEventTemplate(eventData);
      })());
    }

    await Promise.allSettled(promises);

    return NextResponse.json({ modules: result });
  } catch (error) {
    console.error('[AI Post-Event] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
