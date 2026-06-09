import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Blueprint, SimulationResult, EventData, TaskCategory, TaskSourcingResult, SourcingRecommendation } from '@/store/eventStore';
import { researchVenueOrVendor, deepResearch, sourceForTaskCategory } from './you';
import { detectTaskCategory, getAgentConfig } from './task-agents';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

// Helper: Try Gemini first, fallback to You.com
export async function generateWithFallback(prompt: string, requireJson: boolean = false): Promise<string> {
  try {
    const primaryModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: requireJson ? { responseMimeType: 'application/json' } : undefined
    });
    const result = await primaryModel.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.warn('[AI Engine] Gemini failed (possibly 503), falling back to You.com:', err);
    try {
      console.log('[AI Engine] Trying You.com deepResearch (lite) as fallback...');
      const youRes = await deepResearch(prompt, 'lite');
      if (youRes && youRes.content) {
        return youRes.content;
      }
    } catch (youErr) {
      console.error('[AI Engine] You.com also failed:', youErr);
    }
    throw new Error('Both Gemini and You.com failed to generate content');
  }
}

export async function generateEventBlueprint(
  eventData: Partial<EventData>,
  lang: 'en' | 'id' = 'en',
  marketContext?: string
): Promise<Blueprint> {
  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY found, returning mock blueprint.");
    if (lang === 'en') {
      return {
        eventName: eventData.name || "Mock Event",
        eventType: eventData.type || "Seminar",
        summary: "This is a mock blueprint generated without AI to test the UI.",
        operationalPhases: ["Planning", "Preparation", "Execution"],
        divisions: [
          {
            id: "div-1",
            name: "Event",
            pic: "Event Coordinator",
            color: "#6366f1",
            tasks: [
              {
                id: "task-1",
                title: "Create Rundown",
                description: "Draft detailed rundown",
                deadline: "D-14",
                priority: "high",
                status: "pending",
                dependencies: [],
                divisionId: "div-1"
              }
            ]
          }
        ],
        timeline: [
          {
            date: "D-30",
            milestone: "Kickoff meeting",
            phase: "Planning",
            responsible: "All"
          }
        ],
        manpowerEstimate: "MOCK: Needs around 10 people.",
        budgetAllocation: [
          { category: "Operational", estimate: "$1000", percentage: 100 }
        ],
        criticalPath: ["Create Rundown"],
        risks: [
          {
            id: "risk-1",
            scenario: "Power Outage",
            severity: "high",
            probability: "low",
            mitigation: "Rent a backup generator"
          }
        ]
      };
    } else {
      return {
        eventName: eventData.name || "Acara Mock",
        eventType: eventData.type || "Seminar",
        summary: "Ini adalah cetak biru mock yang dihasilkan tanpa AI untuk menguji UI.",
        operationalPhases: ["Perencanaan", "Persiapan", "Eksekusi"],
        divisions: [
          {
            id: "div-1",
            name: "Acara",
            pic: "Koordinator Acara",
            color: "#6366f1",
            tasks: [
              {
                id: "task-1",
                title: "Buat Rundown",
                description: "Susun rundown detail",
                deadline: "H-14",
                priority: "high",
                status: "pending",
                dependencies: [],
                divisionId: "div-1"
              }
            ]
          }
        ],
        timeline: [
          {
            date: "H-30",
            milestone: "Rapat Kickoff",
            phase: "Perencanaan",
            responsible: "Semua"
          }
        ],
        manpowerEstimate: "MOCK: Butuh sekitar 10 orang.",
        budgetAllocation: [
          { category: "Operasional", estimate: "Rp 10.000.000", percentage: 100 }
        ],
        criticalPath: ["Buat Rundown"],
        risks: [
          {
            id: "risk-1",
            scenario: "Listrik Mati",
            severity: "high",
            probability: "low",
            mitigation: "Sewa genset"
          }
        ]
      };
    }
  }

  const langInstruction = lang === 'en' 
    ? 'Write the entire response, including all text and descriptions, in English.'
    : 'Tulis seluruh respons, termasuk semua teks dan deskripsi, dalam Bahasa Indonesia.';

  // ── Scale-aware instructions ─────────────────────────────────────
  const scale = eventData.scale || 'medium';
  const currentDate = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const teamSize = eventData.teamSize || 20;
  const participants = eventData.participants || 100;

  let scaleInstructions: string;
  if (scale === 'small' || participants <= 50 || teamSize <= 5) {
    scaleInstructions = `
SCALE CONSTRAINT (Small Event — keep it lean):
- Create ONLY 1-2 divisions (maximum 2). Keep it simple.
- Each division should have 2-4 tasks only.
- Create 4-6 timeline milestones (shorter planning horizon).
- Identify 2-3 top risks only.
- Timeline should span H-14 to H-Day at most.
- This is a small/solo event — reflect that in your response complexity.`;
  } else if (scale === 'massive' || participants >= 500 || teamSize >= 50) {
    scaleInstructions = `
SCALE CONSTRAINT (Massive Event — be thorough):
- Create 6-8 divisions with specialized roles.
- Each division should have 4-6 tasks.
- Create 12-15 timeline milestones spanning H-90 to H+7.
- Identify 5-7 top risks.
- Budget allocations should be detailed with 6-8 categories.`;
  } else if (scale === 'large' || participants >= 200) {
    scaleInstructions = `
SCALE CONSTRAINT (Large Event):
- Create 5-6 divisions relevant to the event type.
- Each division should have 3-5 tasks.
- Create 8-12 timeline milestones.
- Identify 4-5 top risks.`;
  } else {
    scaleInstructions = `
SCALE CONSTRAINT (Medium Event):
- Create 3-4 divisions relevant to the event type.
- Each division should have 3-4 tasks.
- Create 6-9 timeline milestones.
- Identify 3-4 top risks.`;
  }

  // ── Web Research Context ────────────────────────────────────────
  // Priority 1: Use pre-fetched market context from onboarding (You.com Event Intelligence Brief)
  // Priority 2: Fall back to venue/vendor search if no market context provided
  let webResearchContext = "";

  if (marketContext) {
    // Pre-fetched from /api/ai/event-brief — no extra API call needed
    webResearchContext = `

## Market Intelligence (Real-time Web Data)
Berikut adalah data pasar terkini yang sudah diambil dari web untuk event type ini.
Gunakan data ini untuk memberikan estimasi budget yang realistis, rekomendasi yang relevan, dan risks yang spesifik:

${marketContext}

Pastikan summary, budget allocation, dan risks mencerminkan insight dari data di atas.`;
  } else if (eventData.venue && eventData.venue !== 'TBD') {
    // Fallback: fetch venue-specific data if no market context pre-fetched
    try {
      console.log(`Researching venue/vendor on You.com: ${eventData.venue}`);
      const researchData = await researchVenueOrVendor(`venue event ${eventData.venue} kapasitas ${participants}`, true);
      webResearchContext = `\nContext Riset Web (Venue/Vendor):\n${researchData}\nGunakan informasi di atas untuk memberikan rekomendasi venue atau vendor yang nyata dan relevan pada bagian summary, tasks, atau budget.`;
    } catch (e) {
      console.error("Failed to research venue:", e);
    }
  }

  const prompt = `
You are RunIt's AI operational intelligence engine. Generate a comprehensive event execution blueprint.
${langInstruction}

Event Details:
- Name: ${eventData.name}
- Type: ${eventData.type}
- Target Audience: ${eventData.audience}
- Scale: ${scale}
- Expected Participants: ${participants}
- Budget: ${eventData.budget || 'Flexible (to be determined)'}
- Timeline: ${eventData.timeline || 'To be confirmed'}
- Venue: ${eventData.venue || 'TBD'}
- Team Size: ${teamSize}
- Goals: ${eventData.goals}
- Constraints: ${eventData.constraints || 'None specified'}
- Current Date (Today): ${currentDate}
${webResearchContext}

${scaleInstructions}

Generate a detailed operational blueprint as a valid JSON object with this EXACT structure:
{
  "eventName": "string",
  "eventType": "string",
  "summary": "string (2-3 sentence executive summary)",
  "operationalPhases": ["phase1", "phase2", ...],
  "divisions": [
    {
      "id": "div-1",
      "name": "Division Name",
      "pic": "PIC Role",
      "color": "#6366f1",
      "tasks": [
        {
          "id": "task-1",
          "title": "Task Title",
          "description": "Task description",
          "deadline": "Real Date (e.g. 10 Jun 2026)",
          "priority": "high",
          "status": "pending",
          "dependencies": [],
          "divisionId": "div-1"
        }
      ]
    }
  ],
  "timeline": [
    {
      "date": "Real Date (e.g. 10 Jun 2026)",
      "milestone": "Milestone name",
      "phase": "Phase name",
      "responsible": "Division responsible"
    }
  ],
  "manpowerEstimate": "string describing manpower needed",
  "budgetAllocation": [
    {
      "category": "Category",
      "estimate": "Amount",
      "percentage": 25
    }
  ],
  "criticalPath": ["task description 1", "task description 2"],
  "risks": [
    {
      "id": "risk-1",
      "scenario": "Risk scenario",
      "severity": "high",
      "probability": "medium",
      "mitigation": "Mitigation strategy"
    }
  ]
}

Important:
- Budget allocations should sum to ~100%
- Colors for divisions: use hex colors from this palette: #6366f1, #8b5cf6, #06b6d4, #10b981, #f59e0b, #f43f5e, #ec4899
- TIMELINE DATES: Use REAL CALENDAR DATES (e.g., "DD MMM YYYY") for ALL task deadlines and timeline dates. Calculate these realistically starting from Today's Date (${currentDate}). Do NOT use "H-90" or "D-14" format.

Return ONLY the JSON object, no markdown, no explanation.
`;

  const text = await generateWithFallback(prompt, true);
  
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI blueprint response');
  }
}

