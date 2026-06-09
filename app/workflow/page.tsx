'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import '../landing.css';

/* ── Stage Data ──────────────────────────────────────────── */
const STAGES = [
  { id: 'brief',       num: '01', label: 'Brief',        color: '#00ADB5' },
  { id: 'blueprint',   num: '02', label: 'Blueprint',    color: '#848DFF' },
  { id: 'deps',        num: '03', label: 'Dependencies', color: '#6E78FF' },
  { id: 'simulate',    num: '04', label: 'Simulate',     color: '#FBBF24' },
  { id: 'live',        num: '05', label: 'Live',         color: '#55B467' },
  { id: 'incident',    num: '06', label: 'Incident',     color: '#FF6369' },
  { id: 'report',      num: '07', label: 'Report',       color: '#A0A0A0' },
];

const COMPARE_ROWS = [
  { old: 'Spreadsheet manual & GDocs', newV: 'AI Blueprint auto-generate' },
  { old: 'Group chat tersebar di WA', newV: 'Control Room terpusat' },
  { old: 'Tidak ada dry-run', newV: 'Simulate mode sebelum H-Day' },
  { old: 'Laporan manual post-event', newV: 'Auto-generate post-event report' },
  { old: 'Tidak ada sistem insiden', newV: 'AI Incident Response real-time' },
];

