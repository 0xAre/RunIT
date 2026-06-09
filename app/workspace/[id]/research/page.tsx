'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import { useLangStore } from '@/store/langStore';
import {
  Search, BookOpen, Globe, Loader2, ExternalLink,
  Sparkles, AlertCircle, Plus, X, Building2, ChevronRight,
  FileText, Target, Zap
} from 'lucide-react';

// ── Simple Markdown renderer (headers + bold + lists) ────────
function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '1rem', marginBottom: '0.25rem' }}>{line.slice(4)}</h4>;
        if (line.startsWith('## '))
          return <h3 key={i} style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-mint)', marginTop: '1.25rem', marginBottom: '0.25rem' }}>{line.slice(3)}</h3>;
        if (line.startsWith('# '))
          return <h2 key={i} style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>{line.slice(2)}</h2>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
            <ChevronRight size={13} color="var(--color-mint)" style={{ marginTop: '4px', flexShrink: 0 }} /><span>{line.slice(2)}</span>
          </div>;
        if (line.startsWith('---'))
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.75rem 0' }} />;
        if (line.trim() === '') return <div key={i} style={{ height: '0.25rem' }} />;
        // Bold **text**
        const boldified = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }} dangerouslySetInnerHTML={{ __html: boldified }} />;
      })}
    </div>
  );
}

type Tab = 'research' | 'sponsor';
type ResearchEffort = 'lite' | 'standard' | 'deep';

const effortOptions: { value: ResearchEffort; label: string; desc: string; color: string }[] = [
  { value: 'lite',     label: 'Lite',     desc: 'Cepat ~15s',     color: 'var(--color-mint)' },
  { value: 'standard', label: 'Standard', desc: 'Seimbang ~30s',  color: 'var(--color-teal)' },
  { value: 'deep',     label: 'Deep',     desc: 'Mendalam ~60s+', color: 'var(--color-amber)' },
];

