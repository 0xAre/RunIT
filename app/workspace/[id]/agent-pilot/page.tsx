'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type AgentAction } from '@/store/eventStore';
import {
  Bot, Zap, Loader2, Sparkles, MapPin, DollarSign, Star, MessageSquare,
  Mail, Send, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Building2, Package, BadgeDollarSign, Users, Megaphone, BarChart3,
  RefreshCw, AlertCircle, Phone, ArrowRight, Play
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────── */
interface Recommendation {
  name: string;
  address: string;
  reasoning: string;
  estimatedCost: string;
  rating: string;
}

interface PilotAction {
  agentType: AgentAction['agentType'];
  title: string;
  description: string;
  reasoning: string;
  category: string;
  recommendations: Recommendation[];
  whatsappDraft: string;
  emailDraft: string;
  emailSubject: string;
  recipientType: 'external' | 'pic';
  targetContact: string;
}

/* ── Config ─────────────────────────────────────────── */
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  venue:     { icon: Building2,       color: '#7C6AF5', label: 'Venue' },
  vendor:    { icon: Package,         color: '#00ADB5', label: 'Vendor' },
  sponsor:   { icon: BadgeDollarSign, color: '#F5A623', label: 'Sponsor' },
  team:      { icon: Users,           color: '#55B467', label: 'Tim' },
  media:     { icon: Megaphone,       color: '#E05EA0', label: 'Media' },
  logistics: { icon: BarChart3,       color: '#00ADB5', label: 'Logistik' },
  budget:    { icon: DollarSign,      color: '#F5A623', label: 'Anggaran' },
};

const AGENT_TYPE_LABEL: Record<string, string> = {
  logistics:   'Logistics Agent',
  comms:       'Comms Agent',
  procurement: 'Procurement Agent',
  program:     'Program Agent',
  crisis:      'Crisis Agent',
};

