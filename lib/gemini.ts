import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Blueprint, SimulationResult, EventData } from '@/store/eventStore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

export async function generateEventBlueprint(eventData: Partial<EventData>, lang: 'en' | 'id' = 'en'): Promise<Blueprint> {
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

  const prompt = `
You are RunIt's AI operational intelligence engine. Generate a comprehensive event execution blueprint.
${langInstruction}

Event Details:
- Name: ${eventData.name}
- Type: ${eventData.type}
- Target Audience: ${eventData.audience}
- Scale: ${eventData.scale}
- Expected Participants: ${eventData.participants}
- Budget: ${eventData.budget}
- Timeline: ${eventData.timeline}
- Venue: ${eventData.venue}
- Team Size: ${eventData.teamSize}
- Goals: ${eventData.goals}
- Constraints: ${eventData.constraints}

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
          "deadline": "Week X / Date",
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
      "date": "H-30 / D-30",
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
- Create 5-7 divisions relevant to the event type
- Each division should have 3-5 tasks
- Create 8-12 timeline milestones
- Identify 3-5 top risks
- Budget allocations should sum to ~100%
- Colors for divisions: use hex colors from this palette: #6366f1, #8b5cf6, #06b6d4, #10b981, #f59e0b, #f43f5e, #ec4899

Return ONLY the JSON object, no markdown, no explanation.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
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
  lang: 'en' | 'id' = 'en'
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

  const prompt = `
You are RunIt's operational simulation engine. Analyze this disruption scenario for an event.
${langInstruction}

Event: ${eventData.name} (${eventData.type})
Scale: ${eventData.scale}, Participants: ${eventData.participants}
Venue: ${eventData.venue}
Timeline: ${eventData.timeline}

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
Be specific, practical, and actionable. Use operational language.
Return ONLY the JSON object.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
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

  const result = await model.generateContent(prompt);
  return result.response.text();
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

  const prompt = `
You are RunIt's AI operational copilot for live event execution.
${langInstruction}

Event: ${eventData.name} (${eventData.type})
Scale: ${eventData.scale}
${context ? `Current Context: ${context}` : ''}

Team Question: ${question}

Response should be 2-4 sentences. Be direct and practical.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
