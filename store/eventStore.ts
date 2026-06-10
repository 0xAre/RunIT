import { create } from 'zustand';
import { doc, setDoc, onSnapshot, collection, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { normalizeEvent } from '@/lib/normalize-event';
import type { DagTask, DivisionLoad, OCSResult, MitigationOption, PropagationResult } from '@/lib/dag-engine';

export type { DagTask, DivisionLoad, OCSResult, MitigationOption };

// ── Debounced Firestore auto-save ───────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function eventDocRef(event: EventData) {
  const ownerId = event.ownerId || auth.currentUser?.uid;
  if (!ownerId) throw new Error('No owner for event');
  return doc(db, 'users', ownerId, 'events', event.id);
}

function debouncedSave(get: () => { currentEvent: EventData | null }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const user = auth.currentUser;
    const event = get().currentEvent;
    if (!user || !event) return;
    await setDoc(eventDocRef(event), event, { merge: true } as any);
  }, 800);
}

export type EventStage = 
  | 'initiation'
  | 'masterplan'
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

export type EventMemberRole = 'owner' | 'editor' | 'viewer';

export interface EventMember {
  uid?: string;
  email: string;
  role: EventMemberRole;
  divisionId?: string;
  invitedAt?: string;
}

export interface CommsLogEntry {
  id: string;
  channel: 'whatsapp' | 'email' | 'telegram' | 'instagram';
  sentAt: string;
  recipientName: string;
  recipientContact?: string;
  preview: string;
  taskId?: string;
  contactId?: string;
  sentByUid?: string;
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
  source: 'ai-masterplan' | 'ai-document' | 'manual';
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

export interface MasterPlan {
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
  masterPlan?: MasterPlan;
  simulations: SimulationResult[];
  liveUpdates: LiveUpdate[];
  execution?: ExecutionState;
  report?: string;
  agentActions: AgentAction[];
  budgetTracker?: BudgetTracker;
  reportModules?: Record<string, any>; // post-event generated modules
  /** Event owner Firebase uid (path: users/{ownerId}/events/{id}) */
  ownerId?: string;
  members?: EventMember[];
  /** Denormalized for Firestore security rules */
  memberUids?: string[];
  editorUids?: string[];
  commsLog?: CommsLogEntry[];
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
  updateMasterPlan: (masterPlan: MasterPlan) => void;
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
  logCommsEntry: (entry: Omit<CommsLogEntry, 'id'>) => void;
  addMember: (member: Omit<EventMember, 'invitedAt'>) => Promise<void>;
  removeMember: (email: string) => Promise<void>;
  updateMemberRole: (email: string, role: EventMemberRole) => Promise<void>;
  acceptTeamInvite: (eventId: string, ownerId: string) => Promise<boolean>;

  // Firestore sync (exposed)
  listenToEvent: (eventId: string) => Promise<(() => void) | undefined>;
  saveCurrentEvent: () => Promise<void>;

  // Duplicate event
  duplicateEvent: (sourceEventId: string, overrides: { name: string; timeline?: string; copyMasterPlan: boolean; copyContacts: boolean }) => string | null;

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

    let ownerId = user.uid;
    const membershipRef = doc(db, 'eventMemberships', user.uid, 'refs', eventId);
    const membershipSnap = await getDoc(membershipRef);
    if (membershipSnap.exists()) {
      ownerId = (membershipSnap.data() as { ownerId: string }).ownerId;
    }

    const eventRef = doc(db, 'users', ownerId, 'events', eventId);
    const unsubscribe = onSnapshot(eventRef, (snap) => {
      if (snap.exists()) {
        const data = normalizeEvent(snap.data() as Record<string, unknown>);
        set({ currentEvent: { ...data, ownerId: data.ownerId || ownerId } });
      }
    });
    return unsubscribe;
  },

  saveCurrentEvent: async () => {
    const user = auth.currentUser;
    const event = get().currentEvent;
    if (!user || !event) return;
    await setDoc(eventDocRef(event), event, { merge: true } as any);
  },

