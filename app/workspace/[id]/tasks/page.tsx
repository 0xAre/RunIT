'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useEventStore, type DagTask } from '@/store/eventStore';
import { calculateDivisionLoad, calculateOCS } from '@/lib/dag-engine';
import { KanbanSquare, Clock, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { TaskModal } from '@/components/TaskModal';
import DraftModal, { type DraftPayload } from '@/components/DraftModal';
import SmartAlertBar from '@/components/SmartAlertBar';

const COLUMNS = [
  { id: 'pending', title: 'Pending', color: 'var(--color-ground-3)' },
  { id: 'in-progress', title: 'In Progress', color: 'var(--color-amber)' },
  { id: 'delayed', title: 'Delayed', color: 'var(--color-red)' },
  { id: 'done', title: 'Done', color: 'var(--color-mint)' }
];

export default function TasksBoardPage() {
  const { currentEvent, updateDagTask, updateOCS, addAgentAction, updateAgentAction } = useEventStore();
  const execution = currentEvent?.execution;

  const [isMounted, setIsMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DagTask | null>(null);

  // AI Draft State
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftPayload, setDraftPayload] = useState<DraftPayload | null>(null);
  const [isDraftLoading, setDraftLoading] = useState(false);
  const [draftTaskTitle, setDraftTaskTitle] = useState('');
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !execution) return;

    const sourceStatus = result.source.droppableId;
    const destStatus = result.destination.droppableId as DagTask['status'];
    const taskId = result.draggableId;

    if (sourceStatus === destStatus) return;

    updateDagTask(taskId, { status: destStatus });

    const updatedTasks = execution.dagTasks.map(t =>
      t.id === taskId ? { ...t, status: destStatus } : t
    );

    const divMeta = execution.divisionLoads.map(d => ({ id: d.id, name: d.name, color: d.color, personnel: d.personnel }));
    const newDivLoads = calculateDivisionLoad(updatedTasks, divMeta);
    const newOCS = calculateOCS(updatedTasks, newDivLoads, execution.unresolvedIncidentSeverity, execution.ocs.score);
    updateOCS(newOCS);
  }, [execution, updateDagTask, updateOCS]);

  const handleAiAction = useCallback(async (task: DagTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentEvent) return;

    setDraftLoading(true);
    setDraftModalOpen(true);
    setDraftPayload(null);
    setDraftTaskTitle(task.title);
    setLoadingTaskId(task.id);

    const agentTypeMap: Record<string, string> = {
      'pending': 'logistics',
      'in-progress': 'program',
      'delayed': 'crisis',
      'blocked': 'crisis',
    };

    try {
      const res = await apiFetch('/api/ai/draft-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          eventData: currentEvent,
          agentType: agentTypeMap[task.status] || 'logistics',
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const actionId = `action-task-${task.id}-${Date.now()}`;
        addAgentAction({
          id: actionId,
          agentType: (agentTypeMap[task.status] || 'logistics') as any,
          title: `Draft: ${task.title}`,
          description: `AI membuat draft komunikasi untuk task "${task.title}"`,
          reasoning: data.reasoning || '',
          status: 'pending',
          commsPayload: {
            whatsappDraft: data.whatsappDraft,
            emailDraft: data.emailDraft,
            telegramDraft: data.telegramDraft,
            subject: data.emailSubject,
            recipientName: data.recipientName,
            recipientPhone: data.recipientPhone,
            recipientEmail: data.recipientEmail,
            recipientTelegram: data.recipientTelegram,
          },
          triggeredByTaskId: task.id,
          createdAt: new Date().toISOString(),
        });
        setCurrentActionId(actionId);
        setDraftPayload({
          whatsappDraft: data.whatsappDraft,
          emailDraft: data.emailDraft,
          emailSubject: data.emailSubject,
          telegramDraft: data.telegramDraft,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          recipientEmail: data.recipientEmail,
          recipientTelegram: data.recipientTelegram,
          reasoning: data.reasoning,
        });
      }
    } catch (err) {
      console.error('AI Action error:', err);
    } finally {
      setDraftLoading(false);
      setLoadingTaskId(null);
    }
  }, [currentEvent, addAgentAction]);

  const handleMarkSent = useCallback(() => {
    if (currentActionId) updateAgentAction(currentActionId, 'approved');
  }, [currentActionId, updateAgentAction]);

  if (!execution) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Execution hasn't started yet. Go to Control Room to initialize.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b border-[var(--color-border)] bg-[var(--color-ground-1)]">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--color-ground-2)', borderRadius: '8px' }}>
            <KanbanSquare size={18} color="var(--color-mint)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Tasks Board</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Drag & drop untuk update status. Klik <Sparkles size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> AI Action untuk draft pesan otomatis.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.3rem 0.875rem', borderRadius: 20,
            background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)',
            fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-mint)',
          }}>
            <Activity size={13} />
            OCS: {execution.ocs.score}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        {/* Smart Alert Bar */}
        <SmartAlertBar tasks={execution.dagTasks} eventData={currentEvent} />

        {isMounted && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minWidth: 'min-content' }}>
              {COLUMNS.map(col => {
                const tasks = execution.dagTasks.filter(t => t.status === col.id);
                return (
                  <div key={col.id} style={{ display: 'flex', flexDirection: 'column', width: 320, background: 'var(--color-ground-1)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-ground-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{col.title}</h3>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-0)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{tasks.length}</span>
                    </div>

                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            flex: 1, padding: '1rem', overflowY: 'auto',
                            background: snapshot.isDraggingOver ? 'var(--color-ground-2)' : 'transparent',
                            transition: 'background 0.2s',
                            display: 'flex', flexDirection: 'column', gap: '0.75rem',
                          }}
                        >
                          {tasks.map((task, index) => {
                            const division = currentEvent.masterPlan?.divisions.find(d => d.id === task.divisionId);
                            const divColor = division?.color || 'var(--color-border)';
                            const isActionLoading = loadingTaskId === task.id;

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      background: 'var(--color-ground-0)',
                                      padding: '1rem', borderRadius: '8px',
                                      border: `1px solid ${task.isCritical && task.status !== 'done' ? 'var(--color-red)' : 'var(--color-border)'}`,
                                      borderLeft: `4px solid ${divColor}`,
                                      boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    {/* Task Card Content */}
                                    <div
                                      onClick={() => setSelectedTask(task)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{task.title}</p>
                                        {task.isCritical && task.status !== 'done' && (
                                          <AlertTriangle size={14} color="var(--color-red)" style={{ flexShrink: 0 }} />
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: task.status !== 'done' ? '0.625rem' : 0 }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{division?.name}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-secondary)' }}>
                                          <Clock size={12} />
                                          <span style={{ fontSize: '0.7rem' }}>{task.duration}m</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* ── AI Action Button (only for non-done tasks) ── */}
                                    {task.status !== 'done' && (
                                      <button
                                        onClick={(e) => handleAiAction(task, e)}
                                        disabled={isActionLoading}
                                        style={{
                                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                                          padding: '0.35rem 0.5rem', borderRadius: 6,
                                          background: isActionLoading ? 'rgba(37,208,171,0.05)' : 'rgba(37,208,171,0.08)',
                                          border: '1px solid rgba(37,208,171,0.25)',
                                          color: 'var(--color-mint)', cursor: isActionLoading ? 'wait' : 'pointer',
                                          fontSize: '0.72rem', fontWeight: 600,
                                          transition: 'all 0.15s',
                                          opacity: isActionLoading ? 0.6 : 1,
                                        }}
                                      >
                                        <Sparkles size={11} />
                                        {isActionLoading ? 'AI Membuat Draft...' : '💬 AI Action'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      <DraftModal
        isOpen={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        payload={draftPayload}
        isLoading={isDraftLoading}
        taskTitle={draftTaskTitle}
        onMarkSent={handleMarkSent}
      />
    </div>
  );
}