export async function runDisruptionSimulation(
  eventData: Partial<EventData>,
  scenario: string,
  customScenario?: string,
  lang: 'en' | 'id' = 'en',
  precedentPromise?: Promise<import('./you').YouResearchResponse['output'] | null> | null
): Promise<SimulationResult> {
  const scenarioText = customScenario || scenario;
  
  const fallbackResult: SimulationResult = lang === 'en' ? {
    scenario: scenarioText,
    severity: "high",
    impactedAreas: ["Operational Flow", "Team Coordination"],
    immediateActions: [
      "Activate primary PIC for rapid response coordination",
      "Inform all related divisions regarding the change",
      "Stabilize affected area before continuing rundown",
    ],
    contingencyPlan: [
      "Prepare alternative options for the affected session",
      "Strengthen internal communication via main channel",
      "Update participants periodically to maintain trust",
      "Review timeline and adjust priority slots",
    ],
    timeImpact: "Estimated 20–40 minutes delay",
    affectedDivisions: ["Operations", "Event"],
  } : {
    scenario: scenarioText,
    severity: "high",
    impactedAreas: ["Alur Operasional", "Koordinasi Tim"],
    immediateActions: [
      "Aktifkan PIC utama untuk koordinasi respon cepat",
      "Informasikan perubahan kepada seluruh divisi terkait",
      "Stabilkan area terdampak sebelum melanjutkan rundown",
    ],
    contingencyPlan: [
      "Siapkan opsi alternatif untuk sesi terdampak",
      "Perkuat komunikasi internal via channel utama",
      "Update peserta secara berkala untuk menjaga kepercayaan",
      "Review timeline dan sesuaikan slot prioritas",
    ],
    timeImpact: "Estimasi delay 20–40 menit",
    affectedDivisions: ["Divisi Operasional", "Divisi Acara"],
  };
  
  if (!process.env.GEMINI_API_KEY) {
    return fallbackResult;
  }

  const langInstruction = lang === 'en' 
    ? 'Write the entire response, including all text and descriptions, in English.'
    : 'Tulis seluruh respons, termasuk semua teks dan deskripsi, dalam Bahasa Indonesia.';

  // ── Inject You.com real-world precedent if available ─────────────────────
  let precedentContext = '';
  if (precedentPromise) {
    try {
      const precedent = await precedentPromise;
      if (precedent?.content) {
        precedentContext = lang === 'id'
          ? `\n\n## Preseden Dunia Nyata (dari riset web)\nBerikut adalah contoh nyata kejadian serupa dan penanganannya di event besar. Gunakan sebagai referensi untuk membuat simulasi yang SPESIFIK dan REALISTIS:\n\n${precedent.content.slice(0, 1200)}\n`
          : `\n\n## Real-World Precedent (from web research)\nHere are real examples of similar incidents at major events and how they were handled. Use these as reference to make the simulation SPECIFIC and REALISTIC:\n\n${precedent.content.slice(0, 1200)}\n`;
      }
    } catch {
      // Ignore — precedent is optional enhancement
    }
  }

  const prompt = `
You are RunIt's operational simulation engine. Analyze this disruption scenario for an event.
${langInstruction}

Event: ${eventData.name} (${eventData.type})
Scale: ${eventData.scale}, Participants: ${eventData.participants}
Venue: ${eventData.venue}
Timeline: ${eventData.timeline}
${precedentContext}
DISRUPTION SCENARIO: ${scenarioText}

Analyze the impact and generate a contingency response as valid JSON:
{
  "scenario": "${scenarioText}",
  "severity": "critical",
  "impactedAreas": ["Area 1", "Area 2"],
  "immediateActions": [
    "Action 1 (first 5 minutes)",
    "Action 2",
    "Action 3"
  ],
  "contingencyPlan": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ...",
    "Step 4: ..."
  ],
  "timeImpact": "Estimated X minutes delay",
  "affectedDivisions": ["Division 1", "Division 2"]
}

Severity levels: low, medium, high, critical
Be specific, practical, and actionable. Reference the real-world precedent if provided. Use operational language.
Return ONLY the JSON object.
`;

  try {
    const text = await generateWithFallback(prompt, true);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return fallbackResult;
    }
  } catch (error) {
    console.warn('Simulation model error, falling back to mock result.', error);
    return fallbackResult;
  }
}

