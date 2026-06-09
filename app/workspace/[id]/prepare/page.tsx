'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import { useEventStore } from '@/store/eventStore';
import { Bot, KanbanSquare, ArrowRight } from 'lucide-react';

export default function PreparePage() {
  const params = useParams();
  const { lang } = useLangStore();
  const t = dict[lang];
  const { currentEvent } = useEventStore();

  const id = typeof params?.id === 'string' ? params.id : '';

  return (
    <div className="flex flex-col gap-6 max-w-[960px] mx-auto p-4 md:p-8">
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>{t.prepareTitle}</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{t.prepareSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href={`/workspace/${id}/execution`} className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-ground-1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <KanbanSquare size={16} />
            <span>{t.prepareOpenTasks}</span>
          </div>
          <ArrowRight size={14} />
        </Link>
        <Link href={`/workspace/${id}/committee`} className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-ground-1)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Bot size={16} />
            <span>{t.prepareOpenAiCommittee}</span>
          </div>
          <ArrowRight size={14} />
        </Link>
      </div>

      {currentEvent && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Event: {currentEvent.name}
        </div>
      )}
    </div>
  );
}
