'use client';

import './landing.css';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Zap, Shield, GitBranch,
  Radio, AlertTriangle, FileText, Globe
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import RadarPulse from '@/src/components/landing/RadarPulse';
import { ChromaCard } from '@/src/components/landing/ChromaGrid';

/* ── Data ─────────────────────────────────────────────────────── */

const STAGES = [
  'Blueprint', 'Dependencies', 'Simulate',
  'Live Execution', 'Incident Response', 'Report', 'Copilot',
];

const STAGE_GRADIENTS = [
  { from: 'rgba(8,58,61,0.85)',  to: 'rgba(0,0,0,0)' },
  { from: 'rgba(20,14,60,0.85)', to: 'rgba(0,0,0,0)' },
  { from: 'rgba(50,36,4,0.85)',  to: 'rgba(0,0,0,0)' },
  { from: 'rgba(14,52,20,0.85)', to: 'rgba(0,0,0,0)' },
  { from: 'rgba(60,12,14,0.85)', to: 'rgba(0,0,0,0)' },
  { from: 'rgba(30,30,30,0.85)', to: 'rgba(0,0,0,0)' },
];

const STAGE_ICONS = [
  Zap, GitBranch, Shield, Radio, AlertTriangle, FileText
];

/* Marquee content (doubled for seamless loop) */
const MARQUEE_ITEMS = [
  ...STAGES, '/', ...STAGES, '/',
  ...STAGES, '/', ...STAGES, '/',
];

/* ── Component ────────────────────────────────────────────────── */

