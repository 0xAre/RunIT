'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import {
  AlertTriangle, Zap, CheckCircle, Loader2, Clock, Users, ShieldAlert, FileText, Activity
} from 'lucide-react';

interface IncidentResponse {
  immediateActions: string[];
  affectedDivisions: string[];
  recommendation: string;
}

const incidentTypes = [
  { label: 'Technical Failure', icon: Zap, color: 'var(--color-amber)', example: 'Sound system / projector mati mendadak' },
  { label: 'Speaker Problem', icon: Users, color: 'var(--color-mint)', example: 'Pembicara sakit / tidak bisa hadir' },
  { label: 'Safety Issue', icon: ShieldAlert, color: 'var(--color-red)', example: 'Ada peserta yang jatuh sakit / cedera' },
  { label: 'Venue Problem', icon: AlertTriangle, color: 'var(--color-teal)', example: 'Kebocoran, kerusakan fasilitas venue' },
];

function PanelHeader({ title, icon: Icon, color = 'var(--color-text-primary)' }: { title: string; icon?: any; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '1rem 1.25rem',
      background: 'var(--color-ground-2)',
      borderBottom: '1px solid var(--color-border)',
      borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
    }}>
      {Icon && <Icon size={16} color={color !== 'var(--color-text-primary)' ? color : 'var(--color-text-muted)'} />}
      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color }}>{title}</h3>
    </div>
  );
}

export default function IncidentPage() {
  const params = useParams();
  const { currentEvent } = useEventStore();
  const [incident, setIncident] = useState('');
  const [response, setResponse] = useState<IncidentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ incident: string; response: IncidentResponse; time: string }[]>([]);

  const handleIncident = async () => {
    if (!incident.trim() || !currentEvent) return;
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/ai/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent, incident }),
      });
      const data = await res.json();
      if (data.response) {
        setResponse(data.response);
        setHistory(prev => [{ incident, response: data.response, time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }, ...prev]);
      }
    } catch {
      const mockResponse: IncidentResponse = {
        immediateActions: [
          'Secure the area — prioritize safety of all participants',
          'Notify Core Ops and relevant Division Lead within 2 mins',
          'Deploy holding statement via MC to prevent panic',
          'Log incident details for post-event audit',
        ],
        affectedDivisions: ['Acara', 'Ops', 'Security'],
        recommendation: `Incident "${incident}" requires immediate coordinated response. Establish single-point command to avoid conflicting instructions. Prioritize transparent participant communication. After resolution, conduct a 5-min hot wash with PICs to prevent recurrence.`,
      };
      setResponse(mockResponse);
      setHistory(prev => [{ incident, response: mockResponse, time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(255, 99, 105, 0.1)', borderRadius: '8px' }}>
            <AlertTriangle size={20} color="var(--color-red)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Incident Response
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>
          Report active incidents. AI will immediately generate an emergency response protocol and mobilization plan.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* Left — Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick incident templates */}
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <PanelHeader title="Quick Templates" icon={FileText} />
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {incidentTypes.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setIncident(t.example)}
                  style={{
                    padding: '1rem', textAlign: 'left', borderRadius: '8px',
                    border: '1px solid var(--color-border)', background: 'var(--color-ground-0)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = t.color;
                    e.currentTarget.style.background = `${t.color}10`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.background = 'var(--color-ground-0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <t.icon size={16} color={t.color} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: t.color }}>{t.label}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingLeft: '1.75rem', lineHeight: 1.4 }}>{t.example}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Incident input */}
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-red)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(255, 99, 105, 0.05)' }}>
            <PanelHeader title="Report Incident" icon={Zap} color="var(--color-red)" />
            <div style={{ padding: '1.25rem' }}>
              <textarea
                placeholder="Describe incident details...&#10;&#10;E.g., Main speaker for session 2 has a sudden medical emergency."
                value={incident}
                onChange={e => setIncident(e.target.value)}
                style={{ 
                  width: '100%', minHeight: '120px', padding: '1rem', marginBottom: '1rem', borderRadius: '8px',
                  background: 'var(--color-ground-0)', border: '1px solid var(--color-border)', 
                  color: 'var(--color-text-primary)', fontSize: '0.85rem', lineHeight: 1.5,
                  outline: 'none', resize: 'vertical', transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-red)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
              <button
                className="btn-primary"
                onClick={handleIncident}
                disabled={isLoading || !incident.trim()}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '1rem', background: 'var(--color-red)', color: '#000', borderRadius: '8px',
                  fontSize: '0.9rem', fontWeight: 600,
                  opacity: isLoading || !incident.trim() ? 0.5 : 1,
                  cursor: isLoading || !incident.trim() ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s'
                }}
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><Zap size={16} fill="currentColor" /> Get Emergency Response</>
                )}
              </button>
            </div>
          </div>

          {/* Incident history */}
          {history.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Response History ({history.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setResponse(h.response)}
                    style={{
                      padding: '0.875rem 1rem', border: '1px solid var(--color-border)', background: 'var(--color-ground-1)', borderRadius: '6px',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
                      {h.incident}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <Clock size={12} /> {h.time}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Response */}
        <div>
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '10px', height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PanelHeader title="AI Response Protocol" icon={ShieldAlert} />
            <div style={{ padding: '1.5rem', flex: 1 }}>
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', textAlign: 'center'
                    }}
                  >
                    <Loader2 size={32} color="var(--color-red)" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <div>
                      <p style={{ color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Incident Response Active</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Generating emergency protocol...</p>
                    </div>
                  </motion.div>
                ) : response ? (
                  <motion.div
                    key="response"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                  >
                    {/* Immediate actions */}
                    <div style={{ border: '1px solid var(--color-red)', background: 'var(--color-ground-0)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 99, 105, 0.1)' }}>
                        <Zap size={16} color="var(--color-red)" />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-red)' }}>Immediate Actions</h4>
                      </div>
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {response.immediateActions.map((action, i) => (
                          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255, 99, 105, 0.15)', color: 'var(--color-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Affected divisions */}
                    <div style={{ background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', padding: '1.25rem', borderRadius: '8px' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobilize Divisions</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {response.affectedDivisions.map((div, i) => (
                          <span key={i} style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-red)', color: 'var(--color-red)', background: 'rgba(255, 99, 105, 0.1)' }}>{div}</span>
                        ))}
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div style={{ border: '1px solid var(--color-mint)', background: 'var(--color-ground-0)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-mint)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37, 208, 171, 0.1)' }}>
                        <CheckCircle size={16} color="var(--color-mint)" />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-mint)' }}>Operational Recommendation</h4>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                          {response.recommendation}
                        </p>
                      </div>
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
                      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>System Standby</p>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                        Report an incident on the left to generate an emergency response protocol.
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
