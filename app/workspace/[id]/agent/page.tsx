'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type AgentAction } from '@/store/eventStore';
import {
  Bot, Package, ShieldAlert, MessageSquare, Users,
  CheckCheck, X, Loader2, RefreshCw, MessageCircle, Mail,
  Send, ChevronDown, ChevronUp, Inbox, Camera, MapPin, Star, Sparkles
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

const AGENT_CONFIG: Record<AgentAction['agentType'], { label: string; color: string; bgColor: string; icon: typeof Package }> = {
  logistics:   { label: 'Logistik',   color: '#25D366', bgColor: 'rgba(37,211,102,0.1)',   icon: Package },
  program:     { label: 'Program',     color: '#848DFF', bgColor: 'rgba(132,141,255,0.1)', icon: Users },
  crisis:      { label: 'Krisis',      color: '#FF6369', bgColor: 'rgba(255,99,105,0.1)',  icon: ShieldAlert },
  comms:       { label: 'Komunikasi',  color: '#25D4AB', bgColor: 'rgba(37,212,171,0.1)', icon: MessageSquare },
  procurement: { label: 'Pengadaan', color: '#FBBF24', bgColor: 'rgba(251,191,36,0.1)', icon: Package },
};

const CATEGORY_LABEL: Record<string, string> = {
  venue: 'Gedung / Venue',
  vendor: 'Vendor',
  sponsor: 'Sponsor',
  catering: 'Catering',
  equipment: 'Perlengkapan',
  permit: 'Perizinan',
  comms: 'Publikasi',
  other: 'Kebutuhan lain',
};

function buildPlatformLinks(action: AgentAction) {
  const p = action.commsPayload;
  const waText = p?.whatsappDraft || '';
  const phone = p?.recipientPhone?.replace(/\D/g, '') || '';
  const igUser = p?.recipientInstagram?.replace('@', '').trim() || '';
  const igText = p?.instagramDraft || waText;

  return {
    wa: phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`
      : waText ? `https://wa.me/?text=${encodeURIComponent(waText)}` : null,
    tg: p?.recipientTelegram
      ? `https://t.me/${p.recipientTelegram.replace('@', '')}`
      : (p?.telegramDraft || waText)
        ? `https://t.me/share/url?url=&text=${encodeURIComponent(p?.telegramDraft || waText)}`
        : null,
    ig: igUser
      ? `https://instagram.com/${igUser}`
      : igText
        ? `https://www.instagram.com/`
        : null,
    email: p?.emailDraft
      ? `mailto:${p.recipientEmail || ''}?subject=${encodeURIComponent(p.subject || action.title)}&body=${encodeURIComponent(p.emailDraft)}`
      : null,
    igCopyText: igText,
  };
}

function ActionCard({ action, onApprove, onDismiss }: {
  action: AgentAction;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const cfg = AGENT_CONFIG[action.agentType];
  const AgentIcon = cfg.icon;
  const links = buildPlatformLinks(action);
  const { lang } = useLangStore();
  const isId = lang === 'id';

  // UX Flow State: initial -> searching -> recommendations -> drafting -> ready
  const [phase, setPhase] = useState<'initial' | 'searching' | 'recommendations' | 'drafting' | 'ready'>(
    action.status === 'approved' ? 'ready' : 'initial'
  );
  const [selectedRecIndex, setSelectedRecIndex] = useState<number | null>(null);

  const copyDraft = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleSearchNearby = () => {
    setPhase('searching');
    // Simulate Maps API delay
    setTimeout(() => setPhase('recommendations'), 1800);
  };

  const handleSelectRec = (index: number) => {
    setSelectedRecIndex(index);
    setPhase('drafting');
    // Simulate AI Drafting delay
    setTimeout(() => setPhase('ready'), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: action.status === 'approved' ? 60 : -60 }}
      style={{
        background: 'var(--color-ground-1)',
        border: `1px solid ${action.status === 'pending' ? 'var(--color-border)' : 'rgba(37,208,171,0.35)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: action.status !== 'pending' ? 0.55 : 1,
      }}
    >
      <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ padding: '0.625rem', borderRadius: 10, background: cfg.bgColor, flexShrink: 0 }}>
          <AgentIcon size={18} color={cfg.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {cfg.label}
            </span>
            {action.category && (
              <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 12, background: 'var(--color-ground-2)', color: 'var(--color-text-muted)' }}>
                {CATEGORY_LABEL[action.category] || action.category}
              </span>
            )}
            {action.status === 'approved' && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-mint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                <CheckCheck size={12} /> {isId ? 'Selesai' : 'Done'}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
            {action.title}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            {action.description}
          </p>

          {/* Interactive Flow */}
          {phase === 'initial' && action.recommendations && action.recommendations.length > 0 && (
            <button
              onClick={handleSearchNearby}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1rem', background: 'var(--color-mint)',
                color: '#000', fontWeight: 700, fontSize: '0.8rem',
                border: 'none', borderRadius: 8, cursor: 'pointer'
              }}
            >
              <MapPin size={14} /> {isId ? 'Search Nearby (Maps)' : 'Search Nearby (Maps)'}
            </button>
          )}

          {phase === 'searching' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {isId ? 'Mencari rekomendasi terdekat di Maps...' : 'Searching nearby on Maps...'}
            </div>
          )}

          {phase === 'recommendations' && action.recommendations && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{isId ? 'Pilih satu untuk dihubungi:' : 'Select one to contact:'}</p>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {action.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectRec(i)}
                    style={{
                      padding: '0.75rem', background: 'var(--color-ground-0)',
                      borderRadius: 8, border: '1px solid var(--color-border)',
                      cursor: 'pointer', transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-mint)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{rec.name}</span>
                      {rec.rating && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                          <Star size={11} fill="currentColor" /> {rec.rating}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.25rem' }}>
                      <MapPin size={11} /> {rec.address}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{rec.reasoning}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'drafting' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              <Sparkles size={14} style={{ animation: 'pulse 1.5s infinite' }} /> {isId ? 'AI sedang membuat draft pesan...' : 'AI is drafting message...'}
            </div>
          )}

          {phase === 'ready' && selectedRecIndex !== null && action.recommendations && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--color-mint)', fontWeight: 600 }}>
                <CheckCheck size={14} /> Terpilih: {action.recommendations[selectedRecIndex].name}
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--color-ground-0)', borderRadius: 8, border: '1px dashed var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {action.commsPayload?.whatsappDraft}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {phase === 'ready' && action.status === 'pending' && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-ground-0)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', width: '100%', marginBottom: '0.25rem' }}>
            {isId ? 'Kirim pesan (draft otomatis terisi):' : 'Send message (draft pre-filled):'}
          </span>
          {links.wa && (
            <a href={links.wa} target="_blank" rel="noopener noreferrer" onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#25D366', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          {links.ig && (
            <a href={links.ig} target="_blank" rel="noopener noreferrer"
              onClick={(e) => { if (!action.commsPayload?.recipientInstagram && links.igCopyText) { e.preventDefault(); copyDraft(links.igCopyText); } onApprove(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
              <Camera size={13} /> Instagram
            </a>
          )}
          {links.tg && (
            <a href={links.tg} target="_blank" rel="noopener noreferrer" onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0088cc', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
              <Send size={13} /> Telegram
            </a>
          )}
          {links.email && (
            <a href={links.email} target="_blank" rel="noopener noreferrer" onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#EA4335', color: '#fff', padding: '0.45rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
              <Mail size={13} /> Email
            </a>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onDismiss} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-ground-2)', color: 'var(--color-text-muted)', padding: '0.45rem 0.8rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            <X size={13} /> {isId ? 'Lewati' : 'Skip'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function AgentInboxPage() {
  const { currentEvent, addAgentAction, updateAgentAction } = useEventStore();
  const { lang } = useLangStore();
  const t = dict[lang];
  const isId = lang === 'id';
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('runit-welcome-agent') === '1') {
      setWelcome(true);
      sessionStorage.removeItem('runit-welcome-agent');
    }
  }, []);

  const actions = currentEvent?.agentActions || [];
  const pendingCount = actions.filter(a => a.status === 'pending').length;

  const ingestActions = useCallback((rawActions: Record<string, unknown>[]) => {
    rawActions.forEach((a) => {
      addAgentAction({
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        agentType: a.agentType as AgentAction['agentType'],
        title: String(a.title || ''),
        description: String(a.description || ''),
        reasoning: String(a.reasoning || ''),
        status: 'pending',
        category: a.category as AgentAction['category'],
        recommendations: Array.isArray(a.recommendations) ? a.recommendations as AgentAction['recommendations'] : undefined,
        commsPayload: {
          whatsappDraft: String(a.whatsappDraft || ''),
          emailDraft: String(a.emailDraft || ''),
          telegramDraft: String(a.telegramDraft || a.whatsappDraft || ''),
          instagramDraft: String(a.instagramDraft || a.whatsappDraft || ''),
          subject: String(a.emailSubject || a.title || ''),
          recipientName: String(a.recipientName || ''),
          recipientPhone: String(a.recipientPhone || ''),
          recipientEmail: String(a.recipientEmail || ''),
          recipientInstagram: String(a.recipientInstagram || ''),
        },
        createdAt: new Date().toISOString(),
      });
    });
  }, [addAgentAction]);

  const loadCommitteeActions = useCallback(async () => {
    if (!currentEvent) return;
    setIsLoading(true);
    try {
      const endpoint = currentEvent.masterPlan ? '/api/ai/agent-inbox' : '/api/ai/committee-sourcing';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent }),
      });
      const data = await res.json();
      if (res.ok && data.actions) {
        ingestActions(data.actions);
      }
    } catch (err) {
      console.error('Agent load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentEvent, ingestActions]);

  useEffect(() => {
    if (!currentEvent || hasAutoLoaded || isLoading) return;
    const shouldAutoLoad = welcome || actions.length === 0;
    if (shouldAutoLoad) {
      setHasAutoLoaded(true);
      loadCommitteeActions();
    }
  }, [currentEvent, welcome, actions.length, hasAutoLoaded, isLoading, loadCommitteeActions]);

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
        <p style={{ color: 'var(--color-text-muted)' }}>{isId ? 'Event tidak ditemukan.' : 'Event not found.'}</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-ground-0)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 2rem' }}>

        {welcome && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 10, background: 'rgba(0,173,181,0.08)', border: '1px solid rgba(0,173,181,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Sparkles size={16} color="var(--color-mint)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-mint)' }}>
                {isId ? 'AI Panitia aktif' : 'AI Committee active'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {isId
                ? 'Di bawah ini kebutuhan yang AI temukan — gedung, vendor, sponsor. Setiap item punya draft pesan. Buka WhatsApp / Instagram / Telegram, review, lalu kirim.'
                : 'Below are needs AI found — venues, vendors, sponsors. Each item has a message draft. Open WhatsApp / Instagram / Telegram, review, then send.'}
            </p>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(37,208,171,0.1)', borderRadius: 8 }}>
                <Bot size={22} color="var(--color-mint)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t.sideAiCommittee}</h1>
              {pendingCount > 0 && (
                <div style={{ background: 'var(--color-red)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 20 }}>
                  {pendingCount} {isId ? 'draft' : 'drafts'}
                </div>
              )}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: 520, lineHeight: 1.5 }}>
              {isId
                ? 'AI bertindak seperti panitia: riset vendor & gedung, buatkan draft pesan saja. Anda yang kirim lewat platform.'
                : 'AI acts as your committee: researches vendors & venues, drafts messages only. You send via the platform.'}
            </p>
          </div>
          <button onClick={loadCommitteeActions} disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'var(--color-mint)', border: 'none', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer', color: '#000', fontWeight: 700, fontSize: '0.85rem', opacity: isLoading ? 0.7 : 1, flexShrink: 0 }}>
            {isLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
            {isLoading ? (isId ? 'AI mencari…' : 'Searching…') : (isId ? 'Cari kebutuhan baru' : 'Find more needs')}
          </button>
        </div>

        {actions.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-ground-1)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
            <Inbox size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
              {isId ? 'Belum ada draft pesan' : 'No message drafts yet'}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {isId ? 'Klik tombol di atas agar AI panitia mencari vendor, gedung, dan kebutuhan lainnya.' : 'Click above to let AI find venues, vendors, and other needs.'}
            </p>
          </div>
        )}

        {isLoading && actions.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.5rem', opacity: 1 - i * 0.15 }}>
                <div style={{ height: 14, width: '30%', background: 'var(--color-ground-2)', borderRadius: 6, marginBottom: '0.75rem' }} />
                <div style={{ height: 20, width: '70%', background: 'var(--color-ground-2)', borderRadius: 6, marginBottom: '0.5rem' }} />
                <div style={{ height: 12, width: '90%', background: 'var(--color-ground-2)', borderRadius: 6 }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && actions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence>
              {actions.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onApprove={() => updateAgentAction(action.id, 'approved')}
                  onDismiss={() => updateAgentAction(action.id, 'dismissed')}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
