import { describe, expect, it } from 'vitest';
import { approveDelta, proposeDelta } from './change-engine';
import {
  createBaseOperationalState,
  createConfirmationResolvedDelta,
  createCueCorrectionDelta,
  createVendorFailureDelta,
} from './fixtures';
import { calculateReadiness } from './readiness-engine';

describe('operational readiness engine', () => {
  it('is deterministic and explains every deduction', () => {
    const state = createBaseOperationalState();
    const asOf = '2024-08-23T15:00:00+07:00';

    const first = calculateReadiness(state, asOf);
    const second = calculateReadiness(state, asOf);

    expect(first).toEqual(second);
    expect(first.score).toBe(85);
    expect(first.blockers.map(item => item.entityId)).toEqual([
      'confirm-lighting-arrival',
    ]);
    expect(first.explanations).toHaveLength(1);
    expect(first.explanations[0]).toContain('-15');
  });

  it('creates an explainable blocker for an approved vendor failure', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createVendorFailureDelta(),
    );
    const approved = approveDelta(
      proposed,
      'delta-vendor-failed',
      'role-technical-lead',
      '2024-08-23T05:35:00+07:00',
    );
    const snapshot = calculateReadiness(
      approved,
      '2024-08-23T15:00:00+07:00',
    );

    expect(snapshot.score).toBe(60);
    expect(snapshot.blockers.map(item => item.entityId)).toEqual([
      'confirm-lighting-arrival',
      'vendor-stage',
    ]);
    expect(snapshot.explanations).toEqual([
      '-15: Confirmation "Lighting setup completion confirmed" is requested.',
      '-25: Vendor commitment "Stage vendor delivery" has failed.',
    ]);
  });

  it('adds a warning for an unreviewed high-impact change', () => {
    const proposed = proposeDelta(
      createBaseOperationalState(),
      createCueCorrectionDelta(),
    );
    const snapshot = calculateReadiness(
      proposed,
      '2024-08-23T15:00:00+07:00',
    );

    expect(snapshot.score).toBe(80);
    expect(snapshot.warnings).toContainEqual(
      expect.objectContaining({
        entityId: 'delta-cue-lighting',
        deduction: 5,
      }),
    );
  });

  it('removes only the blocker related to a resolved confirmation', () => {
    const failedVendor = approveDelta(
      proposeDelta(
        createBaseOperationalState(),
        createVendorFailureDelta(),
      ),
      'delta-vendor-failed',
      'role-technical-lead',
      '2024-08-23T05:35:00+07:00',
    );
    const proposedConfirmation = proposeDelta(
      failedVendor,
      createConfirmationResolvedDelta(),
    );
    const resolved = approveDelta(
      proposedConfirmation,
      'delta-confirm-lighting',
      'role-technical-lead',
      '2024-08-23T09:46:00+07:00',
    );
    const snapshot = calculateReadiness(
      resolved,
      '2024-08-23T15:00:00+07:00',
    );

    expect(snapshot.score).toBe(75);
    expect(snapshot.blockers.map(item => item.entityId)).toEqual([
      'vendor-stage',
    ]);
  });

  it('marks overdue mandatory requirements as blockers', () => {
    const snapshot = calculateReadiness(
      createBaseOperationalState(),
      '2024-08-23T17:00:00+07:00',
    );

    expect(snapshot.score).toBe(65);
    expect(snapshot.blockers.map(item => item.entityId)).toEqual([
      'confirm-lighting-arrival',
      'req-rehearsal',
    ]);
  });

  it('clamps readiness scores to the 0..100 range', () => {
    const state = createBaseOperationalState();
    state.confirmations = Array.from({ length: 10 }, (_, index) => ({
      id: `confirm-${index}`,
      requirement: `Blocking confirmation ${index}`,
      ownerRoleId: 'role-operations',
      status: 'unknown' as const,
      evidenceSourceIds: [],
      blocksReadiness: true,
    }));

    expect(
      calculateReadiness(state, '2024-08-23T15:00:00+07:00').score,
    ).toBe(0);
  });
});

