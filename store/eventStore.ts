import { create } from 'zustand';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import type { DagTask, DivisionLoad, OCSResult, MitigationOption, PropagationResult } from '@/lib/dag-engine';

export type { DagTask, DivisionLoad, OCSResult, MitigationOption };

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
}

export interface Division {
  id: string;
  name: string;
  pic: string;
  tasks: Task[];
  color: string;
  personnel?: number;
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
    subject?: string;
    // ── Recipient info (new) ─────────────────────────────────
    recipientName?: string;
    recipientPhone?: string;  // format: 628xxxxxxxxx
    recipientEmail?: string;
    recipientTelegram?: string;
    // ─────────────────────────────────────────────────────────
  };
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
  // Contact & role actions (new)
  updateOrganizerRole: (role: OrganizerRole) => void;
  addPicContact: (contact: ContactPIC) => void;
  removePicContact: (id: string) => void;
  addExternalContact: (contact: ExternalContact) => void;
  removeExternalContact: (id: string) => void;

  // Execution Engine actions
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
    await setDoc(eventRef, event);
  },

  // ── Basic Actions ────────────────────────────────────────────────────────
  setCurrentEvent: (event) => set({ currentEvent: event }),

  updateEventStage: (stage) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, stage } : null
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
    const newEvent: EventData = {
      ...data,
      id,
      stage: 'initiation',
      simulations: [],
      liveUpdates: [],
      execution: undefined,
      report: undefined,
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

  // ── Execution Engine Actions ─────────────────────────────────────────────

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
