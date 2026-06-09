/**
 * RunIt — Deterministic DAG Execution Engine
 *
 * Layer 1: Deterministic Core — NO AI, NO external calls.
 *
 * Implements:
 *  - Topological sort (Kahn's algorithm)
 *  - Forward + Backward pass (critical path method)
 *  - BFS delay propagation from a changed node
 *  - Operational Confidence Score (OCS) calculation
 *  - Deterministic mitigation option generation
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DagTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'delayed';
  dependencies: string[];   // IDs of tasks that must complete before this one
  divisionId: string;
  divisionName?: string;

  // DAG-computed fields (set by engine, not AI)
  duration: number;            // in minutes
  slack: number;               // float time in minutes (0 = critical)
  isCritical: boolean;         // true if on the critical path
  earliestStart: number;       // earliest start in minutes from event T=0
  earliestFinish: number;      // earliestStart + duration
  latestStart: number;         // latestFinish - duration
  latestFinish: number;        // deadline-constrained latest completion
  delayMinutes: number;        // current delay applied to this task
  assigneeSilentMinutes: number; // minutes since last activity from assignee
  resolutionNotes?: string;    // AI or manual resolution notes
  attachments?: string[];      // Array of file URLs
}

export interface DivisionLoad {
  id: string;
  name: string;
  color: string;
  activeTasks: number;         // tasks currently in-progress or critical
  totalTasks: number;
  density: number;             // activeTasks / max(1, personnel)
  personnel: number;
  isOverloaded: boolean;       // density > 1.5
}

export interface OCSFactors {
  dependency: number;   // 0-100
  slack: number;        // 0-100
  manpower: number;     // 0-100
  incidents: number;    // 0-100
  silence: number;      // 0-100
}

export interface OCSResult {
  score: number;         // 0-100
  factors: OCSFactors;
  delta?: number;        // change from previous score
  explanation?: string;  // AI-generated, not computed here
}

export interface MitigationOption {
  id: string;
  title: string;
  description: string;
  timeSavingMinutes: number;
  confidence: number;       // 0-100 deterministic score
  affectedTaskIds: string[];
  action: 'compress' | 'reorder' | 'parallel' | 'drop';
  aiSummary?: string;       // optional, set by AI layer
  whatsappDraft?: string;   // auto-drafted message for field ops
}

export interface CrisisInjection {
  taskId: string;
  delayMinutes: number;
  incidentDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PropagationResult {
  updatedTasks: DagTask[];
  affectedTaskIds: string[];
  criticalPath: string[];
  newOCS: OCSResult;
  mitigationOptions: MitigationOption[];
  timelineExtensionMinutes: number;
}

// ─── Default duration heuristics ────────────────────────────────────────────

const PRIORITY_DURATION: Record<DagTask['priority'], number> = {
  critical: 120,
  high: 90,
  medium: 60,
  low: 30,
};

/**
 * Enrich raw tasks from the blueprint with DAG fields.
 * Called once when entering Execution Mode.
 */
export function enrichTasks(rawTasks: Omit<DagTask, 'duration' | 'slack' | 'isCritical' | 'earliestStart' | 'earliestFinish' | 'latestStart' | 'latestFinish' | 'delayMinutes' | 'assigneeSilentMinutes'>[]): DagTask[] {
  return rawTasks.map(t => ({
    ...t,
    duration: PRIORITY_DURATION[t.priority] ?? 60,
    slack: 0,
    isCritical: false,
    earliestStart: 0,
    earliestFinish: PRIORITY_DURATION[t.priority] ?? 60,
    latestStart: 0,
    latestFinish: PRIORITY_DURATION[t.priority] ?? 60,
    delayMinutes: 0,
    assigneeSilentMinutes: 0,
    status: t.status ?? 'pending',
  }));
}

// ─── Topological Sort (Kahn's Algorithm) ────────────────────────────────────

/**
 * Returns tasks in topological order (dependency-first).
 * Throws if a cycle is detected.
 */
