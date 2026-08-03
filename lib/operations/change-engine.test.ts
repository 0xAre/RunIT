import { describe, expect, it } from 'vitest';
import {
  approveDelta,
  OperationalEngineError,
  proposeDelta,
  rejectDelta,
} from './change-engine';
import {
  createBaseOperationalState,
  createCueCorrectionDelta,
  createMemoTaskDelta,
  createRejectedCueDelta,
} from './fixtures';

describe('operational change engine', () => {
  it('records a proposal without mutating published operational state', () => {
    const state = createBaseOperationalState();
    const next = proposeDelta(state, createMemoTaskDelta());

    expect(state.deltas).toHaveLength(0);
    expect(state.tasks).toHaveLength(1);
    expect(next.deltas).toHaveLength(1);
    expect(next.tasks).toEqual(state.tasks);
    expect(next.auditEvents.at(-1)).toMatchObject({
      action: 'delta-proposed',
      sourceId: 'src-h30-memo',
    });
  });

  it('isolates proposed state from later caller mutations', () => {
    const state = createBaseOperationalState();
    const delta = createMemoTaskDelta();
    delta.value.dependencies = ['task-print-rundown'];

    const next = proposeDelta(state, delta);

    delta.evidence.excerpt = 'Mutated after proposal';
    delta.affectedRoleIds.push('role-unexpected');
    delta.value.dependencies.push('task-unexpected');

    expect(next.deltas[0].evidence.excerpt).toBe(
      'The secretariat must complete the proposal.',
    );
    expect(next.deltas[0].affectedRoleIds).not.toContain('role-unexpected');
    expect(next.deltas[0].kind).toBe('task');
    if (next.deltas[0].kind === 'task') {
      expect(next.deltas[0].value.dependencies).toEqual([
        'task-print-rundown',
      ]);
    }
  });

  it('applies an approved task change with source and reviewer audit evidence', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createMemoTaskDelta(),
    );
    const approved = approveDelta(
      proposed,
      'delta-memo-task',
      'role-event-manager',
      '2024-07-23T10:05:00+07:00',
    );

    expect(approved.tasks).toContainEqual({
      id: 'task-complete-proposal',
      title: 'Complete event proposal',
      ownerRoleId: 'role-secretariat',
      status: 'pending',
      dueAt: undefined,
      dependencies: [],
    });
    expect(approved.deltas[0]).toMatchObject({
      status: 'approved',
      reviewedBy: 'role-event-manager',
    });
    expect(approved.auditEvents.at(-1)).toMatchObject({
      action: 'delta-approved',
      actorRoleId: 'role-event-manager',
      sourceId: 'src-h30-memo',
      affectedTargetIds: ['task-complete-proposal'],
    });
  });

  it('publishes a new rundown version only after cue approval', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createCueCorrectionDelta(),
    );

    expect(proposed.rundownVersions).toHaveLength(1);
    expect(proposed.activeRundownVersionId).toBe('rundown-v1');

    const approved = approveDelta(
      proposed,
      'delta-cue-lighting',
      'role-show-caller',
      '2024-08-23T18:02:00+07:00',
    );

    expect(approved.rundownVersions).toHaveLength(2);
    expect(approved.activeRundownVersionId).toBe('rundown-v2');
    expect(approved.rundownVersions[1]).toMatchObject({
      version: 2,
      approvedBy: 'role-show-caller',
      sourceDeltaIds: ['delta-cue-lighting'],
    });
    expect(
      approved.rundownVersions[1].cues.find(
        cue => cue.id === 'cue-performance',
      )?.notes,
    ).toBe('Keep performance lighting away from the audience.');
  });

  it('keeps canonical rundown unchanged when a cue delta is rejected', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createRejectedCueDelta(),
    );
    const rejected = rejectDelta(
      proposed,
      'delta-cue-rejected',
      'role-show-caller',
      '2024-08-23T18:02:00+07:00',
    );

    expect(rejected.rundownVersions).toHaveLength(1);
    expect(rejected.activeRundownVersionId).toBe('rundown-v1');
    expect(rejected.deltas[0].status).toBe('rejected');
    expect(rejected.appliedDeltaIds).toEqual([]);
  });

  it('makes duplicate approval idempotent', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createCueCorrectionDelta(),
    );
    const approved = approveDelta(
      proposed,
      'delta-cue-lighting',
      'role-show-caller',
      '2024-08-23T18:02:00+07:00',
    );
    const replayed = approveDelta(
      approved,
      'delta-cue-lighting',
      'role-show-caller',
      '2024-08-23T18:03:00+07:00',
    );

    expect(replayed).toBe(approved);
    expect(replayed.rundownVersions).toHaveLength(2);
    expect(replayed.auditEvents).toHaveLength(2);
    expect(replayed.appliedDeltaIds).toEqual(['delta-cue-lighting']);
  });

  it('returns a typed error for an unknown target', () => {
    const delta = {
      ...createCueCorrectionDelta(),
      id: 'delta-unknown-cue',
      targetId: 'cue-does-not-exist',
    };
    const proposed = proposeDelta(createBaseOperationalState(), delta);

    expect(() =>
      approveDelta(
        proposed,
        delta.id,
        'role-show-caller',
        '2024-08-23T18:02:00+07:00',
      ),
    ).toThrowError(
      expect.objectContaining<Partial<OperationalEngineError>>({
        code: 'MISSING_TARGET',
      }),
    );
  });

  it('does not allow an approved delta to transition to rejected', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createMemoTaskDelta(),
    );
    const approved = approveDelta(
      proposed,
      'delta-memo-task',
      'role-event-manager',
      '2024-07-23T10:05:00+07:00',
    );

    expect(() =>
      rejectDelta(
        approved,
        'delta-memo-task',
        'role-event-manager',
        '2024-07-23T10:06:00+07:00',
      ),
    ).toThrowError(
      expect.objectContaining<Partial<OperationalEngineError>>({
        code: 'INVALID_TRANSITION',
      }),
    );
  });
});
