'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import {
  FileText, Download, Loader2, Zap, CheckCircle,
  BarChart3, Users, DollarSign, Activity, Send,
  ClipboardCheck, BookOpen, Save, Copy, Printer,
} from 'lucide-react';
import type { ThankYouMessages, ReconciliationReport, EventTemplate } from '@/lib/post-event';

type PostEventModule = 'report' | 'sponsor-report' | 'survey' | 'thank-you' | 'reconciliation' | 'lessons' | 'template';

interface PostEventResults {
  report?: string;
  sponsorReport?: string;
  survey?: { title: string; questions: Array<{ id: string; text: string; type: string; choices?: string[] }> };
  thankYou?: ThankYouMessages;
  reconciliation?: ReconciliationReport;
  lessons?: { summary: string; strengths: string[]; improvements: string[]; actionItems: string[] };
  template?: EventTemplate;
}

const MODULE_LABELS: Record<PostEventModule, { label: string; icon: typeof FileText; desc: string }> = {
  report: { label: 'LPJ Utama', icon: FileText, desc: 'Executive report with OCS, bottlenecks, recommendations' },
  'sponsor-report': { label: 'Laporan Sponsor', icon: BarChart3, desc: 'Sponsor visibility + audience reach report' },
  survey: { label: 'Survey Peserta', icon: ClipboardCheck, desc: 'Post-event survey questions auto-generated' },
  'thank-you': { label: 'Pesan Terima Kasih', icon: Send, desc: 'Thank-you messages for sponsors, speakers, vendors, team' },
  reconciliation: { label: 'Rekonsiliasi Keuangan', icon: DollarSign, desc: 'Budget vs actual with variance analysis' },
  lessons: { label: 'Lessons Learned', icon: BookOpen, desc: 'What went well, what to improve, action items' },
  template: { label: 'Event Template', icon: Save, desc: 'Reusable master plan for next similar event' },
};

