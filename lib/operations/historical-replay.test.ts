import { describe, expect, it } from 'vitest';
import goldDataset from '@/docs/gemini-xprize-2026/research/gold/change-to-readiness-v0.json';
import { approveDelta, proposeDelta, rejectDelta } from './change-engine';
import {
  createBaseOperationalState,
  createConfirmationResolvedDelta,
  createCueCorrectionDelta,
  createMemoTaskDelta,
  createRejectedCueDelta,
  createVendorFailureDelta,
} from './fixtures';
import { calculateReadiness } from './readiness-engine';

describe('change-to-readiness historical replay', () => {
  it('loads an anonymized gold dataset with at least 20 atomic labels', () => {
    expect(goldDataset.labels.length).toBeGreaterThanOrEqual(20);
    expect(goldDataset.scenarios.length).toBeGreaterThanOrEqual(4);

    const scenarioIds = new Set<string>();
    const sourceIds = new Set<string>();
    for (const scenario of goldDataset.scenarios) {
      expect(scenarioIds.has(scenario.id)).toBe(false);
      expect(sourceIds.has(scenario.sourceId)).toBe(false);
      expect(scenario.sourceLocator.path).toBeTruthy();
      expect(scenario.sourceLocator.reference).toBeTruthy();
      scenarioIds.add(scenario.id);
      sourceIds.add(scenario.sourceId);
    }

    const labelIds = new Set<string>();
    for (const label of goldDataset.labels) {
      expect(label.id).toBeTruthy();
      expect(labelIds.has(label.id)).toBe(false);
      expect(scenarioIds.has(label.scenarioId)).toBe(true);
      expect(sourceIds.has(label.sourceId)).toBe(true);
      expect(label.sourceId).toBeTruthy();
      expect(label.evidence.excerpt).toBeTruthy();
      expect(['observed', 'inferred']).toContain(label.evidence.basis);
      if (label.evidence.basis === 'inferred') {
        expect(label.evidence.note).toBeTruthy();
      }
      expect(label.expectedOwnerRoleId).toMatch(/^role-/);
      expect(label.affectedRoleIds.length).toBeGreaterThan(0);
      expect(label.analystConfidence).toBeGreaterThanOrEqual(0);
      expect(label.analystConfidence).toBeLessThanOrEqual(1);
      expect(label.evidence.excerpt).not.toMatch(
        /https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s-]{8,}\d/,
      );
      labelIds.add(label.id);
    }
  });

  it('replays memo extraction without publishing before approval', () => {
    const initial = createBaseOperationalState();
    const proposed = proposeDelta(initial, createMemoTaskDelta());

    expect(proposed.tasks).toEqual(initial.tasks);

    const approved = approveDelta(
      proposed,
      'delta-memo-task',
      'role-event-manager',
      '2024-07-23T10:05:00+07:00',
    );
    expect(
      approved.tasks.some(task => task.id === 'task-complete-proposal'),
    ).toBe(true);
  });

  it('replays vendor failure into an operational readiness blocker', () => {
    const approved = approveDelta(
      proposeDelta(
        createBaseOperationalState(),
        createVendorFailureDelta(),
      ),
      'delta-vendor-failed',
      'role-technical-lead',
      '2024-08-23T05:35:00+07:00',
    );
    const readiness = calculateReadiness(
      approved,
      '2024-08-23T15:00:00+07:00',
    );

    expect(readiness.blockers).toContainEqual(
      expect.objectContaining({
        entityType: 'vendor',
        entityId: 'vendor-stage',
      }),
    );
  });

  it('replays approved and rejected cue corrections without version drift', () => {
    const initial = createBaseOperationalState();
    const approved = approveDelta(
      proposeDelta(initial, createCueCorrectionDelta()),
      'delta-cue-lighting',
      'role-show-caller',
      '2024-08-23T18:02:00+07:00',
    );
    const withRejectedProposal = proposeDelta(
      approved,
      createRejectedCueDelta(),
    );
    const rejected = rejectDelta(
      withRejectedProposal,
      'delta-cue-rejected',
      'role-show-caller',
      '2024-08-23T18:03:00+07:00',
    );

    expect(rejected.rundownVersions).toHaveLength(2);
    expect(rejected.activeRundownVersionId).toBe('rundown-v2');
  });

  it('replays confirmation resolution without clearing unrelated blockers', () => {
    const failedVendor = approveDelta(
      proposeDelta(
        createBaseOperationalState(),
        createVendorFailureDelta(),
      ),
      'delta-vendor-failed',
      'role-technical-lead',
      '2024-08-23T05:35:00+07:00',
    );
    const resolved = approveDelta(
      proposeDelta(failedVendor, createConfirmationResolvedDelta()),
      'delta-confirm-lighting',
      'role-technical-lead',
      '2024-08-23T09:46:00+07:00',
    );
    const readiness = calculateReadiness(
      resolved,
      '2024-08-23T15:00:00+07:00',
    );

    expect(readiness.blockers.map(item => item.entityId)).toEqual([
      'vendor-stage',
    ]);
  });
});
