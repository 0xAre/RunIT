'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import {
  enrichTasks,
  computeCriticalPath,
  calculateDivisionLoad,
  calculateOCS,
  applyMitigation,
  type DagTask,
  type MitigationOption,
} from '@/lib/dag-engine';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Radio, Zap, AlertTriangle, CheckCircle, TrendingDown,
  TrendingUp, Shield, Activity, Users, Clock, ChevronRight,
  X, Play, RotateCcw, Target, Cpu, Layers, Camera, Upload, MessageCircle, Copy
} from 'lucide-react';

// ── Pre-built demo crisis scenarios ─────────────────────────────────────────

const CRISIS_TEMPLATES = [
  {
    id: 'power',
    label: 'Power Failure',
    description: 'Main stage power failure — 45 min recovery',
    delayMinutes: 45,
    severity: 'critical' as const,
    color: 'var(--color-red)',
    icon: Zap,
  },
  {
    id: 'speaker',
    label: 'Speaker Delay',
    description: 'Keynote speaker delayed by 30 minutes',
    delayMinutes: 30,
    severity: 'high' as const,
    color: 'var(--color-amber)',
    icon: Users,
  },
  {
    id: 'catering',
    label: 'Catering Delay',
    description: 'Catering team late — 20 min delay on break',
    delayMinutes: 20,
    severity: 'medium' as const,
    color: 'var(--color-teal)',
    icon: Clock,
  },
  {
    id: 'av',
    label: 'AV Failure',
    description: 'Sound system interference — tech team on it',
    delayMinutes: 15,
    severity: 'high' as const,
    color: 'var(--color-amber)',
    icon: Activity,
  },
];

// ── OCS Gauge Component ──────────────────────────────────────────────────────

function OCSGauge({ score, delta }: { score: number; delta?: number }) {
  const color =
    score >= 80 ? 'var(--color-mint)' :
    score >= 60 ? 'var(--color-teal)' :
    score >= 40 ? 'var(--color-amber)' :
    'var(--color-red)';

  const label =
    score >= 80 ? 'OPERATIONAL' :
    score >= 60 ? 'REDUCED' :
    score >= 40 ? 'CRITICAL' :
    'EMERGENCY';

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle cx="70" cy="70" r="54" fill="none" stroke="var(--color-ground-2)" strokeWidth="10" />
          {/* Score ring */}
          <circle
            cx="70" cy="70" r="54" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.6s ease' }}
          />
        </svg>
        {/* Score text */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.span
            key={score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: '2rem', fontWeight: 800, color,
              lineHeight: 1, fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            {score}
          </motion.span>
          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>
            OCS
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.25rem 0.75rem', borderRadius: '20px',
        background: `${color}15`, border: `1px solid ${color}40`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: score < 60 ? 'pulse-ring 1.5s infinite' : 'none',
        }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.08em' }}>
          {label}
        </span>
      </div>

      {/* Delta indicator */}
      {delta !== undefined && delta !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.75rem', fontWeight: 600,
            color: delta > 0 ? 'var(--color-mint)' : 'var(--color-red)',
          }}
        >
          {delta > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {delta > 0 ? '+' : ''}{delta} pts
        </motion.div>
      )}
    </div>
  );
}

// ── OCS Factor Bar ───────────────────────────────────────────────────────────

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.7rem', color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'var(--color-ground-2)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ── DAG Task Node ────────────────────────────────────────────────────────────

