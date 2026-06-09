'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, X, Calendar, CheckSquare, Square, ArrowRight, Loader2 } from 'lucide-react';
import { useEventStore, type EventData } from '@/store/eventStore';
import { useRouter } from 'next/navigation';

interface Props {
  sourceEvent: EventData;
  onClose: () => void;
}

export default function DuplicateEventModal({ sourceEvent, onClose }: Props) {
  const router = useRouter();
  const { duplicateEvent } = useEventStore();

  const [name, setName] = useState(`Copy of ${sourceEvent.name}`);
  const [timeline, setTimeline] = useState('');
  const [copyBlueprint, setCopyBlueprint] = useState(true);
  const [copyContacts, setCopyContacts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleDuplicate = () => {
    if (!name.trim()) return;
    setIsLoading(true);

    const newId = duplicateEvent(sourceEvent.id, {
      name: name.trim(),
      timeline: timeline.trim() || sourceEvent.timeline,
      copyBlueprint,
      copyContacts,
    });

    if (newId) {
      router.push(`/workspace/${newId}/blueprint`);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="dup-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <motion.div
          key="dup-modal"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 460,
            background: 'var(--bg-card, #111)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '1.75rem',
            margin: '1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'rgba(0,173,181,0.12)',
                border: '1px solid rgba(0,173,181,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Copy size={16} color="var(--accent-blue, #00ADB5)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Duplikasi Event
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Dari: {sourceEvent.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Event Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Nama Event Baru <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama event baru..."
                autoFocus
                style={{ width: '100%' }}
              />
            </div>

            {/* Timeline */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                Timeline Baru <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span>
              </label>
              <input
                className="input-field"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                placeholder={sourceEvent.timeline || 'cth: 2026-07-15'}
                style={{ width: '100%' }}
              />
            </div>

            {/* Options */}
            <div style={{ background: 'var(--bg-elevated, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                Opsi Duplikasi
              </p>

              {/* Copy blueprint */}
              <button
                onClick={() => setCopyBlueprint(v => !v)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, textAlign: 'left',
                }}
              >
                {copyBlueprint
                  ? <CheckSquare size={18} color="var(--accent-blue, #00ADB5)" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <Square size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Salin Master Plan
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Divisi, tasks, dan timeline disalin — status direset ke pending
                  </p>
                </div>
              </button>

              {/* Copy contacts */}
              <button
                onClick={() => setCopyContacts(v => !v)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, textAlign: 'left',
                }}
              >
                {copyContacts
                  ? <CheckSquare size={18} color="var(--accent-blue, #00ADB5)" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <Square size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Salin Kontak PIC &amp; Eksternal
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Kontak dapat diedit setelah duplikasi
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              onClick={onClose}
              className="btn-ghost"
              style={{ fontSize: '0.85rem' }}
            >
              Batal
            </button>
            <button
              onClick={handleDuplicate}
              disabled={!name.trim() || isLoading}
              className="btn-primary"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontSize: '0.88rem',
                opacity: !name.trim() ? 0.5 : 1,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Menduplikasi…</>
                : <><Copy size={14} /> Duplikasi &amp; Buka <ArrowRight size={14} /></>
              }
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