/* ── Stage Details ───────────────────────────────────────── */
const STAGE_DETAILS = [
  {
    id: 'brief',
    num: '01',
    color: '#00ADB5',
    titleEN: 'One Paragraph.\nA Complete Plan.',
    titleID: 'Satu Paragraf.\nRencana Lengkap.',
    descEN: 'Describe your event in plain text — scope, audience, timeline, budget. The AI Panitia reads it, asks clarifying questions, and auto-fills the full event form for you.',
    descID: 'Ceritakan event Anda dalam teks biasa — skala, audiens, jadwal, anggaran. AI Panitia membacanya dan mengisi formulir event secara otomatis untuk Anda.',
    bullets: [
      { en: 'AI Prefill from a single paragraph', id: 'Prefill AI dari satu paragraf' },
      { en: 'Smart form completion with context', id: 'Isi formulir cerdas dengan konteks' },
      { en: 'Bilingual support (EN / ID)', id: 'Dukungan bilingual (EN / ID)' },
    ],
    terminal: [
      { type: 'comment', text: '// BRIEF INPUT' },
      { type: 'teal',    text: '> Seminar AI, 200 pax, Jakarta' },
      { type: 'teal',    text: '> Budget 25jt, 6 minggu prep' },
      { type: 'muted',   text: '' },
      { type: 'comment', text: '// AI PARSING...' },
      { type: 'normal',  text: '✓ Event: Seminar' },
      { type: 'normal',  text: '✓ Scale: Medium (200 pax)' },
      { type: 'normal',  text: '✓ Venue: Jakarta (searching)' },
      { type: 'normal',  text: '✓ Budget: Rp 25.000.000' },
    ],
    reverse: false,
  },
  {
    id: 'blueprint',
    num: '02',
    color: '#848DFF',
    titleEN: 'Master Plan.\nReady in Seconds.',
    titleID: 'Master Plan.\nSiap dalam Detik.',
    descEN: 'From your brief, the AI instantly generates a complete operational blueprint — tasks, owners, deadlines, and critical paths — all mapped and ready to execute.',
    descID: 'Dari brief Anda, AI langsung menghasilkan blueprint operasional lengkap — tugas, penanggung jawab, tenggat waktu, dan jalur kritis — semua terpetakan.',
    bullets: [
      { en: 'Full task & timeline generation', id: 'Generasi tugas & timeline lengkap' },
      { en: 'DAG critical path visualization', id: 'Visualisasi jalur kritis DAG' },
      { en: 'One-click crew assignment', id: 'Penugasan kru dengan satu klik' },
    ],
    terminal: [
      { type: 'comment', text: '// BLUEPRINT GENERATED' },
      { type: 'normal',  text: '✓ 47 tasks mapped' },
      { type: 'normal',  text: '✓ 12 crew assigned' },
      { type: 'normal',  text: '✓ Critical path: 6 nodes' },
      { type: 'muted',   text: '' },
      { type: 'comment', text: '// DEPENDENCIES' },
      { type: 'teal',    text: 'VENUE ← CATERING ← SETUP' },
      { type: 'teal',    text: 'SPONSOR ← RUNDOWN ← MC' },
    ],
    reverse: true,
  },
  {
    id: 'deps',
    num: '03',
    color: '#6E78FF',
    titleEN: 'See Every\nDependency.',
    titleID: 'Lihat Setiap\nDependensi.',
    descEN: 'Visualize task dependencies, critical paths, and operational bottlenecks in an interactive flow diagram. Know exactly what blocks what.',
    descID: 'Visualisasikan dependensi tugas, jalur kritis, dan hambatan operasional dalam diagram alur interaktif. Tahu persis apa yang memblokir apa.',
    bullets: [
      { en: 'Interactive dependency graph', id: 'Graf dependensi interaktif' },
      { en: 'Bottleneck detection', id: 'Deteksi hambatan operasional' },
      { en: 'Real-time task updates', id: 'Pembaruan tugas real-time' },
    ],
    terminal: [
      { type: 'comment', text: '// DEPENDENCY MAP' },
      { type: 'teal',    text: 'VENUE [CRITICAL]' },
      { type: 'normal',  text: '  └─ Catering Setup' },
      { type: 'normal',  text: '  └─ Stage Installation' },
      { type: 'teal',    text: 'SPONSOR DECK [BLOCKING]' },
      { type: 'normal',  text: '  └─ MC Briefing' },
      { type: 'normal',  text: '  └─ Opening Ceremony' },
    ],
    reverse: false,
  },
  {
    id: 'simulate',
    num: '04',
    color: '#FBBF24',
    titleEN: 'Stress-Test\nBefore H-Day.',
    titleID: 'Uji Ketahanan\nSebelum Hari-H.',
    descEN: 'Run disruption simulations before the event happens. The AI generates contingency scenarios — vendor cancellations, weather issues, technical failures — and gives you instant fallback plans.',
    descID: 'Jalankan simulasi gangguan sebelum event terjadi. AI menghasilkan skenario kontingensi — vendor batal, masalah cuaca, kegagalan teknis — dengan rencana cadangan instan.',
    bullets: [
      { en: 'AI-generated disruption scenarios', id: 'Skenario gangguan buatan AI' },
      { en: 'Instant contingency plan output', id: 'Output rencana cadangan instan' },
      { en: 'Operational Confidence Score', id: 'Skor Keyakinan Operasional' },
    ],
    terminal: [
      { type: 'comment', text: '// SIMULATION RUNNING' },
      { type: 'muted',   text: 'Scenario: Vendor Dropout' },
      { type: 'normal',  text: '● Impact: Stage Setup (HIGH)' },
      { type: 'teal',    text: '✓ Fallback: Alternative vendor' },
      { type: 'muted',   text: '' },
      { type: 'muted',   text: 'Scenario: Rain Forecast' },
      { type: 'normal',  text: '● Impact: Outdoor venue (MED)' },
      { type: 'teal',    text: '✓ Fallback: Indoor transition' },
    ],
    reverse: true,
  },
  {
    id: 'live',
    num: '05',
    color: '#55B467',
    titleEN: 'Mission Control.\nEvent Day.',
    titleID: 'Mission Control.\nHari Pelaksanaan.',
    descEN: 'Launch the real-time Control Room dashboard. Monitor live task progress, crew status, Operational Confidence Score, and DAG visualization — all from one command center.',
    descID: 'Buka dashboard Control Room real-time. Pantau progres tugas langsung, status kru, Skor Keyakinan Operasional, dan visualisasi DAG — semua dari satu pusat komando.',
    bullets: [
      { en: 'Real-time task & crew tracking', id: 'Pelacakan tugas & kru real-time' },
      { en: 'Operational Confidence Score', id: 'Skor Keyakinan Operasional' },
      { en: 'Live DAG visualization', id: 'Visualisasi DAG langsung' },
    ],
    terminal: [
      { type: 'comment', text: '// LIVE STATUS' },
      { type: 'teal',    text: '● STAGE: EXECUTION' },
      { type: 'normal',  text: '● CREW: 12 ACTIVE' },
      { type: 'normal',  text: '● TASKS: 31/47 DONE' },
      { type: 'normal',  text: '● ALERTS: 0 CRITICAL' },
      { type: 'teal',    text: '● OCS: 94%' },
      { type: 'muted',   text: '' },
      { type: 'teal',    text: '● AI: MONITORING' },
    ],
    reverse: false,
  },
  {
    id: 'incident',
    num: '06',
    color: '#FF6369',
    titleEN: 'When Things\nGo Wrong.',
    titleID: 'Saat Masalah\nTerjadi.',
    descEN: 'When disruptions happen on H-Day, the AI Incident system activates instantly. It generates rapid fallback flows, reassigns crew, and coordinates response — so you stay in control.',
    descID: 'Saat gangguan terjadi di Hari-H, sistem AI Incident langsung aktif. Ia menghasilkan alur respons darurat, menugaskan ulang kru, dan mengoordinasikan respons — Anda tetap in control.',
    bullets: [
      { en: 'Real-time incident detection', id: 'Deteksi insiden real-time' },
      { en: 'AI fallback flow generator', id: 'Generator alur cadangan AI' },
      { en: 'Rapid crew re-coordination', id: 'Koordinasi ulang kru cepat' },
    ],
    terminal: [
      { type: 'comment', text: '// INCIDENT DETECTED' },
      { type: 'muted',   text: '[14:32] Projector failure — Main Stage' },
      { type: 'muted',   text: '' },
      { type: 'comment', text: '// AI RESPONSE' },
      { type: 'teal',    text: '✓ Alt: Screen B activated' },
      { type: 'teal',    text: '✓ Tech crew reassigned (2)' },
      { type: 'teal',    text: '✓ Rundown buffer: +15min' },
      { type: 'normal',  text: '● OCS: 91% (stable)' },
    ],
    reverse: true,
  },
  {
    id: 'report',
    num: '07',
    color: '#A0A0A0',
    titleEN: 'Every Event.\nA Learning.',
    titleID: 'Setiap Event.\nSebuah Pelajaran.',
    descEN: 'After the event, RunIT auto-generates a complete post-event report — task completion rates, incident logs, sponsor summaries, and reusable templates for next time.',
    descID: 'Setelah event, RunIT otomatis menghasilkan laporan pasca-acara lengkap — tingkat penyelesaian tugas, log insiden, ringkasan sponsor, dan template yang bisa digunakan ulang.',
    bullets: [
      { en: 'Auto-generated event report', id: 'Laporan event auto-generate' },
      { en: 'Sponsor summary document', id: 'Dokumen ringkasan sponsor' },
      { en: 'Reusable template export', id: 'Ekspor template yang dapat digunakan ulang' },
    ],
    terminal: [
      { type: 'comment', text: '// POST-EVENT REPORT' },
      { type: 'normal',  text: '✓ Tasks: 47/47 completed' },
      { type: 'normal',  text: '✓ Incidents: 2 resolved' },
      { type: 'normal',  text: '✓ OCS avg: 92.4%' },
      { type: 'muted',   text: '' },
      { type: 'comment', text: '// EXPORTS READY' },
      { type: 'teal',    text: '→ PDF Report (12 pages)' },
      { type: 'teal',    text: '→ Sponsor Summary' },
      { type: 'teal',    text: '→ Reusable Template' },
    ],
    reverse: false,
  },
];

