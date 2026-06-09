'use client';

import { apiFetch } from '@/lib/api-fetch';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useEventStore } from '@/store/eventStore';
import {
  LayoutDashboard, Bot, FileText, ArrowLeft, Globe,
  KanbanSquare, FileBarChart, Shield, Loader2, Search
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import BrandLogo from '@/components/BrandLogo';

/* ── Stage config ─────────────────────────────────────────────── */
const STAGE_COLOR: Record<string, string> = {
  overview:   'var(--color-mint)',
  committee:  'var(--color-stage-copilot, #7C6AF5)',
  'master-plan': 'var(--color-stage-masterplan, #25D0AB)',
  execution:  'var(--color-stage-live, #55B467)',
  simulate:   'var(--color-stage-simulate, #FBBF24)',
  research:   'var(--color-teal, #00ADB5)',
  report:     'var(--color-stage-report, #A0A0A0)',
};

const STAGE_BG: Record<string, string> = {
  overview:   'rgba(37,208,171,0.08)',
  committee:  'rgba(124,106,245,0.08)',
  'master-plan': 'rgba(37,208,171,0.07)',
  execution:  'rgba(85,180,103,0.07)',
  simulate:   'rgba(251,191,36,0.07)',
  research:   'rgba(0,173,181,0.08)',
  report:     'rgba(160,160,160,0.07)',
};

/* ── Layout ───────────────────────────────────────────────────── */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentEvent, listenToEvent, saveCurrentEvent } = useEventStore();
  const { lang, toggleLang } = useLangStore();
  const t = dict[lang];

  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [isTranslatingData, setIsTranslatingData] = useState(false);
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  const pathParts    = pathname.split('/');
  const workspaceId  = pathParts[2];
  const currentPage  = pathParts[3] || 'overview';

  // ── Firestore real-time listener ──────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    setIsLoadingEvent(true);

    let mounted = true;
    listenToEvent(workspaceId).then(unsub => {
      if (mounted) {
        unsubscribeRef.current = unsub;
        setIsLoadingEvent(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribeRef.current?.();
    };
  }, [workspaceId, listenToEvent]);

  // ── Auto-save on every state change (debounced 2s) ───────────
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentEvent) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentEvent();
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentEvent, saveCurrentEvent]);

  // ── Auto-translate when language changes ─────────────────────
  useEffect(() => {
    const handleTranslate = async () => {
      if (!currentEvent || !currentEvent.masterPlan) return;
      // If dataLanguage is not set, we assume it was generated in the current lang initially.
      // But if it's set and different from the UI lang, translate it!
      if (currentEvent.dataLanguage && currentEvent.dataLanguage !== lang) {
        setIsTranslatingData(true);
        try {
          const res = await apiFetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterPlan: currentEvent.masterPlan, targetLang: lang })
          });
          if (res.ok) {
            const { masterPlan } = await res.json();
            if (masterPlan) {
              useEventStore.getState().updateMasterPlan(masterPlan);
              useEventStore.getState().updateEventDataLanguage(lang);
            }
          }
        } catch (error) {
          console.error("Translation failed", error);
        } finally {
          setIsTranslatingData(false);
        }
      }
    };
    handleTranslate();
  }, [lang, currentEvent?.dataLanguage, currentEvent?.masterPlan, currentEvent?.id]);



  /* Map old/sub pages to their canonical parent */
  const pageAliases: Record<string, string> = {
    'agent':        'committee',
    'agent-pilot':  'committee',
    'tasks':        'execution',
    'dependencies': 'execution',
    'live':         'execution',
    'incident':     'execution',
    'prepare':      'execution',
    'sponsor':      'research',
  };
  const canonicalPage = pageAliases[currentPage] || currentPage;

  const navItems = [
    { href: 'overview',   label: t.sideOverview,      icon: LayoutDashboard },
    { href: 'committee',  label: t.sideAiCommittee,   icon: Bot },
    { href: 'master-plan',  label: t.sideMasterPlan,     icon: FileText },
    { href: 'execution',  label: 'Execution',         icon: KanbanSquare },
    { href: 'simulate',   label: t.sideSimulation,    icon: Shield },
    { href: 'research',   label: 'Research Hub',      icon: Search },
    { href: 'report',     label: t.sideReport,        icon: FileBarChart },
  ];

  const stageOrder   = ['overview', 'committee', 'master-plan', 'execution', 'simulate', 'research', 'report'];
  const currentIndex = stageOrder.indexOf(canonicalPage);

  // ── Loading skeleton while Firestore hydrates ─────────────────
  if (isLoadingEvent && !currentEvent) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-ground-0)', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={28} color="var(--color-mint)" style={{ animation: 'spin 1.2s linear infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memuat workspace…</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--color-ground-0)', position: 'relative',
    }}>
      {/* ═══════════════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════════════ */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--color-ground-1)',
        zIndex: 10, position: 'relative',
      }}>

        {/* Logo row */}
        <div style={{
          height: 'var(--nav-height)',
          padding: '0 var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <BrandLogo href="/" size={30} />
          <button
            onClick={toggleLang}
            className="btn-ghost"
            style={{ height: 26, padding: '0 var(--space-xs)', gap: 4, fontSize: 'var(--text-caption)' }}
            aria-label="Toggle language"
          >
            <Globe size={13} />
            {lang.toUpperCase()}
          </button>
        </div>

        {/* Active project banner */}
        {currentEvent && (
          <div style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-2xs)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-xs)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {t.sideActiveProject}
            </div>
            <p style={{
              fontSize: 'var(--text-body-sm)', fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 'var(--space-xs)',
            }}>
              {currentEvent.name}
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '2px 8px', borderRadius: '12px',
              background: `${STAGE_COLOR[canonicalPage] || 'var(--color-mint)'}15`,
              border: `1px solid ${STAGE_COLOR[canonicalPage] || 'var(--color-mint)'}30`,
              fontSize: '0.7rem', fontWeight: 500,
              color: STAGE_COLOR[canonicalPage] || 'var(--color-mint)'
            }}>
              <span className="pulse-dot" style={{
                color: STAGE_COLOR[canonicalPage] || 'var(--color-mint)',
                width: 6, height: 6,
              }} />
              {navItems.find(i => i.href === canonicalPage)?.label || currentEvent.stage}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          flex: 1, padding: 'var(--space-lg) var(--space-xs)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{
            fontSize: 'var(--text-label)', fontWeight: 600,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: 'var(--space-xs) var(--space-sm)',
            marginBottom: 'var(--space-xs)',
          }}>
            WORKFLOW
          </div>

          {navItems.map((item, i) => {
            const isActive    = canonicalPage === item.href;
            const isCompleted = i < currentIndex;
            const isDisabled  = !currentEvent && !['overview'].includes(item.href);
            const stageColor  = STAGE_COLOR[item.href] || 'var(--color-text-muted)';

            return (
              <Link
                key={item.href}
                href={`/workspace/${workspaceId}/${item.href}`}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  padding: '0.5rem var(--space-sm)',
                  borderRadius: '6px',
                  marginBottom: 2, textDecoration: 'none',
                  background: isActive ? STAGE_BG[item.href] : 'transparent',
                  color: isActive ? stageColor : isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                  border: isActive ? `1px solid ${stageColor}30` : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  pointerEvents: isDisabled ? 'none' : 'auto',
                  opacity: isDisabled ? 0.35 : 1,
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                }}
              >
                <item.icon size={16} style={{ flexShrink: 0, color: isActive ? stageColor : 'inherit' }} />
                <span style={{ flex: 1, lineHeight: 1 }}>{item.label}</span>
                {isCompleted && !isActive && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--color-text-muted)', flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: 'var(--space-sm)',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <Link href="/workspace" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{
              width: '100%', justifyContent: 'flex-start',
              gap: 'var(--space-xs)', fontSize: '0.85rem', fontWeight: 500
            }}>
              <ArrowLeft size={16} />
              {t.navBackToWorkspace}
            </button>
          </Link>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════ */}
      <main style={{
        flex: 1, overflow: 'auto',
        position: 'relative', zIndex: 1,
        padding: 'var(--space-xl)',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        background: 'var(--color-ground-0)'
      }}>

        {/* Stage header panel */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'stretch',
            background: 'var(--color-ground-1)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            {/* Stage label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '1rem 1.25rem',
              borderRight: '1px solid var(--color-border)',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: STAGE_COLOR[canonicalPage] || 'var(--color-text-primary)',
              }}>
                {navItems.find(i => i.href === canonicalPage)?.label || 'Workspace'}
              </span>
            </div>

            {/* Stage breadcrumb */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              padding: '0 1.25rem', gap: '0.75rem',
              overflowX: 'auto',
            }}>
              {stageOrder.map((stage, i) => {
                const isActive = stage === canonicalPage;
                const isPast   = i < currentIndex;
                const stageLabel = navItems.find(item => item.href === stage)?.label || stage;

                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      color: isActive
                        ? STAGE_COLOR[stage]
                        : isPast
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-muted)',
                      fontWeight: isActive ? 600 : 500,
                    }}>
                      {stageLabel}
                    </span>
                    {i < stageOrder.length - 1 && (
                      <span style={{ color: 'var(--color-border)' }}>/</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status badge */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '0 1.25rem',
              borderLeft: '1px solid var(--color-border)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', borderRadius: '16px',
                  background: `${STAGE_COLOR[canonicalPage] || 'var(--color-mint)'}15`,
                  border: `1px solid ${STAGE_COLOR[canonicalPage] || 'var(--color-mint)'}30`,
                  fontSize: '0.75rem', fontWeight: 500, color: STAGE_COLOR[canonicalPage] || 'var(--color-mint)'
                }}>
                <span className="pulse-dot" style={{ color: STAGE_COLOR[canonicalPage], width: 6, height: 6, borderRadius: '50%' }} />
                {t.sideSystemConnected}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {isTranslatingData && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 50, borderRadius: '8px'
            }}>
              <Loader2 size={32} color="var(--color-mint)" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                Translating Master Plan...
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Applying AI translation to match {lang.toUpperCase()} interface.
              </p>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