export default function HomePage() {
  const { lang, toggleLang } = useLangStore();
  const t = dict[lang];

  const features = [
    {
      icon: Zap,
      tag: 'Blueprint',
      title: t.feat1Title,
      desc: t.feat1Desc,
      gradient: STAGE_GRADIENTS[0],
      spotlightColor: 'rgba(0,173,181,0.13)',
    },
    {
      icon: GitBranch,
      tag: 'Dependencies',
      title: t.feat2Title,
      desc: t.feat2Desc,
      gradient: STAGE_GRADIENTS[1],
      spotlightColor: 'rgba(132,141,255,0.12)',
    },
    {
      icon: Shield,
      tag: 'Simulate',
      title: t.feat3Title,
      desc: t.feat3Desc,
      gradient: STAGE_GRADIENTS[2],
      spotlightColor: 'rgba(251,191,36,0.10)',
    },
    {
      icon: Radio,
      tag: 'Live',
      title: t.feat4Title,
      desc: t.feat4Desc,
      gradient: STAGE_GRADIENTS[3],
      spotlightColor: 'rgba(85,180,103,0.12)',
    },
    {
      icon: AlertTriangle,
      tag: 'Incident',
      title: t.feat5Title,
      desc: t.feat5Desc,
      gradient: STAGE_GRADIENTS[4],
      spotlightColor: 'rgba(255,99,105,0.12)',
    },
    {
      icon: FileText,
      tag: 'Report',
      title: t.feat6Title,
      desc: t.feat6Desc,
      gradient: STAGE_GRADIENTS[5],
      spotlightColor: 'rgba(160,160,160,0.10)',
    },
  ];

  return (
    <div style={{ background: '#000', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="landing-nav">
        <Link href="/" className="landing-wordmark">
          Run<em>IT</em>
        </Link>
        <div className="landing-nav-actions">
          <button
            onClick={toggleLang}
            className="landing-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            aria-label="Toggle language"
          >
            <Globe size={14} />
            {lang === 'en' ? 'EN' : 'ID'}
          </button>
          <Link href="/workspace/new" className="landing-nav-btn">
            {t.navDashboard}
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────── */}
      <section className="landing-hero" id="hero">

        {/* Ambient glow */}
        <div className="landing-hero-glow" aria-hidden="true" />

        {/* Radar pulse — centered behind content */}
        <RadarPulse
          size={700}
          color="0, 173, 181"
          rings={3}
        />

        {/* Eyebrow */}
        <span className="landing-hero-eyebrow">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          AI · Event Execution System
        </span>

        {/* H1 — cinematic scale */}
        <motion.h1
          className="landing-hero-h1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {t.heroTitle1}<br />
          <span className="teal">{t.heroTitle2}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="landing-hero-subtitle"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {t.heroSubtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="landing-hero-ctas"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Link href="/workspace/new" className="landing-btn-primary">
            {t.heroStartBtn} <ArrowRight size={16} />
          </Link>
          <a href="#features" className="landing-btn-secondary">
            {t.heroExploreBtn}
          </a>
        </motion.div>

        {/* Marquee strip */}
        <motion.div
          className="landing-marquee-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="landing-marquee-track" aria-hidden="true">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="landing-marquee-item">
                {item === '/' ? (
                  <span className="landing-marquee-dot" />
                ) : (
                  item
                )}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────── */}
      <section id="features" className="landing-section" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Section header */}
          <div className="landing-section-header">
            <span className="landing-section-eyebrow">// operational capabilities</span>
            <h2 className="landing-section-title">Everything you need<br />to run it.</h2>
            <p className="landing-section-subtitle">
              A complete toolkit for modern event operators — from blueprint to real-time incident response.
            </p>
          </div>

          {/* Editorial feature grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
            }}
          >
            {/* Row 1: 3 equal columns */}
            {features.slice(0, 3).map((f, i) => (
              <motion.div
                key={f.tag}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16,1,0.3,1] }}
              >
                <ChromaCard
                  gradientFrom={f.gradient.from}
                  gradientTo={f.gradient.to}
                  spotlightColor={f.spotlightColor}
                  style={{ height: '100%' }}
                >
                  <div className="landing-card-icon">
                    <f.icon size={20} color="#00ADB5" />
                  </div>
                  <span className="landing-card-tag">{f.tag}</span>
                  <h3 className="landing-card-title">{f.title}</h3>
                  <p className="landing-card-desc">{f.desc}</p>
                </ChromaCard>
              </motion.div>
            ))}

            {/* Row 2: 1 wide + 2 regular */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.5, ease: [0.16,1,0.3,1] }}
              style={{ gridColumn: '1 / span 2' }}
            >
              {(() => {
                const LiveIcon = features[3].icon;
                return (
                  <ChromaCard
                    gradientFrom={features[3].gradient.from}
                    gradientTo={features[3].gradient.to}
                    spotlightColor={features[3].spotlightColor}
                    style={{ height: '100%' }}
                  >
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div className="landing-card-icon">
                          <LiveIcon size={20} color="#55B467" />
                        </div>
                        <span className="landing-card-tag" style={{ borderColor: 'rgba(85,180,103,0.3)', color: '#55B467', background: 'rgba(85,180,103,0.07)' }}>
                          {features[3].tag}
                        </span>
                        <h3 className="landing-card-title">{features[3].title}</h3>
                        <p className="landing-card-desc">{features[3].desc}</p>
                      </div>
                      {/* Live terminal preview */}
                      <div style={{
                        flexShrink: 0, width: '200px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(85,180,103,0.15)',
                        borderRadius: '8px',
                        padding: '0.875rem',
                        fontFamily: 'var(--font-dot)',
                        fontSize: '0.65rem',
                        color: '#55B467',
                        lineHeight: 1.8,
                        letterSpacing: '0.03em',
                      }}>
                        <div style={{ color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem' }}>// LIVE STATUS</div>
                        <div>● STAGE: EXECUTION</div>
                        <div>● CREW: 12 ACTIVE</div>
                        <div>● ALERTS: 0 CRITICAL</div>
                        <div style={{ color: '#00ADB5' }}>● AI: MONITORING</div>
                      </div>
                    </div>
                  </ChromaCard>
                );
              })()}
            </motion.div>

            {features.slice(4).map((f, i) => {
              const isReport = f.tag === 'Report';
              return (
                <motion.div
                  key={f.tag}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (i + 3) * 0.08, duration: 0.5, ease: [0.16,1,0.3,1] }}
                  style={isReport ? { gridColumn: '1 / -1' } : {}}
                >
                  <ChromaCard
                    gradientFrom={f.gradient.from}
                    gradientTo={f.gradient.to}
                    spotlightColor={f.spotlightColor}
                    style={{ height: '100%' }}
                  >
                    <div style={isReport ? { display: 'flex', gap: '2rem', alignItems: 'center' } : {}}>
                      <div style={isReport ? { flexShrink: 0, width: '250px' } : {}}>
                        <div className="landing-card-icon" style={{ background: 'rgba(160,160,160,0.08)', borderColor: 'rgba(160,160,160,0.15)' }}>
                          <f.icon size={20} color="#A0A0A0" />
                        </div>
                        <span className="landing-card-tag" style={{ borderColor: 'rgba(160,160,160,0.2)', color: '#A0A0A0', background: 'rgba(160,160,160,0.06)' }}>
                          {f.tag}
                        </span>
                        {!isReport && (
                          <>
                            <h3 className="landing-card-title">{f.title}</h3>
                            <p className="landing-card-desc">{f.desc}</p>
                          </>
                        )}
                      </div>
                      
                      {isReport && (
                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '2rem' }}>
                          <h3 className="landing-card-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{f.title}</h3>
                          <p className="landing-card-desc" style={{ fontSize: '1rem', maxWidth: '600px' }}>{f.desc}</p>
                        </div>
                      )}
                    </div>
                  </ChromaCard>
                </motion.div>
              );
            })}
          </div>

          {/* Responsive: collapse grid on mobile */}
          <style>{`
            @media (max-width: 900px) {
              #features [style*="grid-template-columns: repeat(3"] {
                grid-template-columns: 1fr 1fr !important;
              }
            }
            @media (max-width: 620px) {
              #features [style*="grid-template-columns"] {
                grid-template-columns: 1fr !important;
              }
              #features [style*="grid-column: 1 / span 2"] {
                grid-column: 1 !important;
              }
            }
          `}</style>
        </div>
      </section>

      {/* Teal divider */}
      <hr className="landing-teal-divider" />

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="landing-cta-glow" aria-hidden="true" />

        {/* Stage flow — dot matrix */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '0.5rem', marginBottom: '3rem', flexWrap: 'wrap',
        }}>
          {STAGES.map((stage, i) => (
            <span key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-dot)', fontSize: '0.7rem',
                color: i === 3 ? 'var(--landing-teal)' : 'rgba(255,255,255,0.25)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {stage}
              </span>
              {i < STAGES.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.7rem' }}>→</span>
              )}
            </span>
          ))}
        </div>

        <motion.h2
          className="landing-cta-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          {t.ctaTitle}
        </motion.h2>
        <p className="landing-cta-subtitle" style={{ position: 'relative', zIndex: 1 }}>
          {t.ctaSubtitle}
        </p>
        <Link href="/workspace/new" className="landing-btn-primary" style={{ position: 'relative', zIndex: 1 }}>
          {t.ctaBtn} <ArrowRight size={16} />
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="landing-footer">
        <Link href="/" className="landing-wordmark" style={{ fontSize: '1rem' }}>
          Run<em>IT</em>
        </Link>
        <span className="landing-footer-copy">
          © 2026 RUNIT AI · OPERATIONAL INTELLIGENCE FOR EVENTS
        </span>
      </footer>

    </div>
  );
}
