import type {
  OperationalState,
  ReadinessFinding,
  ReadinessSnapshot,
} from './types';

function activeRundownVersion(state: OperationalState): number {
  return state.rundownVersions.find(
    version => version.id === state.activeRundownVersionId,
  )?.version ?? 0;
}

function isOverdue(dueAt: string | undefined, asOf: string): boolean {
  if (!dueAt) return false;
  const due = Date.parse(dueAt);
  const current = Date.parse(asOf);
  return Number.isFinite(due) && Number.isFinite(current) && due < current;
}

export function calculateReadiness(
  state: OperationalState,
  asOf: string,
): ReadinessSnapshot {
  const blockers: ReadinessFinding[] = [];
  const warnings: ReadinessFinding[] = [];

  for (const confirmation of state.confirmations) {
    if (
      confirmation.blocksReadiness &&
      confirmation.status !== 'confirmed' &&
      confirmation.status !== 'cancelled'
    ) {
      blockers.push({
        id: `confirmation:${confirmation.id}`,
        type: 'blocker',
        entityType: 'confirmation',
        entityId: confirmation.id,
        reason: `Confirmation "${confirmation.requirement}" is ${confirmation.status}.`,
        deduction: 15,
      });
    }
  }

  for (const commitment of state.vendorCommitments) {
    if (
      commitment.blocksReadiness &&
      commitment.deliveryStatus === 'failed'
    ) {
      blockers.push({
        id: `vendor:${commitment.id}`,
        type: 'blocker',
        entityType: 'vendor',
        entityId: commitment.id,
        reason: `Vendor commitment "${commitment.name}" has failed.`,
        deduction: 25,
      });
    }
  }

  for (const requirement of state.readinessRequirements) {
    if (
      requirement.mandatory &&
      requirement.status === 'pending' &&
      isOverdue(requirement.dueAt, asOf)
    ) {
      blockers.push({
        id: `requirement:${requirement.id}`,
        type: 'blocker',
        entityType: 'requirement',
        entityId: requirement.id,
        reason: `Mandatory requirement "${requirement.title}" is overdue.`,
        deduction: 20,
      });
    }
  }

  for (const delta of state.deltas) {
    if (
      delta.status === 'proposed' &&
      (delta.impact === 'high' || delta.impact === 'critical')
    ) {
      warnings.push({
        id: `delta:${delta.id}`,
        type: 'warning',
        entityType: 'delta',
        entityId: delta.id,
        reason: `High-impact ${delta.kind} change ${delta.id} is awaiting review.`,
        deduction: 5,
      });
    }
  }

  const deductions = [...blockers, ...warnings].reduce(
    (total, finding) => total + finding.deduction,
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const explanations = [...blockers, ...warnings].map(
    finding => `-${finding.deduction}: ${finding.reason}`,
  );

  return {
    calculatedAt: asOf,
    rundownVersion: activeRundownVersion(state),
    score,
    blockers,
    warnings,
    explanations,
  };
}

