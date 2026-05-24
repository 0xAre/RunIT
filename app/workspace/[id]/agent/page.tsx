'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type AgentAction } from '@/store/eventStore';
import {
  Bot, Zap, Users, Package, ShieldAlert, MessageSquare,
  CheckCheck, X, Loader2, RefreshCw, MessageCircle, Mail,
  Send, ChevronDown, ChevronUp, Inbox
} from 'lucide-react';

const AGENT_CONFIG: Record<AgentAction['agentType'], { label: string; color: string; bgColor: string; icon: any }> = {
  logistics:   { label: 'Logistics Agent',   color: '#25D366', bgColor: 'rgba(37,211,102,0.1)',   icon: Package },
  program:     { label: 'Program Agent',     color: '#848DFF', bgColor: 'rgba(132,141,255,0.1)', icon: Users },
  crisis:      { label: 'Crisis Agent',      color: '#FF6369', bgColor: 'rgba(255,99,105,0.1)',  icon: ShieldAlert },
  comms:       { label: 'Comms Agent',       color: '#25D4AB', bgColor: 'rgba(37,212,171,0.1)', icon: MessageSquare },
  procurement: { label: 'Procurement Agent', color: '#FBBF24', bgColor: 'rgba(251,191,36,0.1)', icon: Package },
};

