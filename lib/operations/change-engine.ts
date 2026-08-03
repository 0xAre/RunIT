import type {
  CommunicationDraft,
  ConfirmationItem,
  OperationalAuditEvent,
  OperationalDelta,
  OperationalState,
  OperationalTask,
  RundownVersion,
  VendorCommitment,
} from './types';

export type OperationalEngineErrorCode =
  | 'DUPLICATE_DELTA'
  | 'INVALID_DELTA'
  | 'INVALID_TRANSITION'
  | 'MISSING_SOURCE'
  | 'MISSING_TARGET';

export class OperationalEngineError extends Error {
  constructor(
    public readonly code: OperationalEngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OperationalEngineError';
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function cloneDelta(delta: OperationalDelta): OperationalDelta {
  const common = {
    ...delta,
    evidence: { ...delta.evidence },
    affectedRoleIds: [...delta.affectedRoleIds],
  };

  switch (delta.kind) {
    case 'task':
      return {
        ...common,
        kind: 'task',
        value: {
          ...delta.value,
          dependencies: delta.value.dependencies
            ? [...delta.value.dependencies]
            : undefined,
        },
      };
    case 'cue':
      return { ...common, kind: 'cue', value: { ...delta.value } };
    case 'confirmation':
      return {
        ...common,
        kind: 'confirmation',
        value: {
          ...delta.value,
          evidenceSourceIds: delta.value.evidenceSourceIds
            ? [...delta.value.evidenceSourceIds]
            : undefined,
        },
      };
    case 'vendor':
      return {
        ...common,
        kind: 'vendor',
        value: {
          ...delta.value,
          evidenceSourceIds: delta.value.evidenceSourceIds
            ? [...delta.value.evidenceSourceIds]
            : undefined,
        },
      };
    case 'communication':
      return {
        ...common,
        kind: 'communication',
        value: {
          ...delta.value,
          audienceRoleIds: delta.value.audienceRoleIds
            ? [...delta.value.audienceRoleIds]
            : undefined,
        },
      };
  }
}

function cloneState(state: OperationalState): OperationalState {
  return {
    sources: state.sources.map(source => ({ ...source })),
    tasks: state.tasks.map(task => ({
      ...task,
      dependencies: [...task.dependencies],
    })),
    rundownVersions: state.rundownVersions.map(version => ({
      ...version,
      sourceDeltaIds: [...version.sourceDeltaIds],
      cues: version.cues.map(cue => ({ ...cue })),
    })),
    activeRundownVersionId: state.activeRundownVersionId,
    confirmations: state.confirmations.map(confirmation => ({
      ...confirmation,
      evidenceSourceIds: [...confirmation.evidenceSourceIds],
    })),
    vendorCommitments: state.vendorCommitments.map(commitment => ({
      ...commitment,
      evidenceSourceIds: [...commitment.evidenceSourceIds],
    })),
    communicationDrafts: state.communicationDrafts.map(draft => ({
      ...draft,
      audienceRoleIds: [...draft.audienceRoleIds],
    })),
    readinessRequirements: state.readinessRequirements.map(requirement => ({
      ...requirement,
      evidenceSourceIds: [...requirement.evidenceSourceIds],
    })),
    deltas: state.deltas.map(cloneDelta),
    auditEvents: state.auditEvents.map(event => ({
      ...event,
      affectedRoleIds: [...event.affectedRoleIds],
      affectedTargetIds: [...event.affectedTargetIds],
    })),
    appliedDeltaIds: [...state.appliedDeltaIds],
  };
}

function getActiveRundown(state: OperationalState): RundownVersion {
  const active = state.rundownVersions.find(
    version => version.id === state.activeRundownVersionId,
  );
  if (!active) {
    throw new OperationalEngineError(
      'MISSING_TARGET',
      `Active rundown ${state.activeRundownVersionId} does not exist.`,
    );
  }
  return active;
}

function requireCreateFields(
  kind: OperationalDelta['kind'],
  value: { id?: string },
): string {
  if (!value.id?.trim()) {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      `${kind} create delta requires a stable id.`,
    );
  }
  return value.id;
}

function requireTarget(delta: OperationalDelta): string {
  if (!delta.targetId?.trim()) {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      `${delta.kind} ${delta.operation} delta requires targetId.`,
    );
  }
  return delta.targetId;
}