export function topologicalSort(tasks: DagTask[]): DagTask[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map(tasks.map(t => [t.id, 0]));

  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (taskMap.has(depId)) {
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: DagTask[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const task = taskMap.get(id);
    if (task) sorted.push(task);

    // Find tasks that depend on this one
    for (const t of tasks) {
      if (t.dependencies.includes(id)) {
        const newDeg = (inDegree.get(t.id) ?? 0) - 1;
        inDegree.set(t.id, newDeg);
        if (newDeg === 0 && !visited.has(t.id)) {
          queue.push(t.id);
        }
      }
    }
  }

  if (sorted.length !== tasks.length) {
    // Cycle detected — return original order with warning
    console.warn('[DAG Engine] Cycle detected in task graph. Returning original order.');
    return [...tasks];
  }

  return sorted;
}

// ─── Critical Path Calculation (Forward + Backward Pass) ────────────────────

/**
 * Computes the critical path using the CPM (Critical Path Method).
 * Returns tasks with updated slack, isCritical, earliestStart/Finish,
 * latestStart/Finish.
 */
export function computeCriticalPath(tasks: DagTask[]): DagTask[] {
  const sorted = topologicalSort(tasks);
  const taskMap = new Map(sorted.map(t => [t.id, { ...t }]));

  // ── Forward Pass: Earliest Start & Finish ──────────────────────────────
  for (const task of sorted) {
    const t = taskMap.get(task.id)!;
    let maxDepFinish = 0;

    for (const depId of t.dependencies) {
      const dep = taskMap.get(depId);
      if (dep) {
        maxDepFinish = Math.max(maxDepFinish, dep.earliestFinish);
      }
    }

    t.earliestStart = maxDepFinish + t.delayMinutes;
    t.earliestFinish = t.earliestStart + t.duration;
    taskMap.set(task.id, t);
  }

  // ── Project Duration ────────────────────────────────────────────────────
  const projectDuration = Math.max(...[...taskMap.values()].map(t => t.earliestFinish));

  // ── Backward Pass: Latest Start & Finish ───────────────────────────────
  // Initialize: tasks with no successors get latestFinish = projectDuration
  for (const task of sorted) {
    taskMap.get(task.id)!.latestFinish = projectDuration;
  }

  const reverseSorted = [...sorted].reverse();
  for (const task of reverseSorted) {
    const t = taskMap.get(task.id)!;

    // Find successor tasks
    const successors = sorted.filter(s => s.dependencies.includes(task.id));
    if (successors.length > 0) {
      const minSuccessorLatestStart = Math.min(
        ...successors.map(s => taskMap.get(s.id)!.latestStart ?? Infinity)
      );
      t.latestFinish = minSuccessorLatestStart;
    }

    t.latestStart = t.latestFinish - t.duration;
    t.slack = t.latestStart - t.earliestStart;
    t.isCritical = Math.abs(t.slack) < 1; // tolerance of 1 minute
    taskMap.set(task.id, t);
  }

  return [...taskMap.values()];
}

/**
 * Returns the list of task IDs that form the critical path.
 */
export function getCriticalPath(tasks: DagTask[]): string[] {
  return tasks.filter(t => t.isCritical).map(t => t.id);
}

// ─── BFS Delay Propagation ───────────────────────────────────────────────────

/**
 * Propagates a delay from a changed task through its descendants via BFS.
 * Only re-computes tasks in the affected subgraph.
 * Returns: updated task list + set of affected task IDs.
 */
export function propagateDelay(
  tasks: DagTask[],
  changedTaskId: string,
  delayMinutes: number
): { updatedTasks: DagTask[]; affectedIds: Set<string> } {
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));
  const affected = new Set<string>();

  // Apply the delay to the changed task
  const changedTask = taskMap.get(changedTaskId);
  if (!changedTask) return { updatedTasks: tasks, affectedIds: affected };

  changedTask.delayMinutes = delayMinutes;
  changedTask.status = delayMinutes > 0 ? 'delayed' : changedTask.status;
  taskMap.set(changedTaskId, changedTask);
  affected.add(changedTaskId);

  // BFS to find all descendants
  const queue = [changedTaskId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    for (const task of taskMap.values()) {
      if (task.dependencies.includes(currentId) && !visited.has(task.id)) {
        affected.add(task.id);
        queue.push(task.id);
      }
    }
  }

  // Re-compute critical path on full task list
  const allTasks = [...taskMap.values()];
  const recomputed = computeCriticalPath(allTasks);

  return {
    updatedTasks: recomputed,
    affectedIds: affected,
  };
}

// ─── OCS Calculation ─────────────────────────────────────────────────────────

const OCS_WEIGHTS = {
  dependency: 0.30,
  slack: 0.25,
  manpower: 0.20,
  incidents: 0.15,
  silence: 0.10,
};

