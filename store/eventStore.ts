import { create } from 'zustand';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { DagTask, DivisionLoad, OCSResult, MitigationOption, PropagationResult } from '@/lib/dag-engine';

export type { DagTask, DivisionLoad, OCSResult, MitigationOption };

// ── Debounced Firestore auto-save ───────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSave(get: () => { currentEvent: EventData | null }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const user = auth.currentUser;
    const event = get().currentEvent;
    if (!user || !event) return;
    const eventRef = doc(db, 'users', user.uid, 'events', event.id);
    await setDoc(eventRef, event, { merge: true } as any);
  }, 800);
}

export type EventStage = 
  | 'initiation'
  | 'blueprint'
  | 'revision'
  | 'execution'
  | 'simulation'
  | 'live'
  | 'incident'
  | 'post-event';

export type OrganizerRole = 'solo' | 'chairman';

export interface ContactPIC {
  id: string;
  name: string;
  role: string; // e.g. "Kepala Divisi Acara"
  divisionId?: string;
  whatsapp?: string; // format: 628xxxxxxxxx
  telegram?: string; // @username or number
  email?: string;
}

export interface ExternalContact {
  id: string;
  name: string;
  category: 'vendor' | 'sponsor' | 'venue' | 'speaker' | 'other';
  whatsapp?: string;
  email?: string;
  notes?: string;
  communicationLog?: Array<{
    channel: 'whatsapp' | 'email' | 'telegram' | 'instagram';
    sentAt: string;
    taskId?: string;
    preview: string;
  }>;
}

export interface Division {
  id: string;
  name: string;
  pic: string;
  tasks: Task[];
  color: string;
  personnel?: number;
}

export type TaskCategory = 'internal' | 'venue' | 'vendor' | 'sponsor' | 'speaker' | 'catering' | 'equipment' | 'permit' | 'comms' | 'logistics' | 'program' | 'budget' | 'crisis';

export type DocumentType = 'rundown' | 'proposal' | 'checklist' | 'budget' | 'mc-script' | 'press-release' | 'technical-rider' | 'h1-checklist';

export interface RundownItem {
  id: string;
  time: string;
  activity: string;
  pic: string;
  duration: number;  // minutes
  notes: string;
}

export interface GeneratedDocument {
  id: string;
  type: DocumentType;
  title: string;
  taskId: string;
  content: {
    markdown: string;
    structured: any; // type-specific structured data
  };
  createdAt: string;
  status: 'draft' | 'final';
}

export interface BudgetLineItem {
  id: string;
  category: string;
  name: string;
  estimated: number;
  actual: number;
  notes: string;
  source: 'ai-blueprint' | 'ai-document' | 'manual';
  taskId?: string;
  status: 'pending' | 'paid' | 'over-budget' | 'on-track';
}

export interface BudgetTracker {
  items: BudgetLineItem[];
  totalEstimated: number;
  totalActual: number;
  contingencyPercent: number;
  lastUpdated: string;
}

export interface SourcingRecommendation {
  name: string;
  address: string;
  reasoning: string;
  rating: string;
  estimatedCost?: string;
  sourceUrl?: string;
}

export interface TaskSourcingResult {
  recommendations: SourcingRecommendation[];
  draftMessage: string;
  sourceUrls: string[];
  estimatedCost: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'delayed';
  dependencies: string[];
  divisionId: string;
  resolutionNotes?: string;
  attachments?: string[];
  category?: TaskCategory;
  sourcingResults?: TaskSourcingResult;
  linkedContactId?: string;
  confidenceScore?: number;
  resolveMethod?: 'ai-auto' | 'ai-manual' | 'manual';
  needsApproval?: boolean;
  generatedDocument?: GeneratedDocument;
}

export interface Blueprint {
  eventName: string;
  eventType: string;
  summary: string;
  operationalPhases: string[];
  divisions: Division[];
  timeline: TimelineItem[];
  manpowerEstimate: string;
  budgetAllocation: BudgetItem[];
  criticalPath: string[];
  risks: RiskItem[];
}

export interface TimelineItem {
  date: string;
  milestone: string;
  phase: string;
  responsible: string;
}