export async function generateIncidentResponse(
  eventData: Partial<EventData>,
  incident: string,
  lang: 'en' | 'id' = 'en'
): Promise<{ immediateActions: string[]; affectedDivisions: string[]; recommendation: string }> {
  
  const langInstruction = lang === 'en' 
    ? 'Write the entire response in English.'
    : 'Tulis seluruh respons dalam Bahasa Indonesia.';

  const prompt = `
You are RunIt's live incident response system. An incident has occurred during the event.
${langInstruction}

Event: ${eventData.name}
Incident: ${incident}

Generate an immediate response plan as JSON:
{
  "immediateActions": ["Action 1", "Action 2", "Action 3"],
  "affectedDivisions": ["Division 1"],
  "recommendation": "Brief operational recommendation paragraph"
}

Be direct, fast, and operational. Return ONLY the JSON.
`;

  const text = await generateWithFallback(prompt, true);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Failed to parse incident response');
  }
}

export async function generatePostEventReport(eventData: EventData, lang: 'en' | 'id' = 'en'): Promise<string> {
  const langInstruction = lang === 'en' 
    ? 'Generate a comprehensive post-event report in English.'
    : 'Generate a comprehensive post-event report (LPJ) in Bahasa Indonesia.';

  const prompt = `
You are RunIt's post-event intelligence system. ${langInstruction}

Event Details:
- Name: ${eventData.name}
- Type: ${eventData.type}
- Participants: ${eventData.participants}
- Budget: ${eventData.budget}
- Timeline: ${eventData.timeline}
- Goals: ${eventData.goals}

Simulations Run: ${eventData.simulations.length} scenarios
Live Updates: ${eventData.liveUpdates.length} updates

Generate a professional report covering:
1. Executive Summary
2. Goal Achievements (Pencapaian Tujuan)
3. Budget Realization (Realisasi Anggaran)
4. Execution Evaluation (Evaluasi Pelaksanaan)
5. Lessons Learned
6. Recommendations for Next Event

Write in a professional tone. Format with clear sections using markdown headers.
`;

  return await generateWithFallback(prompt);
}

