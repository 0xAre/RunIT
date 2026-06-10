'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { Loader2, MessageCircle, Mail, Send, User, History } from 'lucide-react';
import DraftModal, { type DraftPayload } from '@/components/DraftModal';
import {
  useEventStore,
  type EventData,
  type ContactPIC,
  type ExternalContact,
  type Task,
  type CommsLogEntry,
} from '@/store/eventStore';

type ContactOption = {
  id: string;
  name: string;
  role?: string;
  whatsapp?: string;
  email?: string;
  telegram?: string;
  source: 'pic' | 'external';
};

function buildContactOptions(event: EventData): ContactOption[] {
  const pics: ContactOption[] = (event.picContacts || []).map((c: ContactPIC) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    whatsapp: c.whatsapp,
    email: c.email,
    telegram: c.telegram,
    source: 'pic' as const,
  }));
  const externals: ContactOption[] = (event.externalContacts || []).map((c: ExternalContact) => ({
    id: c.id,
    name: c.name,
    role: c.category,
    whatsapp: c.whatsapp,
    email: c.email,
    source: 'external' as const,
  }));
  return [...pics, ...externals];
}

function allTasks(event: EventData): Task[] {
  return event.masterPlan?.divisions.flatMap(d => d.tasks) || [];
}

interface CommsPanelProps {
  event: EventData;
}

export default function CommsPanel({ event }: CommsPanelProps) {
  const logCommsEntry = useEventStore(s => s.logCommsEntry);
  const contacts = useMemo(() => buildContactOptions(event), [event]);
  const tasks = useMemo(() => allTasks(event), [event]);

  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftPayload, setDraftPayload] = useState<DraftPayload | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [pendingChannel, setPendingChannel] = useState<CommsLogEntry['channel']>('whatsapp');

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const commsLog = [...(event.commsLog || [])].reverse().slice(0, 20);

  const generateDraft = async () => {
    if (!selectedContact) return;
    setDraftLoading(true);
    setDraftOpen(true);
    setDraftTitle(selectedTask?.title || `Message to ${selectedContact.name}`);

    const taskContext = selectedTask || {
      id: 'comms-manual',
      title: `Follow-up: ${selectedContact.name}`,
      description: `Communication with ${selectedContact.name}${selectedContact.role ? ` (${selectedContact.role})` : ''} for ${event.name}.`,
      deadline: event.timeline || 'H-0',
      priority: 'medium' as const,
      status: 'in-progress' as const,
      dependencies: [],
      divisionId: '',
    };

    try {
      const res = await apiFetch('/api/ai/draft-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskContext,
          eventData: event,
          agentType: 'comms',
          recipientOverride: {
            name: selectedContact.name,
            phone: selectedContact.whatsapp,
            email: selectedContact.email,
            telegram: selectedContact.telegram,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDraftPayload({
          whatsappDraft: data.whatsappDraft,
          emailDraft: data.emailDraft,
          emailSubject: data.emailSubject,
          telegramDraft: data.telegramDraft,
          recipientName: selectedContact.name,
          recipientPhone: selectedContact.whatsapp || data.recipientPhone,
          recipientEmail: selectedContact.email || data.recipientEmail,
          recipientTelegram: selectedContact.telegram || data.recipientTelegram,
          reasoning: data.reasoning,
        });
      }
    } catch (err) {
      console.error('CommsPanel draft error:', err);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleMarkSent = (channel: CommsLogEntry['channel'] = pendingChannel) => {
    if (!selectedContact) return;
    const preview =
      channel === 'email'
        ? draftPayload?.emailDraft?.slice(0, 120) || ''
        : channel === 'telegram'
          ? draftPayload?.telegramDraft?.slice(0, 120) || ''
          : draftPayload?.whatsappDraft?.slice(0, 120) || '';

    logCommsEntry({
      channel,
      sentAt: new Date().toISOString(),
      recipientName: selectedContact.name,
      recipientContact: selectedContact.whatsapp || selectedContact.email || selectedContact.telegram,
      preview,
      taskId: selectedTask?.id,
      contactId: selectedContact.id,
    });

    if (selectedContact.source === 'external') {
      useEventStore.getState().logCommunication(selectedContact.id, {
        channel,
        sentAt: new Date().toISOString(),
        taskId: selectedTask?.id,
        preview,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MessageCircle size={18} color="var(--color-mint)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, flex: 1 }}>
          Communications
        </h3>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>WA · Email · Telegram</span>
      </div>

      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--color-border)', borderRadius: 12, color: 'var(--color-text-muted)' }}>
          <User size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>No contacts yet</p>
          <p style={{ fontSize: '0.8rem' }}>Add PIC contacts in Committee or external contacts during execution confirm tab.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Recipient
              <select
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-1)', color: 'var(--color-text-primary)', fontSize: '0.82rem' }}
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.role ? `· ${c.role}` : ''} ({c.source === 'pic' ? 'PIC' : 'External'})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Task context (optional)
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-1)', color: 'var(--color-text-primary)', fontSize: '0.82rem' }}
              >
                <option value="">— General message —</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedContact && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
              {selectedContact.whatsapp && (
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>WA: {selectedContact.whatsapp}</span>
              )}
              {selectedContact.email && (
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(234,67,53,0.1)', color: '#EA4335' }}>{selectedContact.email}</span>
              )}
              {selectedContact.telegram && (
                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(0,136,204,0.1)', color: '#0088cc' }}>TG: {selectedContact.telegram}</span>
              )}
            </div>
          )}

          <button
            onClick={generateDraft}
            disabled={!selectedContact || draftLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.625rem 1rem', borderRadius: 8, border: 'none', cursor: draftLoading ? 'wait' : 'pointer',
              background: 'var(--color-mint)', color: '#04312C', fontWeight: 700, fontSize: '0.85rem',
              opacity: !selectedContact || draftLoading ? 0.7 : 1,
            }}
          >
            {draftLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating draft...</> : <><Send size={14} /> Generate AI Draft & Send</>}
          </button>
        </>
      )}

      {commsLog.length > 0 && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
            <History size={14} /> Recent comms log
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {commsLog.map(entry => (
              <div key={entry.id} style={{ padding: '0.625rem 0.75rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{entry.recipientName}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{new Date(entry.sentAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', color: 'var(--color-text-muted)' }}>
                  {entry.channel === 'whatsapp' && <MessageCircle size={11} color="#25D366" />}
                  {entry.channel === 'email' && <Mail size={11} color="#EA4335" />}
                  {entry.channel === 'telegram' && <Send size={11} color="#0088cc" />}
                  <span style={{ textTransform: 'capitalize' }}>{entry.channel}</span>
                  {entry.preview && <span>· {entry.preview.slice(0, 60)}{entry.preview.length > 60 ? '…' : ''}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DraftModal
        isOpen={draftOpen}
        onClose={() => setDraftOpen(false)}
        payload={draftPayload}
        isLoading={draftLoading}
        taskTitle={draftTitle}
        onMarkSent={() => handleMarkSent(pendingChannel)}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
