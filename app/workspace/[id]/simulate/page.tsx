'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type SimulationResult } from '@/store/eventStore';
import {
  Shield, CloudRain, Mic, Zap, Users, AlertTriangle,
  ChevronRight, Play, Loader2, CheckCircle, ArrowRight, Plus, Terminal,
  Activity, Target, TrendingDown
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';

const presetScenarios = [
  { id: 'weather', label: 'Weather Disruption', icon: CloudRain, desc: 'Heavy rain or extreme weather disrupts outdoor/hybrid event', color: 'var(--color-teal)' },
  { id: 'speaker', label: 'Speaker No-Show', icon: Mic, desc: 'Keynote speaker cancels or arrives very late', color: 'var(--color-mint)' },
  { id: 'power', label: 'Power Outage', icon: Zap, desc: 'Total electrical failure during main session', color: 'var(--color-amber)' },
  { id: 'crowd', label: 'Attendance Surge', icon: Users, desc: 'Participants far exceed venue capacity', color: 'var(--color-teal)' },
  { id: 'sponsor', label: 'Sponsor Cancellation', icon: AlertTriangle, desc: 'Main sponsor pulls out H-3 before event', color: 'var(--color-red)' },
];

const severityConfig = {
  critical: { color: 'var(--color-red)', bg: 'rgba(255, 99, 105, 0.1)', border: 'var(--color-red)', label: 'Critical' },
  high: { color: 'var(--color-amber)', bg: 'rgba(251, 191, 36, 0.1)', border: 'var(--color-amber)', label: 'High' },
  medium: { color: 'var(--color-teal)', bg: 'rgba(0, 173, 181, 0.1)', border: 'var(--color-teal)', label: 'Medium' },
  low: { color: 'var(--color-mint)', bg: 'rgba(37, 208, 171, 0.1)', border: 'var(--color-mint)', label: 'Low' },
};

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

export default function SimulatePage() {
  const params = useParams();
  const router = useRouter();
  const { currentEvent, addSimulation, setAiLoading, isAiLoading } = useEventStore();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [customScenario, setCustomScenario] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [runningResult, setRunningResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSimulations = currentEvent?.simulations || [];

  const runSimulation = async () => {
    if (!currentEvent) return;
    const scenarioText = isCustom
      ? customScenario
      : presetScenarios.find(s => s.id === selectedScenario)?.label + ' — ' +
        presetScenarios.find(s => s.id === selectedScenario)?.desc;

    if (!scenarioText) return;

    setAiLoading(true);
    setError(null);
    setRunningResult(null);

    try {
      const { lang } = useLangStore.getState();
      const res = await fetch('/api/ai/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent, scenario: scenarioText, customScenario: isCustom ? customScenario : undefined, lang }),
      });

      const data = await res.json();
      if (data.result) {
        setRunningResult(data.result);
        addSimulation(data.result);
      }
    } catch {
      const presetId = selectedScenario;
      const mockResults: Record<string, SimulationResult> = {
        speaker: {
          scenario: 'Speaker No-Show — Keynote speaker cancels or arrives very late',
          severity: 'critical',
          impactedAreas: ['Main Stage Program', 'Audience Experience', 'Rundown Flow', 'Media Coverage'],
          immediateActions: [
            'Contact backup speaker from standby list immediately',
            'Announcer inform participants of session delay',
            'MC transition to networking / coffee break',
            'Revise emergency rundown with core ops',
          ],
          contingencyPlan: [
            'Activate confirmed backup speaker',
            'Extend coffee break duration by 30 mins',
            'Replace slot with impromptu panel discussion',
            'Coordinate with MC for interactive Q&A filler',
            'Update participants via social media & announcements',
          ],
          timeImpact: 'Estimated Delay: 45-60 mins',
          affectedDivisions: ['Acara', 'Publikasi', 'MC'],
        },
      };

      const result = mockResults[presetId || 'speaker'] || mockResults['speaker'];
      setRunningResult(result);
      addSimulation(result);
    } finally {
      setAiLoading(false);
    }
  };

  const sc = runningResult ? severityConfig[runningResult.severity] : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--color-ground-2)', borderRadius: '8px' }}>
            <Shield size={20} color="var(--color-mint)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Simulation Engine
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>
          Simulate operational disruptions to test event resilience and generate contingency plans.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* Left panel — scenario selector */}
        <div>
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <PanelHeader title="Select Scenario" icon={Activity} />
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => setIsCustom(false)}
                  style={{
                    flex: 1, padding: '0.625rem', fontSize: '0.8rem', fontWeight: 500, borderRadius: '6px',
                    background: !isCustom ? 'var(--color-ground-2)' : 'transparent',
                    color: !isCustom ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  Presets
                </button>
                <button
                  onClick={() => setIsCustom(true)}
                  style={{
                    flex: 1, padding: '0.625rem', fontSize: '0.8rem', fontWeight: 500, borderRadius: '6px',
                    background: isCustom ? 'var(--color-ground-2)' : 'transparent',
                    color: isCustom ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem'
                  }}
                >
                  <Plus size={14} /> Custom
                </button>
              </div>

              {!isCustom ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {presetScenarios.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScenario(s.id)}
                      style={{
                        padding: '1rem', textAlign: 'left', borderRadius: '8px',
                        border: `1px solid ${selectedScenario === s.id ? s.color : 'var(--color-border)'}`,
                        background: selectedScenario === s.id ? `${s.color}10` : 'var(--color-ground-0)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                        <s.icon size={16} color={selectedScenario === s.id ? s.color : 'var(--color-text-primary)'} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: selectedScenario === s.id ? s.color : 'var(--color-text-primary)' }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', paddingLeft: '1.75rem', lineHeight: 1.4 }}>{s.desc}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  placeholder="Describe a custom disruption scenario...&#10;&#10;E.g., Core ops team absent on D-Day"
                  value={customScenario}
                  onChange={e => setCustomScenario(e.target.value)}
                  style={{ 
                    width: '100%', minHeight: '180px', padding: '1rem', borderRadius: '8px',
                    background: 'var(--color-ground-0)', border: '1px solid var(--color-border)', 
                    color: 'var(--color-text-primary)', fontSize: '0.85rem', lineHeight: 1.5,
                    outline: 'none', resize: 'vertical'
                  }}
                />
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={runSimulation}
            disabled={isAiLoading || (!selectedScenario && !customScenario)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600,
              opacity: isAiLoading || (!selectedScenario && !customScenario) ? 0.5 : 1,
              cursor: isAiLoading || (!selectedScenario && !customScenario) ? 'not-allowed' : 'pointer',
            }}
          >
            {isAiLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : (
              <><Play size={16} fill="currentColor" /> Run Simulation</>
            )}
          </button>

          {/* Past simulations */}
          {allSimulations.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Past Simulations ({allSimulations.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {allSimulations.map((sim, i) => {
                  const sConf = severityConfig[sim.severity];
                  return (
                    <button
                      key={i}
                      onClick={() => setRunningResult(sim)}
                      style={{
                        padding: '0.875rem 1rem', border: '1px solid var(--color-border)', background: 'var(--color-ground-1)',
                        borderRadius: '6px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sConf.color }} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {sim.scenario.split('—')[0].trim()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — results */}
        <div>
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', minHeight: '500px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PanelHeader title="Simulation Output" />
            <div style={{ padding: '1.5rem', flex: 1 }}>
              <AnimatePresence mode="wait">
                {isAiLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem'
                    }}
                  >
                    <Loader2 size={32} color="var(--color-mint)" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Processing Scenario</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Calculating operational impact and contingency plans...</p>
                    </div>
                  </motion.div>
                ) : runningResult && sc ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                  >
                    {/* Severity banner */}
                    <div style={{
                      padding: '1.25rem 1.5rem', background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '8px',
                      display: 'flex', gap: '1.25rem', alignItems: 'center'
                    }}>
                      <div style={{ padding: '0.75rem', background: 'var(--color-ground-0)', borderRadius: '8px' }}>
                        <AlertTriangle size={24} color={sc.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: sc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {sc.label} Severity
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>•</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{runningResult.timeImpact}</span>
                        </div>
                        <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{runningResult.scenario}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      {/* Impacted areas */}
                      <div style={{ background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacted Areas</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {runningResult.impactedAreas.map((area, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }} />
                              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{area}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Affected divisions */}
                      <div style={{ background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Divisions</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {runningResult.affectedDivisions.map((div, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.625rem', borderRadius: '4px', border: `1px solid ${sc.color}`, color: sc.color, background: `${sc.color}10` }}>{div}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Immediate actions */}
                    <div style={{ border: `1px solid ${sc.border}`, background: 'var(--color-ground-0)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', gap: '0.5rem', background: sc.bg }}>
                        <Zap size={16} color={sc.color} />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: sc.color }}>Immediate Actions (First 5 Mins)</h4>
                      </div>
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {runningResult.immediateActions.map((action, i) => (
                          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${sc.color}20`, color: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                              {i+1}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contingency plan */}
                    <div style={{ border: '1px solid var(--color-mint)', background: 'var(--color-ground-0)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-mint)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37, 208, 171, 0.1)' }}>
                        <CheckCircle size={16} color="var(--color-mint)" />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-mint)' }}>Contingency Plan</h4>
                      </div>
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {runningResult.contingencyPlan.map((step, i) => (
                          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <ChevronRight size={16} color="var(--color-mint)" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* OCS impact preview */}
                    {currentEvent?.execution && (
                      <div style={{
                        background: 'rgba(255,99,105,0.06)', border: '1px solid rgba(255,99,105,0.3)',
                        borderRadius: 8, padding: '1rem 1.25rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <TrendingDown size={16} color="var(--color-red)" />
                          <div>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-red)', marginBottom: '0.125rem' }}>Estimated OCS Impact</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Based on current operational state</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono, monospace)' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-mint)' }}>
                            {currentEvent.execution.ocs.score}
                          </span>
                          <ArrowRight size={14} color="var(--color-text-muted)" />
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-red)' }}>
                            ~{Math.max(10, currentEvent.execution.ocs.score - 30)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-primary"
                        onClick={() => router.push(`/workspace/${params.id}/live`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.75rem 1.25rem' }}
                      >
                        <Target size={16} />
                        Open Control Room
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center'
                    }}
                  >
                    <div style={{ padding: '1rem', background: 'var(--color-ground-2)', borderRadius: '50%', marginBottom: '0.5rem' }}>
                      <Activity size={32} color="var(--color-ground-8)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Awaiting Input</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        Select a scenario from the left to initiate the simulation engine.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