export async function getAiCopilotAdvice(
  eventData: Partial<EventData>,
  question: string,
  context?: string,
  lang: 'en' | 'id' = 'en'
): Promise<string> {
  const langInstruction = lang === 'en' 
    ? 'Provide a concise, actionable operational response in English.'
    : 'Berikan respons operasional yang singkat dan dapat ditindaklanjuti dalam Bahasa Indonesia.';

  // Selalu cari konteks tambahan dari web untuk memperkaya jawaban
  let webResearchContext = "";
  try {
    console.log(`Copilot researching: ${question}`);
    const researchData = await researchVenueOrVendor(question);
    webResearchContext = `\nWeb Search Context:\n${researchData}\nGunakan informasi relevan dari web search jika menjawab pertanyaan.`;
  } catch (e) {
    console.error("Copilot search failed:", e);
  }

  const prompt = `
You are RunIt's AI operational copilot for live event execution.
${langInstruction}

Event: ${eventData.name} (${eventData.type})
Scale: ${eventData.scale}
${context ? `Current Context: ${context}` : ''}
${webResearchContext}

Team Question: ${question}

Response should be 2-4 sentences. Be direct and practical.
`;

  return await generateWithFallback(prompt);
}

export async function translateBlueprint(
  blueprint: any,
  targetLang: 'en' | 'id'
): Promise<any> {
  if (!process.env.GEMINI_API_KEY) {
    return blueprint;
  }
  
  const langInstruction = targetLang === 'en' 
    ? 'Translate the text values in this JSON object to English. Keep the exact same JSON structure, array sizes, keys, and IDs. DO NOT modify any IDs or format.'
    : 'Terjemahkan value teks di dalam objek JSON ini ke dalam Bahasa Indonesia. Pertahankan struktur JSON, jumlah item array, keys, dan ID agar persis sama. JANGAN ubah ID atau format aslinya.';

  const prompt = `
You are a highly accurate operational data translator.
${langInstruction}

JSON DATA TO TRANSLATE:
${JSON.stringify(blueprint, null, 2)}

Return ONLY the translated JSON object. Do not include any explanations or markdown.
`;

  try {
    const text = await generateWithFallback(prompt, true);
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to translate blueprint', error);
    return blueprint; // return original as fallback
  }
}

