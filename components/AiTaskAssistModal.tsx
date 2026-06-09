import { apiFetch } from '@/lib/api-fetch';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, FileUp, CheckCircle2, Loader2, Paperclip, Star, MapPin, ExternalLink, Save, FileText, ClipboardCheck, Download, Send, MessageCircle, Mail, Phone } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { Task, EventData, TaskCategory, DocumentType, GeneratedDocument } from '@/store/eventStore';
import { useEventStore } from '@/store/eventStore';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/task-agents';
import { getDocumentTypesForCategory } from '@/lib/document-generator';

interface AiTaskAssistModalProps {
  task: Task;
  eventData: EventData;
  onClose: () => void;
  onApply: (notes: string, attachments: string[]) => void;
}

interface ResolutionData {
  steps: string[];
  draftMessage?: string;
  sourcingSummary: string;
  category?: TaskCategory;
  recommendations?: Array<{
    name: string;
    address: string;
    reasoning: string;
    rating: string;
    estimatedCost?: string;
    sourceUrl?: string;
  }>;
  estimatedCost?: string;
  confidenceScore?: number;
  negotiationTip?: string;
}

export default function AiTaskAssistModal({ task, eventData, onClose, onApply }: AiTaskAssistModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResolutionData | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(task.attachments || []);
  const [savedContacts, setSavedContacts] = useState<Set<number>>(new Set());

  const addExternalContact = useEventStore(s => s.addExternalContact);

  useEffect(() => {
    async function resolveTask() {
      try {
        const res = await apiFetch('/api/ai/resolve-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, eventData }),
        });
        if (!res.ok) throw new Error('Failed to resolve task');
        const result: ResolutionData = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    resolveTask();
  }, [task, eventData]);

  const handleFileUpload = async () => {
    if (files.length === 0) return attachments;
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of files) {
      const fileRef = ref(storage, `workspaces/${eventData.id}/tasks/${task.id}/${file.name}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      newUrls.push(url);
    }

    setUploading(false);
    return [...attachments, ...newUrls];
  };

  const handleSaveContact = (rec: NonNullable<ResolutionData['recommendations']>[number], idx: number) => {
    const extId = `ext-${Date.now()}-${idx}`;
    const isVendor = data?.category === 'vendor' || data?.category === 'catering' || data?.category === 'equipment';
    const isVenue = data?.category === 'venue';
    const isSponsor = data?.category === 'sponsor';
    const isSpeaker = data?.category === 'speaker';
    const contactType = isVenue ? 'venue' : isSponsor ? 'sponsor' : isSpeaker ? 'speaker' : isVendor ? 'vendor' : 'other';

    addExternalContact({
      id: extId,
      name: rec.name,
      category: contactType,
      notes: `${rec.reasoning} | Rating: ${rec.rating}${rec.estimatedCost ? ' | Estimasi: ' + rec.estimatedCost : ''}`,
      email: '',
      whatsapp: '',
    });
    setSavedContacts(prev => new Set(prev).add(idx));
  };

  const handleApply = async () => {
    const finalAttachments = await handleFileUpload();
    if (!data) return;

    let notes = '';
    if (data.category && data.category !== 'internal') {
      notes += `**Kategori:** ${data.category} | **Confidence:** ${data.confidenceScore}%\n\n`;
    }
    notes += `**Sourcing Intel:**\n${data.sourcingSummary}\n\n`;
    if (data.negotiationTip) {
      notes += `**Tips Negosiasi:** ${data.negotiationTip}\n\n`;
    }
    notes += `**Langkah Eksekusi:**\n`;
    data.steps.forEach((s, i) => { notes += `${i + 1}. ${s}\n`; });
    if (data.draftMessage) {
      notes += `\n**Draft Pesan:**\n${data.draftMessage}`;
    }
    if (data.recommendations && data.recommendations.length > 0) {
      notes += `\n\n**Rekomendasi (${data.category}):**\n`;
      data.recommendations.forEach((r, i) => {
        notes += `${i + 1}. ${r.name} — ${r.address} (${r.rating})\n   ${r.reasoning}${r.estimatedCost ? ' | Estimasi: ' + r.estimatedCost : ''}\n`;
      });
    }

    onApply(notes, finalAttachments);
  };

  // ── Document Generation ──────────────────────────────────
  type Tab = 'resolution' | 'document';
  const [activeTab, setActiveTab] = useState<Tab>('resolution');
  const [docGenLoading, setDocGenLoading] = useState(false);
  const [docGenError, setDocGenError] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(task.generatedDocument || null);
  const [docGenType, setDocGenType] = useState<DocumentType>('rundown');
  const [docSaved, setDocSaved] = useState(!!task.generatedDocument);

  const category = data?.category || task.category || 'internal';
  const availableDocTypes = getDocumentTypesForCategory(category);

  const handleGenerateDocument = useCallback(async (type: DocumentType) => {
    setDocGenLoading(true);
    setDocGenError(null);
    setDocGenType(type);
    try {
      const res = await apiFetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, eventData, docType: type }),
      });
      if (!res.ok) throw new Error('Failed to generate document');
      const result = await res.json();
      setGeneratedDoc(result.document);
      useEventStore.getState().setTaskDocument(task.id, result.document);

      // Auto-init budget tracker if this is a budget document
      if (type === 'budget' && result.budgetItems?.length) {
        useEventStore.getState().initBudgetTracker(result.budgetItems);
      }

      setDocSaved(true);
    } catch (err: any) {
      setDocGenError(err.message);
    } finally {
      setDocGenLoading(false);
    }
  }, [task, eventData]);

  const DOC_LABELS: Record<DocumentType, { label: string; icon: typeof FileText }> = {
    rundown: { label: 'Rundown', icon: FileText },
    proposal: { label: 'Proposal Sponsor', icon: FileText },
    checklist: { label: 'Checklist', icon: ClipboardCheck },
    budget: { label: 'Budget Sheet', icon: FileText },
    'mc-script': { label: 'Script MC', icon: FileText },
    'press-release': { label: 'Siaran Pers', icon: FileText },
    'technical-rider': { label: 'Technical Rider', icon: FileText },
    'h1-checklist': { label: 'Checklist H-1', icon: ClipboardCheck },
  };

  const simpleMd = (md: string) => md
    .replace(/^### (.+)$/gm, '<h4 style="margin-top:0.75rem;margin-bottom:0.3rem;font-size:0.88rem;font-weight:700;color:var(--color-text-primary)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin-top:1rem;margin-bottom:0.4rem;font-size:1rem;font-weight:700;color:var(--color-text-primary)">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin-bottom:0.5rem;font-size:1.1rem;font-weight:700;color:var(--color-text-primary)">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line.split('|').filter(Boolean).map(c => c.trim());
      const isHeader = cells.length > 0 && cells.every(c => /^-{3,}$/.test(c.replace(/\s/g, '')));
      if (isHeader) return '';
      return `<tr>${cells.map(c => `<td style="padding:0.15rem 0.5rem;border:1px solid var(--color-border);font-size:0.72rem">${c}</td>`).join('')}</tr>`;
    })
    .replace(/(\n<tr>)/g, '<table style="width:100%;border-collapse:collapse;margin:0.5rem 0;font-size:0.72rem">$1')
    .replace(/(<\/tr>\n)(?!<tr>)/g, '$1</table>')
    .replace(/- \[ \]/g, '<span style="color:var(--color-text-muted)">☐</span> ')
    .replace(/- \[x\]/gi, '<span style="color:#25D0AB">☑</span> ')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  const categoryLabel = (cat?: TaskCategory) => {
    const labels: Record<TaskCategory, string> = {
      internal: 'Internal', venue: 'Venue', vendor: 'Vendor', sponsor: 'Sponsor',
      speaker: 'Speaker/Talent', catering: 'Catering', equipment: 'Equipment',
      permit: 'Perizinan', comms: 'Komunikasi', logistics: 'Logistik',
      program: 'Program', budget: 'Anggaran', crisis: 'Mitigasi',
    };
    return cat ? labels[cat] : 'General';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        style={{
          width: '90%', maxWidth: 640, maxHeight: '90vh', background: 'var(--color-ground-1)',
          borderRadius: 16, border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--color-border)', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,106,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#7C6AF5" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Sourcing Assistant
              {data?.category && data.category !== 'internal' && (
                <span style={{ fontSize: '0.7rem', padding: '0.12rem 0.5rem', borderRadius: 20, background: 'rgba(124,106,245,0.12)', color: '#7C6AF5', fontWeight: 600, marginLeft: '0.5rem', verticalAlign: 'middle' }}>
                  {categoryLabel(data.category)}
                </span>
              )}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{task.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {availableDocTypes.length > 0 && (
          <div style={{ padding: '0 1.25rem', display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--color-border)' }}>
            {(['resolution', 'document'] as const).map(t => (
              <button key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: '0.5rem 0.875rem', border: 'none', cursor: 'pointer',
                  background: 'transparent', fontSize: '0.78rem', fontWeight: activeTab === t ? 700 : 500,
                  color: activeTab === t ? '#7C6AF5' : 'var(--color-text-muted)',
                  borderBottom: activeTab === t ? '2px solid #7C6AF5' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'resolution' ? 'Steps' : 'Dokumen'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTab === 'resolution' && (
          <>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: 'var(--color-text-muted)', gap: '1rem' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#7C6AF5' }} />
              <p style={{ fontSize: '0.9rem' }}>Sourcing Assistant sedang mencari data & menganalisis di web...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '1rem', background: 'rgba(255,99,105,0.1)', border: '1px solid #FF6369', borderRadius: 8, color: '#FF6369', fontSize: '0.9rem' }}>
              {error}
            </div>
          ) : data ? (
            <>
              {/* Confidence Badge */}
              {data.confidenceScore !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>AI Confidence:</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--color-ground-0)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${data.confidenceScore}%`, background: data.confidenceScore >= 70 ? '#25D0AB' : data.confidenceScore >= 40 ? '#FBBF24' : '#FF6369', borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{data.confidenceScore}%</span>
                </div>
              )}

              {/* Recommendations (if any) */}
              {data.recommendations && data.recommendations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Star size={13} color="#FBBF24" /> Rekomendasi ({data.category})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {data.recommendations.map((rec, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{idx + 1}. {rec.name}</span>
                              {rec.rating && (
                                <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', fontWeight: 700 }}>{rec.rating}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                              <MapPin size={11} /> {rec.address}
                              {rec.sourceUrl && (
                                <a href={rec.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#7C6AF5', display: 'flex', alignItems: 'center', gap: '0.15rem' }}><ExternalLink size={10} /></a>
                              )}
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{rec.reasoning}</p>
                            {rec.estimatedCost && (
                              <p style={{ fontSize: '0.75rem', color: '#25D0AB', margin: '0.3rem 0 0', fontWeight: 600 }}>Estimasi: {rec.estimatedCost}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleSaveContact(rec, idx)}
                            disabled={savedContacts.has(idx)}
                            style={{
                              padding: '0.35rem 0.65rem', borderRadius: 6, cursor: savedContacts.has(idx) ? 'default' : 'pointer',
                              background: savedContacts.has(idx) ? 'rgba(37,208,171,0.1)' : 'rgba(124,106,245,0.1)',
                              border: `1px solid ${savedContacts.has(idx) ? '#25D0AB' : '#7C6AF5'}`, color: savedContacts.has(idx) ? '#25D0AB' : '#7C6AF5',
                              fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0,
                            }}
                          >
                            {savedContacts.has(idx) ? <><CheckCircle2 size={11} /> Tersimpan</> : <><Save size={11} /> Kontak</>}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                          <SendButton channel="whatsapp" text={data.draftMessage || `Halo ${rec.name}, saya dari panitia ${eventData.name}...`} contactName={rec.name} onClick={() => {}} />
                          <SendButton channel="email" text={data.draftMessage || ''} contactName={rec.name} onClick={() => {}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sourcing Summary */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sourcing Intel</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.6, background: 'var(--color-ground-2)', padding: '0.875rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  {data.sourcingSummary}
                </div>
              </div>

              {/* Negotiation Tip */}
              {data.negotiationTip && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tips Negosiasi</h4>
                  <div style={{ fontSize: '0.85rem', color: '#FBBF24', lineHeight: 1.6, background: 'rgba(251,191,36,0.08)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)' }}>
                    {data.negotiationTip}
                  </div>
                </div>
              )}

              {/* Steps */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Plan</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.steps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', background: 'var(--color-ground-2)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#7C6AF5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Draft Message */}
              {data.draftMessage && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Draft Komunikasi
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
                      <SendButton
                        channel="whatsapp"
                        text={data.draftMessage}
                        contactName={data.recommendations?.[0]?.name}
                        onClick={() => {}}
                      />
                      <SendButton channel="email" text={data.draftMessage} contactName={data.recommendations?.[0]?.name} onClick={() => {}} />
                      <SendButton channel="telegram" text={data.draftMessage} contactName={data.recommendations?.[0]?.name} onClick={() => {}} />
                    </div>
                  </h4>
                  <textarea
                    value={data.draftMessage}
                    onChange={(e) => setData({ ...data, draftMessage: e.target.value })}
                    style={{
                      width: '100%', minHeight: 100, padding: '0.875rem', fontSize: '0.9rem', lineHeight: 1.6,
                      background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: 8,
                      color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)'
                    }}
                  />
                </div>
              )}

              {/* File Upload */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lampiran File</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {attachments.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#7C6AF5', textDecoration: 'none', padding: '0.5rem', background: 'rgba(124,106,245,0.1)', borderRadius: 6 }}>
                      <Paperclip size={14} /> Attachment {idx + 1}
                    </a>
                  ))}
                  {files.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-primary)', padding: '0.5rem', background: 'var(--color-ground-2)', borderRadius: 6, border: '1px dashed var(--color-border)' }}>
                      <FileUp size={14} color="var(--color-text-muted)" /> {f.name}
                    </div>
                  ))}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '0.5rem', border: '1px dashed var(--color-border)', borderRadius: 6, background: 'var(--color-ground-2)', width: 'fit-content' }}>
                    <PlusIcon size={14} /> Tambah Lampiran
                    <input type="file" style={{ display: 'none' }} multiple onChange={(e) => {
                      if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }} />
                  </label>
                </div>
              </div>
            </>
          ) : null}
          </>
          )}

          {/* Document Tab */}
          {activeTab === 'document' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Doc type selector */}
              {availableDocTypes.length > 1 && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {availableDocTypes.map((t: DocumentType) => (
                    <button key={t}
                      onClick={() => handleGenerateDocument(t)}
                      disabled={docGenLoading}
                      style={{
                        padding: '0.35rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                        cursor: docGenLoading ? 'not-allowed' : 'pointer',
                        background: docGenType === t ? `${CATEGORY_COLORS[category]}20` : 'var(--color-ground-2)',
                        border: `1px solid ${docGenType === t ? CATEGORY_COLORS[category] : 'var(--color-border)'}`,
                        color: docGenType === t ? CATEGORY_COLORS[category] : 'var(--color-text-secondary)',
                        opacity: docGenLoading ? 0.6 : 1,
                      }}
                    >
                      {(DOC_LABELS[t as keyof typeof DOC_LABELS]?.label || t)}
                    </button>
                  ))}
                </div>
              )}

              {docGenLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', gap: '0.75rem' }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: CATEGORY_COLORS[category] || '#7C6AF5' }} />
                  <p style={{ fontSize: '0.85rem' }}>Generating {DOC_LABELS[docGenType]?.label || docGenType}...</p>
                  <p style={{ fontSize: '0.7rem' }}>Researching web + structuring document</p>
                </div>
              ) : docGenError ? (
                <div style={{ padding: '0.75rem', background: 'rgba(255,99,105,0.1)', border: '1px solid #FF6369', borderRadius: 8, color: '#FF6369', fontSize: '0.85rem' }}>
                  {docGenError}
                  <button onClick={() => handleGenerateDocument(docGenType)} style={{ display: 'block', marginTop: '0.5rem', padding: '0.3rem 0.75rem', borderRadius: 5, background: 'transparent', border: '1px solid #FF6369', color: '#FF6369', cursor: 'pointer', fontSize: '0.75rem' }}>Retry</button>
                </div>
              ) : generatedDoc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {DOC_LABELS[generatedDoc.type]?.label || generatedDoc.type}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {availableDocTypes.filter((t: DocumentType) => t !== generatedDoc.type).map((t: DocumentType) => (
                        <button key={t}
                          onClick={() => handleGenerateDocument(t)}
                          style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 10, background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                        >
                           + {DOC_LABELS[t as keyof typeof DOC_LABELS]?.label}
                        </button>
                      ))}
                      <button onClick={() => {
                        navigator.clipboard.writeText(generatedDoc.content.markdown);
                      }} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 8, background: 'rgba(37,208,171,0.1)', border: '1px solid #25D0AB', color: '#25D0AB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                        <Download size={10} /> Copy
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--color-text-primary)',
                      background: 'var(--color-ground-2)', padding: '0.875rem', borderRadius: 8,
                      border: '1px solid var(--color-border)', maxHeight: 400, overflow: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: simpleMd(generatedDoc.content.markdown) }}
                  />
                  {docSaved && (
                    <div style={{ fontSize: '0.7rem', color: '#25D0AB', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={11} /> Saved to this task
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <FileText size={28} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Generate a document from AI</p>
                  <p style={{ fontSize: '0.72rem', marginBottom: '1rem' }}>
                    {availableDocTypes.length === 1
                      ? `Generate ${DOC_LABELS[availableDocTypes[0] as keyof typeof DOC_LABELS]?.label} automatically`
                      : `Choose a document type above`}
                  </p>
                  {availableDocTypes.length === 1 && (
                    <button onClick={() => handleGenerateDocument(availableDocTypes[0])}
                      style={{ padding: '0.5rem 1rem', borderRadius: 8, background: `${CATEGORY_COLORS[category]}18`, border: `1px solid ${CATEGORY_COLORS[category]}`, color: CATEGORY_COLORS[category], cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                      Generate {DOC_LABELS[availableDocTypes[0] as keyof typeof DOC_LABELS]?.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--color-ground-2)' }}>
          <button onClick={onClose} style={{ padding: '0.65rem 1.25rem', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !!error || uploading || !data}
            style={{
              padding: '0.65rem 1.25rem', borderRadius: 8, background: '#7C6AF5', border: 'none',
              color: '#fff', fontSize: '0.9rem', cursor: (loading || !!error || uploading || !data) ? 'not-allowed' : 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (loading || !!error || uploading || !data) ? 0.7 : 1
            }}
          >
            {uploading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
            {uploading ? 'Mengunggah...' : 'Terapkan & Selesai'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function sendDeepLink(channel: 'whatsapp' | 'email' | 'telegram', text: string, phone?: string): string {
  const encoded = encodeURIComponent(text);
  switch (channel) {
    case 'whatsapp': return `https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encoded}`;
    case 'email': return `mailto:?body=${encoded}`;
    case 'telegram': return `https://t.me/share/url?url=&text=${encoded}`;
  }
}

function SendButton({ channel, text, contactName, phone, onClick }: {
  channel: 'whatsapp' | 'email' | 'telegram';
  text: string;
  contactName?: string;
  phone?: string;
  onClick: () => void;
}) {
  const href = sendDeepLink(channel, text, phone);
  const colors: Record<string, string> = {
    whatsapp: '#25D366', email: '#EA4335', telegram: '#0088cc',
  };
  const labels: Record<string, string> = {
    whatsapp: 'WA', email: 'Email', telegram: 'TG',
  };
  const icons: Record<string, typeof MessageCircle> = {
    whatsapp: Phone, email: Mail, telegram: Send,
  };
  const Icon = icons[channel] || Send;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      title={`Kirim via ${channel}${phone ? ' ke ' + phone : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
        padding: '0.2rem 0.45rem', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700,
        background: `${colors[channel]}15`, border: `1px solid ${colors[channel]}40`,
        color: colors[channel], textDecoration: 'none', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <Icon size={10} /> {labels[channel]}
    </a>
  );
}