function TaskNode({ data }: {
  data: {
    label: string; status: DagTask['status']; isCritical: boolean;
    slack: number; divColor: string; priority: string;
    onStatusChange: (status: DagTask['status']) => void;
  }
}) {
  const bgColor =
    data.status === 'done' ? 'rgba(37,208,171,0.08)' :
    data.status === 'delayed' ? 'rgba(255,99,105,0.12)' :
    data.status === 'in-progress' ? 'rgba(251,191,36,0.08)' :
    'var(--color-ground-1)';

  const borderColor =
    data.isCritical && data.status !== 'done' ? 'var(--color-red)' :
    data.status === 'done' ? 'var(--color-mint)' :
    data.status === 'delayed' ? 'var(--color-red)' :
    data.status === 'in-progress' ? 'var(--color-amber)' :
    'var(--color-border)';

  const statusIcon =
    data.status === 'done' ? '✓' :
    data.status === 'delayed' ? '!' :
    data.status === 'in-progress' ? '▶' : '○';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderTop: `3px solid ${data.isCritical && data.status !== 'done' ? 'var(--color-red)' : data.divColor}`,
        borderRadius: 8, padding: '0.75rem',
        minWidth: 160, maxWidth: 200,
        boxShadow: data.isCritical && data.status !== 'done' ? `0 0 12px ${borderColor}30` : '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer', userSelect: 'none',
        animation: data.isCritical && data.status === 'delayed' ? 'node-pulse 2s infinite' : 'none',
      }}
      onClick={() => {
        const next: Record<string, DagTask['status']> = {
          pending: 'in-progress', 'in-progress': 'done', done: 'pending', delayed: 'in-progress', blocked: 'in-progress'
        };
        data.onStatusChange(next[data.status] || 'pending');
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', lineHeight: 1.3, fontWeight: 500, flex: 1, paddingRight: '0.5rem' }}>
          {data.label}
        </p>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700,
          color: borderColor,
          flexShrink: 0,
        }}>{statusIcon}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.65rem', padding: '0.1rem 0.375rem', borderRadius: 4,
          background: `${borderColor}15`, color: borderColor, fontWeight: 600,
          textTransform: 'capitalize',
        }}>{data.status}</span>
        {data.isCritical && data.status !== 'done' && (
          <span style={{ fontSize: '0.6rem', color: 'var(--color-red)', fontWeight: 700, letterSpacing: '0.05em' }}>CRIT</span>
        )}
        {data.slack > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>+{Math.round(data.slack)}m</span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

// ── Main Control Room ────────────────────────────────────────────────────────

export default function ControlRoomPage() {
  const {
    currentEvent, initializeExecution, updateDagTask,
    applyPropagationResult, setActiveIncident, applyMitigationOption,
    resolveIncident, updateOCS,
  } = useEventStore();

  const execution = currentEvent?.execution;
  const blueprint = currentEvent?.blueprint;

  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [selectedCrisis, setSelectedCrisis] = useState(CRISIS_TEMPLATES[0]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMitigationPanel, setShowMitigationPanel] = useState(false);
  const [executingMitigation, setExecutingMitigation] = useState<string | null>(null);
  const previousOCSRef = useRef<number>(100);

  const [crisisTab, setCrisisTab] = useState<'manual' | 'photo'>('manual');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    
    setIsDiagnosing(true);
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await fetch('/api/ai/diagnose-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, tasks: execution?.dagTasks || [] }),
        });
        const result = await res.json();
        
        if (res.ok) {
          setSelectedCrisis({
            id: 'photo-crisis',
            label: 'AI Field Diagnosis',
            description: result.description,
            delayMinutes: result.delayMinutes,
            severity: result.severity,
            color: 'var(--color-red)',
            icon: Camera,
            taskIdOverride: result.taskId,
          } as any);
        } else {
          alert('Diagnosis failed: ' + result.error);
        }
      } catch (err) {
        alert('Network error during diagnosis.');
      } finally {
        setIsDiagnosing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Initialize execution state from blueprint ─────────────────────────────
  useEffect(() => {
    if (!blueprint || execution?.isLive) return;

    const rawTasks = blueprint.divisions.flatMap(div =>
      div.tasks.map(t => ({ ...t, divisionName: div.name }))
    );

    const enriched = enrichTasks(rawTasks);
    const withCriticalPath = computeCriticalPath(enriched);

    const divMeta = blueprint.divisions.map(d => ({
      id: d.id, name: d.name, color: d.color, personnel: d.personnel ?? 3,
    }));
    const divLoads = calculateDivisionLoad(withCriticalPath, divMeta);
    const ocs = calculateOCS(withCriticalPath, divLoads, 0);

    initializeExecution(
      withCriticalPath,
      divLoads,
      ocs,
      withCriticalPath.filter(t => t.isCritical).map(t => t.id)
    );
  }, [blueprint, execution?.isLive]);

  // ── Keep OCS current when tasks change ───────────────────────────────────
  useEffect(() => {
    if (!execution) return;
    const prev = previousOCSRef.current;
    previousOCSRef.current = execution.ocs.score;
  }, [execution?.ocs.score]);

  // ── Show mitigation panel when crisis active ──────────────────────────────
  useEffect(() => {
    if (execution?.activeIncident && execution.mitigationOptions.length > 0) {
      setShowMitigationPanel(true);
    }
  }, [execution?.activeIncident, execution?.mitigationOptions.length]);

  // ── Task status update → re-propagate OCS ────────────────────────────────
  const handleTaskStatusChange = useCallback((taskId: string, status: DagTask['status']) => {
    if (!execution) return;
    updateDagTask(taskId, { status });

    // Re-compute OCS from current task state
    const updatedTasks = execution.dagTasks.map(t =>
      t.id === taskId ? { ...t, status } : t
    );
    const divMeta = execution.divisionLoads.map(d => ({ id: d.id, name: d.name, color: d.color, personnel: d.personnel }));
    const newDivLoads = calculateDivisionLoad(updatedTasks, divMeta);
    const newOCS = calculateOCS(updatedTasks, newDivLoads, execution.unresolvedIncidentSeverity, execution.ocs.score);
    updateOCS(newOCS);
  }, [execution, updateDagTask, updateOCS]);

  // ── Crisis injection handler ──────────────────────────────────────────────
  const handleInjectCrisis = useCallback(async () => {
    if (!execution || !currentEvent) return;
    setIsProcessing(true);
    setShowCrisisModal(false);

    // Find a critical task to inject into (or first pending task) or use override
    const targetTask = execution.dagTasks.find(t => t.id === (selectedCrisis as any).taskIdOverride)
      || execution.dagTasks.find(t => t.isCritical && t.status === 'pending')
      || execution.dagTasks.find(t => t.status === 'pending')
      || execution.dagTasks[0];

    if (!targetTask) { setIsProcessing(false); return; }

    const incident = {
      id: `inc-${Date.now()}`,
      description: selectedCrisis.description,
      severity: selectedCrisis.severity,
      injectedAt: new Date().toLocaleTimeString('en-US', { hour12: false }),
      taskId: targetTask.id,
      delayMinutes: selectedCrisis.delayMinutes,
      resolved: false,
    };

    setActiveIncident(incident);

    try {
      const res = await fetch('/api/dag/propagate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: execution.dagTasks,
          divisions: execution.divisionLoads,
          crisis: {
            taskId: targetTask.id,
            delayMinutes: selectedCrisis.delayMinutes,
            incidentDescription: selectedCrisis.description,
            severity: selectedCrisis.severity,
          },
          previousOCS: execution.ocs.score,
          unresolvedIncidentSeverity: execution.unresolvedIncidentSeverity,
          enrichWithAI: true,
        }),
      });

      const result = await res.json();
      if (result.updatedTasks) {
        applyPropagationResult(result);
      }
    } catch {
      // Fallback: run propagation client-side
      const { processCrisisInjection } = await import('@/lib/dag-engine');
      const result = processCrisisInjection(
        execution.dagTasks,
        execution.divisionLoads,
        {
          taskId: targetTask.id,
          delayMinutes: selectedCrisis.delayMinutes,
          incidentDescription: selectedCrisis.description,
          severity: selectedCrisis.severity,
        },
        execution.ocs.score,
        execution.unresolvedIncidentSeverity
      );
      applyPropagationResult(result);
    } finally {
      setIsProcessing(false);
    }
  }, [execution, currentEvent, selectedCrisis, setActiveIncident, applyPropagationResult]);

  // ── Apply mitigation ──────────────────────────────────────────────────────
  const handleApplyMitigation = useCallback(async (option: MitigationOption) => {
    if (!execution) return;
    setExecutingMitigation(option.id);

    try {
      const updatedTasks = applyMitigation(execution.dagTasks, option);
      const divMeta = execution.divisionLoads.map(d => ({ id: d.id, name: d.name, color: d.color, personnel: d.personnel }));
      const newDivLoads = calculateDivisionLoad(updatedTasks, divMeta);
      const newOCS = calculateOCS(updatedTasks, newDivLoads, Math.max(0, execution.unresolvedIncidentSeverity - 2), execution.ocs.score);

      await new Promise(r => setTimeout(r, 800)); // visual pause for effect
      applyMitigationOption(option.id, updatedTasks, newOCS);
      setShowMitigationPanel(false);
    } finally {
      setExecutingMitigation(null);
    }
  }, [execution, applyMitigationOption]);

  // ── Build React Flow graph ────────────────────────────────────────────────
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!execution?.dagTasks || !blueprint) return { rfNodes: [], rfEdges: [] };

    const tasks = execution.dagTasks;
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Lay out tasks by division, left-to-right
    blueprint.divisions.forEach((div, divIdx) => {
      const divTasks = tasks.filter(t => t.divisionId === div.id);
      const colX = divIdx * 220;

      divTasks.forEach((task, taskIdx) => {
        nodes.push({
          id: task.id,
          type: 'taskNode',
          position: { x: colX, y: taskIdx * 130 },
          data: {
            label: task.title,
            status: task.status,
            isCritical: task.isCritical,
            slack: task.slack,
            divColor: div.color,
            priority: task.priority,
            onStatusChange: (s: DagTask['status']) => handleTaskStatusChange(task.id, s),
          },
        });

        task.dependencies.forEach(depId => {
          const isCriticalEdge = task.isCritical && tasks.find(t => t.id === depId)?.isCritical;
          edges.push({
            id: `e-${depId}-${task.id}`,
            source: depId,
            target: task.id,
            animated: isCriticalEdge,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isCriticalEdge ? 'var(--color-red)' : div.color,
            },
            style: {
              stroke: isCriticalEdge ? 'var(--color-red)' : div.color,
              strokeWidth: isCriticalEdge ? 2.5 : 1.5,
              opacity: isCriticalEdge ? 1 : 0.5,
            },
          });
        });
      });
    });

    return { rfNodes: nodes, rfEdges: edges };
  }, [execution?.dagTasks, blueprint, handleTaskStatusChange]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!blueprint) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.6,
      }}>
        <Cpu size={40} color="var(--color-text-muted)" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>No Event Loaded</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Generate a blueprint first to initialize the Control Room.</p>
        </div>
      </div>
    );
  }

  const ocs = execution?.ocs;
  const incident = execution?.activeIncident;
  const mitigationOptions = execution?.mitigationOptions ?? [];
  const divisionLoads = execution?.divisionLoads ?? [];
  const timelineExt = execution?.timelineExtensionMinutes ?? 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-ground-0)', position: 'relative' }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-ground-1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.4rem', background: 'rgba(37,208,171,0.12)', borderRadius: 8 }}>
            <Radio size={18} color="var(--color-mint)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Control Room
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {currentEvent?.name} — Live Execution Intelligence
            </p>
          </div>

          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.2rem 0.625rem', borderRadius: 20,
            background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)',
          }}>
            <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-mint)' }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-mint)', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
        </div>

        {/* Crisis injection button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {incident && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.875rem', borderRadius: 20,
              background: 'rgba(255,99,105,0.12)', border: '1px solid var(--color-red)',
              animation: 'pulse-border 2s infinite',
            }}>
              <Zap size={13} color="var(--color-red)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-red)', letterSpacing: '0.05em' }}>
                CRISIS ACTIVE
              </span>
            </div>
          )}
          {timelineExt > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.3rem 0.75rem', borderRadius: 20,
              background: 'rgba(251,191,36,0.1)', border: '1px solid var(--color-amber)',
              fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-amber)',
            }}>
              <Clock size={12} />
              +{timelineExt}m extension
            </div>
          )}
          {!incident && (
            <button
              onClick={() => setShowCrisisModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(255,99,105,0.08)', border: '1px solid rgba(255,99,105,0.4)',
                borderRadius: 8, cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-red)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,99,105,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,99,105,0.08)'; }}
            >
              <Zap size={14} />
              Inject Crisis
            </button>
          )}
          {incident && (
            <button
              onClick={() => { resolveIncident(); setShowMitigationPanel(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(37,208,171,0.08)', border: '1px solid rgba(37,208,171,0.4)',
                borderRadius: 8, cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-mint)',
                transition: 'all 0.15s',
              }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid: DAG left, panels right ──────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>

        {/* DAG Visualization */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            style={{ background: 'var(--color-ground-0)' }}
            nodesDraggable
          >
            <Background color="var(--color-ground-2)" gap={20} size={1} />
            <Controls style={{
              background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
              borderRadius: 8,
            }} />
            <MiniMap
              style={{
                background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}
              nodeColor={(n) => {
                const status = n.data?.status;
                if (status === 'done') return 'var(--color-mint)';
                if (status === 'delayed') return 'var(--color-red)';
                if (n.data?.isCritical) return 'var(--color-red)';
                return 'var(--color-ground-4)';
              }}
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>

          {/* Legend overlay */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 5,
            background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '0.625rem 0.875rem',
            display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: 340,
          }}>
            {[
              { label: 'Critical Path', color: 'var(--color-red)' },
              { label: 'In Progress', color: 'var(--color-amber)' },
              { label: 'Complete', color: 'var(--color-mint)' },
              { label: 'Delayed', color: 'var(--color-red)', dash: true },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{ width: 20, height: 2, background: item.color, opacity: item.dash ? 0.6 : 1 }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel stack */}
        <div style={{
          borderLeft: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--color-ground-1)',
        }}>

          {/* OCS Panel */}
          <div style={{
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              Operational Confidence Score
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <OCSGauge score={ocs?.score ?? 100} delta={ocs?.delta} />
            </div>

            {ocs?.factors && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { label: 'Completion', value: ocs.factors.dependency, color: 'var(--color-mint)' },
                  { label: 'Timeline Slack', value: ocs.factors.slack, color: 'var(--color-teal)' },
                  { label: 'Manpower', value: ocs.factors.manpower, color: 'var(--color-amber)' },
                  { label: 'Incidents', value: ocs.factors.incidents, color: 'var(--color-red)' },
                  { label: 'Comm. Activity', value: ocs.factors.silence, color: '#848dff' },
                ].map(f => (
                  <FactorBar key={f.label} {...f} />
                ))}
              </div>
            )}
          </div>

          {/* Division Load Panel */}
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem',
            }}>
              Division Status
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {divisionLoads.slice(0, 5).map(div => {
                const pct = Math.min(100, Math.round(div.density * 100));
                const col = div.isOverloaded ? 'var(--color-red)' : pct > 70 ? 'var(--color-amber)' : 'var(--color-mint)';
                return (
                  <div key={div.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: div.color }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{div.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {div.isOverloaded && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--color-red)', fontWeight: 700, letterSpacing: '0.05em' }}>OVERLOADED</span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: col, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 3, background: 'var(--color-ground-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', background: col, borderRadius: 3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mitigation panel / incident feed */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <AnimatePresence mode="wait">
              {incident && showMitigationPanel && mitigationOptions.length > 0 ? (
                <motion.div
                  key="mitigation"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{
                      fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-red)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      Mitigation Options
                    </p>
                    <button
                      onClick={() => setShowMitigationPanel(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Active incident summary */}
                  <div style={{
                    background: 'rgba(255,99,105,0.08)', border: '1px solid rgba(255,99,105,0.3)',
                    borderRadius: 8, padding: '0.75rem 0.875rem',
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <AlertTriangle size={14} color="var(--color-red)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-red)', fontWeight: 600, marginBottom: '0.25rem' }}>
                          {incident.description}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          Logged {incident.injectedAt} · {incident.delayMinutes}min delay
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  {mitigationOptions.map((opt) => (
                    <motion.div
                      key={opt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: 'var(--color-ground-0)', border: '1px solid var(--color-border)',
                        borderRadius: 8, padding: '0.875rem', cursor: 'pointer',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-mint)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 12px rgba(37,208,171,0.15)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1, paddingRight: '0.5rem' }}>
                          {opt.title}
                        </p>
                        <div style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 12,
                          background: opt.confidence >= 80 ? 'rgba(37,208,171,0.15)' : 'rgba(251,191,36,0.15)',
                          color: opt.confidence >= 80 ? 'var(--color-mint)' : 'var(--color-amber)',
                          whiteSpace: 'nowrap',
                        }}>
                          {opt.confidence}%
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                        {opt.aiSummary || opt.description}
                      </p>
                      
                      {opt.whatsappDraft && (
                        <div style={{
                          background: 'rgba(37,208,171,0.06)', border: '1px solid rgba(37,208,171,0.2)',
                          borderRadius: 8, padding: '0.75rem', marginBottom: '1rem',
                          display: 'flex', flexDirection: 'column', gap: '0.5rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-mint)' }}>
                              <MessageCircle size={14} />
                              <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>Auto-Draft: WhatsApp</span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(opt.whatsappDraft || '');
                                alert('Copied to clipboard!');
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                            {opt.whatsappDraft}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-teal)' }}>
                          Saves ~{opt.timeSavingMinutes}min
                        </span>
                        <button
                          onClick={() => handleApplyMitigation(opt)}
                          disabled={!!executingMitigation}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.35rem 0.75rem', borderRadius: 6,
                            background: 'var(--color-mint)', border: 'none',
                            color: '#000', cursor: executingMitigation ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem', fontWeight: 700,
                            opacity: executingMitigation && executingMitigation !== opt.id ? 0.4 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {executingMitigation === opt.id ? (
                            <span>Executing...</span>
                          ) : (
                            <>
                              <Play size={10} fill="currentColor" />
                              Execute
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                >
                  <p style={{
                    fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)',
                    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem',
                  }}>
                    Task Status
                  </p>

                  {/* Task summary rows */}
                  {execution?.dagTasks.slice(0, 8).map(task => (
                    <div key={task.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.5rem 0.625rem', borderRadius: 6,
                      background: task.isCritical && task.status !== 'done'
                        ? 'rgba(255,99,105,0.06)' : 'var(--color-ground-0)',
                      border: `1px solid ${task.isCritical && task.status !== 'done' ? 'rgba(255,99,105,0.2)' : 'var(--color-border)'}`,
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background:
                          task.status === 'done' ? 'var(--color-mint)' :
                          task.status === 'delayed' ? 'var(--color-red)' :
                          task.status === 'in-progress' ? 'var(--color-amber)' :
                          task.isCritical ? 'var(--color-red)' : 'var(--color-ground-4)',
                      }} />
                      <p style={{
                        fontSize: '0.75rem', color: 'var(--color-text-secondary)',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </p>
                      {task.isCritical && task.status !== 'done' && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-red)', fontWeight: 700 }}>CRIT</span>
                      )}
                    </div>
                  ))}

                  {(execution?.dagTasks.length ?? 0) > 8 && (
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                      +{(execution?.dagTasks.length ?? 0) - 8} more tasks in graph
                    </p>
                  )}

                  {incident && mitigationOptions.length > 0 && !showMitigationPanel && (
                    <button
                      onClick={() => setShowMitigationPanel(true)}
                      style={{
                        marginTop: '0.5rem', padding: '0.625rem', borderRadius: 8,
                        background: 'rgba(255,99,105,0.1)', border: '1px solid var(--color-red)',
                        color: 'var(--color-red)', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 600, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        animation: 'pulse-border 2s infinite',
                      }}
                    >
                      <Shield size={14} />
                      View {mitigationOptions.length} Mitigation Options
                      <ChevronRight size={14} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Crisis Injection Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showCrisisModal && (
          <motion.div
            key="crisis-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
            }}
            onClick={e => e.target === e.currentTarget && setShowCrisisModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: 'var(--color-ground-1)', border: '1px solid var(--color-red)',
                borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 500,
                boxShadow: '0 0 60px rgba(255,99,105,0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-red)', marginBottom: '0.25rem' }}>
                    Inject Crisis Scenario
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Select a disruption to propagate through the execution graph
                  </p>
                </div>
                <button
                  onClick={() => setShowCrisisModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <button
                  onClick={() => setCrisisTab('manual')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 600, padding: '0.5rem 0',
                    color: crisisTab === 'manual' ? 'var(--color-red)' : 'var(--color-text-muted)',
                    borderBottom: crisisTab === 'manual' ? '2px solid var(--color-red)' : '2px solid transparent',
                  }}
                >
                  Manual Injection
                </button>
                <button
                  onClick={() => setCrisisTab('photo')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 600, padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: crisisTab === 'photo' ? 'var(--color-red)' : 'var(--color-text-muted)',
                    borderBottom: crisisTab === 'photo' ? '2px solid var(--color-red)' : '2px solid transparent',
                  }}
                >
                  <Camera size={16} /> Photo Diagnosis
                </button>
              </div>

              {crisisTab === 'manual' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {CRISIS_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedCrisis(template)}
                      style={{
                        padding: '1rem 1.25rem', textAlign: 'left', borderRadius: 8,
                        border: `1px solid ${selectedCrisis.id === template.id ? template.color : 'var(--color-border)'}`,
                        background: selectedCrisis.id === template.id ? `${template.color}10` : 'var(--color-ground-0)',
                        cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <template.icon size={16} color={template.color} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: template.color, marginBottom: '0.2rem' }}>
                            {template.label}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {template.description}
                          </p>
                        </div>
                        <div style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                          borderRadius: 12, background: `${template.color}15`, color: template.color,
                        }}>
                          {template.delayMinutes}min
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    padding: '3rem', border: '2px dashed var(--color-border)', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--color-ground-0)', transition: 'border 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-red)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <Upload size={32} color="var(--color-text-muted)" />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Click to upload incident photo</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>AI will diagnose the delay and affected task</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                  </label>
                  
                  {isDiagnosing && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                      <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red)' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Analyzing operational impact...</span>
                    </div>
                  )}

                  {!isDiagnosing && selectedCrisis.id === 'photo-crisis' && (
                    <div style={{
                      padding: '1rem 1.25rem', textAlign: 'left', borderRadius: 8,
                      border: `1px solid var(--color-red)`, background: `rgba(255,99,105,0.1)`, width: '100%',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Camera size={16} color="var(--color-red)" />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-red)', marginBottom: '0.2rem' }}>
                            {selectedCrisis.label}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {selectedCrisis.description}
                          </p>
                        </div>
                        <div style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                          borderRadius: 12, background: `rgba(255,99,105,0.15)`, color: 'var(--color-red)',
                        }}>
                          {selectedCrisis.delayMinutes}min
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleInjectCrisis}
                disabled={isProcessing}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: 8,
                  background: isProcessing ? 'var(--color-ground-2)' : 'var(--color-red)',
                  border: 'none', cursor: isProcessing ? 'not-allowed' : 'pointer',
                  color: '#000', fontSize: '0.9rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'background 0.15s',
                }}
              >
                <Zap size={16} fill="currentColor" />
                {isProcessing ? 'Propagating Crisis...' : `Inject: ${selectedCrisis.label}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global CSS animations ──────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50% { box-shadow: 0 0 0 4px transparent; opacity: 0.7; }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(255,99,105,0.4); }
          50% { border-color: rgba(255,99,105,0.9); }
        }
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,99,105,0); }
          50% { box-shadow: 0 0 0 6px rgba(255,99,105,0.15); }
        }
      `}</style>
    </div>
  );
}
