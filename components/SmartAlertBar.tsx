'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ChevronRight, Loader2, X } from 'lucide-react';
import type { DagTask } from '@/store/eventStore';
import DraftModal, { type DraftPayload } from './DraftModal';
import { useEventStore } from '@/store/eventStore';

interface SmartAlertBarProps {
  tasks: DagTask[];
  eventData: any;
}

export default function SmartAlertBar({ tasks, eventData }: SmartAlertBarProps) {
  const { addAgentAction, updateAgentAction } = useEventStore();

  const overdueTasks = tasks.filter(t => t.status === 'delayed' || (t.status !== 'done' && t.isCritical));
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  const [isDraftModalOpen, setDraftModalOpen] = useState(false);
  const [currentPayload, setCurrentPayload] = useState<DraftPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTaskTitle, setCurrentTaskTitle] = useState('');
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const total = overdueTasks.length + blockedTasks.length;
  if (total === 0 || dismissed) return null;

  const generateBatchReminders = async () => {
    if (!eventData) return;

    setIsLoading(true);
    setDraftModalOpen(true);
    setCurrentTaskTitle(`Batch Reminder — ${overdueTasks.length} task overdue`);

    // Use first overdue task as primary context
    const primaryTask = overdueTasks[0] || blockedTasks[0];

    try {
      const res = await apiFetch('/api/ai/draft-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            ...primaryTask,
            title: `[BATCH REMINDER] ${overdueTasks.map(t => t.title).join(' | ')}`,
            description: `${overdueTasks.length} task overdue & ${blockedTasks.length} task blocked. Perlu tindak lanjut segera.`,
          },
          eventData,
          agentType: 'crisis',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const actionId = `action-batch-${Date.now()}`;
        addAgentAction({
          id: actionId,
          agentType: 'crisis',
          title: `Batch Reminder — ${total} Task Kritis`,
          description: `${overdueTasks.length} task overdue, ${blockedTasks.length} task blocked.`,
          reasoning: data.reasoning || 'Terdapat task kritis yang memerlukan tindak lanjut segera.',
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
          createdAt: new Date().toISOString(),
        });
        setCurrentActionId(actionId);
        setCurrentPayload({
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
      console.error('SmartAlertBar batch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkSent = () => {
    if (currentActionId) {
      updateAgentAction(currentActionId, 'approved');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(255,99,105,0.12), rgba(251,191,36,0.08))',
          border: '1px solid rgba(255,99,105,0.35)',
          borderRadius: 10,
          padding: '0.875rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 200 }}>
          <AlertTriangle size={18} color="var(--color-red)" />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-red)' }}>
              {total} Task Butuh Perhatian
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
              {overdueTasks.length > 0 && `${overdueTasks.length} overdue/kritis`}
              {overdueTasks.length > 0 && blockedTasks.length > 0 && ' · '}
              {blockedTasks.length > 0 && `${blockedTasks.length} terblokir`}
            </p>
          </div>
        </div>

        {/* Task chips preview */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 2, minWidth: 200 }}>
          {[...overdueTasks, ...blockedTasks].slice(0, 3).map(t => (
            <span key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.6rem', background: 'rgba(255,99,105,0.1)',
              border: '1px solid rgba(255,99,105,0.25)', borderRadius: 20,
              fontSize: '0.72rem', color: 'var(--color-red)', fontWeight: 500,
            }}>
              <Clock size={10} />
              {t.title.length > 28 ? t.title.slice(0, 28) + '…' : t.title}
            </span>
          ))}
          {total > 3 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
              +{total - 3} lagi
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={generateBatchReminders}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'var(--color-red)', color: '#fff',
              padding: '0.5rem 1rem', borderRadius: 7,
              border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem', fontWeight: 700, opacity: isLoading ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isLoading
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Membuat Draft...</>
              : <><ChevronRight size={13} /> Generate AI Reminder</>
            }
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>

      <DraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        payload={currentPayload}
        isLoading={isLoading}
        taskTitle={currentTaskTitle}
        onMarkSent={handleMarkSent}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