export function calculateOCS(
  tasks: DagTask[],
  divisions: DivisionLoad[],
  unresolvedIncidentSeverity: number,  // 0-10 sum of incident severity scores
  previousScore?: number
): OCSResult {
  if (tasks.length === 0) {
    return { score: 100, factors: { dependency: 100, slack: 100, manpower: 100, incidents: 100, silence: 100 } };
  }

  // Factor 1: Dependency Completion Rate (0-100)
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const dependency = Math.round((doneTasks / tasks.length) * 100);

  // Factor 2: Timeline Stability — based on critical path slack
  const criticalTasks = tasks.filter(t => t.isCritical);
  const totalSlack = criticalTasks.reduce((acc, t) => acc + Math.max(0, t.slack), 0);
  const maxPossibleSlack = tasks.reduce((acc, t) => acc + t.duration, 0) * 0.3; // 30% buffer baseline
  const slack = Math.min(100, Math.round((totalSlack / Math.max(1, maxPossibleSlack)) * 100));

  // Factor 3: Manpower Sufficiency
  const overloadedCount = divisions.filter(d => d.isOverloaded).length;
  const manpower = Math.max(0, Math.round(100 - (overloadedCount / Math.max(1, divisions.length)) * 100));

  // Factor 4: Unresolved Incidents (severity 0-10 per incident)
  const incidents = Math.max(0, Math.round(100 - unresolvedIncidentSeverity * 12));

  // Factor 5: Operational Silence (critical assignees silent > 30 min)
  const silentCritical = tasks.filter(t => t.isCritical && t.assigneeSilentMinutes > 30).length;
  const silence = Math.max(0, Math.round(100 - silentCritical * 25));

  const rawScore =
    dependency * OCS_WEIGHTS.dependency +
    slack * OCS_WEIGHTS.slack +
    manpower * OCS_WEIGHTS.manpower +
    incidents * OCS_WEIGHTS.incidents +
    silence * OCS_WEIGHTS.silence;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    score,
    factors: { dependency, slack, manpower, incidents, silence },
    delta: previousScore !== undefined ? score - previousScore : undefined,
  };
}

// ─── Division Load Calculation ────────────────────────────────────────────────

export function calculateDivisionLoad(
  tasks: DagTask[],
  divisionMeta: { id: string; name: string; color: string; personnel?: number }[]
): DivisionLoad[] {
  return divisionMeta.map(div => {
    const divTasks = tasks.filter(t => t.divisionId === div.id);
    const activeTasks = divTasks.filter(t => t.isCritical || t.status === 'in-progress').length;
    const personnel = div.personnel ?? Math.max(1, Math.ceil(divTasks.length / 3));
    const density = activeTasks / personnel;

    return {
      id: div.id,
      name: div.name,
      color: div.color,
      activeTasks,
      totalTasks: divTasks.length,
      density,
      personnel,
      isOverloaded: density > 1.5,
    };
  });
}

// ─── Deterministic Mitigation Options ────────────────────────────────────────

/**
 * Given the current task graph after a crisis injection,
 * generate 2-3 deterministic mitigation options.
 * These are structurally validated before AI summarizes them.
 */