function requireText(value: string | undefined, field: string): string {
  if (!value?.trim()) {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      `${field} is required.`,
    );
  }
  return value;
}

function replaceDelta(
  state: OperationalState,
  replacement: OperationalDelta,
): void {
  const index = state.deltas.findIndex(delta => delta.id === replacement.id);
  state.deltas[index] = replacement;
}

function findTargetIndex<T extends { id: string }>(
  collection: T[],
  targetId: string,
  kind: OperationalDelta['kind'],
): number {
  const index = collection.findIndex(item => item.id === targetId);
  if (index < 0) {
    throw new OperationalEngineError(
      'MISSING_TARGET',
      `${kind} target ${targetId} does not exist.`,
    );
  }
  return index;
}

function deriveAffectedRoleIds(
  state: OperationalState,
  delta: OperationalDelta,
): string[] {
  const roleIds = [...delta.affectedRoleIds];

  if (delta.kind === 'communication') {
    if (delta.value.audienceRoleIds) {
      roleIds.push(...delta.value.audienceRoleIds);
    }
  } else if (delta.value.ownerRoleId) {
    roleIds.push(delta.value.ownerRoleId);
  }

  if (delta.operation !== 'create' && delta.targetId) {
    if (delta.kind === 'task') {
      const target = state.tasks.find(task => task.id === delta.targetId);
      if (target) roleIds.push(target.ownerRoleId);
    } else if (delta.kind === 'cue') {
      const target = getActiveRundown(state).cues.find(
        cue => cue.id === delta.targetId,
      );
      if (target) roleIds.push(target.ownerRoleId);
    } else if (delta.kind === 'confirmation') {
      const target = state.confirmations.find(
        confirmation => confirmation.id === delta.targetId,
      );
      if (target) roleIds.push(target.ownerRoleId);
    } else if (delta.kind === 'vendor') {
      const target = state.vendorCommitments.find(
        commitment => commitment.id === delta.targetId,
      );
      if (target) roleIds.push(target.ownerRoleId);
    } else {
      const target = state.communicationDrafts.find(
        draft => draft.id === delta.targetId,
      );
      if (target) roleIds.push(...target.audienceRoleIds);
    }
  }

  return unique(roleIds);
}

function createAuditEvent(
  delta: OperationalDelta,
  action: OperationalAuditEvent['action'],
  actorRoleId: string,
  occurredAt: string,
  affectedRoleIds: string[],
  affectedTargetIds: string[],
): OperationalAuditEvent {
  return {
    id: `audit:${delta.id}:${action}`,
    deltaId: delta.id,
    sourceId: delta.sourceId,
    action,
    actorRoleId,
    occurredAt,
    affectedRoleIds,
    affectedTargetIds,
  };
}

function applyTaskDelta(state: OperationalState, delta: OperationalDelta): string[] {
  if (delta.kind !== 'task') return [];

  if (delta.operation === 'create') {
    const id = requireCreateFields(delta.kind, delta.value);
    if (state.tasks.some(task => task.id === id)) {
      throw new OperationalEngineError(
        'INVALID_DELTA',
        `Task ${id} already exists.`,
      );
    }
    const task: OperationalTask = {
      id,
      title: requireText(delta.value.title, 'task title'),
      ownerRoleId: requireText(delta.value.ownerRoleId, 'task ownerRoleId'),
      status: delta.value.status ?? 'pending',
      dueAt: delta.value.dueAt,
      dependencies: [...(delta.value.dependencies ?? [])],
    };
    state.tasks.push(task);
    return [id];
  }

  const targetId = requireTarget(delta);
  const index = findTargetIndex(state.tasks, targetId, delta.kind);
  const current = state.tasks[index];

  if (delta.operation === 'cancel') {
    state.tasks[index] = { ...current, status: 'cancelled' };
    return [targetId];
  }

  state.tasks[index] = {
    ...current,
    title: delta.value.title ?? current.title,
    ownerRoleId: delta.value.ownerRoleId ?? current.ownerRoleId,
    status: delta.value.status ?? current.status,
    dueAt: delta.value.dueAt ?? current.dueAt,
    dependencies: delta.value.dependencies
      ? [...delta.value.dependencies]
      : [...current.dependencies],
  };
  return [targetId];
}

