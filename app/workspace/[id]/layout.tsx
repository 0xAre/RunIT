'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEventStore } from '@/store/eventStore';
import {
  LayoutDashboard, GitBranch, Shield,
  Target, AlertTriangle, FileText, ArrowLeft, Globe, KanbanSquare, FileBarChart, BotMessageSquare, Bot
} from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

/* ── Stage config ─────────────────────────────────────────────── */
const STAGE_COLOR: Record<string, string> = {
  blueprint:    'var(--color-stage-blueprint)',
  dependencies: 'var(--color-stage-dependencies)',
  'agent-pilot': 'var(--color-stage-simulate)',
  simulate:     'var(--color-stage-simulate)',
  live:         'var(--color-stage-live)',
  incident:     'var(--color-stage-incident)',
  report:       'var(--color-stage-report)',
};

const STAGE_BG: Record<string, string> = {
  blueprint:    'rgba(37,208,171,0.07)',
  dependencies: 'rgba(132,141,255,0.07)',
  'agent-pilot': 'rgba(124,106,245,0.07)',
  simulate:     'rgba(251,191,36,0.07)',
  live:         'rgba(85,180,103,0.07)',
  incident:     'rgba(255,99,105,0.07)',
  report:       'rgba(160,160,160,0.07)',
};

/* ── Layout ───────────────────────────────────────────────────── */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentEvent } = useEventStore();
  const { lang, toggleLang } = useLangStore();
  const t = dict[lang];

  const pathParts    = pathname.split('/');
  const workspaceId  = pathParts[2];
  const currentPage  = pathParts[3] || 'blueprint';

  const navItems = [
    { href: 'overview',     label: t.sideOverview,     icon: LayoutDashboard },
    { href: 'agent',        label: 'Agent Inbox',      icon: BotMessageSquare },
    { href: 'agent-pilot',  label: 'Auto-Pilot',       icon: Bot },
    { href: 'blueprint',    label: t.sideBlueprint,    icon: FileText },
    { href: 'tasks',        label: t.sideTasks,        icon: KanbanSquare },
    { href: 'dependencies', label: t.sideDependencies, icon: GitBranch },
    { href: 'simulate',     label: t.sideSimulation,   icon: Shield },
    { href: 'live',         label: t.sideLiveMode,     icon: Target },
    { href: 'incident',     label: t.sideIncident,     icon: AlertTriangle },
    { href: 'report',       label: t.sideReport,       icon: FileBarChart },
  ];

  const stageOrder   = ['blueprint', 'dependencies', 'simulate', 'live', 'incident', 'report'];
  const currentIndex = stageOrder.indexOf(currentPage);

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
          <Link href="/" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem', fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em', textDecoration: 'none',
          }}>
            Run<em style={{ fontStyle: 'normal', color: 'var(--color-mint)' }}>IT</em>
          </Link>
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
              background: `${STAGE_COLOR[currentEvent.stage?.toLowerCase() || 'blueprint']}15`,
              border: `1px solid ${STAGE_COLOR[currentEvent.stage?.toLowerCase() || 'blueprint']}30`,
              fontSize: '0.7rem', fontWeight: 500, color: STAGE_COLOR[currentEvent.stage?.toLowerCase() || 'blueprint']
            }}>
              <span className="pulse-dot" style={{
                color: STAGE_COLOR[currentEvent.stage?.toLowerCase() || 'blueprint'],
                width: 6, height: 6,
              }} />
              {currentEvent.stage}
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
            {t.sideOverview}
          </div>

          {navItems.map((item, i) => {
            const isActive    = currentPage === item.href;
            const isCompleted = i < currentIndex;
            const isDisabled  = !currentEvent && item.href !== 'blueprint';
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
                color: STAGE_COLOR[currentPage] || 'var(--color-text-primary)',
              }}>
                {navItems.find(i => i.href === currentPage)?.label || 'Workspace'}
              </span>
            </div>

            {/* Stage breadcrumb */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              padding: '0 1.25rem', gap: '0.75rem',
              overflowX: 'auto',
            }}>
              {stageOrder.map((stage, i) => {
                const isActive = stage === currentPage;
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
                background: `${STAGE_COLOR[currentPage] || 'var(--color-mint)'}15`,
                border: `1px solid ${STAGE_COLOR[currentPage] || 'var(--color-mint)'}30`,
                fontSize: '0.75rem', fontWeight: 500, color: STAGE_COLOR[currentPage] || 'var(--color-mint)'
              }}>
                <span className="pulse-dot" style={{ color: STAGE_COLOR[currentPage], width: 6, height: 6, borderRadius: '50%' }} />
                {t.sideSystemConnected}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
