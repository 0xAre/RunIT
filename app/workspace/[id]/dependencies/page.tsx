'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useEventStore } from '@/store/eventStore';
import { GitBranch, Info, Target, Activity } from 'lucide-react';
import Link from 'next/link';

const priorityColors: Record<string, string> = {
  critical: 'var(--color-red)',
  high: 'var(--color-amber)',
  medium: 'var(--color-teal)',
  low: 'var(--color-mint)',
};

function TaskNode({ data }: { data: { label: string; priority: string; status: string; deadline: string; divColor: string } }) {
  const pc = priorityColors[data.priority] || 'var(--color-mint)';
  return (
    <div style={{
      background: 'var(--color-ground-1)',
      border: `1px solid var(--color-border)`,
      borderTop: `3px solid ${data.divColor}`,
      borderRadius: '8px',
      padding: '0.875rem',
      minWidth: '200px',
      maxWidth: '240px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.4, fontWeight: 500 }}>{data.label}</p>
        <span style={{ 
          fontSize: '0.65rem', color: pc, background: `${pc}15`, 
          padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'capitalize', flexShrink: 0 
        }}>
          {data.priority}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: data.status === 'done' ? 'var(--color-mint)' : data.status === 'in-progress' ? 'var(--color-amber)' : 'var(--color-ground-8)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{data.status}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{data.deadline}</span>
      </div>
    </div>
  );
}

function DivisionNode({ data }: { data: { label: string; pic: string; taskCount: number; color: string } }) {
  return (
    <div style={{
      background: 'var(--color-ground-2)',
      border: `1px solid ${data.color}`,
      borderRadius: '8px',
      padding: '1rem 1.25rem',
      minWidth: '200px',
      textAlign: 'center',
      boxShadow: `0 4px 20px ${data.color}10`,
    }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.color, margin: '0 auto 0.5rem' }} />
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem', fontWeight: 600 }}>{data.label}</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>PIC: {data.pic}</p>
      <div style={{ 
        background: 'var(--color-ground-1)', border: `1px solid var(--color-border)`, borderRadius: '4px',
        fontSize: '0.7rem', color: data.color, padding: '0.25rem 0.5rem', marginTop: '0.75rem', fontWeight: 500
      }}>
        {data.taskCount} Tasks
      </div>
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
  divisionNode: DivisionNode,
};

export default function DependenciesPage() {
  const { currentEvent } = useEventStore();
  const blueprint = currentEvent?.blueprint;
  const execution = currentEvent?.execution;

  // Use execution DAG tasks when in live mode, else fall back to blueprint tasks
  const liveTasks = execution?.dagTasks;
  const criticalPathIds = new Set(execution?.criticalPath ?? []);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!blueprint) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    blueprint.divisions.forEach((div, divIdx) => {
      const divX = divIdx * 300;
      const divTasks = liveTasks
        ? liveTasks.filter(t => t.divisionId === div.id)
        : div.tasks;

      nodes.push({
        id: div.id,
        type: 'divisionNode',
        position: { x: divX, y: 0 },
        data: { label: div.name, pic: div.pic, taskCount: divTasks.length, color: div.color },
        draggable: true,
      });

      divTasks.forEach((task, taskIdx) => {
        const nodeId = task.id;
        const isOnCriticalPath = criticalPathIds.has(nodeId);
        const liveStatus = liveTasks ? (task as any).status : task.status;
        const isCritical = liveTasks ? (task as any).isCritical ?? false : false;

        nodes.push({
          id: nodeId,
          type: 'taskNode',
          position: { x: divX, y: 140 + taskIdx * 120 },
          data: {
            label: task.title,
            priority: task.priority,
            status: liveStatus,
            deadline: task.deadline,
            divColor: isCritical ? 'var(--color-red)' : div.color,
          },
          draggable: true,
        });
      });
    });

    // Create a set of rendered node IDs to validate edges
    const renderedNodeIds = new Set(nodes.map(n => n.id));

    // Second pass to create edges securely
    blueprint.divisions.forEach((div) => {
      const divTasks = liveTasks
        ? liveTasks.filter(t => t.divisionId === div.id)
        : div.tasks;

      divTasks.forEach((task, taskIdx) => {
        const nodeId = task.id;
        
        if (taskIdx === 0 && renderedNodeIds.has(div.id) && renderedNodeIds.has(nodeId)) {
          edges.push({
            id: `${div.id}-${nodeId}`,
            source: div.id,
            target: nodeId,
            markerEnd: { type: MarkerType.ArrowClosed, color: div.color },
            style: { stroke: div.color, strokeWidth: 1.5, opacity: 0.8 },
          });
        }

        task.dependencies.forEach(depId => {
          // Only add edge if the dependency is actually rendered on screen
          if (renderedNodeIds.has(depId) && renderedNodeIds.has(nodeId)) {
            const isCriticalEdge = criticalPathIds.has(depId) && criticalPathIds.has(nodeId);
            edges.push({
              id: `dep-${depId}-${nodeId}`,
              source: depId,
              target: nodeId,
              animated: isCriticalEdge,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isCriticalEdge ? 'var(--color-red)' : 'var(--color-mint)',
              },
              style: {
                stroke: isCriticalEdge ? 'var(--color-red)' : 'var(--color-mint)',
                strokeWidth: isCriticalEdge ? 2.5 : 1.5,
                strokeDasharray: isCriticalEdge ? undefined : '4 2',
                opacity: isCriticalEdge ? 1 : 0.6,
              },
            });
          }
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [blueprint, liveTasks, criticalPathIds]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  if (!blueprint) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>No Master Plan Data Available</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--color-ground-1)] border-b border-[var(--color-border)] p-4 md:px-6 md:py-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--color-ground-2)', borderRadius: '8px' }}>
            <GitBranch size={18} color="var(--color-mint)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Dependency Map</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {execution?.isLive
                ? 'Live execution graph — click nodes in Control Room to update status'
                : 'Drag nodes to rearrange • Dashed lines indicate task dependencies'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Live OCS badge */}
          {execution?.isLive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.875rem', borderRadius: 20,
              background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-mint)',
            }}>
              <Activity size={13} />
              OCS: {execution.ocs.score}
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-4 items-center">
            {execution?.isLive ? (
              [{ label: 'Critical Path', color: 'var(--color-red)' }, { label: 'Done', color: 'var(--color-mint)' }, { label: 'Delayed', color: 'var(--color-amber)' }]
                .map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <div style={{ width: 8, height: 8, background: item.color, borderRadius: '2px' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{item.label}</span>
                  </div>
                ))
            ) : (
              Object.entries(priorityColors).map(([key, color]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <div style={{ width: 8, height: 8, background: color, borderRadius: '2px' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{key}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={14} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{nodes.length} Nodes • {edges.length} Edges</span>
          </div>
        </div>
      </div>

      {/* React Flow */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: 'var(--color-ground-0)' }}
        >
          <Background color="var(--color-ground-3)" gap={24} size={1} />
          <Controls style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
          <MiniMap
            style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
            nodeColor={(n) => {
              if (n.type === 'divisionNode') return n.data.color;
              return priorityColors[n.data?.priority] || 'var(--color-mint)';
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