function applyCueDelta(
  state: OperationalState,
  delta: OperationalDelta,
  reviewerRoleId: string,
  reviewedAt: string,
): string[] {
  if (delta.kind !== 'cue') return [];

  const currentVersion = getActiveRundown(state);
  const cues = currentVersion.cues.map(cue => ({ ...cue }));
  let targetId: string;

  if (delta.operation === 'create') {
    targetId = requireCreateFields(delta.kind, delta.value);
    if (cues.some(cue => cue.id === targetId)) {
      throw new OperationalEngineError(
        'INVALID_DELTA',
        `Cue ${targetId} already exists.`,
      );
    }
    cues.push({
      id: targetId,
      title: requireText(delta.value.title, 'cue title'),
      plannedAt: requireText(delta.value.plannedAt, 'cue plannedAt'),
      ownerRoleId: requireText(delta.value.ownerRoleId, 'cue ownerRoleId'),
      status: delta.value.status ?? 'planned',
      notes: delta.value.notes ?? '',
    });
  } else {
    targetId = requireTarget(delta);
    const index = findTargetIndex(cues, targetId, delta.kind);
    const current = cues[index];
    cues[index] = delta.operation === 'cancel'
      ? { ...current, status: 'cancelled' }
      : {
          ...current,
          title: delta.value.title ?? current.title,
          plannedAt: delta.value.plannedAt ?? current.plannedAt,
          ownerRoleId: delta.value.ownerRoleId ?? current.ownerRoleId,
          status: delta.value.status ?? current.status,
          notes: delta.value.notes ?? current.notes,
        };
  }

  const nextVersionNumber = currentVersion.version + 1;
  const nextVersion: RundownVersion = {
    id: `rundown-v${nextVersionNumber}`,
    version: nextVersionNumber,
    createdAt: reviewedAt,
    approvedBy: reviewerRoleId,
    sourceDeltaIds: [delta.id],
    cues,
  };
  state.rundownVersions.push(nextVersion);
  state.activeRundownVersionId = nextVersion.id;
  return [targetId];
}

function applyConfirmationDelta(
  state: OperationalState,
  delta: OperationalDelta,
): string[] {
  if (delta.kind !== 'confirmation') return [];

  if (delta.operation === 'create') {
    const id = requireCreateFields(delta.kind, delta.value);
    if (state.confirmations.some(item => item.id === id)) {
      throw new OperationalEngineError(
        'INVALID_DELTA',
        `Confirmation ${id} already exists.`,
      );
    }
    const item: ConfirmationItem = {
      id,
      requirement: requireText(
        delta.value.requirement,
        'confirmation requirement',
      ),
      ownerRoleId: requireText(
        delta.value.ownerRoleId,
        'confirmation ownerRoleId',
      ),
      dueAt: delta.value.dueAt,
      status: delta.value.status ?? 'unknown',
      evidenceSourceIds: [...(delta.value.evidenceSourceIds ?? [delta.sourceId])],
      blocksReadiness: delta.value.blocksReadiness ?? false,
    };
    state.confirmations.push(item);
    return [id];
  }

  const targetId = requireTarget(delta);
  const index = findTargetIndex(state.confirmations, targetId, delta.kind);
  const current = state.confirmations[index];
  state.confirmations[index] = delta.operation === 'cancel'
    ? { ...current, status: 'cancelled' }
    : {
        ...current,
        requirement: delta.value.requirement ?? current.requirement,
        ownerRoleId: delta.value.ownerRoleId ?? current.ownerRoleId,
        dueAt: delta.value.dueAt ?? current.dueAt,
        status: delta.value.status ?? current.status,
        evidenceSourceIds: delta.value.evidenceSourceIds
          ? [...delta.value.evidenceSourceIds]
          : unique([...current.evidenceSourceIds, delta.sourceId]),
        blocksReadiness:
          delta.value.blocksReadiness ?? current.blocksReadiness,
      };
  return [targetId];
}