function ActionCard({ action, onApprove, onDismiss }: {
  action: AgentAction;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const cfg = AGENT_CONFIG[action.agentType];
  const AgentIcon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  const waLink = action.commsPayload?.recipientPhone
    ? `https://wa.me/${action.commsPayload.recipientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(action.commsPayload.whatsappDraft || '')}`
    : action.commsPayload?.whatsappDraft
    ? `https://wa.me/?text=${encodeURIComponent(action.commsPayload.whatsappDraft)}`
    : null;
  const tgLink = action.commsPayload?.recipientTelegram
    ? `https://t.me/${action.commsPayload.recipientTelegram.replace('@', '')}`
    : action.commsPayload?.telegramDraft
    ? `https://t.me/share/url?url=&text=${encodeURIComponent(action.commsPayload.telegramDraft)}`
    : null;
  const emailLink = action.commsPayload?.emailDraft
    ? `mailto:${action.commsPayload.recipientEmail || ''}?subject=${encodeURIComponent(action.commsPayload.subject || action.title)}&body=${encodeURIComponent(action.commsPayload.emailDraft)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: action.status === 'approved' ? 60 : -60 }}
      style={{
        background: 'var(--color-ground-1)',
        border: `1px solid ${action.status === 'pending' ? 'var(--color-border)' : action.status === 'approved' ? 'rgba(37,208,171,0.4)' : 'transparent'}`,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: action.status !== 'pending' ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Card Header */}
      <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{
          padding: '0.625rem', borderRadius: 10, background: cfg.bgColor,
          flexShrink: 0, marginTop: 2,
        }}>
          <AgentIcon size={18} color={cfg.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {cfg.label}
            </span>
            {action.status === 'approved' && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-mint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCheck size={12} /> Approved
              </span>
            )}
            {action.status === 'dismissed' && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Dismissed</span>
            )}
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
            {action.title}
          </h3>

          {/* Recipient badge (new) */}
          {action.commsPayload?.recipientName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.375rem', padding: '0.15rem 0.5rem', background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, borderRadius: 20 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: cfg.color }}>
                → {action.commsPayload.recipientName}
                {action.commsPayload.recipientPhone && ` · ${action.commsPayload.recipientPhone}`}
              </span>
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
            {action.description}
          </p>

          <button
            onClick={() => setExpanded(e => !e)}
            style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide reasoning' : "Agent's reasoning"}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: '0.75rem', background: 'var(--color-ground-2)', padding: '0.875rem', borderRadius: 8, borderLeft: `3px solid ${cfg.color}` }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{action.reasoning}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Footer */}
      {action.status === 'pending' && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-ground-0)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Approve & Dispatch buttons */}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#25D366', color: '#fff', padding: '0.45rem 0.875rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          {tgLink && (
            <a href={tgLink} target="_blank" rel="noopener noreferrer"
              onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#0088cc', color: '#fff', padding: '0.45rem 0.875rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <Send size={13} /> Telegram
            </a>
          )}
          {emailLink && (
            <a href={emailLink} target="_blank" rel="noopener noreferrer"
              onClick={onApprove}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#EA4335', color: '#fff', padding: '0.45rem 0.875rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <Mail size={13} /> Gmail
            </a>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={onApprove}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-mint)', color: '#000', padding: '0.45rem 0.875rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            <CheckCheck size={13} /> Mark Done
          </button>
          <button
            onClick={onDismiss}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-ground-2)', color: 'var(--color-text-muted)', padding: '0.45rem 0.875rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer' }}
          >
            <X size={13} /> Dismiss
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function AgentInboxPage() {
  const { currentEvent, addAgentAction, updateAgentAction } = useEventStore();
  const [isLoading, setIsLoading] = useState(false);

  const actions = currentEvent?.agentActions || [];
  const pendingCount = actions.filter(a => a.status === 'pending').length;

  const loadAgentActions = async () => {
    if (!currentEvent?.blueprint) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/agent-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent }),
      });
      const data = await res.json();
      if (res.ok && data.actions) {
        data.actions.forEach((a: any) => {
          addAgentAction({
            id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            agentType: a.agentType,
            title: a.title,
            description: a.description,
            reasoning: a.reasoning,
            status: 'pending',
            commsPayload: {
              whatsappDraft: a.whatsappDraft,
              emailDraft: a.emailDraft,
              telegramDraft: a.whatsappDraft,
              subject: a.emailSubject,
              // Recipient info from AI (new)
              recipientName: a.recipientName || '',
              recipientPhone: a.recipientPhone || '',
              recipientEmail: a.recipientEmail || '',
            },
            createdAt: new Date().toISOString(),
          });
        });
      }
    } catch (err) {
      console.error('Agent inbox error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentEvent?.blueprint) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', opacity: 0.6 }}>
        <Inbox size={48} color="var(--color-text-muted)" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>No Event Blueprint</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Generate a blueprint first to activate your AI agent team.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--color-ground-0)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(37,208,171,0.1)', borderRadius: 8 }}>
                <Bot size={22} color="var(--color-mint)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Agent Inbox</h1>
              {pendingCount > 0 && (
                <div style={{ background: 'var(--color-red)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 20 }}>
                  {pendingCount} pending
                </div>
              )}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              Your AI agent team is proactively managing the event. Review and approve their proposed actions below.
            </p>
          </div>

          <button
            onClick={loadAgentActions}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'var(--color-mint)', border: 'none', borderRadius: 8, cursor: isLoading ? 'not-allowed' : 'pointer', color: '#000', fontWeight: 700, fontSize: '0.85rem', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
            {isLoading ? 'Agents working...' : 'Get Agent Recommendations'}
          </button>
        </div>

        {/* Agent Status Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {Object.entries(AGENT_CONFIG).map(([type, cfg]) => {
            const AgentIcon = cfg.icon;
            return (
              <div key={type} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: cfg.bgColor, margin: '0 auto 0.5rem' }}>
                  <AgentIcon size={16} color={cfg.color} />
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {cfg.label.replace(' Agent', '')}
                </p>
                <div style={{ marginTop: '0.25rem', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-mint)', margin: '0.25rem auto 0' }} />
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {actions.length === 0 && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-ground-1)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
            <Inbox size={40} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Inbox is empty</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Click "Get Agent Recommendations" to let your AI team analyze the event and propose actions.</p>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.5rem', opacity: 1 - (i * 0.15) }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-ground-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: 'var(--color-ground-2)', borderRadius: 6, marginBottom: '0.5rem', width: '40%' }} />
                    <div style={{ height: 18, background: 'var(--color-ground-2)', borderRadius: 6, width: '80%' }} />
                  </div>
                </div>
                <div style={{ height: 12, background: 'var(--color-ground-2)', borderRadius: 6, marginBottom: '0.375rem' }} />
                <div style={{ height: 12, background: 'var(--color-ground-2)', borderRadius: 6, width: '70%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Action Cards */}
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