/* ── Loading Animation ─────────────────────────────── */
function PilotLoader() {
  const phases = [
    'Membaca master plan event...',
    'Menganalisis task prioritas...',
    'Mencari vendor & venue yang relevan...',
    'Menyusun draft komunikasi...',
    'Finalisasi rekomendasi AI...',
  ];
  const [phase, setPhase] = useState(0);

  // cycle through phases via useEffect
  /* eslint-disable react-hooks/exhaustive-deps */
  const startCycle = () => {
    const id = setInterval(() => setPhase(p => (p + 1) % phases.length), 1500);
    return id;
  };

  // Start on mount
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (typeof window !== 'undefined' && !timerRef.current) {
    timerRef.current = startCycle();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '4rem 2rem', textAlign: 'center' }}>
      {/* Animated bot icon */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid rgba(0,173,181,${0.5 - i * 0.14})`,
          }}
            animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.7, 0] }}
            transition={{ duration: 1.8, delay: i * 0.35, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        <div style={{
          position: 'absolute', inset: '50%', transform: 'translate(-50%, -50%)',
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ADB5 0%, #7C6AF5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={20} color="#fff" />
        </div>
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>
          AI Auto-Pilot Aktif
        </p>
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}
        >
          {phases[phase]}
        </motion.p>
      </div>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {phases.map((_, i) => (
          <motion.div key={i} style={{
            width: i === phase ? 20 : 6, height: 6, borderRadius: 3,
            background: i === phase ? 'var(--color-mint)' : 'var(--color-border)',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Draft Modal ───────────────────────────────────── */
function DraftPanel({ action, onClose }: { action: PilotAction; onClose: () => void }) {
  const [tab, setTab] = useState<'wa' | 'email' | 'telegram'>('wa');
  const [copied, setCopied] = useState(false);

  const content = {
    wa: action.whatsappDraft,
    email: `Subject: ${action.emailSubject}\n\n${action.emailDraft}`,
    telegram: action.whatsappDraft,
  };

  const links = {
    wa: action.recommendations?.[0]
      ? `https://wa.me/?text=${encodeURIComponent(action.whatsappDraft)}`
      : `https://wa.me/?text=${encodeURIComponent(action.whatsappDraft)}`,
    email: `mailto:?subject=${encodeURIComponent(action.emailSubject)}&body=${encodeURIComponent(action.emailDraft)}`,
    telegram: `https://t.me/share/url?text=${encodeURIComponent(action.whatsappDraft)}`,
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
        borderRadius: 12, overflow: 'hidden', marginTop: '1rem',
      }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.25rem', background: 'var(--color-ground-2)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={14} color="var(--color-mint)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            Draft ke: {action.targetContact}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.2rem' }}>
          <XCircle size={16} />
        </button>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        {([
          { key: 'wa', label: 'WhatsApp', color: '#25D366' },
          { key: 'email', label: 'Email', color: '#EA4335' },
          { key: 'telegram', label: 'Telegram', color: '#2CA5E0' },
        ] as const).map(({ key, label, color }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '0.3rem 0.875rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            border: `1px solid ${tab === key ? color : 'var(--color-border)'}`,
            background: tab === key ? `${color}18` : 'transparent',
            color: tab === key ? color : 'var(--color-text-muted)',
            transition: 'all 0.12s', fontFamily: 'var(--font-sans)',
          }}>{label}</button>
        ))}
      </div>

      {/* Draft content */}
      <div style={{ padding: '1.25rem' }}>
        <div style={{
          background: 'var(--color-ground-0)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: '1rem', fontSize: '0.875rem', lineHeight: 1.65,
          color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', minHeight: 120,
          fontFamily: 'var(--font-sans)',
        }}>
          {content[tab]}
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem' }}>
          <button onClick={copy} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.55rem', borderRadius: 8, cursor: 'pointer',
            background: 'var(--color-ground-2)', border: '1px solid var(--color-border)',
            color: copied ? 'var(--color-mint)' : 'var(--color-text-secondary)',
            fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
          }}>
            {copied ? <CheckCircle2 size={14} /> : <MessageSquare size={14} />}
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
          <a href={links[tab]} target="_blank" rel="noopener noreferrer" style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.55rem', borderRadius: 8, cursor: 'pointer',
            background: tab === 'wa' ? '#25D366' : tab === 'email' ? '#EA4335' : '#2CA5E0',
            border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 700,
            fontFamily: 'var(--font-sans)', textDecoration: 'none',
          }}>
            <Send size={14} />
            {tab === 'wa' ? 'Buka WhatsApp' : tab === 'email' ? 'Buka Email' : 'Buka Telegram'}
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Action Card ───────────────────────────────────── */
function ActionCard({ action, index, onApprove, onDismiss }: {
  action: PilotAction;
  index: number;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showDraft, setShowDraft] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [approved, setApproved] = useState(false);

  const cfg = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.logistics;
  const Icon = cfg.icon;

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: approved ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.25 }}
      style={{
        background: 'var(--color-ground-1)', border: `1px solid ${approved ? 'var(--color-mint)' : 'var(--color-border)'}`,
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      {/* Card Header */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={cfg.color} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: cfg.color }}>
              {AGENT_TYPE_LABEL[action.agentType] || action.agentType}
            </span>
            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem', borderRadius: 10, background: `${cfg.color}15`, color: cfg.color, fontWeight: 600 }}>
              {cfg.label}
            </span>
            {approved && (
              <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.5rem', borderRadius: 10, background: 'rgba(37,208,171,0.12)', color: 'var(--color-mint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={10} /> Approved
              </span>
            )}
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
            {action.title}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {action.description}
          </p>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0, padding: '0.25rem' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Reasoning bar */}
      <div style={{ padding: '0.5rem 1.25rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-ground-0)' }}>
        <AlertCircle size={13} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{action.reasoning}</p>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '1.25rem' }}>

              {/* Recommendations */}
              {action.recommendations && action.recommendations.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    Rekomendasi AI ({action.recommendations.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {action.recommendations.map((rec, i) => (
                      <div key={i} style={{
                        background: 'var(--color-ground-0)', border: `1px solid ${i === 0 ? `${cfg.color}40` : 'var(--color-border)'}`,
                        borderRadius: 8, padding: '0.875rem 1rem',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {i === 0 && (
                          <div style={{
                            position: 'absolute', top: 0, right: 0,
                            background: cfg.color, color: '#000', fontSize: '0.6rem', fontWeight: 800,
                            padding: '0.15rem 0.5rem', borderBottomLeftRadius: 6,
                          }}>TOP PICK</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem', paddingRight: i === 0 ? '4rem' : 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{rec.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                            <Star size={11} color="#F5A623" style={{ fill: '#F5A623' }} />
                            <span style={{ fontSize: '0.75rem', color: '#F5A623', fontWeight: 600 }}>{rec.rating}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.375rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={11} color="var(--color-text-muted)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{rec.address}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <DollarSign size={11} color="var(--color-text-muted)" />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{rec.estimatedCost}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{rec.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target contact info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem 0.875rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <Phone size={13} color="var(--color-text-muted)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Draft pesan untuk: <strong style={{ color: 'var(--color-text-primary)' }}>{action.targetContact}</strong>
                </span>
              </div>

              {/* Draft Panel */}
              {showDraft && (
                <DraftPanel action={action} onClose={() => setShowDraft(false)} />
              )}

              {/* Actions */}
              {!approved && (
                <div style={{ display: 'flex', gap: '0.625rem', marginTop: showDraft ? '1rem' : 0 }}>
                  {!showDraft && (
                    <button
                      onClick={() => setShowDraft(true)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.6rem', borderRadius: 8, cursor: 'pointer',
                        background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`,
                        color: cfg.color, fontSize: '0.82rem', fontWeight: 700,
                        fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                      }}
                    >
                      <MessageSquare size={14} /> Lihat Draft Pesan
                    </button>
                  )}
                  <button
                    onClick={() => { setApproved(true); onApprove(); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.6rem', borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)',
                      color: 'var(--color-mint)', fontSize: '0.82rem', fontWeight: 700,
                      fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                    }}
                  >
                    <CheckCircle2 size={14} /> Tandai Selesai
                  </button>
                  <button
                    onClick={() => { setDismissed(true); onDismiss(); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, borderRadius: 8, cursor: 'pointer',
                      background: 'transparent', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)', transition: 'all 0.12s',
                    }}
                  >
                    <XCircle size={15} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Page ─────────────────────────────────────── */
export default function AgentPilotPage() {
  const params = useParams();
  const router = useRouter();
  const { currentEvent, addAgentAction, updateAgentAction } = useEventStore();

  const [actions, setActions] = useState<PilotAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  const runPilot = async () => {
    if (!currentEvent) return;
    setLoading(true);
    setError('');
    setActions([]);
    setHasRun(false);

    try {
      const res = await fetch('/api/ai/auto-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed');

      const generatedActions: PilotAction[] = json.actions;
      setActions(generatedActions);
      setHasRun(true);

      // Register all actions in the event store
      generatedActions.forEach(a => {
        addAgentAction({
          id: `ap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          agentType: a.agentType,
          title: a.title,
          description: a.description,
          reasoning: a.reasoning,
          status: 'pending',
          commsPayload: {
            whatsappDraft: a.whatsappDraft,
            emailDraft: a.emailDraft,
            subject: a.emailSubject,
            recipientName: a.targetContact,
          },
          recommendations: a.recommendations?.map(r => ({
            name: r.name,
            address: r.address,
            reasoning: r.reasoning,
            rating: r.estimatedCost,
          })),
          createdAt: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      setError('Gagal menjalankan Auto-Pilot. Pastikan master plan sudah dibuat dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Tidak ada event aktif.</p>
      </div>
    );
  }

  if (!currentEvent.masterPlan) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
        <Bot size={40} color="var(--color-text-muted)" />
        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>MasterPlan belum dibuat</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: 360 }}>
          Auto-Pilot membutuhkan master plan untuk menganalisis kebutuhan event. Buat master plan terlebih dahulu.
        </p>
        <button className="btn-primary" onClick={() => router.push(`/workspace/${params.id}/master-plan`)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowRight size={15} /> Buat MasterPlan
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0,173,181,0.15), rgba(124,106,245,0.15))',
              border: '1px solid rgba(124,106,245,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={18} color="#7C6AF5" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
              AI Auto-Pilot
            </h1>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', maxWidth: 560 }}>
            AI membaca master plan Anda, mencari vendor/venue yang sesuai, dan menyiapkan draft pesan komunikasi yang tinggal Anda kirim.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {hasRun && (
            <button onClick={runPilot} disabled={loading} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <RefreshCw size={14} /> Regenerate
            </button>
          )}
          <button
            onClick={runPilot}
            disabled={loading}
            id="start-autopilot-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'var(--color-ground-2)' : 'linear-gradient(135deg, #00ADB5, #7C6AF5)',
              border: 'none', color: loading ? 'var(--color-text-muted)' : '#fff',
              fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} style={{ fill: 'white' }} />}
            {loading ? 'Memproses...' : hasRun ? 'Jalankan Ulang' : 'Mulai Auto-Pilot'}
          </button>
        </div>
      </div>

      {/* ── Status Banner ───────────────────────────────── */}
      {!hasRun && !loading && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,173,181,0.06), rgba(124,106,245,0.06))',
          border: '1px solid rgba(124,106,245,0.2)',
          borderRadius: 12, padding: '1.5rem',
          display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
        }}>
          <div style={{ padding: '0.75rem', background: 'rgba(124,106,245,0.12)', borderRadius: 10 }}>
            <Sparkles size={20} color="#7C6AF5" />
          </div>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
              Siap untuk di-aktivasi
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 500 }}>
              Klik <strong>"Mulai Auto-Pilot"</strong> dan AI akan menganalisis master plan <strong>{currentEvent.name}</strong>, lalu langsung mencari vendor, venue, dan menyiapkan draft komunikasi berdasarkan kebutuhan event Anda.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {[
                { icon: Building2, label: 'Cari Venue & Vendor', color: '#7C6AF5' },
                { icon: MessageSquare, label: 'Draft Pesan Siap Kirim', color: '#00ADB5' },
                { icon: BadgeDollarSign, label: 'Rekomendasi Budget', color: '#F5A623' },
              ].map(({ icon: I, label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <I size={13} color={color} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────── */}
      {loading && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <PilotLoader />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <div style={{ background: 'rgba(255,99,105,0.08)', border: '1px solid rgba(255,99,105,0.3)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--color-red)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--color-red)', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      {/* ── Progress Summary ─────────────────────────────── */}
      {hasRun && actions.length > 0 && (
        <div style={{
          display: 'flex', gap: '1rem', alignItems: 'center',
          padding: '0.875rem 1.25rem',
          background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              {approvedCount} dari {actions.length} action selesai
            </p>
            <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(approvedCount / actions.length) * 100}%` }}
                style={{ height: '100%', background: 'var(--color-mint)', borderRadius: 2 }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Zap size={14} color="var(--color-mint)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              {actions.length - approvedCount} tersisa
            </span>
          </div>
        </div>
      )}

      {/* ── Action Cards ─────────────────────────────────── */}
      <AnimatePresence>
        {actions.map((action, i) => (
          <ActionCard
            key={`${action.title}-${i}`}
            action={action}
            index={i}
            onApprove={() => setApprovedCount(c => c + 1)}
            onDismiss={() => {}}
          />
        ))}
      </AnimatePresence>

      {/* ── All done CTA ─────────────────────────────────── */}
      {hasRun && approvedCount === actions.length && actions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(37,208,171,0.08), rgba(37,208,171,0.03))',
            border: '1px solid rgba(37,208,171,0.3)', borderRadius: 12,
            padding: '1.5rem', textAlign: 'center',
          }}>
          <CheckCircle2 size={32} color="var(--color-mint)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
            Semua Action Selesai!
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Lanjutkan ke Control Room untuk memantau eksekusi event secara real-time.
          </p>
          <button className="btn-primary" onClick={() => router.push(`/workspace/${params.id}/live`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Buka Control Room <ArrowRight size={15} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
