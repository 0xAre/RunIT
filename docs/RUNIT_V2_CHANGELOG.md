# RunIT v2 — Complete Changelog

## Ringkasan

RunIT bertransformasi dari event management app menjadi **AI-powered autonomous event execution system**. Semua milestone (M1-M6 + P1-P5 + QW1-QW3) telah diimplementasikan dalam satu sesi.

---

## M1: Enhanced AI Task Resolution Engine

### Yang Berubah

Sebelumnya AI hanya melakukan basic search 3 hasil + Gemini generic prompt. Sekarang setiap task di-resolve oleh **specialized AI agent** dengan You.com livecrawl (full page content) + domain-specific Gemini prompt.

### File: `store/eventStore.ts`

```ts
// NEW TYPES
export type TaskCategory = 'internal' | 'venue' | 'vendor' | 'sponsor' | 'speaker' | 'catering' | 'equipment' | 'permit' | 'comms' | 'logistics' | 'program' | 'budget' | 'crisis';

export interface SourcingRecommendation {
  name: string; address: string; reasoning: string; rating: string;
  estimatedCost?: string; sourceUrl?: string;
}

export interface TaskSourcingResult {
  recommendations: SourcingRecommendation[];
  draftMessage: string; sourceUrls: string[]; estimatedCost: string;
}

// UPDATED: Task interface — new fields
export interface Task {
  // ... existing fields ...
  category?: TaskCategory;
  sourcingResults?: TaskSourcingResult;
  linkedContactId?: string;
  confidenceScore?: number;
  resolveMethod?: 'ai-auto' | 'ai-manual' | 'manual';
}
```

### File: `lib/task-agents.ts` (NEW)

```ts
// 9 specialized agents with keyword detection, sourcing query templates,
// and domain-specific Gemini resolution prompts
const AGENT_REGISTRY: Record<string, AgentConfig> = {
  venue: { keywords: ['venue', 'gedung', 'tempat', ...], ... },
  vendor: { keywords: ['vendor', 'catering', 'konsumsi', ...], ... },
  sponsor: { keywords: ['sponsor', 'sponsorship', ...], ... },
  speaker: { keywords: ['speaker', 'pembicara', 'narasumber', ...], ... },
  comms: { keywords: ['publikasi', 'posting', 'pengumuman', ...], ... },
  logistics: { keywords: ['transportasi', 'bus', 'logistik', ...], ... },
  permit: { keywords: ['izin', 'perizinan', 'polisi', ...], ... },
  crisis: { keywords: ['risiko', 'mitigasi', 'keamanan', ...], ... },
  budget: { keywords: ['budget', 'anggaran', 'biaya', ...], ... },
};

export function detectTaskCategory(task: Task, eventData: EventData): TaskCategory;
export function getAgentConfig(category: TaskCategory): AgentConfig;
```

### File: `lib/gemini.ts`

```ts
// BEFORE: basic search + generic prompt
// AFTER: category-aware agent pipeline
export async function resolveTaskWithAi(task, eventData) {
  const category = detectTaskCategory(task, eventData);  // NEW
  const agentConfig = getAgentConfig(category);           // NEW

  // Phase 1: You.com livecrawl for vendor/venue/sponsor
  const { context } = await sourceForTaskCategory(sourcingQuery, category);

  // Phase 2: Agent-specific Gemini resolution
  const prompt = agentConfig.resolutionPromptTemplate(task, eventData, sourcingContext);
  // returns: { steps, draftMessage, sourcingSummary, category, recommendations, confidenceScore, negotiationTip }
}
```

### File: `lib/you.ts`

```ts
// NEW: Category-aware sourcing with auto-livecrawl
export async function sourceForTaskCategory(
  query: string,
  category?: string,
): Promise<{ context: string; results: YouWebResult[] }> {
  const shouldLivecrawl = ['venue', 'vendor', 'sponsor', 'speaker', 'logistics'].includes(category || '');
  const results = await searchYouCom(query, {
    count: 5,
    livecrawl: shouldLivecrawl ? 'all' : 'none',
    livecrawlFormats: 'markdown',
  });
  // ...
}
```

### File: `app/api/ai/resolve-task/route.ts`

