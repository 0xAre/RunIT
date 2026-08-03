export type OperationalSourceType =
  | 'chat'
  | 'meeting-note'
  | 'rundown'
  | 'document'
  | 'manual';

export type EvidenceBasis = 'observed' | 'inferred';
export type OperationalImpact = 'low' | 'medium' | 'high' | 'critical';
export type DeltaStatus = 'proposed' | 'approved' | 'rejected';
export type DeltaOperation = 'create' | 'update' | 'cancel';

export interface OperationalEvidence {
  excerpt: string;
  basis: EvidenceBasis;
  note?: string;
}

export interface OperationalSource {
  id: string;
  scenarioId: string;
  type: OperationalSourceType;
  title: string;
  capturedAt: string;
  contentHash: string;
}

export type OperationalTaskStatus =
  | 'pending'
  | 'in-progress'
  | 'done'
  | 'blocked'
  | 'cancelled';

export interface OperationalTask {
  id: string;
  title: string;
  ownerRoleId: string;
  status: OperationalTaskStatus;
  dueAt?: string;
  dependencies: string[];
}

export type OperationalCueStatus =
  | 'planned'
  | 'standby'
  | 'live'
  | 'completed'
  | 'skipped'
  | 'cancelled';

export interface OperationalCue {
  id: string;
  title: string;
  plannedAt: string;
  ownerRoleId: string;
  status: OperationalCueStatus;
  notes: string;
}

export interface RundownVersion {
  id: string;
  version: number;
  createdAt: string;
  approvedBy: string;
  sourceDeltaIds: string[];
  cues: OperationalCue[];
}

export type ConfirmationStatus =
  | 'unknown'
  | 'requested'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export interface ConfirmationItem {
  id: string;
  requirement: string;
  ownerRoleId: string;
  dueAt?: string;
  status: ConfirmationStatus;
  evidenceSourceIds: string[];
  blocksReadiness: boolean;
}

export type VendorDeliveryStatus =
  | 'pending'
  | 'scheduled'
  | 'ready'
  | 'failed'
  | 'cancelled';

export interface VendorCommitment {
  id: string;
  name: string;
  ownerRoleId: string;
  expectedAt?: string;
  deliveryStatus: VendorDeliveryStatus;
  blocksReadiness: boolean;
  evidenceSourceIds: string[];
}

export type ReadinessRequirementStatus =
  | 'pending'
  | 'completed'
  | 'waived'
  | 'cancelled';

export interface ReadinessRequirement {
  id: string;
  title: string;
  ownerRoleId: string;
  dueAt?: string;
  status: ReadinessRequirementStatus;
  mandatory: boolean;
  evidenceSourceIds: string[];
}

export type CommunicationDraftStatus = 'draft' | 'approved' | 'cancelled';

export interface CommunicationDraft {
  id: string;
  audienceRoleIds: string[];
  channel: 'internal-chat' | 'email' | 'announcement' | 'radio-brief';
  message: string;
  status: CommunicationDraftStatus;
}

export interface TaskChange {
  id?: string;
  title?: string;
  ownerRoleId?: string;
  status?: OperationalTaskStatus;
  dueAt?: string;
  dependencies?: string[];
}

export interface CueChange {
  id?: string;
  title?: string;
  plannedAt?: string;
  ownerRoleId?: string;
  status?: OperationalCueStatus;
  notes?: string;
}

export interface ConfirmationChange {
  id?: string;
  requirement?: string;
  ownerRoleId?: string;
  dueAt?: string;
  status?: ConfirmationStatus;
  evidenceSourceIds?: string[];
  blocksReadiness?: boolean;
}

export interface VendorChange {
  id?: string;
  name?: string;
  ownerRoleId?: string;
  expectedAt?: string;
  deliveryStatus?: VendorDeliveryStatus;
  blocksReadiness?: boolean;
  evidenceSourceIds?: string[];
}

export interface CommunicationChange {
  id?: string;
  audienceRoleIds?: string[];
  channel?: CommunicationDraft['channel'];
  message?: string;
  status?: CommunicationDraftStatus;
}

interface OperationalDeltaBase {
  id: string;
  sourceId: string;
  evidence: OperationalEvidence;
  operation: DeltaOperation;
  targetId?: string;
  affectedRoleIds: string[];
  impact: OperationalImpact;
  confidence: number;
  status: DeltaStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface TaskDelta extends OperationalDeltaBase {
  kind: 'task';
  value: TaskChange;
}

export interface CueDelta extends OperationalDeltaBase {
  kind: 'cue';
  value: CueChange;
}

export interface ConfirmationDelta extends OperationalDeltaBase {
  kind: 'confirmation';
  value: ConfirmationChange;
}

export interface VendorDelta extends OperationalDeltaBase {
  kind: 'vendor';
  value: VendorChange;
}

export interface CommunicationDelta extends OperationalDeltaBase {
  kind: 'communication';
  value: CommunicationChange;
}

export type OperationalDelta =
  | TaskDelta
  | CueDelta
  | ConfirmationDelta
  | VendorDelta
  | CommunicationDelta;

export type OperationalAuditAction =
  | 'delta-proposed'
  | 'delta-approved'
  | 'delta-rejected';

export interface OperationalAuditEvent {
  id: string;
  deltaId: string;
  sourceId: string;
  action: OperationalAuditAction;
  actorRoleId: string;
  occurredAt: string;
  affectedRoleIds: string[];
  affectedTargetIds: string[];
}

export type ReadinessEntityType =
  | 'confirmation'
  | 'vendor'
  | 'requirement'
  | 'delta';

export interface ReadinessFinding {
  id: string;
  type: 'blocker' | 'warning';
  entityType: ReadinessEntityType;
  entityId: string;
  reason: string;
  deduction: number;
}

export interface ReadinessSnapshot {
  calculatedAt: string;
  rundownVersion: number;
  score: number;
  blockers: ReadinessFinding[];
  warnings: ReadinessFinding[];
  explanations: string[];
}

export interface OperationalState {
  sources: OperationalSource[];
  tasks: OperationalTask[];
  rundownVersions: RundownVersion[];
  activeRundownVersionId: string;
  confirmations: ConfirmationItem[];
  vendorCommitments: VendorCommitment[];
  communicationDrafts: CommunicationDraft[];
  readinessRequirements: ReadinessRequirement[];
  deltas: OperationalDelta[];
  auditEvents: OperationalAuditEvent[];
  appliedDeltaIds: string[];
}

