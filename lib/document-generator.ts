// ────────────────────────────────────────────────────────────
// RunIT × Document Generation Engine
// Maps categories → document types, generates structured prompts.
// Output: Markdown + structured JSON ready for UI rendering.
// ────────────────────────────────────────────────────────────

import type { TaskCategory, DocumentType, GeneratedDocument, BudgetLineItem } from '@/store/eventStore';

interface DocGenConfig {
  type: DocumentType;
  titleTemplate: string;
  prompt: (task: { title: string; description: string }, event: any, steps: string[], sourcingSummary: string) => string;
  parse: (raw: string) => any;
}

const DOC_CONFIGS: Record<string, DocGenConfig> = {

  // ── Rundown (Program Agent) ─────────────────────────────
  rundown: {
    type: 'rundown',
    titleTemplate: 'Rundown Acara',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Program Agent. Generate a COMPLETE EVENT RUNDOWN for this event.

Event: ${event.name} (${event.type})
Venue: ${event.venue || 'TBD'}
Date: ${event.timeline || 'TBD'}
Participants: ${event.participants}
Scale: ${event.scale}

Task context: ${task.title} — ${task.description || ''}
Execution plan: ${steps.join('; ')}

Generate a complete day-of rundown from setup to breakdown. Include:
- Arrival & setup time
- Registration period
- Opening ceremony
- Each session with duration
- Breaks (lunch, coffee, prayer)
- Closing ceremony
- Breakdown & evaluation

Return ONLY valid JSON:
{
  "items": [
    { "time": "06:00", "activity": "Setup & Check Sound", "pic": "Logistik", "duration": 90, "notes": "Cek sound system, projector, lighting, dekorasi" },
    { "time": "07:30", "activity": "Briefing Panitia", "pic": "Ketua", "duration": 15, "notes": "Final walkthrough + pembagian walkie-talkie" }
  ],
  "totalDuration": 480,
  "breaks": [
    { "time": "12:00", "activity": "ISHOMA", "duration": 60, "notes": "Makan siang + sholat" }
  ]
}
Create 8-12 realistic items based on the event type and scale. Use 24-hour time format.
`.trim(),
    parse: (raw) => {
      const j = JSON.parse(raw);
      return {
        items: j.items || [],
        totalDuration: j.totalDuration || 0,
        breaks: j.breaks || [],
      };
    },
  },

  // ── MC Script (Program Agent) ───────────────────────────
  'mc-script': {
    type: 'mc-script',
    titleTemplate: 'Script MC / Pembawa Acara',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Program Agent. Generate a COMPLETE MC SCRIPT in Bahasa Indonesia.

Event: ${event.name} (${event.type})
Venue: ${event.venue || 'TBD'}
Audience: ${event.audience}
Scale: ${event.scale}

Generate script with:
- Opening (salam, perkenalan, ucapan terima kasih)
- Segue antar sesi (minimal 3 transisi)
- Speaker introduction template
- Closing remarks
- Housekeeping announcements (toilet, emergency exit, etc.)

Return ONLY valid JSON:
{
  "segments": [
    { "id": "opening", "label": "Pembukaan", "script": "Assalamualaikum wr wb. Selamat pagi dan salam sejahtera..." },
    { "id": "intro-speaker", "label": "Intro Speaker", "script": "Selanjutnya, mari kita sambut..." }
  ],
  "housekeeping": "Toilet di sebelah kiri, emergency exit di belakang...",
  "estimatedDuration": 15
}
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },

  // ── Sponsorship Proposal ────────────────────────────────
  proposal: {
    type: 'proposal',
    titleTemplate: 'Proposal Sponsorship',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Sponsorship Agent. Generate a SPONSORSHIP PROPOSAL PACKAGE.

Event: ${event.name} (${event.type})
Audience: ${event.audience}
Participants: ${event.participants}
Scale: ${event.scale}
Venue: ${event.venue}
Date: ${event.timeline}
Goals: ${event.goals}

Generate 3 sponsorship tiers in IDR:
- Platinum (highest): Logo everywhere, booth, speaking slot, social media
- Gold (mid): Logo, booth, social media mention
- Silver (entry): Logo on backdrop, social media mention

Include for each tier:
- Price range (realistic for event scale)
- Benefits list (5-7 items)
- Estimated reach/impression

Return ONLY valid JSON:
{
  "eventSummary": "2-3 sentence event pitch",
  "audienceProfile": "Who attends and why sponsors care",
  "tiers": [
    {
      "name": "Platinum",
      "price": "Rp 25.000.000",
      "slots": 1,
      "benefits": ["Main stage branding", "VIP booth", "Speaking slot", "Social media package", "Logo on all materials", "Database access", "Opening speech mention"],
      "estimatedReach": "5000+ attendees + 50K social media"
    },
    { "name": "Gold", "price": "Rp 10.000.000", "slots": 3, "benefits": [...], "estimatedReach": "..." },
    { "name": "Silver", "price": "Rp 3.000.000", "slots": 5, "benefits": [...], "estimatedReach": "..." }
  ],
  "contactInfo": "How to reach the sponsorship team"
}
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },

  // ── Checklist (H-1) ─────────────────────────────────────
  'h1-checklist': {
    type: 'h1-checklist',
    titleTemplate: 'Checklist H-1',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Logistics Agent. Generate a COMPREHENSIVE H-1 CHECKLIST.

Event: ${event.name} (${event.type})
Venue: ${event.venue}
Date: ${event.timeline}
Scale: ${event.scale}

Generate a checklist covering ALL aspects that must be verified 1 day before:
- Venue readiness
- Equipment & tech
- Catering confirmation
- Speaker/guest arrival
- Registration setup
- Safety & medical
- Documentation team
- Transportation
- Weather contingency

Return ONLY valid JSON:
{
  "sections": [
    {
      "label": "Venue & Setup",
      "items": [
        { "check": "Sound system test 100% OK", "pic": "Logistik", "priority": "critical" },
        { "check": "Projector & screen aligned", "pic": "Logistik", "priority": "high" }
      ]
    },
    { "label": "Registration", "items": [...] }
  ]
}
Create 5-7 sections with 3-5 items each.
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },

  // ── Press Release ────────────────────────────────────────
  'press-release': {
    type: 'press-release',
    titleTemplate: 'Siaran Pers',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Communications Agent. Write a PRESS RELEASE in Bahasa Indonesia.

Event: ${event.name} (${event.type})
Date: ${event.timeline}
Venue: ${event.venue}
Audience: ${event.audience}
Scale: ${event.scale}

Structure:
- Headline (catchy, news-worthy)
- Dateline (city, date)
- Lead paragraph (who, what, when, where, why)
- Body (2-3 paragraphs: event details, speakers, unique angle)
- Boilerplate (about the organizer)
- Media contact

Return ONLY valid JSON:
{
  "headline": "string",
  "dateline": "Kota, Tanggal",
  "lead": "string (1 paragraph)",
  "body": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "boilerplate": "string",
  "mediaContact": "Nama | WA | Email"
}
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },

  // ── Technical Rider ──────────────────────────────────────
  'technical-rider': {
    type: 'technical-rider',
    titleTemplate: 'Technical Rider',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Logistics Agent. Generate a TECHNICAL RIDER for this event.

Event: ${event.name} (${event.type})
Venue: ${event.venue}
Scale: ${event.scale}
Participants: ${event.participants}

Generate technical requirements for:
- Stage design (size, height, backdrop)
- Audio (speakers, mixer, mic types/count)
- Lighting (basic wash, spot, effects)
- Video (projector, screen size, laptop)
- Power requirements
- Internet/WiFi
- Furniture (tables, chairs, podium)
- Backstage (green room, storage)

Return ONLY valid JSON:
{
  "sections": [
    { "category": "Stage", "items": [{ "spec": "Main stage 8x6m, height 60cm", "qty": 1, "notes": "Carpet black" }] },
    { "category": "Audio", "items": [{ "spec": "Line array PA system min 5000W", "qty": 1, "notes": "Outdoor-rated" }] }
  ]
}
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },

  // ── Budget Sheet ─────────────────────────────────────────
  budget: {
    type: 'budget',
    titleTemplate: 'Lembar Anggaran',
    prompt: (task, event, steps, sourcing) => `
You are RunIT's Budget Agent. Generate a detailed BUDGET SHEET in IDR.

Event: ${event.name} (${event.type})
Scale: ${event.scale}
Participants: ${event.participants}
Total Budget: ${event.budget}
Execution context: ${steps.join('; ')}

Generate budget line items across all categories with:
- Category
- Item name
- Estimated cost (realistic for Indonesia market)
- Actual (leave 0, to be filled later)
- Notes

Return ONLY valid JSON:
{
  "categories": [
    {
      "label": "Venue & Fasilitas",
      "totalEstimated": 15000000,
      "items": [
        { "name": "Sewa gedung", "estimated": 10000000, "actual": 0, "notes": "Full day incl. AC & cleaning" },
        { "name": "Genset backup", "estimated": 5000000, "actual": 0, "notes": "50KVA, outdoor" }
      ]
    }
  ],
  "grandTotalEstimated": 50000000,
  "contingency": 10
}
Include 5-7 categories with 3-5 items each. contingency = % buffer.
`.trim(),
    parse: (raw) => JSON.parse(raw),
  },
};

// ── Category → Document Type mapping ──────────────────────
const CATEGORY_DOC_MAP: Partial<Record<TaskCategory, DocumentType[]>> = {
  program: ['rundown', 'mc-script'],
  sponsor: ['proposal'],
  comms: ['press-release'],
  logistics: ['h1-checklist', 'technical-rider'],
  budget: ['budget'],
  internal: ['rundown'],
  crisis: ['h1-checklist'],
};

export function getDocumentTypesForCategory(category: TaskCategory): DocumentType[] {
  return CATEGORY_DOC_MAP[category] || [];
}

export function getDocConfig(type: DocumentType): DocGenConfig | null {
  return DOC_CONFIGS[type] || null;
}

export async function generateDocument(
  type: DocumentType,
  task: { id: string; title: string; description: string },
  eventData: any,
  steps: string[],
  sourcingSummary: string,
  generateFn: (prompt: string, requireJson: boolean) => Promise<string>,
): Promise<GeneratedDocument> {
  const config = DOC_CONFIGS[type];
  if (!config) throw new Error(`No document config for type: ${type}`);

  const prompt = config.prompt(task, eventData, steps, sourcingSummary);

  const text = await generateFn(prompt, true);
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

  let structured: any;
  try {
    structured = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    structured = m ? JSON.parse(m[0]) : { raw: cleaned };
  }

  structured = config.parse(cleaned);

  let markdown = `# ${config.titleTemplate}: ${eventData.name}\n\n`;
  markdown += `*Generated by RunIT AI — ${new Date().toLocaleDateString('id-ID')}*\n\n`;

  switch (type) {
    case 'rundown':
      markdown += `| Waktu | Durasi | Kegiatan | PIC | Catatan |\n|---|---|---|---|---|\n`;
      for (const item of (structured.items || [])) {
        markdown += `| ${item.time} | ${item.duration}m | ${item.activity} | ${item.pic} | ${item.notes || ''} |\n`;
      }
      if (structured.breaks?.length) {
        markdown += `\n### Istirahat\n`;
        for (const b of structured.breaks) markdown += `- **${b.time}** (${b.duration}m): ${b.activity}\n`;
      }
      break;
    case 'mc-script':
      for (const seg of (structured.segments || [])) {
        markdown += `### ${seg.label}\n\n${seg.script}\n\n`;
      }
      if (structured.housekeeping) markdown += `---\n\n**Housekeeping:** ${structured.housekeeping}\n`;
      break;
    case 'proposal':
      markdown += `### Event Summary\n${structured.eventSummary}\n\n### Audience\n${structured.audienceProfile}\n\n`;
      for (const tier of (structured.tiers || [])) {
        markdown += `### ${tier.name} — ${tier.price} (${tier.slots} slot)\n`;
        for (const b of (tier.benefits || [])) markdown += `- ${b}\n`;
        markdown += `\n*Reach: ${tier.estimatedReach}*\n\n`;
      }
      break;
    case 'h1-checklist':
      for (const sec of (structured.sections || [])) {
        markdown += `### ${sec.label}\n`;
        for (const item of (sec.items || [])) {
          markdown += `- [ ] **${item.priority?.toUpperCase() || ''}** ${item.check} — *PIC: ${item.pic}*\n`;
        }
        markdown += '\n';
      }
      break;
    case 'press-release':
      markdown += `**${structured.headline}**\n\n*${structured.dateline}* — ${structured.lead}\n\n`;
      for (const p of (structured.body || [])) markdown += `${p}\n\n`;
      markdown += `---\n${structured.boilerplate}\n\n**Contact:** ${structured.mediaContact}`;
      break;
    case 'technical-rider':
      for (const sec of (structured.sections || [])) {
        markdown += `### ${sec.category}\n| Spec | Qty | Notes |\n|---|---|---|\n`;
        for (const item of (sec.items || [])) markdown += `| ${item.spec} | ${item.qty} | ${item.notes || ''} |\n`;
        markdown += '\n';
      }
      break;
    case 'budget':
      markdown += `**Grand Total Estimate:** Rp ${(structured.grandTotalEstimated || 0).toLocaleString('id-ID')}\n`;
      markdown += `**Contingency:** ${structured.contingency || 10}%\n\n`;
      for (const cat of (structured.categories || [])) {
        markdown += `### ${cat.label} — Rp ${(cat.totalEstimated || 0).toLocaleString('id-ID')}\n`;
        markdown += `| Item | Estimasi | Actual | Notes |\n|---|---|---|---|\n`;
        for (const item of (cat.items || [])) {
          markdown += `| ${item.name} | Rp ${(item.estimated || 0).toLocaleString('id-ID')} | ${item.actual ? 'Rp ' + item.actual.toLocaleString('id-ID') : '—'} | ${item.notes || ''} |\n`;
        }
        markdown += '\n';
      }
      break;
  }

  return {
    id: `doc-${Date.now()}`,
    type,
    title: config.titleTemplate,
    taskId: task.id,
    content: { markdown, structured },
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
}

export function extractBudgetItems(doc: GeneratedDocument, taskId?: string): BudgetLineItem[] {
  if (doc.type !== 'budget') return [];

  const structured = doc.content.structured;
  if (!structured?.categories) return [];

  const items: BudgetLineItem[] = [];
  for (const cat of structured.categories) {
    for (const item of (cat.items || [])) {
      items.push({
        id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: cat.label || 'Uncategorized',
        name: item.name || 'Unknown',
        estimated: item.estimated || 0,
        actual: 0,
        notes: item.notes || '',
        source: 'ai-document',
        taskId,
        status: 'pending',
      });
    }
  }
  return items;
}