export function generateMitigationOptions(
  tasks: DagTask[],
  affectedIds: Set<string>,
  delayMinutes: number
): MitigationOption[] {
  const options: MitigationOption[] = [];
  const criticalAffected = tasks.filter(t => affectedIds.has(t.id) && t.isCritical);
  const nonCriticalTasks = tasks.filter(t => !t.isCritical && t.status === 'pending');

  // ── Option A: Compress downstream durations ─────────────────────────────
  if (criticalAffected.length > 0) {
    const compressibleTasks = criticalAffected.filter(t => t.duration > 30);
    const timeSaved = compressibleTasks.reduce((acc, t) => acc + Math.floor(t.duration * 0.25), 0);
    const confidence = Math.min(90, Math.max(50, 85 - (delayMinutes - timeSaved) * 0.5));

    if (timeSaved > 0) {
      options.push({
        id: 'mit-a',
        title: 'Compress Downstream Durations',
        description: `Reduce duration of ${compressibleTasks.length} downstream tasks by 25% each. Recovers ${timeSaved} minutes.`,
        timeSavingMinutes: timeSaved,
        confidence: Math.round(confidence),
        affectedTaskIds: compressibleTasks.map(t => t.id),
        action: 'compress',
      });
    }
  }

  // ── Option B: Reorder non-dependent tasks ───────────────────────────────
  const reorderCandidates = nonCriticalTasks.filter(t => {
    // No dependency on any affected task
    return !t.dependencies.some(dep => affectedIds.has(dep));
  }).slice(0, 3);

  if (reorderCandidates.length > 0) {
    const timeSaved = Math.min(delayMinutes, reorderCandidates.reduce((acc, t) => acc + t.duration, 0));
    const confidence = Math.min(95, Math.max(60, 90 - (delayMinutes - timeSaved) * 0.3));

    options.push({
      id: 'mit-b',
      title: 'Reorder Non-Dependent Tasks',
      description: `Move ${reorderCandidates.length} non-critical tasks earlier to absorb the delay window. Full ${Math.min(timeSaved, delayMinutes)}-minute recovery possible.`,
      timeSavingMinutes: timeSaved,
      confidence: Math.round(confidence),
      affectedTaskIds: reorderCandidates.map(t => t.id),
      action: 'reorder',
    });
  }

  // ── Option C: Parallel execution ────────────────────────────────────────
  const parallelCandidates = nonCriticalTasks.filter(t =>
    !t.dependencies.some(dep => affectedIds.has(dep)) && !reorderCandidates.includes(t)
  ).slice(0, 2);

  if (parallelCandidates.length > 1) {
    const timeSaved = Math.max(...parallelCandidates.map(t => t.duration));
    const confidence = Math.max(45, 75 - delayMinutes * 0.4);

    options.push({
      id: 'mit-c',
      title: 'Parallel Execution Sprint',
      description: `Run ${parallelCandidates.length} independent tasks in parallel. Requires extra personnel reallocation. Saves up to ${timeSaved} minutes.`,
      timeSavingMinutes: timeSaved,
      confidence: Math.round(confidence),
      affectedTaskIds: parallelCandidates.map(t => t.id),
      action: 'parallel',
    });
  }

  // Sort by confidence descending, cap at 3 options
  return options.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ─── Full Crisis Response ─────────────────────────────────────────────────────

/**
 * One-call orchestration: inject crisis, propagate, compute OCS, generate options.
 */
export function processCrisisInjection(
  tasks: DagTask[],
  divisions: DivisionLoad[],
  crisis: CrisisInjection,
  previousOCS: number,
  unresolvedIncidentSeverity: number
): PropagationResult {
  // 1. Propagate the delay
  const { updatedTasks, affectedIds } = propagateDelay(tasks, crisis.taskId, crisis.delayMinutes);

  // 2. Find new critical path
  const criticalPath = getCriticalPath(updatedTasks);

  // 3. Calculate timeline extension
  const originalMax = Math.max(...tasks.map(t => t.earliestFinish));
  const newMax = Math.max(...updatedTasks.map(t => t.earliestFinish));
  const timelineExtensionMinutes = Math.max(0, newMax - originalMax);

  // 4. Recalculate division loads
  const updatedDivisions = calculateDivisionLoad(updatedTasks, divisions.map(d => ({
    id: d.id,
    name: d.name,
    color: d.color,
    personnel: d.personnel,
  })));

  // 5. Calculate new OCS
  const newOCS = calculateOCS(
    updatedTasks,
    updatedDivisions,
    unresolvedIncidentSeverity + (crisis.severity === 'critical' ? 5 : crisis.severity === 'high' ? 3 : 1),
    previousOCS
  );

  // 6. Generate mitigation options
  const mitigationOptions = generateMitigationOptions(updatedTasks, affectedIds, crisis.delayMinutes);

  return {
    updatedTasks,
    affectedTaskIds: [...affectedIds],
    criticalPath,
    newOCS,
    mitigationOptions,
    timelineExtensionMinutes,
  };
}

// ─── Apply Mitigation ─────────────────────────────────────────────────────────

/**
 * Apply a selected mitigation option to the task graph.
 * Returns the updated task list after mitigation.
 */
export function applyMitigation(
  tasks: DagTask[],
  option: MitigationOption
): DagTask[] {
  const taskMap = new Map(tasks.map(t => [t.id, { ...t }]));

  if (option.action === 'compress') {
    for (const taskId of option.affectedTaskIds) {
      const task = taskMap.get(taskId);
      if (task) {
        task.duration = Math.max(15, Math.floor(task.duration * 0.75));
        taskMap.set(taskId, task);
      }
    }
  } else if (option.action === 'reorder') {
    // Reset delay on the task by moving affected tasks to start earlier
    for (const taskId of option.affectedTaskIds) {
      const task = taskMap.get(taskId);
      if (task) {
        task.earliestStart = Math.max(0, task.earliestStart - option.timeSavingMinutes);
        taskMap.set(taskId, task);
      }
    }
  } else if (option.action === 'parallel') {
    // Mark tasks as in-progress (parallel execution started)
    for (const taskId of option.affectedTaskIds) {
      const task = taskMap.get(taskId);
      if (task && task.status === 'pending') {
        task.status = 'in-progress';
        taskMap.set(taskId, task);
      }
    }
  }

  return computeCriticalPath([...taskMap.values()]);
}