  // ── Basic Actions ────────────────────────────────────────────────────────
  setCurrentEvent: (event) => set({ currentEvent: event }),

  updateEventStage: (stage) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, stage } : null
  })),

  updateEventDataLanguage: (lang) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, dataLanguage: lang } : null
  })),

  updateMasterPlan: (masterPlan) => set(state => ({
    currentEvent: state.currentEvent ? { ...state.currentEvent, masterPlan } : null
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
    const ownerMember: EventMember = {
      uid: user?.uid,
      email: user?.email || '',
      role: 'owner',
      invitedAt: new Date().toISOString(),
    };
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
      ownerId: user?.uid,
      members: [ownerMember],
      memberUids: user ? [user.uid] : [],
      editorUids: user ? [user.uid] : [],
      commsLog: [],
      createdAt: new Date().toISOString(),
    };
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'events', id), newEvent);
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

  logCommsEntry: (entry) => {
    const state = get();
    if (!state.currentEvent) return;
    const logEntry: CommsLogEntry = {
      ...entry,
      id: `comms-${Date.now()}`,
      sentByUid: auth.currentUser?.uid,
    };
    set({
      currentEvent: {
        ...state.currentEvent,
        commsLog: [...(state.currentEvent.commsLog || []), logEntry],
      },
    });
    debouncedSave(get);
  },

  addMember: async (member) => {
    const state = get();
    const user = auth.currentUser;
    const event = state.currentEvent;
    if (!user || !event) return;

    const email = member.email.trim().toLowerCase();
    if (!email) return;

    const members = [...(event.members || [])];
    if (members.some(m => m.email.toLowerCase() === email)) return;

    const invited: EventMember = {
      ...member,
      email,
      invitedAt: new Date().toISOString(),
    };
    if (member.uid) {
      invited.uid = member.uid;
    } else if (email === user.email?.toLowerCase()) {
      invited.uid = user.uid;
    }

    const memberUids = [...(event.memberUids || [])];
    const editorUids = [...(event.editorUids || [])];
    if (invited.uid && !memberUids.includes(invited.uid)) {
      memberUids.push(invited.uid);
      if (invited.role === 'owner' || invited.role === 'editor') {
        if (!editorUids.includes(invited.uid)) editorUids.push(invited.uid);
      }
      await setDoc(
        doc(db, 'eventMemberships', invited.uid, 'refs', event.id),
        { ownerId: event.ownerId || user.uid, role: invited.role, eventName: event.name, invitedAt: invited.invitedAt },
        { merge: true } as any
      );
    }

    const updated: EventData = {
      ...event,
      members: [...members, invited],
      memberUids,
      editorUids,
    };
    set({ currentEvent: updated });
    await setDoc(eventDocRef(updated), updated, { merge: true } as any);
  },

  removeMember: async (email) => {
    const state = get();
    const event = state.currentEvent;
    if (!event) return;

    const target = (event.members || []).find(m => m.email.toLowerCase() === email.toLowerCase());
    if (!target || target.role === 'owner') return;

    const members = (event.members || []).filter(m => m.email.toLowerCase() !== email.toLowerCase());
    let memberUids = [...(event.memberUids || [])];
    let editorUids = [...(event.editorUids || [])];
    if (target.uid) {
      memberUids = memberUids.filter(id => id !== target.uid);
      editorUids = editorUids.filter(id => id !== target.uid);
    }

    const updated: EventData = { ...event, members, memberUids, editorUids };
    set({ currentEvent: updated });
    await setDoc(eventDocRef(updated), updated, { merge: true } as any);
    if (target.uid) {
      await deleteDoc(doc(db, 'eventMemberships', target.uid, 'refs', event.id));
    }
  },

  updateMemberRole: async (email, role) => {
    const state = get();
    const event = state.currentEvent;
    if (!event) return;

    const members = (event.members || []).map(m =>
      m.email.toLowerCase() === email.toLowerCase() ? { ...m, role } : m
    );
    let editorUids = [...(event.editorUids || [])];
    const target = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (target?.uid) {
      if (role === 'editor' || role === 'owner') {
        if (!editorUids.includes(target.uid)) editorUids.push(target.uid);
      } else {
        editorUids = editorUids.filter(id => id !== target.uid);
      }
      await setDoc(
        doc(db, 'eventMemberships', target.uid, 'refs', event.id),
        { role },
        { merge: true } as any
      );
    }

    const updated: EventData = { ...event, members, editorUids };
    set({ currentEvent: updated });
    await setDoc(eventDocRef(updated), updated, { merge: true } as any);
  },

  acceptTeamInvite: async (eventId, ownerId) => {
    const user = auth.currentUser;
    if (!user?.email) return false;

    const eventRef = doc(db, 'users', ownerId, 'events', eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) return false;

    const event = normalizeEvent(snap.data() as Record<string, unknown>);
    const email = user.email.toLowerCase();
    const members = [...(event.members || [])];
    const idx = members.findIndex(m => m.email.toLowerCase() === email);
    if (idx === -1) return false;

    members[idx] = { ...members[idx], uid: user.uid };
    const memberUids = [...new Set([...(event.memberUids || []), user.uid])];
    const editorUids = [...(event.editorUids || [])];
    const role = members[idx].role;
    if ((role === 'editor' || role === 'owner') && !editorUids.includes(user.uid)) {
      editorUids.push(user.uid);
    }

    const updated: EventData = {
      ...event,
      ownerId: event.ownerId || ownerId,
      members,
      memberUids,
      editorUids,
    };

    await setDoc(eventRef, updated, { merge: true } as any);
    await setDoc(
      doc(db, 'eventMemberships', user.uid, 'refs', eventId),
      { ownerId, role, eventName: event.name, invitedAt: new Date().toISOString() },
      { merge: true } as any
    );

    if (get().currentEvent?.id === eventId) {
      set({ currentEvent: updated });
    }
    return true;
  },

  clearCurrentEvent: () => set({ currentEvent: null }),

  loadUserEvents: async () => {
    const user = auth.currentUser;
    if (!user) return [];

    const evts: EventData[] = [];
    const seen = new Set<string>();

    const ownCol = collection(db, 'users', user.uid, 'events');
    const ownSnap = await getDocs(ownCol);
    ownSnap.forEach(docSnap => {
      const evt = normalizeEvent(docSnap.data() as Record<string, unknown>);
      evt.ownerId = evt.ownerId || user.uid;
      evts.push(evt);
      seen.add(evt.id);
    });

    const membershipCol = collection(db, 'eventMemberships', user.uid, 'refs');
    const membershipSnap = await getDocs(membershipCol);
    for (const memDoc of membershipSnap.docs) {
      const { ownerId } = memDoc.data() as { ownerId: string };
      const eventId = memDoc.id;
      if (seen.has(eventId)) continue;
      const sharedRef = doc(db, 'users', ownerId, 'events', eventId);
      const sharedSnap = await getDoc(sharedRef);
      if (sharedSnap.exists()) {
        const evt = normalizeEvent(sharedSnap.data() as Record<string, unknown>);
        evt.ownerId = evt.ownerId || ownerId;
        evts.push(evt);
        seen.add(eventId);
      }
    }

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

    // Deep-clone masterPlan if requested, resetting task statuses
    let clonedMasterPlan = overrides.copyMasterPlan && source.masterPlan
      ? {
          ...source.masterPlan,
          divisions: source.masterPlan.divisions.map(div => ({
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
      stage: 'masterplan' as EventStage,
      masterPlan: clonedMasterPlan,
      simulations: [],
      liveUpdates: [],
      agentActions: [],
      picContacts: overrides.copyContacts ? (source.picContacts ?? []).map(c => ({ ...c, id: `pic-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) : [],
      externalContacts: overrides.copyContacts ? (source.externalContacts ?? []).map(c => ({ ...c, id: `ext-${Date.now()}-${Math.random().toString(36).slice(2,6)}` })) : [],
      ownerId: user?.uid,
      members: user ? [{ uid: user.uid, email: user.email || '', role: 'owner' as const, invitedAt: now }] : [],
      memberUids: user ? [user.uid] : [],
      editorUids: user ? [user.uid] : [],
      commsLog: [],
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

    const newMasterPlan: MasterPlan | undefined = state.currentEvent.masterPlan ? {
      ...state.currentEvent.masterPlan,
      divisions: state.currentEvent.masterPlan.divisions.map(div => ({
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
        masterPlan: newMasterPlan || state.currentEvent.masterPlan!,
        execution: {
          ...state.currentEvent.execution,
          dagTasks: newDagTasks
        }
      }
    });
  },

  batchUpdateTasks: (updates) => {
    const state = get();
    if (!state.currentEvent?.masterPlan) return;

    const updateMap = new Map(updates.map(u => [u.taskId, u]));

    const newDivisions: Division[] = state.currentEvent.masterPlan.divisions.map(div => ({
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

    const newMasterPlan: MasterPlan = {
      ...state.currentEvent.masterPlan,
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
        masterPlan: newMasterPlan,
        execution: state.currentEvent.execution && newDagTasks
          ? { ...state.currentEvent.execution, dagTasks: newDagTasks }
          : state.currentEvent.execution,
      },
    });
    debouncedSave(get);
  },

  updateTaskCategory: (taskId, category) => set(state => {
    if (!state.currentEvent?.masterPlan) return state;
    const newMasterPlan = {
      ...state.currentEvent.masterPlan,
      divisions: state.currentEvent.masterPlan.divisions.map(div => ({
        ...div,
        tasks: div.tasks.map(t => t.id === taskId ? { ...t, category } : t)
      }))
    };
    return { currentEvent: { ...state.currentEvent, masterPlan: newMasterPlan } };
  }),

  classifyAllTasks: (classifications) => set(state => {
    if (!state.currentEvent?.masterPlan) return state;
    const classifyMap = new Map(classifications.map(c => [c.taskId, c.category]));
    const newMasterPlan = {
      ...state.currentEvent.masterPlan,
      divisions: state.currentEvent.masterPlan.divisions.map(div => ({
        ...div,
        tasks: div.tasks.map(t => {
          const cat = classifyMap.get(t.id);
          return cat ? { ...t, category: cat } : t;
        })
      }))
    };
    return { currentEvent: { ...state.currentEvent, masterPlan: newMasterPlan } };
  }),

  setTaskDocument: (taskId, doc) => {
    const state = get();
    if (!state.currentEvent?.masterPlan) return;
    const newDivisions: Division[] = state.currentEvent.masterPlan.divisions.map(div => ({
      ...div,
      tasks: div.tasks.map((t): Task => t.id === taskId ? { ...t, generatedDocument: doc } : t),
    }));
    const newMasterPlan: MasterPlan = { ...state.currentEvent.masterPlan, divisions: newDivisions };
    set({ currentEvent: { ...state.currentEvent, masterPlan: newMasterPlan } });
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
    if (!state.currentEvent?.masterPlan) return state;
    const resultMap = new Map(results.map(r => [r.taskId, r]));

    const newDivisions: Division[] = state.currentEvent.masterPlan.divisions.map(div => ({
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

    const newMasterPlan: MasterPlan = {
      ...state.currentEvent.masterPlan,
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
        masterPlan: newMasterPlan,
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
    let updatedMasterPlan = state.currentEvent?.masterPlan;
    if (updatedMasterPlan) {
      const targetDiv = updatedMasterPlan.divisions.find(d => d.id === task.divisionId);
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
        masterPlan: updatedMasterPlan,
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