export interface BudgetItem {
  category: string;
  estimate: string;
  percentage: number;
}

export interface RiskItem {
  id: string;
  scenario: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface SimulationResult {
  scenario: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactedAreas: string[];
  immediateActions: string[];
  contingencyPlan: string[];
  timeImpact: string;
  affectedDivisions: string[];
}

export interface LiveUpdate {
  id: string;
  timestamp: string;
  type: 'update' | 'alert' | 'incident' | 'resolved';
  message: string;
  division?: string;
}

export interface ActiveIncident {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  injectedAt: string;
  taskId: string;
  delayMinutes: number;
  resolved: boolean;
}

export interface ExecutionState {
  dagTasks: DagTask[];
  divisionLoads: DivisionLoad[];
  ocs: OCSResult;
  criticalPath: string[];
  activeIncident: ActiveIncident | null;
  mitigationOptions: MitigationOption[];
  appliedMitigationId: string | null;
  timelineExtensionMinutes: number;
  unresolvedIncidentSeverity: number;
  isLive: boolean;
}

export interface EventData {
  id: string;
  name: string;
  type: string;
  audience: string;
  scale: string;
  participants: number;
  budget: string;
  timeline: string;
  venue: string;
  teamSize: number;
  goals: string;
  constraints: string;
  stage: EventStage;
  dataLanguage?: 'en' | 'id';
  // ── Role & Contacts (new) ──────────────────────────────────
  organizerRole?: OrganizerRole;  // 'solo' | 'chairman'
  picContacts?: ContactPIC[];     // Internal team PICs (for chairman mode)
  externalContacts?: ExternalContact[]; // Vendors, sponsors, etc.
  // ──────────────────────────────────────────────────────────
  blueprint?: Blueprint;
  simulations: SimulationResult[];
  liveUpdates: LiveUpdate[];
  execution?: ExecutionState;
  report?: string;
  agentActions: AgentAction[];
  budgetTracker?: BudgetTracker;
  reportModules?: Record<string, any>; // post-event generated modules
  createdAt: string;
}

export interface AgentAction {
  id: string;
  agentType: 'logistics' | 'program' | 'crisis' | 'comms' | 'procurement';
  title: string;
  description: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'dismissed';
  commsPayload?: {
    whatsappDraft?: string;
    emailDraft?: string;
    telegramDraft?: string;
    instagramDraft?: string;
    subject?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    recipientTelegram?: string;
    recipientInstagram?: string;
  };
  category?: 'venue' | 'vendor' | 'sponsor' | 'catering' | 'equipment' | 'permit' | 'comms' | 'other';
  recommendations?: { name: string; address: string; reasoning: string; rating: string }[];
  // Task context that triggered this action (new)
  triggeredByTaskId?: string;
  createdAt: string;
}

interface EventStore {
  currentEvent: EventData | null;
  events: EventData[];
  isAiLoading: boolean;
  aiError: string | null;

  // Basic actions
  setCurrentEvent: (event: EventData) => void;
  updateEventStage: (stage: EventStage) => void;
  updateBlueprint: (blueprint: Blueprint) => void;
  addSimulation: (result: SimulationResult) => void;
  addLiveUpdate: (update: LiveUpdate) => void;
  setAiLoading: (loading: boolean) => void;
  setAiError: (error: string | null) => void;
  createEvent: (data: Omit<EventData, 'id' | 'stage' | 'simulations' | 'liveUpdates' | 'createdAt'>) => string;
  clearCurrentEvent: () => void;
  loadUserEvents: () => Promise<EventData[]>;
  updateEventDataLanguage: (lang: 'en' | 'id') => void;
  // Contact & role actions
  updateOrganizerRole: (role: OrganizerRole) => void;
  addPicContact: (contact: ContactPIC) => void;
  removePicContact: (id: string) => void;
  addExternalContact: (contact: ExternalContact) => void;
  removeExternalContact: (id: string) => void;

  // Firestore sync (exposed)
  listenToEvent: (eventId: string) => Promise<(() => void) | undefined>;
  saveCurrentEvent: () => Promise<void>;

