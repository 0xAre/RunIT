// ────────────────────────────────────────────────────────────
// RunIT × Post-Event Intelligence Engine
// Generate sponsor report, survey questions, thank-you messages,
// financial reconciliation, lessons learned, and event template.
// ────────────────────────────────────────────────────────────

import type { EventData, BudgetTracker, ExternalContact } from '@/store/eventStore';
import { generateWithFallback } from './gemini';
import { searchYouCom } from './you';

// ── 1. Sponsor Performance Report ─────────────────────────

export async function generateSponsorReport(
  eventData: EventData,
): Promise<string> {
  const budget = eventData.budgetTracker;
  const budgetSection = budget
    ? `\n## Budget Realization\nEstimated: Rp ${budget.totalEstimated.toLocaleString('id-ID')}\nActual: Rp ${budget.totalActual.toLocaleString('id-ID')}\nVariance: ${budget.totalEstimated > 0 ? Math.round(((budget.totalActual - budget.totalEstimated) / budget.totalEstimated) * 100) : 0}%`
    : '';

  const prompt = [
    'You are RunIT\'s Post-Event Intelligence. Generate a SPONSOR PERFORMANCE REPORT.',
    '',
    'Event: ' + eventData.name + ' (' + eventData.type + ')',
    'Date: ' + eventData.timeline,
    'Venue: ' + eventData.venue,
    'Participants: ' + eventData.participants,
    'Audience: ' + eventData.audience,
    budgetSection,
    '',
    'Generate a professional sponsor report in Bahasa Indonesia covering:',
    '1. Event Summary - 1-2 paragraph ringkasan',
    '2. Audience Reach - estimasi reach',
    '3. Sponsor Visibility - di mana logo/brand muncul',
    '4. Key Metrics - peserta, engagement, media coverage',
    '5. Photo/Video Recommendations',
    '6. Recommendation for Renewal',
    '',
    'Format as clean Markdown.',
  ].join('\n');

  const result = await generateWithFallback(prompt);
  return result;
}

// ── 2. Post-Event Survey Generator ─────────────────────────

export async function generateSurvey(
  eventData: EventData,
): Promise<{ title: string; questions: Array<{ id: string; text: string; type: 'rating' | 'text' | 'yesno' | 'choice'; choices?: string[] }> }> {
  const prompt = `You are RunIT's Post-Event Intelligence. Generate a POST-EVENT SURVEY in Bahasa Indonesia.

Event: ${eventData.name} (${eventData.type})
Audience: ${eventData.audience}
Scale: ${eventData.scale}
Participants: ${eventData.participants}

Generate 10-12 survey questions covering:
- Overall satisfaction (rating 1-5)
- Content quality (rating)
- Speaker evaluation (rating + open text)
- Venue & facilities (rating)
- Food & beverage (rating)
- Registration process (rating)
- Would recommend? (yes/no)
- Best part (open text)
- Improvement suggestions (open text)
- Future topic interests (choice: list 4 options)

Return ONLY valid JSON:
{
  "title": "Judul Survey",
  "questions": [
    { "id": "q1", "text": "Question text", "type": "rating|text|yesno|choice", "choices": ["A", "B"] }
  ]
}`.trim();

  const text = await generateWithFallback(prompt, true);
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {
      title: 'Post-Event Survey',
      questions: [{ id: 'q1', text: 'Bagaimana penilaian Anda terhadap event secara keseluruhan? (1-5)', type: 'rating' }],
    };
  }
}

// ── 3. Thank-You Message Generator ─────────────────────────

export interface ThankYouMessages {
  sponsor: string;
  speaker: string;
  vendor: string;
  team: string;
  general: string;
}

export async function generateThankYouMessages(
  eventData: EventData,
): Promise<ThankYouMessages> {
  const contactNames = (eventData.externalContacts || []).map(c => c.name).join(', ');
  const sponsors = (eventData.externalContacts || []).filter(c => c.category === 'sponsor').map(c => c.name).join(', ');
  const speakers = (eventData.externalContacts || []).filter(c => c.category === 'speaker').map(c => c.name).join(', ');

  const prompt = `You are RunIT's Post-Event Intelligence. Generate PERSONALIZED THANK-YOU MESSAGES in Bahasa Indonesia.

Event: ${eventData.name} (${eventData.type})
Date: ${eventData.timeline}
Sponsors: ${sponsors || 'Various partners'}
Speakers: ${speakers || 'Guest speakers'}
Key Contacts: ${contactNames || 'All partners'}

Generate 5 thank-you messages:
1. **Sponsor** - formal & warm, mention event success
2. **Speaker/Pembicara** - personal & appreciative
3. **Vendor (catering, AV, etc)** - professional, mention specific contributions
4. **Tim Internal/Panitia** - motivating, team spirit
5. **General/Umum** - for social media or participant broadcast

Each message: 3-5 sentences, natural Indonesian. Ready to send via WhatsApp.

Return ONLY valid JSON:
{
  "sponsor": "message text",
  "speaker": "message text",
  "vendor": "message text",
  "team": "message text",
  "general": "message text"
}`.trim();

  const text = await generateWithFallback(prompt, true);
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {
      sponsor: `Terima kasih atas dukungan Anda untuk ${eventData.name}.`,
      speaker: `Terima kasih telah berbagi ilmu di ${eventData.name}.`,
      vendor: `Terima kasih atas kerja samanya untuk ${eventData.name}.`,
      team: `Terima kasih tim! ${eventData.name} sukses karena kerja keras kita semua.`,
      general: `Terima kasih telah menjadi bagian dari ${eventData.name}!`,
    };
  }
}

