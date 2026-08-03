import type {
  ConfirmationDelta,
  CueDelta,
  OperationalDelta,
  OperationalState,
  OperationalSource,
  TaskDelta,
  VendorDelta,
} from './types';

const sources: OperationalSource[] = [
  {
    id: 'src-h30-memo',
    scenarioId: 'h30-memo',
    type: 'chat',
    title: 'Anonymized H-30 multi-division memo',
    capturedAt: '2024-07-23T09:58:00+07:00',
    contentHash: 'gold-h30-memo-v0',
  },
  {
    id: 'src-vendor-loadin',
    scenarioId: 'vendor-loadin',
    type: 'chat',
    title: 'Anonymized overnight vendor load-in update',
    capturedAt: '2024-08-22T08:23:00+07:00',
    contentHash: 'gold-vendor-loadin-v0',
  },
  {
    id: 'src-cue-corrections',
    scenarioId: 'cue-corrections',
    type: 'chat',
    title: 'Anonymized rehearsal cue corrections',
    capturedAt: '2024-08-23T17:59:00+07:00',
    contentHash: 'gold-cue-corrections-v0',
  },
  {
    id: 'src-confirmation-note',
    scenarioId: 'unconfirmed-items',
    type: 'meeting-note',
    title: 'Anonymized coordination meeting note',
    capturedAt: '2025-03-01T12:00:00+07:00',
    contentHash: 'gold-unconfirmed-items-v0',
  },
];

export function createBaseOperationalState(): OperationalState {
  return {
    sources: sources.map(source => ({ ...source })),
    tasks: [
      {
        id: 'task-print-rundown',
        title: 'Print controlled rundown copies',
        ownerRoleId: 'role-secretariat',
        status: 'pending',
        dependencies: [],
      },
    ],
    rundownVersions: [
      {
        id: 'rundown-v1',
        version: 1,
        createdAt: '2024-08-23T12:00:00+07:00',
        approvedBy: 'role-show-caller',
        sourceDeltaIds: [],
        cues: [
          {
            id: 'cue-opening',
            title: 'Opening',
            plannedAt: '2024-08-23T19:00:00+07:00',
            ownerRoleId: 'role-show-caller',
            status: 'planned',
            notes: '',
          },
          {
            id: 'cue-performance',
            title: 'Main performance',
            plannedAt: '2024-08-23T20:00:00+07:00',
            ownerRoleId: 'role-stage-manager',
            status: 'planned',
            notes: '',
          },
          {
            id: 'cue-award',
            title: 'Award presentation',
            plannedAt: '2024-08-23T21:00:00+07:00',
            ownerRoleId: 'role-show-caller',
            status: 'planned',
            notes: '',
          },
        ],
      },
    ],
    activeRundownVersionId: 'rundown-v1',
    confirmations: [
      {
        id: 'confirm-lighting-arrival',
        requirement: 'Lighting setup completion confirmed',
        ownerRoleId: 'role-technical-lead',
        dueAt: '2024-08-23T10:00:00+07:00',
        status: 'requested',
        evidenceSourceIds: ['src-vendor-loadin'],
        blocksReadiness: true,
      },
    ],
    vendorCommitments: [
      {
        id: 'vendor-stage',
        name: 'Stage vendor delivery',
        ownerRoleId: 'role-vendor-pic',
        expectedAt: '2024-08-23T05:00:00+07:00',
        deliveryStatus: 'scheduled',
        blocksReadiness: true,
        evidenceSourceIds: ['src-vendor-loadin'],
      },
    ],
    communicationDrafts: [],
    readinessRequirements: [
      {
        id: 'req-rehearsal',
        title: 'Full rehearsal completed',
        ownerRoleId: 'role-stage-manager',
        dueAt: '2024-08-23T16:00:00+07:00',
        status: 'pending',
        mandatory: true,
        evidenceSourceIds: [],
      },
    ],
    deltas: [],
    auditEvents: [],
    appliedDeltaIds: [],
  };
}

export function createMemoTaskDelta(): TaskDelta {
  return {
    id: 'delta-memo-task',
    sourceId: 'src-h30-memo',
    evidence: {
      excerpt: 'The secretariat must complete the proposal.',
      basis: 'observed',
    },
    kind: 'task',
    operation: 'create',
    value: {
      id: 'task-complete-proposal',
      title: 'Complete event proposal',
      ownerRoleId: 'role-secretariat',
      status: 'pending',
      dependencies: [],
    },
    affectedRoleIds: ['role-secretariat'],
    impact: 'medium',
    confidence: 0.98,
    status: 'proposed',
    createdAt: '2024-07-23T10:00:00+07:00',
  };
}

export function createVendorFailureDelta(): VendorDelta {
  return {
    id: 'delta-vendor-failed',
    sourceId: 'src-vendor-loadin',
    evidence: {
      excerpt: 'Stage completion missed the agreed readiness window.',
      basis: 'observed',
    },
    kind: 'vendor',
    operation: 'update',
    targetId: 'vendor-stage',
    value: {
      deliveryStatus: 'failed',
    },
    affectedRoleIds: ['role-vendor-pic', 'role-technical-lead'],
    impact: 'critical',
    confidence: 1,
    status: 'proposed',
    createdAt: '2024-08-23T05:30:00+07:00',
  };
}

export function createCueCorrectionDelta(): CueDelta {
  return {
    id: 'delta-cue-lighting',
    sourceId: 'src-cue-corrections',
    evidence: {
      excerpt: 'Lighting must not point toward the audience.',
      basis: 'observed',
    },
    kind: 'cue',
    operation: 'update',
    targetId: 'cue-performance',
    value: {
      notes: 'Keep performance lighting away from the audience.',
    },
    affectedRoleIds: ['role-lighting', 'role-stage-manager'],
    impact: 'high',
    confidence: 0.99,
    status: 'proposed',
    createdAt: '2024-08-23T18:00:00+07:00',
  };
}

export function createRejectedCueDelta(): CueDelta {
  return {
    ...createCueCorrectionDelta(),
    id: 'delta-cue-rejected',
    evidence: {
      excerpt: 'An ambiguous cue correction requires clarification.',
      basis: 'inferred',
    },
    confidence: 0.55,
  };
}

export function createConfirmationResolvedDelta(): ConfirmationDelta {
  return {
    id: 'delta-confirm-lighting',
    sourceId: 'src-vendor-loadin',
    evidence: {
      excerpt: 'Lighting setup has completed and is ready for check.',
      basis: 'observed',
    },
    kind: 'confirmation',
    operation: 'update',
    targetId: 'confirm-lighting-arrival',
    value: {
      status: 'confirmed',
      evidenceSourceIds: ['src-vendor-loadin'],
    },
    affectedRoleIds: ['role-technical-lead'],
    impact: 'high',
    confidence: 1,
    status: 'proposed',
    createdAt: '2024-08-23T09:45:00+07:00',
  };
}

export function createReplayDeltas(): OperationalDelta[] {
  return [
    createMemoTaskDelta(),
    createVendorFailureDelta(),
    createCueCorrectionDelta(),
    createRejectedCueDelta(),
    createConfirmationResolvedDelta(),
  ];
}

