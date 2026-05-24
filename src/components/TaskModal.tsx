import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle, CheckCircle, Save, GitBranch, MapPin, Search, Bot, MessageCircle, Copy, Loader2 } from 'lucide-react';
import { useEventStore, type DagTask } from '@/store/eventStore';
import { computeCriticalPath, calculateDivisionLoad, calculateOCS } from '@/lib/dag-engine';

interface TaskModalProps {
  task: DagTask | null;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { currentEvent, updateDagTask, updateOCS } = useEventStore();
  const execution = currentEvent?.execution;
  
  const [localDuration, setLocalDuration] = useState<number>(0);
  const [localStatus, setLocalStatus] = useState<DagTask['status']>('pending');

  const [tab, setTab] = useState<'details' | 'agent'>('details');
  const [sourcingQuery, setSourcingQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sourcingResult, setSourcingResult] = useState<any>(null);

  const handleSourcingSearch = async () => {
    if (!sourcingQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/ai/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sourcingQuery, locationContext: currentEvent?.name, taskTitle: task?.title || '' }),
      });
      const data = await res.json();
      if (res.ok) setSourcingResult(data);
      else alert('Failed to source: ' + data.error);
    } catch (error) {
      alert('Error contacting Agent.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (task) {
      setLocalDuration(task.duration);
      setLocalStatus(task.status);
    }
  }, [task]);

  if (!task || !execution) return null;

  const handleSave = () => {
    if (localDuration === task.duration && localStatus === task.status) {
      onClose();
      return;
    }

    // 1. Update the task in the store immediately for optimistic UI
    updateDagTask(task.id, { duration: localDuration, status: localStatus });

    // 2. We need to recalculate the critical path since duration changed
    // We create a mocked array of tasks reflecting this change to feed into the engine
    const updatedTasks = execution.dagTasks.map(t => 
      t.id === task.id ? { ...t, duration: localDuration, status: localStatus } : t
    );

    const recomputedTasks = computeCriticalPath(updatedTasks);
    
    // We must update the store with the new recomputed tasks so slack/isCritical is accurate
    // But our eventStore doesn't have an action to set ALL dagTasks at once easily, except by individual updateDagTask.
    // Wait, let's just do individual updates for the ones that changed, or we can add a `setDagTasks` action.
    // For now, we will update them individually.
    recomputedTasks.forEach(rt => {
      const oldTask = execution.dagTasks.find(t => t.id === rt.id);
      if (!oldTask || oldTask.isCritical !== rt.isCritical || oldTask.slack !== rt.slack || oldTask.earliestStart !== rt.earliestStart || oldTask.latestFinish !== rt.latestFinish) {
        updateDagTask(rt.id, {
          isCritical: rt.isCritical,
          slack: rt.slack,
          earliestStart: rt.earliestStart,
          latestFinish: rt.latestFinish,
          earliestFinish: rt.earliestFinish,
          latestStart: rt.latestStart
        });
      }
    });

    const divMeta = execution.divisionLoads.map(d => ({ id: d.id, name: d.name, color: d.color, personnel: d.personnel }));
    const newDivLoads = calculateDivisionLoad(recomputedTasks, divMeta);
    const newOCS = calculateOCS(recomputedTasks, newDivLoads, execution.unresolvedIncidentSeverity, execution.ocs.score);
    updateOCS(newOCS);
    
    onClose();
  };

  const statusColors = {
    'pending': 'var(--color-ground-3)',
    'in-progress': 'var(--color-amber)',
    'done': 'var(--color-mint)',
    'blocked': 'var(--color-red)',
    'delayed': 'var(--color-red)',
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', justifyContent: 'flex-end',
      }}>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            width: '400px', background: 'var(--color-ground-1)', height: '100%',
            borderLeft: '1px solid var(--color-border)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Task Engine</h2>
            <button className="btn-ghost" onClick={onClose} style={{ padding: '0.5rem' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setTab('details')}
              style={{ flex: 1, padding: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === 'details' ? '2px solid var(--color-mint)' : '2px solid transparent', color: tab === 'details' ? 'var(--color-mint)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Task Details
            </button>
            <button 
              onClick={() => setTab('agent')}
              style={{ flex: 1, padding: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', borderBottom: tab === 'agent' ? '2px solid var(--color-mint)' : '2px solid transparent', color: tab === 'agent' ? 'var(--color-mint)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Bot size={14} /> Sourcing Agent
            </button>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {tab === 'details' ? (
              <>
                {/* Title */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Title</p>
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{task.title}</p>
            </div>

            {/* Description */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Description</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{task.description}</p>
            </div>

            {/* Status & Duration Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Status</p>
                <select 
                  value={localStatus}
                  onChange={(e) => setLocalStatus(e.target.value as any)}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: '6px',
                    background: 'var(--color-ground-2)', border: '1px solid var(--color-border)',
                    color: statusColors[localStatus] || 'var(--color-text-primary)',
                    fontWeight: 600, outline: 'none'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="delayed">Delayed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Duration (mins)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-ground-2)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <Clock size={14} color="var(--color-text-muted)" />
                  <input 
                    type="number" 
                    value={localDuration}
                    onChange={(e) => setLocalDuration(parseInt(e.target.value) || 0)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', width: '100%', outline: 'none', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            {/* DAG Information */}
            <div style={{ background: 'var(--color-ground-2)', borderRadius: '8px', padding: '1rem', border: `1px solid ${task.isCritical ? 'rgba(255,99,105,0.3)' : 'var(--color-border)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <GitBranch size={16} color={task.isCritical ? 'var(--color-red)' : 'var(--color-text-muted)'} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: task.isCritical ? 'var(--color-red)' : 'var(--color-text-primary)' }}>
                  DAG Engine Stats
                </h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Critical Path</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: task.isCritical ? 'var(--color-red)' : 'var(--color-mint)' }}>
                    {task.isCritical ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Slack Time</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: task.slack > 0 ? 'var(--color-mint)' : 'var(--color-text-primary)' }}>
                    {Math.round(task.slack)} mins
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Earliest Start</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    T+{Math.round(task.earliestStart)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Dependencies</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {task.dependencies.length} tasks
                  </p>
                </div>
              </div>
            </div>
            
            {(localDuration !== task.duration || localStatus !== task.status) && (
              <div style={{ background: 'rgba(251,191,36,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color="var(--color-amber)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-amber)', lineHeight: 1.4 }}>
                  Saving these changes will trigger the DAG Engine to recompute the Critical Path and Operational Confidence Score.
                </p>
              </div>
            )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(37,208,171,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(37,208,171,0.2)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-mint)', marginBottom: '0.5rem', fontWeight: 600 }}>Autonomous Procurement Agent</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Need to book a venue or buy supplies? Tell the agent what you need. It will scan real-world locations and draft booking scripts for you.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="e.g., 'Indoor venue for 500 pax in Jakarta'"
                  value={sourcingQuery}
                  onChange={e => setSourcingQuery(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-ground-0)', color: 'var(--color-text-primary)', outline: 'none', fontSize: '0.85rem' }}
                  onKeyDown={e => e.key === 'Enter' && handleSourcingSearch()}
                />
                <button 
                  onClick={handleSourcingSearch}
                  disabled={isSearching || !sourcingQuery}
                  className="btn-primary"
                  style={{ padding: '0 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                >
                  {isSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                </button>
              </div>

              {sourcingResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>Top 3 Recommendations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {sourcingResult.recommendations?.map((rec: any, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-ground-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{rec.name}</p>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-amber)', background: 'rgba(251,191,36,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>★ {rec.rating}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                            <MapPin size={12} color="var(--color-text-muted)" />
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{rec.address}</p>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{rec.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {sourcingResult.whatsappDraft && (
                    <div>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>Automated Communications</h3>
                      <div style={{ background: 'var(--color-ground-1)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                          The AI has drafted the necessary communications. Choose an app below to open it directly with the pre-filled message.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                          <a 
                            href={`https://wa.me/?text=${encodeURIComponent(sourcingResult.whatsappDraft)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#25D366', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                          >
                            <MessageCircle size={14} /> Send via WhatsApp
                          </a>
                          
                          <a 
                            href={`https://t.me/share/url?url=&text=${encodeURIComponent(sourcingResult.whatsappDraft)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0088cc', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                          >
                            <MessageCircle size={14} /> Send via Telegram
                          </a>
                          
                          {sourcingResult.emailDraft && (
                            <a 
                              href={`mailto:?subject=${encodeURIComponent('Inquiry: ' + task.title)}&body=${encodeURIComponent(sourcingResult.emailDraft)}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#EA4335', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                              <MessageCircle size={14} /> Send via Gmail
                            </a>
                          )}
                        </div>

                        <div style={{ background: 'var(--color-ground-2)', padding: '1rem', borderRadius: '6px', border: '1px dashed var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Message Preview</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(sourcingResult.whatsappDraft);
                                alert('Copied to clipboard');
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--color-mint)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Copy size={12} /> Copy
                            </button>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {sourcingResult.whatsappDraft}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>

          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem' }}>
            <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} style={{ flex: 1, justifyContent: 'center', display: 'flex', gap: '0.5rem' }}>
              <Save size={16} /> Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