export async function resolveTaskWithAi(
  task: any, 
  eventData: any
): Promise<{
  steps: string[];
  draftMessage?: string;
  sourcingSummary: string;
  category?: TaskCategory;
  recommendations?: SourcingRecommendation[];
  estimatedCost?: string;
  confidenceScore?: number;
  negotiationTip?: string;
}> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      steps: ["Mock step 1", "Mock step 2"],
      category: 'internal',
      sourcingSummary: "Mock sourcing summary (No API Key)",
      confidenceScore: 0,
    };
  }

  const category = detectTaskCategory(task, eventData);
  const agentConfig = getAgentConfig(category);

  console.log(`[ResolveTask] Task "${task.title}" → category: ${category}, agent: ${agentConfig.category}`);

  // Phase 1: You.com Deep Research (livecrawl for vendor/venue/sponsor)
  let sourcingContext = "No web intel found.";
  try {
    const sourcingQuery = agentConfig.sourcingQueryTemplate(task, eventData);
    const { context } = await sourceForTaskCategory(sourcingQuery, category);
    if (context) {
      sourcingContext = context;
    }
  } catch (err) {
    console.warn(`[ResolveTask] You.com sourcing failed for category ${category}:`, err);
  }

  // Phase 2: Agent-specific Gemini resolution
  const prompt = agentConfig.resolutionPromptTemplate(task, eventData, sourcingContext);

  try {
    const text = await generateWithFallback(prompt, true);
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed) {
      return {
        steps: ["Unable to parse AI response. Please try again."],
        sourcingSummary: "Parsing error.",
        category,
        confidenceScore: 0,
      };
    }

    const recommendations = parsed.recommendations?.map((r: any) => ({
      name: r.name || '',
      address: r.address || '',
      reasoning: r.reasoning || '',
      rating: r.rating || '',
      estimatedCost: r.estimatedCost || undefined,
      sourceUrl: r.sourceUrl || undefined,
    })) || [];

    return {
      steps: parsed.steps || ["No steps generated."],
      draftMessage: parsed.draftMessage || undefined,
      sourcingSummary: parsed.sourcingSummary || 'No summary.',
      category,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      estimatedCost: parsed.estimatedCost || (recommendations[0]?.estimatedCost) || undefined,
      confidenceScore: recommendations.length > 0 ? 75 : 50,
      negotiationTip: parsed.negotiationTip || undefined,
    };
  } catch (error) {
    console.error('[ResolveTask] AI resolution failed:', error);
    return {
      steps: ["Error resolving task. Please try again."],
      sourcingSummary: `Error during AI resolution.`,
      category,
      confidenceScore: 0,
    };
  }
}