/* ── Component ────────────────────────────────────────────── */
export default function WorkflowPage() {
  const { lang } = useLangStore();
  const t = dict[lang];
  const { user } = useAuth();
  const router = useRouter();

  const handleCta = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push('/auth/signin');
    }
  };

  const isEN = lang === 'en';

  return (
    <div className="workflow-page">

      {/* ── Top Nav ─────────────────────────────────────── */}
      <nav className="workflow-topnav">
        <Link href="/" className="landing-wordmark" style={{ fontSize: '1.1rem' }}>
          Run<em>IT</em>
        </Link>
        <Link href="/" className="landing-nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <ArrowLeft size={14} />
          {t.workflowNavBack}
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="workflow-hero" id="top">
        <div className="workflow-hero-glow" aria-hidden="true" />

        <motion.span
          className="landing-hero-eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {t.workflowHeroEyebrow}
        </motion.span>

        <motion.h1
          className="landing-hero-h1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t.workflowHeroTitle1}<br />
          <span className="teal">{t.workflowHeroTitle2}</span>
        </motion.h1>

        <motion.p
          className="landing-hero-subtitle"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          {t.workflowHeroSubtitle}
        </motion.p>

        <motion.div
          className="landing-hero-ctas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link href="/workspace/new" onClick={handleCta} className="landing-btn-primary">
            {t.workflowHeroStartBtn} <ArrowRight size={16} />
          </Link>
          <Link href="/workspace/new" onClick={handleCta} className="landing-btn-secondary">
            {t.workflowHeroExploreBtn}
          </Link>
        </motion.div>
      </section>

      {/* ── Stage Navigation Pills ───────────────────────── */}
      <div className="workflow-stage-nav">
        {STAGES.map((stage, i) => (
          <span key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <a
              href={`#${stage.id}`}
              className="workflow-stage-pill"
              style={{ ['--stage-color' as string]: stage.color }}
            >
              <span style={{ color: stage.color, fontFamily: 'var(--font-dot)', fontSize: '0.6rem' }}>
                {stage.num}
              </span>
              {stage.label}
            </a>
            {i < STAGES.length - 1 && (
              <span className="workflow-stage-arrow">→</span>
            )}
          </span>
        ))}
      </div>

      {/* ── Stage Detail Sections ────────────────────────── */}
      {STAGE_DETAILS.map((stage) => (
        <section
          key={stage.id}
          id={stage.id}
          className="workflow-section"
        >
          <div className="workflow-section-inner">
            <motion.div
              className={`workflow-detail${stage.reverse ? ' reverse' : ''}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Text side */}
              <div>
                <span className="workflow-stage-label" style={{ color: stage.color }}>
                  // STAGE {stage.num} — {stage.id.toUpperCase()}
                </span>
                <h2 className="workflow-detail-title">
                  {(isEN ? stage.titleEN : stage.titleID).split('\n').map((line, i) => (
                    <span key={i} style={{ display: 'block' }}>{line}</span>
                  ))}
                </h2>
                <p className="workflow-detail-desc">
                  {isEN ? stage.descEN : stage.descID}
                </p>
                {stage.bullets.map((b, i) => (
                  <div key={i} className="workflow-bullet">
                    <span className="workflow-bullet-dot" style={{ background: stage.color }} />
                    <span>{isEN ? b.en : b.id}</span>
                  </div>
                ))}
              </div>

              {/* Visual side — terminal */}
              <div className="workflow-visual">
                <div className="workflow-terminal" style={{ borderColor: `${stage.color}20` }}>
                  {stage.terminal.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.type === 'comment' ? 'workflow-terminal-comment' :
                        line.type === 'muted'   ? 'workflow-terminal-muted'   :
                        line.type === 'teal'    ? '' : ''
                      }
                      style={
                        line.type === 'teal'
                          ? { color: stage.color }
                          : line.type === 'normal'
                          ? { color: 'rgba(255,255,255,0.75)' }
                          : {}
                      }
                    >
                      {line.text || '\u00A0'}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* ── Compare Section ──────────────────────────────── */}
      <section className="workflow-section">
        <div className="workflow-section-inner">
          <motion.div
            className="workflow-compare-wrap"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="landing-section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              {t.workflowCompareTitle}
            </h2>
            <div className="workflow-compare-table">
              {/* Headers */}
              <div className="workflow-compare-header old">{t.workflowCompareOld}</div>
              <div className="workflow-compare-header new">{t.workflowCompareNew}</div>
              {/* Rows */}
              {COMPARE_ROWS.map((row, i) => (
                <>
                  <div key={`old-${i}`} className="workflow-compare-row-old">
                    <X size={14} className="workflow-compare-icon-old" />
                    {row.old}
                  </div>
                  <div key={`new-${i}`} className="workflow-compare-row-new">
                    <Check size={14} className="workflow-compare-icon-new" />
                    {row.newV}
                  </div>
                </>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="workflow-cta">
        <motion.span
          className="landing-section-eyebrow"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {t.workflowCtaEyebrow}
        </motion.span>

        <motion.h2
          className="landing-cta-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t.workflowCtaTitle}<br />
          <span className="teal">{t.workflowCtaTitle2}</span>
        </motion.h2>

        <p className="landing-cta-subtitle">{t.workflowCtaSubtitle}</p>

        <div className="landing-hero-ctas">
          <Link href="/workspace/new" onClick={handleCta} className="landing-btn-primary">
            {t.workflowCtaBtn} <ArrowRight size={16} />
          </Link>
          <Link href="/#contact" className="landing-btn-secondary">
            {t.workflowCtaSecondary}
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="landing-footer">
        <Link href="/" className="landing-wordmark" style={{ fontSize: '1rem' }}>
          Run<em>IT</em>
        </Link>
        <span className="landing-footer-copy">© 2026 RUNIT AI · OPERATIONAL INTELLIGENCE</span>
      </footer>

    </div>
  );
}