function applyVendorDelta(
  state: OperationalState,
  delta: OperationalDelta,
): string[] {
  if (delta.kind !== 'vendor') return [];

  if (delta.operation === 'create') {
    const id = requireCreateFields(delta.kind, delta.value);
    if (state.vendorCommitments.some(item => item.id === id)) {
      throw new OperationalEngineError(
        'INVALID_DELTA',
        `Vendor commitment ${id} already exists.`,
      );
    }
    const commitment: VendorCommitment = {
      id,
      name: requireText(delta.value.name, 'vendor name'),
      ownerRoleId: requireText(
        delta.value.ownerRoleId,
        'vendor ownerRoleId',
      ),
      expectedAt: delta.value.expectedAt,
      deliveryStatus: delta.value.deliveryStatus ?? 'pending',
      blocksReadiness: delta.value.blocksReadiness ?? false,
      evidenceSourceIds: [...(delta.value.evidenceSourceIds ?? [delta.sourceId])],
    };
    state.vendorCommitments.push(commitment);
    return [id];
  }

  const targetId = requireTarget(delta);
  const index = findTargetIndex(state.vendorCommitments, targetId, delta.kind);
  const current = state.vendorCommitments[index];
  state.vendorCommitments[index] = delta.operation === 'cancel'
    ? { ...current, deliveryStatus: 'cancelled' }
    : {
        ...current,
        name: delta.value.name ?? current.name,
        ownerRoleId: delta.value.ownerRoleId ?? current.ownerRoleId,
        expectedAt: delta.value.expectedAt ?? current.expectedAt,
        deliveryStatus:
          delta.value.deliveryStatus ?? current.deliveryStatus,
        blocksReadiness:
          delta.value.blocksReadiness ?? current.blocksReadiness,
        evidenceSourceIds: delta.value.evidenceSourceIds
          ? [...delta.value.evidenceSourceIds]
          : unique([...current.evidenceSourceIds, delta.sourceId]),
      };
  return [targetId];
}

function applyCommunicationDelta(
  state: OperationalState,
  delta: OperationalDelta,
): string[] {
  if (delta.kind !== 'communication') return [];

  if (delta.operation === 'create') {
    const id = requireCreateFields(delta.kind, delta.value);
    if (state.communicationDrafts.some(item => item.id === id)) {
      throw new OperationalEngineError(
        'INVALID_DELTA',
        `Communication draft ${id} already exists.`,
      );
    }
    const draft: CommunicationDraft = {
      id,
      audienceRoleIds: unique(delta.value.audienceRoleIds ?? []),
      channel: delta.value.channel ?? 'internal-chat',
      message: requireText(delta.value.message, 'communication message'),
      status: delta.value.status ?? 'draft',
    };
    state.communicationDrafts.push(draft);
    return [id];
  }

  const targetId = requireTarget(delta);
  const index = findTargetIndex(
    state.communicationDrafts,
    targetId,
    delta.kind,
  );
  const current = state.communicationDrafts[index];
  state.communicationDrafts[index] = delta.operation === 'cancel'
    ? { ...current, status: 'cancelled' }
    : {
        ...current,
        audienceRoleIds: delta.value.audienceRoleIds
          ? unique(delta.value.audienceRoleIds)
          : [...current.audienceRoleIds],
        channel: delta.value.channel ?? current.channel,
        message: delta.value.message ?? current.message,
        status: delta.value.status ?? current.status,
      };
  return [targetId];
}

function applyDelta(
  state: OperationalState,
  delta: OperationalDelta,
  reviewerRoleId: string,
  reviewedAt: string,
): string[] {
  switch (delta.kind) {
    case 'task':
      return applyTaskDelta(state, delta);
    case 'cue':
      return applyCueDelta(state, delta, reviewerRoleId, reviewedAt);
    case 'confirmation':
      return applyConfirmationDelta(state, delta);
    case 'vendor':
      return applyVendorDelta(state, delta);
    case 'communication':
      return applyCommunicationDelta(state, delta);
  }
}