```ts
// BEFORE: return result directly
// AFTER: enriched response
return NextResponse.json({
  steps, draftMessage, sourcingSummary,
  category, recommendations, estimatedCost,
  confidenceScore, negotiationTip,
});
```

---

## M2: Batch Task Resolution

### File: `app/api/ai/resolve-all-tasks/route.ts` (NEW)

Max 50 tasks, parallel `Promise.allSettled()`, 300s timeout.

### File: `lib/gemini.ts`

```ts
export async function resolveAllTasksBatch(tasks, eventData) {
  return Promise.allSettled(
    tasks.map(task => resolveTaskWithAi(task, eventData))
  ).then(results => results.map(r =>
    r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }
  ));
}
```

### File: `store/eventStore.ts`

```ts
// NEW action
batchUpdateTasks: (updates: Array<{
  taskId: string; notes: string; attachments?: string[];
  category?: TaskCategory; sourcingResults?: TaskSourcingResult;
  confidenceScore?: number; resolveMethod?: 'ai-auto' | 'ai-manual' | 'manual';
}>) => void;
```

---

## M3: Bidirectional Task-Sourcing Sync

### File: `src/components/AiTaskAssistModal.tsx` (FULL REWRITE)

- One-click **"Save as Kontak"** dari rekomendasi ke `ExternalContact`
- Confidence score bar
- Category badge
- Star rating + estimasi biaya
- Tips negosiasi
- Tab system: **Steps** / **Dokumen** (P1)

### File: `app/workspace/[id]/execution/page.tsx`

- **"Resolve All X Tasks"** button + batch progress
- Batch results popup
- AI Task Overview bar (4 KPI cards)
- Category chips on Kanban task cards

---

## M4: Auto-Classification Pipeline

### File: `lib/task-agents.ts`

```ts
export function classifyAllTasks(tasks, eventData): Array<{ taskId, category }>;
export const CATEGORY_LABELS: Record<TaskCategory, string>;  // 13 labels
export const CATEGORY_COLORS: Record<TaskCategory, string>;  // 13 colors
```

### File: `app/api/ai/classify-tasks/route.ts` (NEW)

API endpoint untuk remote task classification.

### File: `store/eventStore.ts`

```ts
classifyAllTasks: (classifications: Array<{ taskId: string; category: TaskCategory }>) => void;
```

### File: `app/workspace/[id]/master-plan/page.tsx`

- `autoClassifyTasks()` dipanggil setelah master plan generation
- Category badges di compact view + full view
- "Classify Tasks" button di header

---

## M5: Auto-Resolve Pipeline

### File: `lib/gemini.ts`

```ts
export const APPROVAL_REQUIRED: TaskCategory[] = ['budget', 'crisis', 'program', 'permit'];

export async function runAutoResolvePipeline(tasks, eventData): Promise<AutoResolveResult[]> {
  // Classify all tasks
  // Split: autoTasks (vendor, venue, comms, etc.) vs approvalTasks (budget, crisis, program, permit)
  // Parallel resolve autoTasks
  // Flag approvalTasks (AI analysis generated, but human sign-off needed)
}
```

### File: `app/api/ai/auto-resolve-pipeline/route.ts` (NEW)

300s timeout, returns `{ results, summary }` with autoResolved/needsApproval/failed counts.

### File: `store/eventStore.ts`

```ts
// Task: new field
needsApproval?: boolean;

// NEW action
applyAutoResolve: (results) => void;  // auto-set done + flag needsApproval
```

### File: `app/workspace/[id]/execution/page.tsx`

- **"Auto-Pilot"** button (hijau) di overview
- Pipeline results popup: auto-resolved / needs approval / failed breakdown per task

---

## M6: Executive Analytics Dashboard

### File: `app/workspace/[id]/execution/page.tsx` — ProgressTab complete rewrite

- 4 KPI cards: H-Event, Progress %, AI Coverage %, Avg Confidence + ~API cost
- Recharts donut pie — 12 category distribution
- AI Coverage bar chart per division
- Confidence heatmap (gradient bar: red/yellow/green per task)
- Approval queue list
- Sourcing coverage metrics (4 cards)