  // Duplicate event
  duplicateEvent: (sourceEventId: string, overrides: { name: string; timeline?: string; copyBlueprint: boolean; copyContacts: boolean }) => string | null;

  // Execution Engine actions
  updateTaskResolution: (taskId: string, notes: string, attachments?: string[]) => void;
  batchUpdateTasks: (updates: Array<{ taskId: string; notes: string; attachments?: string[]; category?: TaskCategory; sourcingResults?: TaskSourcingResult; confidenceScore?: number; resolveMethod?: 'ai-auto' | 'ai-manual' | 'manual' }>) => void;
  updateTaskCategory: (taskId: string, category: TaskCategory) => void;
  classifyAllTasks: (classifications: Array<{ taskId: string; category: TaskCategory }>) => void;
  applyAutoResolve: (results: Array<{ taskId: string; notes: string; category?: TaskCategory; sourcingResults?: TaskSourcingResult; confidenceScore?: number; needsApproval?: boolean; resolveMethod?: 'ai-auto' | 'ai-manual' | 'manual' }>) => void;
  setTaskDocument: (taskId: string, doc: GeneratedDocument) => void;
  logCommunication: (contactId: string, log: { channel: 'whatsapp' | 'email' | 'telegram' | 'instagram'; sentAt: string; taskId?: string; preview: string }) => void;
  initBudgetTracker: (items: BudgetLineItem[]) => void;
  updateBudgetItem: (itemId: string, updates: Partial<BudgetLineItem>) => void;
  addBudgetItem: (item: BudgetLineItem) => void;
  saveReportModules: (modules: Record<string, any>) => void;
  initializeExecution: (dagTasks: DagTask[], divisionLoads: DivisionLoad[], ocs: OCSResult, criticalPath: string[]) => void;
  updateDagTask: (taskId: string, updates: Partial<DagTask>) => void;
  applyPropagationResult: (result: PropagationResult) => void;
  setActiveIncident: (incident: ActiveIncident | null) => void;
  setMitigationOptions: (options: MitigationOption[]) => void;
  applyMitigationOption: (mitigationId: string, updatedTasks: DagTask[], newOCS: OCSResult) => void;
  resolveIncident: () => void;
  updateOCS: (ocs: OCSResult) => void;
  addDagTask: (task: DagTask) => void;
  updateReport: (reportText: string) => void;
  addAgentAction: (action: AgentAction) => void;
  updateAgentAction: (id: string, status: AgentAction['status']) => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  currentEvent: null,
  events: [],
  isAiLoading: false,
  aiError: null,

  // ── Firestore sync ───────────────────────────────────────────────────────
  listenToEvent: async (eventId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const eventRef = doc(db, 'users', user.uid, 'events', eventId);
    const unsubscribe = onSnapshot(eventRef, (snap) => {
      if (snap.exists()) {
        set({ currentEvent: snap.data() as EventData });
      }
    });
    return unsubscribe;
  },

  saveCurrentEvent: async () => {
    const user = auth.currentUser;
    const event = get().currentEvent;
    if (!user || !event) return;
    const eventRef = doc(db, 'users', user.uid, 'events', event.id);
    await setDoc(eventRef, event, { merge: true } as any);
  },

  // ── Basic Actions ────────────────────────────────────────────────────────
  setCurrentEvent: (event) => set({ currentEvent: event }),