export function proposeDelta(
  state: OperationalState,
  delta: OperationalDelta,
): OperationalState {
  if (!state.sources.some(source => source.id === delta.sourceId)) {
    throw new OperationalEngineError(
      'MISSING_SOURCE',
      `Source ${delta.sourceId} does not exist.`,
    );
  }
  if (state.deltas.some(existing => existing.id === delta.id)) {
    throw new OperationalEngineError(
      'DUPLICATE_DELTA',
      `Delta ${delta.id} already exists.`,
    );
  }
  if (delta.status !== 'proposed') {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      'A new delta must start in proposed status.',
    );
  }
  if (!delta.evidence.excerpt.trim()) {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      'A delta must contain source-grounded evidence.',
    );
  }
  if (delta.confidence < 0 || delta.confidence > 1) {
    throw new OperationalEngineError(
      'INVALID_DELTA',
      'Delta confidence must be between 0 and 1.',
    );
  }

  const next = cloneState(state);
  const proposedClone = cloneDelta(delta);
  const affectedRoleIds = deriveAffectedRoleIds(next, proposedClone);
  const proposed = {
    ...proposedClone,
    affectedRoleIds,
  } as OperationalDelta;
  next.deltas.push(proposed);
  next.auditEvents.push(
    createAuditEvent(
      proposed,
      'delta-proposed',
      'role-system',
      proposed.createdAt,
      affectedRoleIds,
      proposed.targetId ? [proposed.targetId] : [],
    ),
  );
  return next;
}

export function approveDelta(
  state: OperationalState,
  deltaId: string,
  reviewerRoleId: string,
  reviewedAt: string,
): OperationalState {
  requireText(reviewerRoleId, 'reviewerRoleId');
  requireText(reviewedAt, 'reviewedAt');

  const existing = state.deltas.find(delta => delta.id === deltaId);
  if (!existing) {
    throw new OperationalEngineError(
      'MISSING_TARGET',
      `Delta ${deltaId} does not exist.`,
    );
  }
  if (existing.status === 'approved' && state.appliedDeltaIds.includes(deltaId)) {
    return state;
  }
  if (existing.status !== 'proposed') {
    throw new OperationalEngineError(
      'INVALID_TRANSITION',
      `Delta ${deltaId} cannot transition from ${existing.status} to approved.`,
    );
  }

  const next = cloneState(state);
  const affectedRoleIds = deriveAffectedRoleIds(next, existing);
  const approved = {
    ...existing,
    status: 'approved',
    reviewedBy: reviewerRoleId,
    reviewedAt,
    affectedRoleIds,
  } as OperationalDelta;
  replaceDelta(next, approved);
  const affectedTargetIds = applyDelta(
    next,
    approved,
    reviewerRoleId,
    reviewedAt,
  );
  next.appliedDeltaIds.push(approved.id);
  next.auditEvents.push(
    createAuditEvent(
      approved,
      'delta-approved',
      reviewerRoleId,
      reviewedAt,
      affectedRoleIds,
      affectedTargetIds,
    ),
  );
  return next;
}

export function rejectDelta(
  state: OperationalState,
  deltaId: string,
  reviewerRoleId: string,
  reviewedAt: string,
): OperationalState {
  requireText(reviewerRoleId, 'reviewerRoleId');
  requireText(reviewedAt, 'reviewedAt');

  const existing = state.deltas.find(delta => delta.id === deltaId);
  if (!existing) {
    throw new OperationalEngineError(
      'MISSING_TARGET',
      `Delta ${deltaId} does not exist.`,
    );
  }
  if (existing.status === 'rejected') return state;
  if (existing.status !== 'proposed') {
    throw new OperationalEngineError(
      'INVALID_TRANSITION',
      `Delta ${deltaId} cannot transition from ${existing.status} to rejected.`,
    );
  }

  const next = cloneState(state);
  const affectedRoleIds = deriveAffectedRoleIds(next, existing);
  const rejected = {
    ...existing,
    status: 'rejected',
    reviewedBy: reviewerRoleId,
    reviewedAt,
    affectedRoleIds,
  } as OperationalDelta;
  replaceDelta(next, rejected);
  next.auditEvents.push(
    createAuditEvent(
      rejected,
      'delta-rejected',
      reviewerRoleId,
      reviewedAt,
      affectedRoleIds,
      rejected.targetId ? [rejected.targetId] : [],
    ),
  );
  return next;
}
