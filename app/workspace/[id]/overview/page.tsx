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
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>{t.overviewNoEvent}</p>
          <Link href="/workspace/new" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Zap size={14} /> {t.overviewGoToCreate}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[960px] mx-auto p-4 md:p-8">
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>{t.overviewTitle}</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{t.overviewSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: t.formEventName, value: currentEvent.name, icon: FileText },
          { label: t.formTimeline, value: currentEvent.timeline || '—', icon: Calendar },
          { label: t.formExpectedPax, value: currentEvent.participants.toLocaleString(), icon: Users },
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <item.icon size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{item.label}</span>
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{t.overviewNextAction}</p>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.sideBlueprint}</p>
        </div>
        <Link href={`/workspace/${currentEvent.id}/blueprint`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Target size={14} /> {t.sideBlueprint} <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