export default function ReportPage() {
  const params = useParams();
  const currentEvent = useEventStore(s => s.currentEvent);

  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [results, setResults] = useState<PostEventResults | null>(
    currentEvent?.reportModules as PostEventResults || null
  );
  const [activeView, setActiveView] = useState<PostEventModule | null>(
    currentEvent?.reportModules ? (Object.keys(currentEvent.reportModules)[0] as PostEventModule) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<'lpj' | 'pack' | null>(null);

  useEffect(() => {
    if (currentEvent?.reportModules && !results) {
      setResults(currentEvent.reportModules as PostEventResults);
      setGeneratedCount(Object.keys(currentEvent.reportModules).length);
    }
  }, [currentEvent?.id]);

  const handleGenerateAll = async () => {
    if (!currentEvent) return;
    setGenerating(true);
    setError(null);
    try {
      const allModules: PostEventModule[] = ['report', 'sponsor-report', 'survey', 'thank-you', 'lessons', 'template'];
      if (currentEvent.budgetTracker) allModules.push('reconciliation');

      const res = await apiFetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent, modules: allModules }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResults(data.modules);
      setGeneratedCount(Object.keys(data.modules).length);
      useEventStore.getState().saveReportModules(data.modules);
      setActiveView('report');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSingle = async (module: PostEventModule) => {
    if (!currentEvent) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent, modules: [module] }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const merged = { ...results, ...data.modules };
      setResults(merged);
      useEventStore.getState().saveReportModules(merged);
      setGeneratedCount(prev => prev + 1);
      setActiveView(module);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportPdf = async (mode: 'lpj' | 'pack') => {
    if (!currentEvent || !results) return;
    setExportingPdf(mode);
    setError(null);
    try {
      const res = await apiFetch('/api/export/report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: currentEvent.name, modules: results, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'PDF export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mode === 'lpj'
        ? `${currentEvent.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_LPJ.pdf`
        : `${currentEvent.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_EventPack.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'PDF export failed');
    } finally {
      setExportingPdf(null);
    }
  };

  const simpleMd = (md: string) => md
    .replace(/^### (.+)$/gm, '<h4 style="margin-top:1rem;margin-bottom:0.3rem;font-size:0.95rem;font-weight:700;color:var(--color-text-primary)">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin-top:1.25rem;margin-bottom:0.4rem;font-size:1.1rem;font-weight:700;color:var(--color-text-primary)">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin-bottom:0.5rem;font-size:1.25rem;font-weight:700;color:var(--color-text-primary)">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  if (!currentEvent) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Event tidak ditemukan.</div>;
  }

  const completed = currentEvent.masterPlan?.divisions.flatMap(d => d.tasks).filter(t => t.status === 'done').length || 0;
  const total = currentEvent.masterPlan?.divisions.flatMap(d => d.tasks).length || 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="project-page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <Activity size={20} color="var(--color-mint)" />
          <h1 className="project-page-header__title" style={{ margin: 0 }}>Post-Event Intelligence Hub</h1>
        </div>
        <p className="project-page-header__subtitle">
          {currentEvent.name} · {completed}/{total} tasks completed · Generate all post-event deliverables in one click
        </p>
      </header>

      {/* Module grid + actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" style={{ marginBottom: '1.5rem' }}>
        {Object.entries(MODULE_LABELS).map(([key, mod]) => {
          const mk = key as PostEventModule;
          const isGenerated = results && mk in results;
          return (
            <button
              key={mk}
              onClick={() => isGenerated ? setActiveView(mk) : handleGenerateSingle(mk)}
              disabled={generating}
              style={{
                padding: '1rem', borderRadius: 10, border: `1px solid ${isGenerated ? '#25D0AB' : 'var(--color-border)'}`,
                background: isGenerated ? 'rgba(37,208,171,0.06)' : 'var(--color-ground-1)',
                cursor: generating ? 'not-allowed' : 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                opacity: generating ? 0.6 : 1, transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: isGenerated ? 'rgba(37,208,171,0.15)' : 'var(--color-ground-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <mod.icon size={15} color={isGenerated ? '#25D0AB' : 'var(--color-text-muted)'} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.15rem' }}>
                  {mod.label} {isGenerated && <CheckCircle size={12} color="#25D0AB" style={{ display: 'inline', marginLeft: '0.3rem', verticalAlign: 'middle' }} />}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{mod.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Generate All button */}
      {!results && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            style={{
              padding: '0.75rem 2rem', borderRadius: 10, border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
              background: generating ? 'var(--color-ground-2)' : 'linear-gradient(135deg, #25D0AB, #00ADB5)',
              color: generating ? 'var(--color-text-muted)' : '#000', fontSize: '0.9rem', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating {generatedCount}/7...</> : <><Zap size={15} /> Generate All Post-Event Deliverables</>}
          </button>
          {error && <p style={{ color: '#FF6369', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
        </div>
      )}

      {/* Content viewer */}
      {activeView && results && (
        <div className="print-area" style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.5rem', position: 'relative' }}>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {MODULE_LABELS[activeView].label}
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleExportPdf('lpj')}
                disabled={!results.report || exportingPdf !== null}
                style={{
                  padding: '0.35rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                  background: 'rgba(37,208,171,0.1)', border: '1px solid #25D0AB', color: '#25D0AB',
                  cursor: exportingPdf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                  opacity: exportingPdf ? 0.6 : 1,
                }}
              >
                {exportingPdf === 'lpj' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
                Download LPJ
              </button>
              <button
                onClick={() => handleExportPdf('pack')}
                disabled={exportingPdf !== null}
                style={{
                  padding: '0.35rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                  background: 'rgba(124,106,245,0.1)', border: '1px solid #7C6AF5', color: '#7C6AF5',
                  cursor: exportingPdf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                  opacity: exportingPdf ? 0.6 : 1,
                }}
              >
                {exportingPdf === 'pack' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
                Export Event Pack
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '0.35rem 0.65rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                  background: 'rgba(0,173,181,0.1)', border: '1px solid #00ADB5', color: '#00ADB5',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                <Printer size={12} /> Print
              </button>
              {Object.keys(results).map(mk => (
                <button key={mk}
                  onClick={() => setActiveView(mk as PostEventModule)}
                  style={{
                    padding: '0.25rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                    background: activeView === mk ? 'rgba(37,208,171,0.12)' : 'var(--color-ground-2)',
                    border: `1px solid ${activeView === mk ? '#25D0AB' : 'var(--color-border)'}`,
                    color: activeView === mk ? '#25D0AB' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {MODULE_LABELS[mk as PostEventModule].label}
                </button>
              ))}
            </div>
          </div>

          <div className="print-section" style={{ color: 'var(--color-text-primary)', lineHeight: 1.7, fontSize: '0.85rem' }}>
            {/* LPJ Main Report */}
            {activeView === 'report' && results.report && (
              <div>
                <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => handleCopy(results.report!)} style={{ padding: '0.3rem 0.6rem', borderRadius: 5, background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Copy size={11} /> Copy</button>
                </div>
                <div dangerouslySetInnerHTML={{ __html: simpleMd(results.report) }} />
              </div>
            )}

            {/* Sponsor Report */}
            {activeView === 'sponsor-report' && results.sponsorReport && (
              <div>
                <button onClick={() => handleCopy(results.sponsorReport!)} style={{ padding: '0.3rem 0.6rem', borderRadius: 5, background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}><Copy size={11} /> Copy</button>
                <div dangerouslySetInnerHTML={{ __html: simpleMd(results.sponsorReport) }} />
              </div>
            )}

            {/* Survey */}
            {activeView === 'survey' && results.survey && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>{results.survey.title}</h3>
                {results.survey.questions.map((q, i) => (
                  <div key={q.id} style={{ padding: '0.6rem', marginBottom: '0.5rem', background: 'var(--color-ground-2)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>{i + 1}. {q.text}</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-0)', padding: '0.1rem 0.4rem', borderRadius: 10 }}>{q.type}</span>
                  </div>
                ))}
                <button onClick={() => handleCopy(JSON.stringify(results.survey, null, 2))} style={{ padding: '0.3rem 0.6rem', borderRadius: 5, background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}><Copy size={11} /> Copy JSON</button>
              </div>
            )}

            {/* Thank-You Messages */}
            {activeView === 'thank-you' && results.thankYou && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(results.thankYou).map(([key, msg]) => (
                  <div key={key} style={{ padding: '0.875rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#7C6AF5' }}>{key}</span>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 8, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', textDecoration: 'none' }}>WA</a>
                        <button onClick={() => handleCopy(msg)} style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 8, background: 'var(--color-ground-0)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><Copy size={9} /></button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{msg}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reconciliation */}
            {activeView === 'reconciliation' && results.reconciliation && (
              <div>
                <p style={{ marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>{results.reconciliation.summary}</p>
                {results.reconciliation.categories.map(c => (
                  <div key={c.label} style={{ padding: '0.6rem', marginBottom: '0.4rem', background: 'var(--color-ground-2)', borderRadius: 6, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', width: 120 }}>{c.label}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Rp {c.estimated.toLocaleString('id-ID')} → Rp {c.actual.toLocaleString('id-ID')}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: c.variancePct > 10 ? '#FF6369' : c.variancePct < -10 ? '#25D0AB' : '#FBBF24', marginLeft: 'auto' }}>
                      {c.variancePct > 0 ? '+' : ''}{c.variancePct}%
                    </span>
                  </div>
                ))}
                {results.reconciliation.recommendations.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>Recommendations:</p>
                    {results.reconciliation.recommendations.map((r, i) => (
                      <p key={i} style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lessons */}
            {activeView === 'lessons' && results.lessons && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{results.lessons.summary}</p>
                <div style={{ background: 'rgba(37,208,171,0.06)', border: '1px solid rgba(37,208,171,0.2)', borderRadius: 8, padding: '0.875rem' }}>
                  <p style={{ fontWeight: 700, color: '#25D0AB', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Strengths</p>
                  {results.lessons.strengths.map((s, i) => <p key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>• {s}</p>)}
                </div>
                <div style={{ background: 'rgba(255,99,105,0.06)', border: '1px solid rgba(255,99,105,0.2)', borderRadius: 8, padding: '0.875rem' }}>
                  <p style={{ fontWeight: 700, color: '#FF6369', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Improvements</p>
                  {results.lessons.improvements.map((s, i) => <p key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>• {s}</p>)}
                </div>
                <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '0.875rem' }}>
                  <p style={{ fontWeight: 700, color: '#FBBF24', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Action Items</p>
                  {results.lessons.actionItems.map((s, i) => <p key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>• {s}</p>)}
                </div>
              </div>
            )}

            {/* Template */}
            {activeView === 'template' && results.template && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Event Type</p>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{results.template.type} · {results.template.scale} · {results.template.audience}</p>
                  </div>
                  {results.template.divisionStructures.map((div, i) => (
                    <div key={i} style={{ padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem' }}>{div.name} <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>PIC: {div.pic}</span></p>
                      {div.keyTasks.map((t, j) => <p key={j} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>• {t}</p>)}
                    </div>
                  ))}
                  {results.template.keyVendors.length > 0 && (
                    <div style={{ padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.3rem' }}>Key Vendors</p>
                      {results.template.keyVendors.map(v => <p key={v} style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>• {v}</p>)}
                    </div>
                  )}
                  <button onClick={() => {
                    const json = JSON.stringify(results.template, null, 2);
                    handleCopy(json);
                  }} style={{ padding: '0.5rem', borderRadius: 6, background: 'rgba(37,208,171,0.1)', border: '1px solid #25D0AB', color: '#25D0AB', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                    <Save size={12} style={{ display: 'inline', marginRight: '0.3rem' }} /> Copy as JSON (Reusable)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {generating && (
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      )}
    </div>
  );
}