export default function ResearchPage() {
  const params = useParams();
  const { currentEvent } = useEventStore();
  const { lang } = useLangStore();

  const [activeTab, setActiveTab] = useState<Tab>('research');

  // ── Research state ───────────────────────────────────────
  const [question, setQuestion] = useState('');
  const [effort, setEffort] = useState<ResearchEffort>('standard');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    aiInsight: string;
    sources: { url: string; title?: string }[];
    effort: string;
  } | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // ── Sponsor state ────────────────────────────────────────
  const [sponsorUrls, setSponsorUrls] = useState<string[]>(['']);
  const [isProfiling, setIsProfiling] = useState(false);
  const [sponsorResult, setSponsorResult] = useState<string | null>(null);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  // ─── Research handlers ───────────────────────────────────

  const handleResearch = async () => {
    if (!question.trim()) return;
    setIsResearching(true);
    setResearchError(null);
    setResearchResult(null);

    const eventContext = currentEvent
      ? `Event: "${currentEvent.name}" (${currentEvent.type}), Skala: ${currentEvent.scale}, ${currentEvent.participants} peserta`
      : undefined;

    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, effort, eventContext, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Research gagal');
      setResearchResult({ aiInsight: data.aiInsight, sources: data.sources, effort: data.effort });
    } catch (err: unknown) {
      setResearchError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsResearching(false);
    }
  };

  // ─── Sponsor handlers ────────────────────────────────────

  const addUrlField = () => setSponsorUrls(prev => [...prev, '']);
  const removeUrlField = (i: number) => setSponsorUrls(prev => prev.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => setSponsorUrls(prev => prev.map((u, idx) => idx === i ? val : u));

  const handleSponsorProfile = async () => {
    const validUrls = sponsorUrls.filter(u => u.trim() !== '' && u.startsWith('http'));
    if (validUrls.length === 0) {
      setSponsorError('Masukkan minimal 1 URL yang valid (harus dimulai dengan http/https)');
      return;
    }
    setIsProfiling(true);
    setSponsorError(null);
    setSponsorResult(null);

    const eventMasterPlan = currentEvent
      ? `Event "${currentEvent.name}" (${currentEvent.type}), target audiens: ${currentEvent.audience}, skala: ${currentEvent.scale}, ${currentEvent.participants} peserta, tujuan: ${currentEvent.goals}`
      : undefined;

    try {
      const res = await fetch('/api/ai/sponsor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls, eventMasterPlan, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Profiling gagal');
      setSponsorResult(data.pitchStrategy);
    } catch (err: unknown) {
      setSponsorError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setIsProfiling(false);
    }
  };

  // ─── Quick research prompts (context-aware) ──────────────
  const quickPrompts = currentEvent ? [
    `Apa saja risiko operasional utama pada ${currentEvent.type} skala ${currentEvent.scale} di Indonesia?`,
    `Rekomendasikan strategi manajemen kerumunan untuk ${currentEvent.participants} peserta`,
    `Tren terkini dalam industri event ${currentEvent.type} tahun 2025-2026`,
    `Checklist perizinan event ${currentEvent.type} di Indonesia`,
  ] : [
    'Apa saja risiko utama event outdoor di Indonesia?',
    'Bagaimana strategi sponsorship event mahasiswa yang efektif?',
    'Tren event management terbaru di Asia Tenggara 2025',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', padding: '0 0 3rem' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--color-ground-2)', borderRadius: '8px' }}>
            <Search size={20} color="var(--color-teal)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
            AI Research Hub
          </h1>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
            background: 'rgba(0,173,181,0.1)', border: '1px solid rgba(0,173,181,0.3)',
            color: 'var(--color-teal)', letterSpacing: '0.05em', textTransform: 'uppercase'
          }}>
            Powered by You.com
          </span>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Riset mendalam dengan konteks event Anda — dari risiko operasional hingga profil calon sponsor.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem',
        background: 'var(--color-ground-1)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px', padding: '4px',
        width: 'fit-content'
      }}>
        {[
          { id: 'research' as Tab, label: 'Deep Research', icon: BookOpen },
          { id: 'sponsor'  as Tab, label: 'Sponsor Profiling', icon: Building2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.15s',
              background: activeTab === tab.id ? 'var(--color-ground-2)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ════ TAB: DEEP RESEARCH ════ */}
        {activeTab === 'research' && (
          <motion.div
            key="research"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Input card */}
            <div style={{
              background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
              borderRadius: '10px', overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 1.25rem', background: 'var(--color-ground-2)',
                borderBottom: '1px solid var(--color-border)'
              }}>
                <Sparkles size={15} color="var(--color-teal)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Pertanyaan Riset
                </h3>
              </div>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Contoh: Apa saja risiko operasional utama pada festival musik outdoor di Indonesia, dan bagaimana mitigasinya?"
                  rows={3}
                  style={{
                    width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
                    background: 'var(--color-ground-0)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)', fontSize: '0.9rem', lineHeight: 1.6,
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleResearch(); }}
                />

                {/* Effort selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Kedalaman riset:</span>
                  {effortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setEffort(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.375rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                        background: effort === opt.value ? `${opt.color}20` : 'var(--color-ground-0)',
                        color: effort === opt.value ? opt.color : 'var(--color-text-muted)',
                        outline: effort === opt.value ? `1px solid ${opt.color}` : '1px solid var(--color-border)',
                      }}
                    >
                      {opt.label}
                      <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>{opt.desc}</span>
                    </button>
                  ))}

                  <button
                    onClick={handleResearch}
                    disabled={isResearching || !question.trim()}
                    style={{
                      marginLeft: 'auto',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: isResearching || !question.trim() ? 'not-allowed' : 'pointer',
                      background: 'var(--color-mint)', color: '#000',
                      fontSize: '0.85rem', fontWeight: 700,
                      opacity: isResearching || !question.trim() ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    {isResearching
                      ? <><Loader2 size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> Meneliti...</>
                      : <><Search size={14} /> Riset Sekarang</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentEvent ? `Relevan untuk "${currentEvent.name}"` : 'Contoh Pertanyaan'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {quickPrompts.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    style={{
                      padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)',
                      background: 'var(--color-ground-1)', color: 'var(--color-text-secondary)',
                      fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    {q.length > 70 ? q.slice(0, 70) + '…' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {researchError && (
              <div style={{ padding: '1rem', background: 'rgba(255,99,105,0.08)', border: '1px solid rgba(255,99,105,0.3)', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <AlertCircle size={16} color="var(--color-red)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--color-red)' }}>{researchError}</span>
              </div>
            )}

            {/* Loading state */}
            {isResearching && (
              <div style={{
                padding: '3rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center'
              }}>
                <div style={{ position: 'relative', width: 48, height: 48 }}>
                  <Loader2 size={48} color="var(--color-teal)" style={{ animation: 'spin 1.5s linear infinite' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Sedang meneliti…</p>
                  <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                    You.com sedang membaca berbagai sumber web, lalu Gemini akan merangkum hasilnya untuk event Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Result */}
            {researchResult && !isResearching && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {/* AI Insight */}
                <div style={{
                  background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                  borderRadius: '10px', overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 1.25rem', background: 'var(--color-ground-2)',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Zap size={15} color="var(--color-teal)" />
                      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        AI Insight
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px',
                      background: 'rgba(0,173,181,0.1)', color: 'var(--color-teal)',
                      border: '1px solid rgba(0,173,181,0.2)', fontWeight: 600
                    }}>
                      {researchResult.effort} effort
                    </span>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <MarkdownBlock content={researchResult.aiInsight} />
                  </div>
                </div>

                {/* Sources */}
                {researchResult.sources.length > 0 && (
                  <div style={{
                    background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                    borderRadius: '10px', overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '0.75rem 1.25rem', background: 'var(--color-ground-2)',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                      <Globe size={14} color="var(--color-text-muted)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        {researchResult.sources.length} Sumber Terverifikasi
                      </span>
                    </div>
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {researchResult.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            padding: '0.5rem 0.75rem', borderRadius: '6px',
                            background: 'var(--color-ground-0)', border: '1px solid var(--color-border)',
                            textDecoration: 'none', color: 'var(--color-text-secondary)',
                            fontSize: '0.82rem', transition: 'all 0.15s',
                          }}
                        >
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)',
                            background: 'var(--color-ground-2)', padding: '1px 6px', borderRadius: '4px',
                            flexShrink: 0
                          }}>{i + 1}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title ?? s.url}
                          </span>
                          <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ════ TAB: SPONSOR PROFILING ════ */}
        {activeTab === 'sponsor' && (
          <motion.div
            key="sponsor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* Explainer banner */}
            <div style={{
              padding: '1rem 1.25rem', borderRadius: '10px',
              background: 'rgba(37,208,171,0.05)', border: '1px solid rgba(37,208,171,0.2)',
              display: 'flex', gap: '1rem', alignItems: 'flex-start'
            }}>
              <Target size={18} color="var(--color-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                  Cara Kerja Sponsor Profiling
                </p>
                <p style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  Masukkan URL website calon sponsor. You.com <strong>Contents API</strong> akan membaca halaman mereka, 
                  lalu Gemini menganalisis kecocokan dengan event Anda dan membuatkan draft email pitching yang dipersonalisasi.
                </p>
              </div>
            </div>

            {/* URL input card */}
            <div style={{
              background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
              borderRadius: '10px', overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 1.25rem', background: 'var(--color-ground-2)',
                borderBottom: '1px solid var(--color-border)'
              }}>
                <Building2 size={15} color="var(--color-text-muted)" />
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  URL Calon Sponsor
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  Maks. 10 URL
                </span>
              </div>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {sponsorUrls.map((url, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', flex: 1,
                      background: 'var(--color-ground-0)', border: '1px solid var(--color-border)',
                      borderRadius: '8px', overflow: 'hidden',
                    }}>
                      <Globe size={14} color="var(--color-text-muted)" style={{ flexShrink: 0, marginLeft: '0.75rem' }} />
                      <input
                        type="url"
                        value={url}
                        onChange={e => updateUrl(i, e.target.value)}
                        placeholder={`https://perusahaan${i + 1}.com`}
                        style={{
                          flex: 1, padding: '0.625rem 0.75rem',
                          background: 'transparent', border: 'none',
                          color: 'var(--color-text-primary)', fontSize: '0.875rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    {sponsorUrls.length > 1 && (
                      <button
                        onClick={() => removeUrlField(i)}
                        style={{
                          padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)',
                          background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)',
                          flexShrink: 0, display: 'flex', alignItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  {sponsorUrls.length < 10 && (
                    <button
                      onClick={addUrlField}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.875rem', borderRadius: '6px',
                        border: '1px dashed var(--color-border)', background: 'transparent',
                        color: 'var(--color-text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} /> Tambah URL
                    </button>
                  )}
                  <button
                    onClick={handleSponsorProfile}
                    disabled={isProfiling}
                    style={{
                      marginLeft: 'auto',
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: isProfiling ? 'not-allowed' : 'pointer',
                      background: 'var(--color-mint)', color: '#000',
                      fontSize: '0.85rem', fontWeight: 700,
                      opacity: isProfiling ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    {isProfiling
                      ? <><Loader2 size={14} style={{ animation: 'spin 1.2s linear infinite' }} /> Menganalisis...</>
                      : <><Sparkles size={14} /> Generate Pitching</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {sponsorError && (
              <div style={{ padding: '1rem', background: 'rgba(255,99,105,0.08)', border: '1px solid rgba(255,99,105,0.3)', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <AlertCircle size={16} color="var(--color-red)" />
                <span style={{ fontSize: '0.875rem', color: 'var(--color-red)' }}>{sponsorError}</span>
              </div>
            )}

            {/* Loading */}
            {isProfiling && (
              <div style={{
                padding: '3rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center'
              }}>
                <Loader2 size={48} color="var(--color-mint)" style={{ animation: 'spin 1.5s linear infinite' }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Membaca profil sponsor…</p>
                  <p style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                    You.com sedang mengambil konten dari website mereka, lalu AI akan menyusun strategi pitching.
                  </p>
                </div>
              </div>
            )}

            {/* Sponsor result */}
            {sponsorResult && !isProfiling && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                  borderRadius: '10px', overflow: 'hidden'
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem 1.25rem', background: 'var(--color-ground-2)',
                  borderBottom: '1px solid var(--color-border)'
                }}>
                  <FileText size={15} color="var(--color-mint)" />
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Strategi & Draft Pitching
                  </h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <MarkdownBlock content={sponsorResult} />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