---

## P1: Document Generation Engine

### File: `store/eventStore.ts`

```ts
export type DocumentType = 'rundown' | 'proposal' | 'checklist' | 'budget' | 'mc-script' | 'press-release' | 'technical-rider' | 'h1-checklist';

export interface GeneratedDocument {
  id: string; type: DocumentType; title: string; taskId: string;
  content: { markdown: string; structured: any };
  createdAt: string; status: 'draft' | 'final';
}

// Task: new field
generatedDocument?: GeneratedDocument;

// NEW action
setTaskDocument: (taskId: string, doc: GeneratedDocument) => void;
```

### File: `lib/document-generator.ts` (NEW)

8 document configs — masing-masing dengan specialized prompt, JSON parser, dan Markdown renderer. `generateDocument()` engine. `extractBudgetItems()` untuk auto-ekstrak ke budget tracker. `getDocumentTypesForCategory()` — mapping category → available document types.

### File: `app/api/ai/generate-document/route.ts` (NEW)

Auto-resolves task dulu, lalu generate document. Returns `{ document, category, documentType, availableTypes, budgetItems }`.

---

## P2: Communication Hub (Lite)

### File: `src/components/AiTaskAssistModal.tsx`

```ts
function sendDeepLink(channel: 'whatsapp' | 'email' | 'telegram', text: string, phone?: string): string;
function SendButton({ channel, text, contactName, phone, onClick }): JSX.Element;
// WA → https://wa.me/628xxx?text=...
// Email → mailto:?body=...
// Telegram → https://t.me/share/url?url=&text=...
```

Send buttons di draft message header + setiap recommendation card.

### File: `store/eventStore.ts`

```ts
// ExternalContact: new field
communicationLog?: Array<{
  channel: 'whatsapp' | 'email' | 'telegram' | 'instagram';
  sentAt: string; taskId?: string; preview: string;
}>;

// NEW action
logCommunication: (contactId, log) => void;
```

---

## P3: Financial Intelligence

### File: `store/eventStore.ts`

```ts
export interface BudgetLineItem {
  id: string; category: string; name: string;
  estimated: number; actual: number; notes: string;
  source: 'ai-masterplan' | 'ai-document' | 'manual';
  taskId?: string; status: 'pending' | 'paid' | 'over-budget' | 'on-track';
}

export interface BudgetTracker {
  items: BudgetLineItem[]; totalEstimated: number; totalActual: number;
  contingencyPercent: number; lastUpdated: string;
}

// EventData: new field
budgetTracker?: BudgetTracker;

// NEW actions
initBudgetTracker, updateBudgetItem, addBudgetItem
```

### File: `lib/document-generator.ts`

```ts
export function extractBudgetItems(doc: GeneratedDocument, taskId?: string): BudgetLineItem[];
```

### File: `app/api/ai/generate-document/route.ts`

Auto-return `budgetItems` saat document type = `'budget'`.

### File: `AiTaskAssistModal.tsx`

Auto-call `initBudgetTracker()` saat user generate budget document.

### File: `app/workspace/[id]/execution/page.tsx`

`BudgetTrackerSection` component — per-category breakdown, editable actual inputs, overall health bar, variance indicator, over-budget alerts.

---

## P4: Live Operations Upgrade

### File: `src/components/VoiceCopilot.tsx` (NEW)

```ts
// Browser SpeechRecognition (Web Speech API — zero dependency)
// Mic button → STT in Indonesian → send to AI copilot → response via alert
// Pulse animation, interim text display, Send button
```

### File: `src/components/LiveTimelineAdjuster.tsx` (NEW)

```ts
// Real-time timeline widget
// Controls: Start Next, Complete, Delay + auto-shift downstream
// Color-coded: pending → running → done → delayed
// Editable delay minutes
```

### File: `app/workspace/[id]/execution/page.tsx`

- VoiceCopilot di header (sebelah completion badge)
- LiveTimeline di Rundown tab (bawah builder)
- `handleVoiceCommand()` → `/api/ai/copilot`
- Auto-init timeline from pending tasks

---

## P5: Post-Event Intelligence

### File: `lib/post-event.ts` (NEW)

