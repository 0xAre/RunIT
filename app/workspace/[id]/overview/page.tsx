'use client';

import Link from 'next/link';
import { useEventStore } from '@/store/eventStore';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import { ArrowRight, Calendar, Users, Target, FileText, Zap } from 'lucide-react';

export default function OverviewPage() {
  const { currentEvent } = useEventStore();
  const { lang } = useLangStore();
  const t = dict[lang];

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
        <div className="colosseum-card" style={{ textAlign: 'center', maxWidth: 420, padding: '2.5rem 2rem' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>{t.overviewNoEvent}</p>
          <Link href="/workspace/new" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Zap size={14} /> {t.overviewGoToCreate}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="project-page-header">
        <h1 className="project-page-header__title">{t.overviewTitle}</h1>
        <p className="project-page-header__subtitle">{t.overviewSubtitle}</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t.formEventName, value: currentEvent.name, icon: FileText },
          { label: t.formTimeline, value: currentEvent.timeline || '—', icon: Calendar },
          { label: t.formExpectedPax, value: currentEvent.participants.toLocaleString(), icon: Users },
        ].map((item) => (
          <div key={item.label} className="colosseum-card" style={{ padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <item.icon size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</span>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="colosseum-card" style={{ padding: '1.25rem 1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{t.overviewNextAction}</p>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.sideMasterPlan}</p>
        </div>
        <Link href={`/workspace/${currentEvent.id}/master-plan`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Target size={14} /> {t.sideMasterPlan} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
