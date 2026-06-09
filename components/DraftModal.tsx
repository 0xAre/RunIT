'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageCircle, Mail, Send, Copy, CheckCheck,
  User, Loader2, ChevronDown, ChevronUp, Camera
} from 'lucide-react';

export interface DraftPayload {
  whatsappDraft?: string;
  emailDraft?: string;
  emailSubject?: string;
  telegramDraft?: string;
  instagramDraft?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientTelegram?: string;
  recipientInstagram?: string;
  reasoning?: string;
}

interface DraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: DraftPayload | null;
  isLoading: boolean;
  taskTitle?: string;
  onMarkSent?: () => void;
}

type TabType = 'whatsapp' | 'instagram' | 'telegram' | 'email';

export default function DraftModal({
  isOpen, onClose, payload, isLoading, taskTitle, onMarkSent,
}: DraftModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('whatsapp');
  const [editedWA, setEditedWA] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedTelegram, setEditedTelegram] = useState('');
  const [editedInstagram, setEditedInstagram] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [copiedTab, setCopiedTab] = useState<TabType | null>(null);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  // Sync edits when payload arrives
  const [lastPayload, setLastPayload] = useState<DraftPayload | null>(null);
  if (payload && payload !== lastPayload) {
    setLastPayload(payload);
    setEditedWA(payload.whatsappDraft || '');
    setEditedEmail(payload.emailDraft || '');
    setEditedTelegram(payload.telegramDraft || '');
    setEditedInstagram(payload.instagramDraft || payload.whatsappDraft || '');
    setEditedSubject(payload.emailSubject || '');
  }

  if (!isOpen) return null;

  const handleCopy = async (text: string, tab: TabType) => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const waText = editedWA || payload?.whatsappDraft || '';
  const emailText = editedEmail || payload?.emailDraft || '';
  const telegramText = editedTelegram || payload?.telegramDraft || '';
  const instagramText = editedInstagram || payload?.instagramDraft || payload?.whatsappDraft || '';
  const subjectText = editedSubject || payload?.emailSubject || '';

  // Deep links — send actual message with phone/email if available
  const recipientPhone = payload?.recipientPhone?.replace(/\D/g, '') || '';
  const recipientEmail = payload?.recipientEmail || '';

  const waLink = recipientPhone
    ? `https://wa.me/${recipientPhone}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const emailLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(emailText)}`;

  const tgRecipient = payload?.recipientTelegram || '';
  const tgLink = tgRecipient
    ? `https://t.me/${tgRecipient.replace('@', '')}`
    : `https://t.me/share/url?url=&text=${encodeURIComponent(telegramText)}`;

  const igUser = payload?.recipientInstagram?.replace('@', '').trim() || '';
  const igLink = igUser ? `https://instagram.com/${igUser}` : 'https://www.instagram.com/';

  const TABS = [
    { id: 'whatsapp' as TabType, label: 'WhatsApp', icon: MessageCircle, color: '#25D366', bg: 'rgba(37,211,102,0.12)', link: waLink, content: waText, hasRecipient: !!recipientPhone },
    { id: 'instagram' as TabType, label: 'Instagram', icon: Camera, color: '#E4405F', bg: 'rgba(228,64,95,0.12)', link: igLink, content: instagramText, hasRecipient: !!igUser },
    { id: 'telegram' as TabType, label: 'Telegram', icon: Send, color: '#0088cc', bg: 'rgba(0,136,204,0.1)', link: tgLink, content: telegramText, hasRecipient: !!tgRecipient },
    { id: 'email' as TabType, label: 'Email', icon: Mail, color: '#EA4335', bg: 'rgba(234,67,53,0.1)', link: emailLink, content: emailText, hasRecipient: !!recipientEmail },
  ];

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 101,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', pointerEvents: 'none',
            }}
          >
            <div style={{
              width: '100%', maxWidth: 600,
              background: 'var(--color-ground-1)',
              border: '1px solid var(--color-border)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              pointerEvents: 'all',
            }}>

              {/* ── Header ── */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                background: 'var(--color-ground-2)',
              }}>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-mint)', marginBottom: '0.25rem' }}>
                    💡 Draft Pesan — Review & Kirim
                  </p>
                  {taskTitle && (
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                      {taskTitle}
                    </p>
                  )}
                  {payload?.recipientName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem' }}>
                      <div style={{ padding: '0.2rem 0.5rem', background: 'rgba(37,208,171,0.12)', border: '1px solid rgba(37,208,171,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <User size={11} color="var(--color-mint)" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-mint)' }}>
                          {payload.recipientName}
                          {payload.recipientPhone && ` · ${payload.recipientPhone}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem', borderRadius: 6, flexShrink: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Loading State ── */}
              {isLoading && (
                <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Loader2 size={32} color="var(--color-mint)" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>AI sedang membuat draft pesan...</p>
                </div>
              )}

              {/* ── Content ── */}
              {!isLoading && payload && (
                <>
                  {/* AI Reasoning */}
                  {payload.reasoning && (
                    <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-ground-0)' }}>
                      <button
                        onClick={() => setReasoningExpanded(e => !e)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.75rem', padding: 0 }}
                      >
                        {reasoningExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Mengapa AI merekomendasikan ini?
                      </button>
                      <AnimatePresence>
                        {reasoningExpanded && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '0.5rem', fontStyle: 'italic', overflow: 'hidden' }}
                          >
                            {payload.reasoning}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Tab selector */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-ground-0)' }}>
                    {TABS.map(tab => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          style={{
                            flex: 1, padding: '0.75rem 0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            background: isActive ? tab.bg : 'transparent',
                            borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                            color: isActive ? tab.color : 'var(--color-text-muted)',
                            border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: isActive ? 700 : 500,
                            transition: 'all 0.15s',
                          }}
                        >
                          <TabIcon size={14} />
                          {tab.label}
                          {tab.hasRecipient && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tab.color, display: 'inline-block' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Draft Text Area */}
                  <div style={{ padding: '1.25rem 1.5rem' }}>
                    {activeTab === 'email' && (
                      <input
                        value={subjectText}
                        onChange={e => setEditedSubject(e.target.value)}
                        placeholder="Subject email..."
                        style={{
                          width: '100%', padding: '0.625rem 0.875rem',
                          background: 'var(--color-ground-0)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8, color: 'var(--color-text-primary)',
                          fontSize: '0.85rem', fontWeight: 600,
                          marginBottom: '0.75rem', boxSizing: 'border-box',
                        }}
                      />
                    )}
                    <textarea
                      value={
                        activeTab === 'whatsapp' ? waText
                        : activeTab === 'instagram' ? instagramText
                        : activeTab === 'email' ? emailText
                        : telegramText
                      }
                      onChange={e => {
                        if (activeTab === 'whatsapp') setEditedWA(e.target.value);
                        else if (activeTab === 'instagram') setEditedInstagram(e.target.value);
                        else if (activeTab === 'email') setEditedEmail(e.target.value);
                        else setEditedTelegram(e.target.value);
                      }}
                      style={{
                        width: '100%', minHeight: 160, padding: '0.875rem',
                        background: 'var(--color-ground-0)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8, color: 'var(--color-text-primary)',
                        fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical',
                        fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                      ✏️ Edit draft di atas, lalu buka platform untuk kirim. Instagram: teks disalin otomatis jika tidak ada username.
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-ground-2)',
                    display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    {/* Primary Send Button */}
                    <a
                      href={currentTab.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onMarkSent}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: currentTab.color, color: '#fff',
                        padding: '0.6rem 1.25rem', borderRadius: 8,
                        fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <currentTab.icon size={15} />
                      Kirim via {currentTab.label}
                      {payload.recipientName && ` → ${payload.recipientName}`}
                    </a>

                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(currentTab.content, currentTab.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)', padding: '0.6rem 1rem',
                        borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {copiedTab === currentTab.id ? <CheckCheck size={14} color="var(--color-mint)" /> : <Copy size={14} />}
                      {copiedTab === currentTab.id ? 'Tersalin!' : 'Copy Teks'}
                    </button>

                    <div style={{ flex: 1 }} />

                    {/* Mark as Sent (without opening app) */}
                    {onMarkSent && (
                      <button
                        onClick={() => { onMarkSent(); onClose(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(37,208,171,0.12)', border: '1px solid rgba(37,208,171,0.4)',
                          color: 'var(--color-mint)', padding: '0.6rem 1rem',
                          borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        <CheckCheck size={14} />
                        Tandai Sudah Dikirim
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