// ── 4. Financial Reconciliation ────────────────────────────

export interface ReconciliationReport {
  summary: string;
  categories: Array<{
    label: string;
    estimated: number;
    actual: number;
    variance: number;
    variancePct: number;
    analysis: string;
  }>;
  totalEstimated: number;
  totalActual: number;
  overallVariancePct: number;
  recommendations: string[];
}

export function generateReconciliation(budgetTracker: BudgetTracker): ReconciliationReport {
  const { items, totalEstimated, totalActual } = budgetTracker;

  const grouped: Record<string, { estimated: number; actual: number }> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = { estimated: 0, actual: 0 };
    grouped[item.category].estimated += item.estimated;
    grouped[item.category].actual += item.actual;
  }

  const categories = Object.entries(grouped).map(([label, data]) => {
    const variance = data.actual - data.estimated;
    const variancePct = data.estimated > 0 ? Math.round((variance / data.estimated) * 100) : 0;
    return {
      label,
      estimated: data.estimated,
      actual: data.actual,
      variance,
      variancePct,
      analysis: variancePct > 10
        ? `Over budget by ${variancePct}%. Review vendor costs or scope creep.`
        : variancePct < -10
        ? `Under budget by ${Math.abs(variancePct)}%. Good cost control.`
        : 'On track within acceptable variance.',
    };
  });

  const overallVariancePct = totalEstimated > 0
    ? Math.round(((totalActual - totalEstimated) / totalEstimated) * 100)
    : 0;

  return {
    summary: `Overall budget: Rp ${totalEstimated.toLocaleString('id-ID')} estimated vs Rp ${totalActual.toLocaleString('id-ID')} actual (${overallVariancePct > 0 ? '+' : ''}${overallVariancePct}% variance).`,
    categories,
    totalEstimated,
    totalActual,
    overallVariancePct,
    recommendations: categories
      .filter(c => Math.abs(c.variancePct) > 10)
      .map(c => `Review ${c.label} budget (${c.variancePct > 0 ? '+' : ''}${c.variancePct}% variance): ${c.analysis}`),
  };
}

// ── 5. Lessons Learned Generator ───────────────────────────

export async function generateLessonsLearned(
  eventData: EventData,
): Promise<{ summary: string; strengths: string[]; improvements: string[]; actionItems: string[] }> {
  const prompt = `You are RunIT's Post-Event Intelligence. Generate LESSONS LEARNED.

Event: ${eventData.name} (${eventData.type})
Scale: ${eventData.scale}
Participants: ${eventData.participants}
Timeline: ${eventData.timeline}
Venue: ${eventData.venue}

Based on typical event execution patterns for a ${eventData.scale}-scale ${eventData.type}:
- What usually goes well?
- What are common friction points?
- What should be improved for next time?

Return ONLY valid JSON:
{
  "summary": "1 paragraph overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "improvements": ["area to improve 1", "area 2", "area 3", "area 4"],
  "actionItems": ["concrete action 1", "action 2", "action 3", "action 4"]
}`.trim();

  const text = await generateWithFallback(prompt, true);
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {
      summary: 'Event berjalan dengan baik.',
      strengths: ['Koordinasi tim solid', 'Rundown terlaksana'],
      improvements: ['Konfirmasi vendor lebih awal', 'Backup plan untuk teknis'],
      actionItems: ['Buat database vendor', 'Dokumentasikan SOP'],
    };
  }
}

// ── 6. Event Template Generator ────────────────────────────

export interface EventTemplate {
  name: string;
  type: string;
  audience: string;
  scale: string;
  blueprintSummary: string;
  divisionStructures: Array<{ name: string; pic: string; keyTasks: string[] }>;
  keyVendors: string[];
  budgetEstimates: Record<string, number>;
  timelineTemplate: string;
  lessonsApplied: string[];
}

export function generateEventTemplate(eventData: EventData): EventTemplate {
  const blueprint = eventData.blueprint;
  const budget = eventData.budgetTracker;

  return {
    name: eventData.name,
    type: eventData.type,
    audience: eventData.audience,
    scale: eventData.scale,
    blueprintSummary: blueprint?.summary || '',
    divisionStructures: (blueprint?.divisions || []).map(d => ({
      name: d.name,
      pic: d.pic,
      keyTasks: d.tasks.slice(0, 5).map(t => t.title),
    })),
    keyVendors: (eventData.externalContacts || []).filter(c => c.category === 'vendor' || c.category === 'venue').map(c => c.name),
    budgetEstimates: budget ? Object.fromEntries(
      Object.entries(
        budget.items.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + item.estimated;
          return acc;
        }, {} as Record<string, number>)
      )
    ) : {},
    timelineTemplate: eventData.timeline || 'TBD',
    lessonsApplied: [],
  };
}
