import type { EventData, EventStage } from '@/store/eventStore';

/** Migrate legacy Firestore documents that still use `blueprint` field names. */
export function normalizeEvent(raw: Record<string, unknown>): EventData {
  const data = { ...raw } as Record<string, unknown>;

  if (data.blueprint && !data.masterPlan) {
    data.masterPlan = data.blueprint;
    delete data.blueprint;
  }

  if (data.stage === 'blueprint') {
    data.stage = 'masterplan' satisfies EventStage;
  }

  const budgetTracker = data.budgetTracker as { items?: Array<{ source?: string }> } | undefined;
  if (budgetTracker?.items) {
    budgetTracker.items = budgetTracker.items.map((item) =>
      item.source === 'ai-blueprint' ? { ...item, source: 'ai-masterplan' } : item
    );
    data.budgetTracker = budgetTracker;
  }

  if (!data.members) data.members = [];
  if (!data.memberUids) data.memberUids = [];
  if (!data.editorUids) data.editorUids = [];
  if (!data.commsLog) data.commsLog = [];

  return data as unknown as EventData;
}