  updateEventStage: (stage) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, stage } : null
  })),

  updateEventDataLanguage: (lang) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, dataLanguage: lang } : null
  })),

  updateBlueprint: (blueprint) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, blueprint } : null
  })),

  addSimulation: (result) => set(state => ({
    currentEvent: state.currentEvent
      ? { ...state.currentEvent, simulations: [...state.currentEvent.simulations, result] }
      : null
  })),

  addLiveUpdate: (update) => set(state => ({
    currentEvent: state.currentEvent
      ? { ...state.currentEvent, liveUpdates: [update, ...state.currentEvent.liveUpdates] }
      : null
  })),

  setAiLoading: (loading) => set({ isAiLoading: loading }),
  setAiError: (error) => set({ aiError: error }),

  createEvent: (data) => {
    const user = auth.currentUser;
    const id = `evt-${Date.now()}`;
    const { execution, report, ...restData } = data;
    const newEvent: EventData = {
      ...restData,
      id,
      stage: 'initiation',
      simulations: [],
      liveUpdates: [],
      agentActions: [],
      organizerRole: data.organizerRole || 'solo',
      picContacts: data.picContacts || [],
      externalContacts: data.externalContacts || [],
      createdAt: new Date().toISOString(),
    };
    if (user) {
      const eventRef = doc(db, 'users', user.uid, 'events', id);
      setDoc(eventRef, newEvent);
    }
    set(state => ({
      events: [...state.events, newEvent],
      currentEvent: newEvent,
    }));
    return id;
  },

  // ── Contact & Role Actions ───────────────────────────────────────────────
  updateOrganizerRole: (role) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, organizerRole: role } : null
  })),

  addPicContact: (contact) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      picContacts: [...(state.currentEvent.picContacts || []), contact]
    } : null
  })),

  removePicContact: (id) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      picContacts: (state.currentEvent.picContacts || []).filter(c => c.id !== id)
    } : null
  })),

  addExternalContact: (contact) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      externalContacts: [...(state.currentEvent.externalContacts || []), contact]
    } : null
  })),

  removeExternalContact: (id) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      externalContacts: (state.currentEvent.externalContacts || []).filter(c => c.id !== id)
    } : null
  })),

  clearCurrentEvent: () => set({ currentEvent: null }),

  loadUserEvents: async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const eventsCol = collection(db, 'users', user.uid, 'events');
    const snapshot = await getDocs(eventsCol);
    const evts: EventData[] = [];
    snapshot.forEach(docSnap => evts.push(docSnap.data() as EventData));
    set({ events: evts });
    return evts;
  },

  // ── Duplicate Event Action ────────────────────────────────────────
  duplicateEvent: (sourceEventId, overrides) => {
    const user = auth.currentUser;
    const state = get();
    const source = state.events.find(e => e.id === sourceEventId) ?? state.currentEvent;
    if (!source) return null;

    const newId = `evt-${Date.now()}`;
    const now = new Date().toISOString();

    // Deep-clone blueprint if requested, resetting task statuses
    let clonedBlueprint = overrides.copyBlueprint && source.blueprint
      ? {
          ...source.blueprint,
          divisions: source.blueprint.divisions.map(div => ({
            ...div,
            tasks: div.tasks.map(task => ({ ...task, status: 'pending' as const })),
          })),
        }
      : undefined;

    const { execution, report, ...sourceRest } = source;

    const newEvent: EventData = {
      ...sourceRest,
      id: newId,
      name: overrides.name,
      timeline: overrides.timeline || source.timeline,
      stage: 'blueprint' as EventStage,
      blueprint: clonedBlueprint,
      simulations: [],
      liveUpdates: [],
      agentActions: [],
      // Copy contacts if requested (editable after duplication)
      picContacts: overrides.copyContacts ? (source.picContacts ?? []).map(c => ({ ...c, id: `pic-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) : [],
      externalContacts: overrides.copyContacts ? (source.externalContacts ?? []).map(c => ({ ...c, id: `ext-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) : [],
      createdAt: now,
    };

    if (user) {
      const eventRef = doc(db, 'users', user.uid, 'events', newId);
      setDoc(eventRef, newEvent);
    }

    set(state => ({
      events: [...state.events, newEvent],
      currentEvent: newEvent,
    }));

    return newId;
  },

  // ── Execution Engine Actions ────────────────────────────────────
  updateTaskResolution: (taskId, notes, attachments) => {
    const state = get();
    if (!state.currentEvent?.execution) return;

    const newDagTasks = state.currentEvent.execution.dagTasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'done' as const, resolutionNotes: notes, attachments: attachments || t.attachments }
        : t
    );

    const newBlueprint: Blueprint | undefined = state.currentEvent.blueprint ? {
      ...state.currentEvent.blueprint,
      divisions: state.currentEvent.blueprint.divisions.map(div => ({
        ...div,
        tasks: div.tasks.map((t): Task =>
          t.id === taskId
            ? { ...t, status: 'done', resolutionNotes: notes, attachments: attachments || t.attachments }
            : t
        )
      }))
    } : undefined;

    set({
      currentEvent: {
        ...state.currentEvent,
        blueprint: newBlueprint || state.currentEvent.blueprint!,
        execution: {
          ...state.currentEvent.execution,
          dagTasks: newDagTasks
        }
      }
    });
  },

  batchUpdateTasks: (updates) => {
    const state = get();
    if (!state.currentEvent?.blueprint) return;

    const updateMap = new Map(updates.map(u => [u.taskId, u]));

    const newDivisions: Division[] = state.currentEvent.blueprint.divisions.map(div => ({
      ...div,
      tasks: div.tasks.map((t): Task => {
        const upd = updateMap.get(t.id);
        if (!upd) return t;
        return {
          ...t,
          status: 'done',
          resolutionNotes: upd.notes,
          attachments: upd.attachments || t.attachments,
          category: upd.category || t.category,
          sourcingResults: upd.sourcingResults || t.sourcingResults,
          confidenceScore: upd.confidenceScore,
          resolveMethod: upd.resolveMethod || t.resolveMethod,
        };
      }),
    }));

    const newBlueprint: Blueprint = {
      ...state.currentEvent.blueprint,
      divisions: newDivisions,
    };

    const newDagTasks = state.currentEvent.execution
      ? state.currentEvent.execution.dagTasks.map(t => {
          const upd = updateMap.get(t.id);
          return upd ? { ...t, status: 'done' as const, resolutionNotes: upd.notes } : t;
        })
      : undefined;

    set({
      currentEvent: {
        ...state.currentEvent,
        blueprint: newBlueprint,
        execution: state.currentEvent.execution && newDagTasks
          ? { ...state.currentEvent.execution, dagTasks: newDagTasks }
          : state.currentEvent.execution,
      },
    });
    debouncedSave(get);
  },

  updateTaskCategory: (taskId, category) => set(state => {
    if (!state.currentEvent?.blueprint) return state;
    const newBlueprint = {
      ...state.currentEvent.blueprint,
      divisions: state.currentEvent.blueprint.divisions.map(div => ({
        ...div,
        tasks: div.tasks.map(t => t.id === taskId ? { ...t, category } : t)
      }))
    };
    return { currentEvent: { ...state.currentEvent, blueprint: newBlueprint } };
  }),

  classifyAllTasks: (classifications) => set(state => {
    if (!state.currentEvent?.blueprint) return state;
    const classifyMap = new Map(classifications.map(c => [c.taskId, c.category]));
    const newBlueprint = {
      ...state.currentEvent.blueprint,
      divisions: state.currentEvent.blueprint.divisions.map(div => ({
        ...div,
        tasks: div.tasks.map(t => {
          const cat = classifyMap.get(t.id);
          return cat ? { ...t, category: cat } : t;
        })
      }))
    };
    return { currentEvent: { ...state.currentEvent, blueprint: newBlueprint } };
  }),

  setTaskDocument: (taskId, doc) => {
    const state = get();
    if (!state.currentEvent?.blueprint) return;
    const newDivisions: Division[] = state.currentEvent.blueprint.divisions.map(div => ({
      ...div,
      tasks: div.tasks.map((t): Task => t.id === taskId ? { ...t, generatedDocument: doc } : t),
    }));
    const newBlueprint: Blueprint = { ...state.currentEvent.blueprint, divisions: newDivisions };
    set({ currentEvent: { ...state.currentEvent, blueprint: newBlueprint } });
    debouncedSave(get);
  },

  logCommunication: (contactId, log) => {
    const state = get();
    if (!state.currentEvent?.externalContacts) return;
    const newContacts = state.currentEvent.externalContacts.map(c =>
      c.id === contactId
        ? { ...c, communicationLog: [...(c.communicationLog || []), log] }
        : c
    );
    set({ currentEvent: { ...state.currentEvent, externalContacts: newContacts } });
    debouncedSave(get);
  },

  initBudgetTracker: (items) => {
    const state = get();
    if (!state.currentEvent) return;
    if (state.currentEvent.budgetTracker) {
      state.currentEvent.budgetTracker.items
        .filter(i => i.source === 'ai-document')
        .forEach(i => {
          items.push(i);
        });
    }
    const totalEstimated = items.reduce((sum, i) => sum + (i.estimated || 0), 0);
    const tracker: BudgetTracker = {
      items,
      totalEstimated,
      totalActual: items.reduce((sum, i) => sum + (i.actual || 0), 0),
      contingencyPercent: 10,
      lastUpdated: new Date().toISOString(),
    };
    set({ currentEvent: { ...state.currentEvent, budgetTracker: tracker } });
    debouncedSave(get);
  },

  updateBudgetItem: (itemId, updates) => {
    const state = get();
    if (!state.currentEvent?.budgetTracker) return;
    const newItems = state.currentEvent.budgetTracker.items.map(i =>
      i.id === itemId ? { ...i, ...updates } : i
    );
    const totalActual = newItems.reduce((sum, i) => sum + (i.actual || 0), 0);
    set({
      currentEvent: {
        ...state.currentEvent,
        budgetTracker: {
          ...state.currentEvent.budgetTracker,
          items: newItems,
          totalActual,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
    debouncedSave(get);
  },

  addBudgetItem: (item) => {
    const state = get();
    if (!state.currentEvent) return;
    const currentTracker = state.currentEvent.budgetTracker;
    const items = currentTracker ? [...currentTracker.items, item] : [item];
    const tracker: BudgetTracker = {
      items,
      totalEstimated: items.reduce((sum, i) => sum + (i.estimated || 0), 0),
      totalActual: items.reduce((sum, i) => sum + (i.actual || 0), 0),
      contingencyPercent: currentTracker?.contingencyPercent || 10,
      lastUpdated: new Date().toISOString(),
    };
    set({ currentEvent: { ...state.currentEvent, budgetTracker: tracker } });
    debouncedSave(get);
  },

  applyAutoResolve: (results) => set(state => {
    if (!state.currentEvent?.blueprint) return state;
    const resultMap = new Map(results.map(r => [r.taskId, r]));

    const newDivisions: Division[] = state.currentEvent.blueprint.divisions.map(div => ({
      ...div,
      tasks: div.tasks.map((t): Task => {
        const r = resultMap.get(t.id);
        if (!r) return t;
        return {
          ...t,
          status: r.needsApproval ? t.status : 'done',
          resolutionNotes: r.needsApproval
            ? `${t.resolutionNotes || ''}\n\n⚠️ **Menunggu Approval** — Task ini butuh persetujuan manual.\n\n${r.notes}`.trim()
            : r.notes,
          category: r.category || t.category,
          sourcingResults: r.sourcingResults || t.sourcingResults,
          confidenceScore: r.confidenceScore,
          needsApproval: r.needsApproval || false,
          resolveMethod: r.resolveMethod || 'ai-auto',
        };
      }),
    }));

    const newBlueprint: Blueprint = {
      ...state.currentEvent.blueprint,
      divisions: newDivisions,
    };

    const newDagTasks = state.currentEvent.execution
      ? state.currentEvent.execution.dagTasks.map(t => {
          const r = resultMap.get(t.id);
          if (!r || r.needsApproval) return t;
          return { ...t, status: 'done' as const, resolutionNotes: r.notes };
        })
      : undefined;

    return {
      currentEvent: {
        ...state.currentEvent,
        blueprint: newBlueprint,
        execution: state.currentEvent.execution && newDagTasks
          ? { ...state.currentEvent.execution, dagTasks: newDagTasks }
          : state.currentEvent.execution,
      },
    };
  }),

  saveReportModules: (modules: Record<string, any>) => {
    const state = get();
    if (!state.currentEvent) return;
    set({ currentEvent: { ...state.currentEvent, reportModules: modules } });
    debouncedSave(get);
  },

  initializeExecution: (dagTasks, divisionLoads, ocs, criticalPath) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      stage: 'live',
      execution: {
        dagTasks,
        divisionLoads,
        ocs,
        criticalPath,
        activeIncident: null,
        mitigationOptions: [],
        appliedMitigationId: null,
        timelineExtensionMinutes: 0,
        unresolvedIncidentSeverity: 0,
        isLive: true,
      }
    } : null
  })),

  updateDagTask: (taskId, updates) => set(state => {
    if (!state.currentEvent?.execution) return {};
    const updatedTasks = state.currentEvent.execution.dagTasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    return {
      currentEvent: {
        ...state.currentEvent,
        execution: {
          ...state.currentEvent.execution,
          dagTasks: updatedTasks,
        }
      }
    };
  }),

  applyPropagationResult: (result) => set(state => {
    if (!state.currentEvent?.execution) return {};
    return {
      currentEvent: {
        ...state.currentEvent,
        execution: {
          ...state.currentEvent.execution,
          dagTasks: result.updatedTasks,
          criticalPath: result.criticalPath,
          ocs: result.newOCS,
          mitigationOptions: result.mitigationOptions,
          timelineExtensionMinutes: result.timelineExtensionMinutes,
        }
      }
    };
  }),

  setActiveIncident: (incident) => set(state => ({
    currentEvent: state.currentEvent?.execution ? {
      ...state.currentEvent,
      execution: {
        ...state.currentEvent.execution,
        activeIncident: incident,
        unresolvedIncidentSeverity: incident
          ? state.currentEvent.execution.unresolvedIncidentSeverity + (
            incident.severity === 'critical' ? 5 : incident.severity === 'high' ? 3 : 1
          )
          : state.currentEvent.execution.unresolvedIncidentSeverity,
      }
    } : state.currentEvent
  })),

  setMitigationOptions: (options) => set(state => ({
    currentEvent: state.currentEvent?.execution ? {
      ...state.currentEvent,
      execution: {
        ...state.currentEvent.execution,
        mitigationOptions: options,
      }
    } : state.currentEvent
  })),

  applyMitigationOption: (mitigationId, updatedTasks, newOCS) => set(state => {
    if (!state.currentEvent?.execution) return {};
    return {
      currentEvent: {
        ...state.currentEvent,
        execution: {
          ...state.currentEvent.execution,
          dagTasks: updatedTasks,
          ocs: newOCS,
          appliedMitigationId: mitigationId,
          mitigationOptions: [],
          activeIncident: null,
        }
      }
    };
  }),

  resolveIncident: () => set(state => ({
    currentEvent: state.currentEvent?.execution ? {
      ...state.currentEvent,
      execution: {
        ...state.currentEvent.execution,
        activeIncident: null,
        mitigationOptions: [],
        appliedMitigationId: null,
        timelineExtensionMinutes: 0,
      }
    } : state.currentEvent
  })),

  updateOCS: (ocs) => set(state => ({
    currentEvent: state.currentEvent?.execution ? {
      ...state.currentEvent,
      execution: {
        ...state.currentEvent.execution,
        ocs,
      }
    } : state.currentEvent
  })),

  addDagTask: (task) => set(state => {
    let updatedBlueprint = state.currentEvent?.blueprint;
    if (updatedBlueprint) {
      const targetDiv = updatedBlueprint.divisions.find(d => d.id === task.divisionId);
      if (targetDiv) {
        targetDiv.tasks.push({
          id: task.id,
          title: task.title,
          description: task.description,
          deadline: task.deadline || 'H-0',
          priority: task.priority,
          status: task.status,
          dependencies: task.dependencies,
          divisionId: task.divisionId,
        });
      }
    }

    if (!state.currentEvent) return state;

    return {
      currentEvent: {
        ...state.currentEvent,
        blueprint: updatedBlueprint,
        execution: state.currentEvent.execution ? {
          ...state.currentEvent.execution,
          dagTasks: [...state.currentEvent.execution.dagTasks, task],
        } : undefined
      }
    };
  }),

  updateReport: (reportText) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, report: reportText } : null
  })),

  addAgentAction: (action) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      agentActions: [action, ...(state.currentEvent.agentActions || [])]
    } : null
  })),

  updateAgentAction: (id, status) => set(state => ({
    currentEvent: state.currentEvent ? {
      ...state.currentEvent,
      agentActions: (state.currentEvent.agentActions || []).map(a =>
        a.id === id ? { ...a, status } : a
      )
    } : null
  })),
}));
