// ────────────────────────────────────────────────────────────
// RunIT × Specialized AI Task Agents
// Each agent has domain-specific prompts optimized for its category.
// Utilizes You.com livecrawl + deep research for web-grounded results.
// ────────────────────────────────────────────────────────────

import type { Task, EventData, TaskCategory } from '@/store/eventStore';

interface AgentConfig {
  category: TaskCategory;
  keywords: string[];
  promptHeader: string;
  sourcingQueryTemplate: (task: Task, event: EventData) => string;
  resolutionPromptTemplate: (task: Task, event: EventData, sourcingContext: string) => string;
}

const AGENT_REGISTRY: Record<string, AgentConfig> = {

  venue: {
    category: 'venue',
    keywords: ['venue', 'gedung', 'tempat', 'lokasi', 'ruangan', 'hall', 'ballroom', 'convention', 'auditorium', 'lapangan', 'stadion', 'outdoor', 'indoor', 'hotel', 'resort'],
    promptHeader: 'You are a Venue Sourcing Agent specialized in finding event locations.',
    sourcingQueryTemplate: (task, event) =>
      `${event.type} event venue ${event.venue || task.title} kapasitas ${event.participants} ${event.scale} scale best options ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Venue Sourcing Agent. Find and recommend real venues for this event.

Event: ${event.name} (${event.type})
Scale: ${event.scale} | Participants: ${event.participants}
Budget: ${event.budget}
Task: ${task.title} — ${task.description || 'Find suitable venue'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Based on the web intel, provide 3-5 REAL venue recommendations (not generic templates).
2. Each recommendation must include name, address/location, reasoning why it fits, rating estimate, and estimated cost in IDR.
3. Provide a draft WhatsApp message ready to send to venue #1 in natural Indonesian.
4. Summarize the sourcing intel concisely.

Return ONLY valid JSON:
{
  "steps": ["Step 1: Contact X venue to confirm availability", "Step 2: ..."],
  "draftMessage": "Draft WA message",
  "sourcingSummary": "Summary of findings",
  "recommendations": [
    { "name": "Venue Name", "address": "Address/Link", "reasoning": "Why appropriate", "rating": "4.5/5", "estimatedCost": "Rp 5.000.000", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  vendor: {
    category: 'vendor',
    keywords: ['vendor', 'catering', 'konsumsi', 'makanan', 'sewa', 'rental', 'sound', 'lighting', 'dekorasi', 'dekor', 'fotografer', 'videografer', 'dokumentasi', 'cetak', 'printing', 'spanduk', 'banner', 'souvenir', 'merchandise', 'security', 'keamanan', 'medis', 'ambulans', 'toilet', 'tenda', 'genset', 'panggung'],
    promptHeader: 'You are a Vendor Procurement Agent specialized in finding reliable event suppliers.',
    sourcingQueryTemplate: (task, event) =>
      `${task.title} ${event.type} event vendor jasa ${event.venue || 'Indonesia'} terbaik rekomendasi ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Vendor Procurement Agent. Find and recommend real vendors for this event need.

Event: ${event.name} (${event.type})
Scale: ${event.scale} | Participants: ${event.participants}
Budget: ${event.budget}
Task: ${task.title} — ${task.description || 'Procure vendor/service'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Provide 3-5 REAL vendor/service provider recommendations based on web intel.
2. Each recommendation: name, location, reasoning, rating estimate, cost estimate in IDR.
3. Include a negotiation tip specific to this type of vendor.
4. Draft WhatsApp message ready to send to vendor #1.
5. Summarize the sourcing intel.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "draftMessage": "Draft WA message to vendor",
  "sourcingSummary": "Summary of findings",
  "negotiationTip": "Tip specific to this vendor type",
  "recommendations": [
    { "name": "Vendor Name", "address": "Location/URL", "reasoning": "Why recommended", "rating": "4.8/5", "estimatedCost": "Rp 2.500.000", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  sponsor: {
    category: 'sponsor',
    keywords: ['sponsor', 'sponsorship', 'donatur', 'dana', 'partner', 'brand', 'endorsement', 'media partner', 'csr'],
    promptHeader: 'You are a Sponsorship & Partnerships Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${event.type} event sponsorship brand partner ${event.audience || 'Indonesia'} ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Sponsorship Agent. Find potential sponsors for this event.

Event: ${event.name} (${event.type})
Scale: ${event.scale} | Participants: ${event.participants} | Audience: ${event.audience}
Budget needed: ${event.budget}
Task: ${task.title} — ${task.description || 'Find sponsors'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Recommend 3-5 REAL brands/companies that would logically sponsor this type of event.
2. Explain why each brand aligns with the event audience.
3. Provide key talking points for the sponsorship pitch.
4. Draft a professional email pitch to sponsor #1 (English or Indonesian as appropriate).
5. Summarize the rationale.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "draftMessage": "Draft pitch email/WA",
  "sourcingSummary": "Rationale summary",
  "recommendations": [
    { "name": "Brand Name", "address": "Website/Industry", "reasoning": "Why they'd sponsor", "rating": "High alignment", "estimatedCost": "Rp 10.000.000 sponsorship tier", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  speaker: {
    category: 'speaker',
    keywords: ['speaker', 'pembicara', 'narasumber', 'keynote', 'panelis', 'moderator', 'mc', 'host', 'pengisi', 'talent', 'artis', 'band', 'musik', 'hiburan', 'entertainment'],
    promptHeader: 'You are a Talent & Speaker Sourcing Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${task.title} ${event.type} speaker pembicara ${event.audience || ''} Indonesia ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Speaker/Talent Sourcing Agent. Find suitable speakers for this event.

Event: ${event.name} (${event.type})
Audience: ${event.audience}
Budget: ${event.budget}
Task: ${task.title} — ${task.description || 'Find speaker/talent'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Recommend 3-5 REAL speakers/talents relevant to the event topic and audience.
2. Each recommendation: name, expertise area, why they fit, estimated availability/rate.
3. Draft WhatsApp/email message to reach out to speaker #1.
4. Summarize sourcing intel.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "draftMessage": "Draft outreach message",
  "sourcingSummary": "Summary of findings",
  "recommendations": [
    { "name": "Speaker Name", "address": "Expertise/Profile URL", "reasoning": "Why they fit", "rating": "Expert level", "estimatedCost": "Rp 5.000.000", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  comms: {
    category: 'comms',
    keywords: ['publikasi', 'posting', 'pengumuman', 'sosial media', 'instagram', 'twitter', 'tiktok', 'press release', 'media', 'wartawan', 'jurnalis', 'broadcast', 'flyer', 'poster', 'desain', 'konten', 'copywriting', 'caption'],
    promptHeader: 'You are a Communications & Content Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${event.type} event ${task.title} social media campaign ideas ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Communications Agent. Create communication materials for this event task.

Event: ${event.name} (${event.type})
Audience: ${event.audience}
Task: ${task.title} — ${task.description || 'Create communications'}

Web Sourcing Intel (trends, examples):
${sourcingContext}

Instructions:
1. Provide 2-4 concrete steps for executing this communications task.
2. Draft the actual content (caption, announcement text, email blast, etc.) — NOT a template.
3. Recommend the best channel (Instagram, WA Broadcast, Email, etc.) and why.
4. If applicable, suggest posting time/frequency.
5. Summarize the approach.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2"],
  "draftMessage": "The actual content to post",
  "sourcingSummary": "Communication strategy summary",
  "recommendations": [
    { "name": "Channel Recommendation", "address": "Instagram/Twitter/Email", "reasoning": "Why this channel", "rating": "Best fit", "estimatedCost": "Organic", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  logistics: {
    category: 'logistics',
    keywords: ['transportasi', 'transport', 'bus', 'mobil', 'logistik', 'pengiriman', 'parkir', 'akomodasi', 'penginapan', 'hotel', 'pesawat', 'tiket', 'perjalanan', 'jemput', 'antar'],
    promptHeader: 'You are a Logistics & Operations Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${task.title} ${event.type} event transportasi akomodasi ${event.venue || 'Indonesia'}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Logistics Agent. Plan and source logistics for this event task.

Event: ${event.name} (${event.type})
Scale: ${event.scale} | Participants: ${event.participants}
Venue: ${event.venue}
Task: ${task.title} — ${task.description || 'Handle logistics'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Provide 3-5 concrete steps for executing this logistics task.
2. Include specific numerical estimates (number of buses, rooms, etc. based on participants).
3. Provide routing/logistics tips relevant to the venue location.
4. Draft a coordination message for the team/vendor.
5. Summarize the logistics plan.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "draftMessage": "Coordination draft",
  "sourcingSummary": "Logistics plan summary",
  "recommendations": [
    { "name": "Transport Vendor / Hotel", "address": "Location/URL", "reasoning": "Why recommended", "rating": "4.5/5", "estimatedCost": "Rp 3.000.000", "sourceUrl": "url" }
  ]
}
`.trim(),
  },

  permit: {
    category: 'permit',
    keywords: ['izin', 'perizinan', 'perijinan', 'polisi', 'keamanan', 'surat', 'legal', 'regulasi', 'keramaian', 'pemberitahuan', 'rt', 'rw', 'kelurahan', 'kecamatan'],
    promptHeader: 'You are a Permits & Compliance Agent.',
    sourcingQueryTemplate: (task, event) =>
      `cara mengurus izin keramaian event ${event.type} ${event.venue || 'Indonesia'} prosedur legal`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Permits & Compliance Agent. Handle legal/permit requirements.

Event: ${event.name} (${event.type})
Venue: ${event.venue} | Scale: ${event.scale}
Task: ${task.title} — ${task.description || 'Handle permits'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Provide step-by-step procedure for obtaining necessary permits.
2. List specific documents needed.
3. Estimate processing time and potential blockers.
4. Draft a formal letter template if applicable.
5. Summarize the compliance path.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2", "Step 3"],
  "draftMessage": "Letter template or contact message",
  "sourcingSummary": "Permit procedure summary",
  "recommendations": []
}
`.trim(),
  },

  crisis: {
    category: 'crisis',
    keywords: ['risiko', 'mitigasi', 'keamanan', 'darurat', 'emergency', 'evakuasi', 'backup', 'kontingensi', 'asuransi', 'p3k', 'first aid', 'kebakaran', 'gempa', 'hujan', 'cuaca'],
    promptHeader: 'You are a Crisis & Risk Mitigation Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${event.type} event risk mitigation ${task.title} emergency preparedness best practice`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Crisis Agent. Create risk mitigation plans for this event task.

Event: ${event.name} (${event.type})
Venue: ${event.venue} | Scale: ${event.scale}
Task: ${task.title} — ${task.description || 'Mitigate risks'}

Web Sourcing Intel (real incident examples):
${sourcingContext}

Instructions:
1. Identify specific risks related to this task.
2. Provide worst-case, likely, and best-case scenarios.
3. Give concrete prevention and response steps.
4. Draft an emergency communication template.
5. Summarize the risk assessment.

Return ONLY valid JSON:
{
  "steps": ["Prevention Step 1", "Response Step 2", "Recovery Step 3"],
  "draftMessage": "Emergency comms template",
  "sourcingSummary": "Risk assessment summary",
  "recommendations": []
}
`.trim(),
  },

  budget: {
    category: 'budget',
    keywords: ['budget', 'anggaran', 'biaya', 'harga', 'dana', 'keuangan', 'pembayaran', 'invoice', 'kwitansi', 'pembukuan'],
    promptHeader: 'You are a Budget & Finance Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${event.type} event budget breakdown ${event.scale} scale Indonesia ${new Date().getFullYear()}`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's Budget Agent. Provide financial planning for this event task.

Event: ${event.name} (${event.type})
Budget: ${event.budget} | Scale: ${event.scale} | Participants: ${event.participants}
Task: ${task.title} — ${task.description || 'Plan budget'}

Web Sourcing Intel (market rates):
${sourcingContext}

Instructions:
1. Break down estimated costs for this task area.
2. Suggest cost-saving tips based on market research.
3. Flag potential budget risks.
4. Draft a budget tracking template or checklist.
5. Summarize the budget plan.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2"],
  "draftMessage": "Budget summary message for team",
  "sourcingSummary": "Budget analysis summary",
  "recommendations": [
    { "name": "Cost Saving Tip", "address": "Applicable to", "reasoning": "Why it saves money", "rating": "Savings estimate", "estimatedCost": "Rp XXX savings", "sourceUrl": "" }
  ]
}
`.trim(),
  },
};

// ── Category detector ──────────────────────────────────────
const CATEGORY_KEYWORDS: [TaskCategory, string[]][] = Object.entries(AGENT_REGISTRY).map(
  ([cat, cfg]) => [cat as TaskCategory, cfg.keywords]
);

export function detectTaskCategory(task: Task, eventData: EventData): TaskCategory {
  const searchText = `${task.title} ${task.description}`.toLowerCase();

  const scored = CATEGORY_KEYWORDS.map(([cat, keywords]) => {
    const score = keywords.reduce((acc, kw) => acc + (searchText.includes(kw.toLowerCase()) ? 1 : 0), 0);
    return { cat, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].cat : 'internal';
}

export function getAgentConfig(category: TaskCategory): AgentConfig {
  return AGENT_REGISTRY[category] || {
    category: 'internal',
    keywords: [],
    promptHeader: 'You are a General Task Resolution Agent.',
    sourcingQueryTemplate: (task, event) =>
      `${task.title} ${event.name} ${event.type} event planning guide`,
    resolutionPromptTemplate: (task, event, sourcingContext) => `
You are RunIT's General Task Resolution Agent.

Event: ${event.name} (${event.type})
Scale: ${event.scale} | Participants: ${event.participants}
Task: ${task.title} — ${task.description || 'Resolve this task'}

Web Sourcing Intel:
${sourcingContext}

Instructions:
1. Provide 2-4 concrete, actionable steps to resolve this task.
2. If the task involves contacting anyone, provide a draft message.
3. Summarize any useful intel from web research.

Return ONLY valid JSON:
{
  "steps": ["Step 1", "Step 2"],
  "draftMessage": "Draft if applicable",
  "sourcingSummary": "Intel summary"
}
`.trim(),
  };
}

export type { AgentConfig };
export { AGENT_REGISTRY };

export function classifyAllTasks(
  tasks: Array<{ id: string; title: string; description: string }>,
  eventData: EventData,
): Array<{ taskId: string; category: TaskCategory }> {
  return tasks.map(t => ({
    taskId: t.id,
    category: detectTaskCategory({ title: t.title, description: t.description } as any, eventData),
  }));
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  internal: 'Internal',
  venue: 'Venue',
  vendor: 'Vendor',
  sponsor: 'Sponsor',
  speaker: 'Speaker/Talent',
  catering: 'Catering',
  equipment: 'Equipment',
  permit: 'Perizinan',
  comms: 'Komunikasi',
  logistics: 'Logistik',
  program: 'Program',
  budget: 'Anggaran',
  crisis: 'Mitigasi',
};

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  internal: '#6b7280',
  venue: '#8b5cf6',
  vendor: '#f59e0b',
  sponsor: '#ec4899',
  speaker: '#06b6d4',
  catering: '#10b981',
  equipment: '#6366f1',
  permit: '#f43f5e',
  comms: '#3b82f6',
  logistics: '#14b8a6',
  program: '#a855f7',
  budget: '#22c55e',
  crisis: '#ef4444',
};
