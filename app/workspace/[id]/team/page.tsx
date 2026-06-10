import { Suspense } from 'react';
import TeamPageClient from './TeamPageClient';

export default function TeamPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading team…</div>}>
      <TeamPageClient />
    </Suspense>
  );
}
