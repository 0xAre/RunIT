'use client';

import { useEffect, useState, useCallback } from 'react';


import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type MasterPlan } from '@/store/eventStore';
import { classifyAllTasks, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/task-agents';
import {
  Brain, Zap, Users, Calendar, DollarSign, AlertTriangle,
  CheckCircle, Clock, ChevronRight, RefreshCw, Play, ArrowRight,
  Loader2, Target, Activity, Edit3, Plus, Save, Bot, Tag,
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';

const priorityColors = {
  critical: 'var(--color-red)',
  high: 'var(--color-amber)',
  medium: 'var(--color-teal)',
  low: 'var(--color-mint)',
};

const severityColors = {
  critical: { color: 'var(--color-red)', bg: 'rgba(255, 99, 105, 0.1)' },
  high: { color: 'var(--color-amber)', bg: 'rgba(251, 191, 36, 0.1)' },
  medium: { color: 'var(--color-teal)', bg: 'rgba(0, 173, 181, 0.1)' },
  low: { color: 'var(--color-mint)', bg: 'rgba(37, 208, 171, 0.1)' },
};

/* ── Loading State ────────────────────────────────────────────── */
function LoadingMasterPlan() {
  const steps = [
    'Fetching real-time market intelligence...',
    'Analyzing event parameters...',
    'Building divisional structures...',
    'Grounding master plan with web data...',
    'Generating operational master plan...',
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(s => (s + 1) % steps.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', minHeight: '60vh'
    }}>
      <div style={{
        background: 'var(--color-ground-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '3rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
      }}>
        <Loader2 size={32} color="var(--color-mint)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            AI Generator Active
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {steps[currentStep]}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Panel Header ─────────────────────────────────────────────── */
function PanelHeader({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '1rem 1.25rem',
      background: 'var(--color-ground-2)',
      borderBottom: '1px solid var(--color-border)',
      borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
    }}>
      {Icon && <Icon size={16} color="var(--color-text-muted)" />}
      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</h3>
    </div>
  );
}

/* ── Compact View for Small Events ───────────────────────────── */
function MasterPlanCompactView({
  masterPlan, onExpress, onFull, router, params
}: {
  masterPlan: MasterPlan;
  onExpress: () => void;
  onFull: () => void;
  router: any;
  params: any;
}) {
  const totalTasks = masterPlan.divisions.reduce((a, d) => a + d.tasks.length, 0);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5 max-w-[760px] mx-auto pb-12 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {masterPlan.eventName}
            </h1>
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 12, background: 'rgba(37,208,171,0.1)', border: '1px solid rgba(37,208,171,0.3)', color: 'var(--color-mint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Compact Mode
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: 540, lineHeight: 1.55 }}>{masterPlan.summary}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onFull} style={{ fontSize: '0.78rem' }}>Full View</button>
          <button
            onClick={() => router.push(`/workspace/${params.id}/execution`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', borderRadius: 8, background: 'var(--color-mint)', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
          >
            <Target size={13} /> Ke Execution
          </button>
        </div>
      </div>

      {/* Express Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-br from-amber-500/10 to-mint-500/10 border border-amber-500/30 rounded-xl p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Zap size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Express Mode Tersedia</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0' }}>{totalTasks} tasks di {masterPlan.divisions.length} divisi · Langsung masuk ke execution</p>
          </div>
        </div>
        <button
          onClick={onExpress}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Zap size={13} /> ⚡ Express: Skip ke Execution
        </button>
      </div>

      {/* Divisions + tasks in one panel */}
      <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={15} color="var(--color-mint)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Task Overview</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{totalTasks} tasks total</span>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {masterPlan.divisions.map(div => (
            <div key={div.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: div.color || 'var(--color-mint)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{div.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>PIC: {div.pic}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{div.tasks.length} tasks</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingLeft: '1.25rem' }}>
                  {div.tasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--color-ground-0)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                      <span style={{ flex: 1, fontSize: '0.83rem', color: 'var(--color-text-primary)' }}>{task.title}</span>
                      {task.category && (
                        <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: 10, background: `${CATEGORY_COLORS[task.category]}18`, color: CATEGORY_COLORS[task.category], fontWeight: 600, textTransform: 'capitalize' }}>
                          {CATEGORY_LABELS[task.category]}
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: task.priority === 'critical' ? 'var(--color-red)' : task.priority === 'high' ? 'var(--color-amber)' : 'var(--color-mint)', fontWeight: 600, textTransform: 'uppercase' }}>{task.priority}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{task.deadline}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks quick view */}
      {masterPlan.risks.length > 0 && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={15} color="var(--color-amber)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Risiko Utama</span>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {masterPlan.risks.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--color-ground-0)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: r.severity === 'critical' ? 'var(--color-red)' : r.severity === 'high' ? 'var(--color-amber)' : 'var(--color-teal)', textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 1 }}>{r.severity}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.83rem', color: 'var(--color-text-primary)', margin: 0 }}>{r.scenario}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>💡 {r.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function MasterPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { currentEvent, updateMasterPlan, updateEventStage, updateEventDataLanguage, setAiLoading, isAiLoading, setAiError, aiError, addDagTask, classifyAllTasks: storeClassify } = useEventStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'divisions' | 'timeline' | 'risks'>('overview');
  const [forceFullView, setForceFullView] = useState(false);
  
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [classifiedCount, setClassifiedCount] = useState(0);
  const [classifying, setClassifying] = useState(false);

  const masterPlan = currentEvent?.masterPlan;
  const isSmallEvent = !forceFullView && (
    currentEvent?.scale === 'small' ||
    (currentEvent?.teamSize != null && currentEvent.teamSize <= 5)
  );

  const autoClassifyTasks = useCallback(async (bp?: MasterPlan) => {
    const masterPlan = bp || currentEvent?.masterPlan;
    if (!masterPlan || !currentEvent) return;

    const allTasks = masterPlan.divisions.flatMap(d => d.tasks.map(t => ({ id: t.id, title: t.title, description: t.description })));
    if (allTasks.length === 0) return;

    setClassifying(true);
    try {
      const classifications = classifyAllTasks(allTasks, currentEvent);
      storeClassify(classifications);
      setClassifiedCount(classifications.filter(c => c.category !== 'internal').length);
    } catch {
      // Non-blocking
    } finally {
      setClassifying(false);
    }
  }, [currentEvent, storeClassify]);

  const generateMasterPlan = async () => {
    if (!currentEvent) return;
    setAiLoading(true);
    setAiError(null);

    const { lang } = useLangStore.getState();

    try {
      const marketContextKey = `market-context-${currentEvent.id}`;
      const marketContext = sessionStorage.getItem(marketContextKey) || undefined;
      if (marketContext) {
        sessionStorage.removeItem(marketContextKey);
      }

      const res = await fetch('/api/ai/master-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentEvent, lang, marketContext }),
      });
      
      if (!res.ok) throw new Error('API call failed');
      const { masterPlan } = await res.json();
      
      if (masterPlan) {
        updateMasterPlan(masterPlan);
        updateEventDataLanguage(lang);
        updateEventStage('masterplan');
        autoClassifyTasks(masterPlan);
      }
    } catch (err) {
      setAiError('Failed to generate master plan. Showing demo master plan.');
      // Demo mock masterPlan
      const mockMasterPlan: MasterPlan = {
        eventName: currentEvent.name,
        eventType: currentEvent.type,
        summary: `${currentEvent.name} is a ${currentEvent.scale} scale ${currentEvent.type} designed for ${currentEvent.audience}. Target: ${currentEvent.participants} participants. Cross-division coordination required.`,
        operationalPhases: ['Pre-Production (H-90 to H-30)', 'Production (H-30 to H-7)', 'Execution Prep (H-7 to H-1)', 'Event Day (H)', 'Post-Event (H+1 to H+7)'],
        divisions: [
          { id: 'div-1', name: 'Core Operations', pic: 'Jane Doe', color: 'var(--color-mint)', tasks: [
            { id: 't1', title: 'Rundown Assembly', description: 'Compile all timelines into master sheet', deadline: 'H-14', priority: 'critical', status: 'pending', dependencies: [], divisionId: 'div-1' },
            { id: 't2', title: 'Technical Rehearsal', description: 'Full dry run with all teams', deadline: 'H-1', priority: 'high', status: 'pending', dependencies: ['t1'], divisionId: 'div-1' },
          ]},
          { id: 'div-2', name: 'Logistics', pic: 'John Smith', color: 'var(--color-amber)', tasks: [
            { id: 't9', title: 'Venue Booking', description: 'Secure primary and backup venue', deadline: 'H-60', priority: 'critical', status: 'pending', dependencies: [], divisionId: 'div-2' },
          ]},
        ],
        timeline: [
          { date: 'H-90', milestone: 'Kick-off', phase: 'Pre-Production', responsible: 'Core Team' },
          { date: 'H-60', milestone: 'Venue Finalized', phase: 'Pre-Production', responsible: 'Logistics' },
          { date: 'H-1', milestone: 'Technical Rehearsal', phase: 'Execution Prep', responsible: 'All' },
          { date: 'H-Day', milestone: 'Execution', phase: 'Event Day', responsible: 'All' },
        ],
        manpowerEstimate: `Estimated ${Math.round(currentEvent.participants * 0.05)} core crew, ${Math.round(currentEvent.participants * 0.1)} volunteers.`,
        budgetAllocation: [
          { category: 'Venue', estimate: '$5,000', percentage: 40 },
          { category: 'Operations', estimate: '$2,000', percentage: 20 },
        ],
        criticalPath: [
          'Venue Booking → Speaker Confirmation → Rundown → Rehearsal',
        ],
        risks: [
          { id: 'r1', scenario: 'Key speaker cancels', severity: 'high', probability: 'medium', mitigation: 'Backup speaker standby list' },
          { id: 'r2', scenario: 'Power failure', severity: 'critical', probability: 'low', mitigation: 'Genset testing on H-1' },
        ],
      };
      updateMasterPlan(mockMasterPlan);
      updateEventDataLanguage(lang);
      updateEventStage('masterplan');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (currentEvent && !currentEvent.masterPlan && !isAiLoading) {
      generateMasterPlan();
    }
    if (masterPlan && !editableSummary) {
      setEditableSummary(masterPlan.summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvent?.id, masterPlan?.summary]);


  // ── Express Mode: generate (if needed) then go to execution ──
  const handleExpressMode = async () => {
    if (!masterPlan) {
      await generateMasterPlan(); // properly await AI generation
    }
    // Small delay to let store update propagate
    await new Promise(r => setTimeout(r, 200));
    router.push(`/workspace/${params.id}/execution`);
  };


  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>No Active Event</p>
          <a href="/workspace/new" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Initialize Event
          </a>
        </div>
      </div>
    );
  }

  if (isAiLoading) return <LoadingMasterPlan />;

  if (!masterPlan) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem' }}>
        {aiError && (
          <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', padding: '1rem', color: 'var(--color-red)', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.85rem' }}>{aiError}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={generateMasterPlan}>
            <Brain size={16} style={{ marginRight: '0.5rem' }} />
            Generate Master Plan
          </button>
          {isSmallEvent && (
            <button
              onClick={handleExpressMode}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <Zap size={15} /> ⚡ Express Mode
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Compact View for small events ─────────────────────────────
  if (isSmallEvent) {
    return (
      <MasterPlanCompactView
        masterPlan={masterPlan}
        onExpress={handleExpressMode}
        onFull={() => setForceFullView(true)}
        router={router}
        params={params}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 max-w-[1200px] mx-auto p-4 md:p-8">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {masterPlan.eventName}
            </h1>
            <span className="badge" style={{ background: 'var(--color-ground-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
              {masterPlan.eventType}
            </span>
          </div>
          
          {isEditingMode ? (
            <textarea 
              value={editableSummary}
              onChange={e => setEditableSummary(e.target.value)}
              style={{
                width: '100%', maxWidth: '750px', height: '120px', padding: '0.75rem',
                borderRadius: '8px', border: '1px solid var(--color-mint)', background: 'var(--color-ground-0)',
                color: 'var(--color-text-primary)', fontSize: '0.95rem', lineHeight: 1.6, resize: 'vertical'
              }}
            />
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', maxWidth: '750px', lineHeight: 1.6 }}>
              {masterPlan.summary}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEditingMode ? (
            <button className="btn-primary" onClick={() => {
              updateMasterPlan({ ...masterPlan, summary: editableSummary });
              setIsEditingMode(false);
            }} style={{ fontSize: '0.85rem' }}>
              <Save size={14} /> Save Edits
            </button>
          ) : (
            <button className="btn-ghost" onClick={() => setIsEditingMode(true)} style={{ fontSize: '0.85rem' }}>
              <Edit3 size={14} /> Edit Master Plan
            </button>
          )}
          
          <button className="btn-ghost" onClick={generateMasterPlan} style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Regenerate
          </button>
          <button
            className="btn-ghost"
            onClick={() => autoClassifyTasks()}
            disabled={classifying}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {classifying ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Tag size={13} />}
            {classifying ? 'Classifying...' : classifiedCount > 0 ? `Classified (${classifiedCount})` : 'Classify Tasks'}
          </button>
          <button
            className="btn-ghost"
            onClick={() => router.push(`/workspace/${params.id}/simulate`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <Play size={14} fill="currentColor" /> Simulate
          </button>
          <button
            onClick={() => router.push(`/workspace/${params.id}/committee`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
              padding: '0.5rem 1rem', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0,173,181,0.12), rgba(124,106,245,0.12))',
              border: '1px solid rgba(124,106,245,0.35)',
              color: '#7C6AF5', cursor: 'pointer', fontWeight: 700,
              transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,173,181,0.2), rgba(124,106,245,0.2))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,173,181,0.12), rgba(124,106,245,0.12))'; }}
          >
            <Bot size={14} /> AI Committee
          </button>
          <button
            onClick={() => router.push(`/workspace/${params.id}/execution`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
              padding: '0.5rem 1rem', borderRadius: '8px',
              background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)',
              color: 'var(--color-mint)', cursor: 'pointer', fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,208,171,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,208,171,0.1)'; }}
          >
            <Target size={14} />
            Execution Board
          </button>
        </div>
      </div>

      {aiError && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-amber)', padding: '0.875rem 1.25rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertTriangle size={16} color="var(--color-amber)" />
          <p style={{ color: 'var(--color-amber)', fontSize: '0.85rem' }}>{aiError}</p>
        </div>
      )}

      {/* ── EXECUTION READINESS BANNER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl p-4 sm:px-6" style={{
        background: 'linear-gradient(135deg, rgba(37,208,171,0.06) 0%, rgba(37,208,171,0.02) 100%)',
        border: '1px solid rgba(37,208,171,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(37,208,171,0.12)', borderRadius: 8 }}>
            <Activity size={16} color="var(--color-mint)" />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-mint)', marginBottom: '0.125rem' }}>
              Master Plan Ready for Execution
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {masterPlan.divisions.reduce((acc, d) => acc + d.tasks.length, 0)} tasks across {masterPlan.divisions.length} divisions · DAG engine initializes on Control Room launch
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {currentEvent?.execution?.isLive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.875rem', borderRadius: 20,
              background: 'rgba(37,208,171,0.12)', border: '1px solid var(--color-mint)',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-mint)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-mint)' }} />
              OCS: {currentEvent.execution.ocs.score}
            </div>
          )}
          <button
            onClick={() => router.push(`/workspace/${params.id}/execution`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.45rem 0.875rem', borderRadius: 8,
              background: 'var(--color-mint)', border: 'none',
              color: '#000', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 700, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            <Target size={12} />
            Execution Board
          </button>
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Target Participants', value: currentEvent.participants.toLocaleString(), icon: Users },
          { label: 'Crew Estimate', value: `~${currentEvent.teamSize}`, icon: Users },
          { label: 'Budget Cap', value: currentEvent.budget, icon: DollarSign },
          { label: 'Timeline', value: currentEvent.timeline, icon: Calendar },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--color-ground-1)',
            border: '1px solid var(--color-border)',
            padding: '1.25rem',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <stat.icon size={14} color="var(--color-text-muted)" />
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>{stat.label}</p>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {(['overview', 'divisions', 'timeline', 'risks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.625rem 1.25rem',
              background: activeTab === tab ? 'var(--color-ground-2)' : 'transparent',
              color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab ? 600 : 500,
              textTransform: 'capitalize',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          style={{ paddingBottom: '3rem' }}
        >
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                <PanelHeader title="Operational Phases" icon={CheckCircle} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {masterPlan.operationalPhases.map((phase, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-ground-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{i+1}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{phase}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                <PanelHeader title="Budget Allocation" icon={DollarSign} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {masterPlan.budgetAllocation.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{item.category}</span>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{item.percentage}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--color-ground-3)', width: '100%', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.percentage}%`, background: 'var(--color-mint)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
                <PanelHeader title="Critical Path" icon={ArrowRight} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {masterPlan.criticalPath.map((path, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-mint)' }} />
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{path}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* DIVISIONS */}
          {activeTab === 'divisions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masterPlan.divisions.map(div => (
                <div key={div.id} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{div.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>PIC: {div.pic}</p>
                    </div>
                    <span className="badge" style={{ background: 'var(--color-ground-2)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', border: '1px solid var(--color-border)' }}>
                      {div.tasks.length} Tasks
                    </span>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {div.tasks.map(task => (
                      <div key={task.id} style={{ background: 'var(--color-ground-0)', border: '1px solid var(--color-border)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', alignItems: 'flex-start', gap: '1rem' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{task.title}</p>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {task.category && (
                              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: `${CATEGORY_COLORS[task.category]}18`, color: CATEGORY_COLORS[task.category], fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {CATEGORY_LABELS[task.category]}
                              </span>
                            )}
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: priorityColors[task.priority], background: `${priorityColors[task.priority]}15`, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{task.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-secondary)' }}>
                            <Clock size={12} />
                            <span style={{ fontSize: '0.75rem' }}>{task.deadline}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      className="btn-ghost" 
                      style={{ width: '100%', borderStyle: 'dashed', marginTop: '0.5rem', justifyContent: 'center', opacity: 0.7 }}
                      onClick={() => {
                        const newTaskTitle = prompt('Enter new task title:');
                        if (newTaskTitle) {
                          addDagTask({
                            id: `task-${Date.now()}`,
                            title: newTaskTitle,
                            description: 'Manually added task',
                            divisionId: div.id,
                            status: 'pending',
                            priority: 'medium',
                            deadline: 'H-0',
                            duration: 30,
                            slack: 0,
                            isCritical: false,
                            dependencies: [],
                            earliestStart: 0,
                            earliestFinish: 30,
                            latestStart: 0,
                            latestFinish: 30,
                            delayMinutes: 0,
                            assigneeSilentMinutes: 0,
                          });
                        }
                      }}
                    >
                      <Plus size={16} /> Add Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === 'timeline' && (
            <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <PanelHeader title="Execution Timeline" icon={Calendar} />
              <div style={{ padding: '2.5rem 2rem' }}>
                <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                  <div style={{ position: 'absolute', left: '0.5rem', top: 0, bottom: 0, width: '1px', background: 'var(--color-border)' }} />
                  {masterPlan.timeline.map((item, i) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: i === masterPlan.timeline.length - 1 ? 0 : '2.5rem' }}>
                      <div style={{
                        position: 'absolute', left: '-1.75rem', top: '0.25rem',
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: item.date === 'H-Day' ? 'var(--color-mint)' : 'var(--color-ground-3)',
                        border: '2px solid var(--color-ground-1)'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: 600,
                          color: item.date === 'H-Day' ? 'var(--color-mint)' : 'var(--color-text-secondary)',
                          width: '80px', flexShrink: 0
                        }}>
                          {item.date}
                        </span>
                        <div>
                          <p style={{ fontSize: '1rem', fontWeight: 600, color: item.date === 'H-Day' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                            {item.milestone}
                          </p>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            <span>{item.phase}</span>
                            <span>•</span>
                            <span>{item.responsible}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RISKS */}
          {activeTab === 'risks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {masterPlan.risks.map((risk) => {
                const sc = severityColors[risk.severity];
                return (
                  <div key={risk.id} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start p-5 sm:px-6">
                      <div style={{ background: sc.bg, color: sc.color, padding: '0.625rem', borderRadius: '8px', flexShrink: 0 }}>
                        <AlertTriangle size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{risk.scenario}</p>
                          <span className="badge" style={{ color: sc.color, border: `1px solid ${sc.color}`, fontSize: '0.7rem' }}>
                            {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)} Risk
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--color-ground-2)', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem' }}>
                          <CheckCircle size={16} color="var(--color-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginRight: '0.5rem' }}>Mitigation:</span>
                            {risk.mitigation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