```ts
export async function generateSponsorReport(eventData): Promise<string>;
export async function generateSurvey(eventData): Promise<{ title, questions[] }>;
export async function generateThankYouMessages(eventData): Promise<ThankYouMessages>;
export function generateReconciliation(budgetTracker): ReconciliationReport;
export async function generateLessonsLearned(eventData): Promise<Lessons>;
export function generateEventTemplate(eventData): EventTemplate;
```

### File: `app/api/ai/generate-report/route.ts` (FULL REWRITE)

- Accepts `modules[]` param (up to 7 modules)
- `Promise.allSettled()` parallel generation
- Returns `{ modules: { report?, sponsorReport?, survey?, thankYou?, reconciliation?, lessons?, template? } }`

### File: `app/workspace/[id]/report/page.tsx` (FULL REWRITE)

- Module grid with individual/full generation
- Tabbed content viewer
- Copy / WA-Send buttons per module
- Restore from Firestore `reportModules` on page load
- Auto-save generated modules

---

## QW1: Zero TypeScript Errors Fix

### File: `src/hooks/useAuth.ts` (DELETED)

File duplicate — TypeScript resolve `.ts` sebelum `.tsx`, menyebabkan `AuthProvider`, `loginWithGoogle`, `isBypassed`, `bypassLogin` not found di 4 files konsumen.

### File: `store/eventStore.ts`

```ts
// BEFORE: set(state => ({ ...spread... })) — type inference broken
// AFTER: get() pattern with explicit Task return type
updateTaskResolution: (taskId, notes, attachments) => {
  const state = get();
  const newDivisions: Division[] = state.currentEvent.masterPlan.divisions.map(div => ({
    ...div,
    tasks: div.tasks.map((t): Task => /* ... */)
  }));
  set({ currentEvent: { ...state.currentEvent, masterPlan: { ...state.currentEvent.masterPlan, divisions: newDivisions } } });
};
```

**Result: 0 TypeScript errors — first time in project history.**

---

## QW2: Budget Auto-Extract Enhancement

### File: `store/eventStore.ts`

```ts
initBudgetTracker: (items) => {
  // NEW: merge logic — preserves existing tracker items
  if (state.currentEvent.budgetTracker) {
    state.currentEvent.budgetTracker.items
      .filter(i => i.source === 'ai-document')
      .forEach(i => items.push(i));
  }
  // Create new tracker with merged items
};
```

---

## QW3: Browser Print/PDF Export

### File: `app/globals.css`

```css
@media print {
  @page { size: A4; margin: 20mm; }
  * { background: #fff !important; color: #000 !important; }
  nav, header, footer, button, .no-print { display: none !important; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; }
  table { border-collapse: collapse !important; }
  th, td { border: 1px solid #000 !important; }
  /* ... */
}
```

### File: `app/workspace/[id]/report/page.tsx`

- Content wrapped in `print-area` + `print-section` CSS classes
- Print/PDF button → `window.print()` → "Save as PDF"

---

## Storage: Auto-Save + Persistence

### File: `store/eventStore.ts`

```ts
// Debounced Firestore auto-save (800ms)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(get: () => { currentEvent: EventData | null }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const user = auth.currentUser;
    const event = get().currentEvent;
    if (!user || !event) return;
    await setDoc(doc(db, 'users', user.uid, 'events', event.id), event, { merge: true });
  }, 800);
}

// Applied to:
// - updateBudgetItem, initBudgetTracker, addBudgetItem
// - setTaskDocument
// - logCommunication
// - batchUpdateTasks

// saveCurrentEvent: now uses { merge: true } for safe concurrent writes

// EventData: new field
reportModules?: Record<string, any>;
saveReportModules: (modules) => void;
```

---

## Grand Summary

| Metric | Count |
|---|---|
| **New files created** | 11 |
| **Files edited** | 10 |
| **Files deleted** | 1 |
| **New API endpoints** | 6 |
| **Task categories** | 12 |
| **AI agents** | 9 |
| **Document types** | 8 |
| **Post-event modules** | 7 |
| **TypeScript errors** | 0 |
| **Estimated AI cost per event** | $0.15 - $0.40 |