export async function resolveAllTasksBatch(
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    deadline: string;
    priority: string;
    divisionId: string;
    divisionName?: string;
  }>,
  eventData: any
): Promise<Array<{
  taskId: string;
  success: boolean;
  resolution?: Awaited<ReturnType<typeof resolveTaskWithAi>>;
  error?: string;
}>> {
  console.log(`[BatchResolve] Starting batch resolution for ${tasks.length} tasks`);

  return Promise.allSettled(
    tasks.map(async (task) => {
      try {
        const resolution = await resolveTaskWithAi(task, eventData);
        return { taskId: task.id, success: true, resolution };
      } catch (err: any) {
        return { taskId: task.id, success: false, error: err.message };
      }
    })
  ).then((results) =>
    results.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        taskId: '',
        success: false,
        error: result.reason?.message || 'Unknown parallel failure',
      };
    })
  );
}

// ── M5: Auto-Resolve Pipeline ──────────────────────────────

export interface AutoResolveTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: string;
  divisionId: string;
  divisionName?: string;
  category?: TaskCategory;
}

export interface AutoResolveResult {
  taskId: string;
  taskTitle: string;
  autoResolved: boolean;
  needsApproval: boolean;
  category?: TaskCategory;
  resolution?: Awaited<ReturnType<typeof resolveTaskWithAi>>;
  reason: string;
}

const APPROVAL_REQUIRED: TaskCategory[] = ['budget', 'crisis', 'program', 'permit'];

export async function runAutoResolvePipeline(
  tasks: AutoResolveTask[],
  eventData: any,
): Promise<AutoResolveResult[]> {
  const resolved: AutoResolveResult[] = [];

  if (tasks.length === 0) return resolved;

  const { autoTasks, approvalTasks } = tasks.reduce(
    (acc, t) => {
      const cat = t.category || detectTaskCategory(
        { title: t.title, description: t.description } as any,
        eventData,
      );
      if (APPROVAL_REQUIRED.includes(cat)) {
        acc.approvalTasks.push({ ...t, category: cat });
      } else {
        acc.autoTasks.push({ ...t, category: cat });
      }
      return acc;
    },
    { autoTasks: [] as AutoResolveTask[], approvalTasks: [] as AutoResolveTask[] },
  );

  if (autoTasks.length === 0 && approvalTasks.length === 0) return resolved;

  // Resolve auto-tasks in parallel
  if (autoTasks.length > 0) {
    const results = await Promise.allSettled(
      autoTasks.map(async (t) => {
        const resolution = await resolveTaskWithAi(t, eventData);
        return {
          taskId: t.id,
          taskTitle: t.title,
          autoResolved: true,
          needsApproval: false,
          category: t.category,
          resolution,
          reason: `Auto-resolved by ${t.category} agent via You.com livecrawl`,
        };
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        resolved.push(r.value);
      } else {
        resolved.push({
          taskId: '',
          taskTitle: '',
          autoResolved: false,
          needsApproval: false,
          category: 'internal',
          reason: r.reason?.message || 'Resolution failed',
        });
      }
    }
  }

  // Flag approval-needed tasks (no AI resolution yet, just mark)
  for (const t of approvalTasks) {
    // Still generate AI analysis for reference, but mark as needs human
    try {
      const resolution = await resolveTaskWithAi(t, eventData);
      resolved.push({
        taskId: t.id,
        taskTitle: t.title,
        autoResolved: false,
        needsApproval: true,
        category: t.category,
        resolution,
        reason: `Requires human approval — ${t.category} decisions need sign-off`,
      });
    } catch (err: any) {
      resolved.push({
        taskId: t.id,
        taskTitle: t.title,
        autoResolved: false,
        needsApproval: true,
        category: t.category,
        reason: `Requires human approval — AI analysis failed: ${err.message}`,
      });
    }
  }

  return resolved;
}
