'use client';

import { apiFetch } from '@/lib/api-fetch';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useEventStore } from '@/store/eventStore';
import {
  LayoutDashboard, Bot, FileText, ArrowLeft, Globe,
  KanbanSquare, FileBarChart, Shield, Loader2, Search, Radio, Users
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import BrandLogo from '@/components/BrandLogo';

const STAGE_COLOR: Record<string, string> = {
  overview:   'var(--color-mint)',
  committee:  'var(--color-stage-copilot, #7C6AF5)',
  'master-plan': 'var(--color-stage-masterplan, #25D0AB)',
  execution:  'var(--color-stage-live, #55B467)',
  simulate:   'var(--color-stage-simulate, #FBBF24)',
  live:       'var(--color-red, #FF6369)',
  team:       '#7C6AF5',
  research:   'var(--color-teal, #00ADB5)',
  report:     'var(--color-stage-report, #A0A0A0)',
};

const STAGE_BG: Record<string, string> = {
  overview:   'rgba(37,208,171,0.08)',
  committee:  'rgba(124,106,245,0.08)',
  'master-plan': 'rgba(37,208,171,0.07)',
  execution:  'rgba(85,180,103,0.07)',
  simulate:   'rgba(251,191,36,0.07)',
  live:       'rgba(255,99,105,0.08)',
  team:       'rgba(124,106,245,0.08)',
  research:   'rgba(0,173,181,0.08)',
  report:     'rgba(160,160,160,0.07)',
};

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

  useEffect(() => {
    const handleTranslate = async () => {
      if (!currentEvent || !currentEvent.masterPlan) return;
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

  const pageAliases: Record<string, string> = {
    'agent':        'committee',
    'agent-pilot':  'committee',
    'tasks':        'execution',
    'dependencies': 'execution',
    'live':         'live',
    'incident':     'live',
    'prepare':      'committee',
    'sponsor':      'research',
  };
  const canonicalPage = pageAliases[currentPage] || currentPage;

  const navItems = [
    { href: 'overview',   label: t.sideOverview,      icon: LayoutDashboard },
    { href: 'committee',  label: t.sideAiCommittee,   icon: Bot },
    { href: 'master-plan',  label: t.sideMasterPlan,     icon: FileText },
    { href: 'execution',  label: 'Execution',         icon: KanbanSquare },
    { href: 'team',       label: 'Team',              icon: Users },
    { href: 'simulate',   label: t.sideSimulation,    icon: Shield },
    { href: 'live',       label: t.sideLiveMode,      icon: Radio },
    { href: 'research',   label: 'Research Hub',      icon: Search },
    { href: 'report',     label: t.sideReport,        icon: FileBarChart },
  ];

  const stageOrder   = ['overview', 'committee', 'master-plan', 'execution', 'team', 'simulate', 'live', 'research', 'report'];
  const currentIndex = stageOrder.indexOf(canonicalPage);

  if (isLoadingEvent && !currentEvent) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-ground-0)', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={28} color="var(--color-mint)" style={{ animation: 'spin 1.2s linear infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memuat workspace…</p>
      </div>
    );
  }

  return (
    <div className="colosseum-app">
      <div className="grid-bg" />

      <header className="colosseum-app__header">
        <BrandLogo href="/workspace" size={28} />
        {currentEvent && (
          <>
            <span className="colosseum-app__header-divider hidden sm:block" />
            <span className="colosseum-app__event-name hidden sm:block">{currentEvent.name}</span>
          </>
        )}
        <div className="colosseum-app__header-spacer" />
        <div className="colosseum-app__header-actions">
          <span className="colosseum-app__status">
            <span className="pulse-dot" style={{ color: 'var(--color-mint)', width: 6, height: 6, borderRadius: '50%' }} />
            {t.sideSystemConnected}
          </span>
          <button
            type="button"
            onClick={toggleLang}
            className="btn-ghost"
            style={{ height: 30, padding: '0 0.55rem', gap: 4, fontSize: '0.8rem' }}
            aria-label="Toggle language"
          >
            <Globe size={14} />
            {lang.toUpperCase()}
          </button>
          <Link href="/workspace" className="btn-ghost hidden md:inline-flex" style={{ height: 30, padding: '0 0.65rem', gap: 6, fontSize: '0.8rem', textDecoration: 'none' }}>
            <ArrowLeft size={14} />
            {t.navBackToWorkspace}
          </Link>
        </div>
      </header>

      <div className="colosseum-app__body">
        <aside className="colosseum-app__sidebar">
          {currentEvent && (
            <div className="colosseum-app__sidebar-project">
              <div className="colosseum-app__sidebar-label">{t.sideActiveProject}</div>
              <p className="colosseum-app__sidebar-title">{currentEvent.name}</p>
            </div>
          )}

          <nav className="colosseum-app__nav" aria-label="Workflow">
            <div className="colosseum-app__nav-label">Workflow</div>
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
                  className="colosseum-app__nav-link"
                  style={{
                    background: isActive ? STAGE_BG[item.href] : 'transparent',
                    color: isActive ? stageColor : isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                    borderColor: isActive ? `${stageColor}30` : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    pointerEvents: isDisabled ? 'none' : 'auto',
                    opacity: isDisabled ? 0.35 : 1,
                  }}
                >
                  <item.icon size={16} style={{ flexShrink: 0, color: isActive ? stageColor : 'inherit' }} />
                  <span style={{ flex: 1, lineHeight: 1.2 }}>{item.label}</span>
                  {isCompleted && !isActive && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-muted)', flexShrink: 0 }} />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="colosseum-app__sidebar-footer md:hidden">
            <Link href="/workspace" style={{ textDecoration: 'none' }}>
              <button type="button" className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 'var(--space-xs)', fontSize: '0.85rem' }}>
                <ArrowLeft size={16} />
                {t.navBackToWorkspace}
              </button>
            </Link>
          </div>
        </aside>

        <main className="colosseum-app__main">
          <div className="colosseum-app__content">
            <div className="project-page">
              {isTranslatingData && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(4px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  zIndex: 50, borderRadius: '8px',
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
          </div>
        </main>
      </div>
    </div>
  );
}
