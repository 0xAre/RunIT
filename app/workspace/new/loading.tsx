export default function NewEventLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Fixed nav skeleton */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ width: 80, height: 28, borderRadius: 6, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
        <div style={{ width: 80, height: 22, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
      </div>

      {/* Content skeleton */}
      <div style={{ width: '100%', maxWidth: 720, paddingTop: '6rem', padding: '6rem 1.5rem 2rem' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 280, height: 36, borderRadius: 6, background: 'var(--color-ground-3)', margin: '0 auto 0.75rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 200, height: 16, borderRadius: 4, background: 'var(--color-ground-3)', margin: '0 auto', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.1s' }} />
        </div>

        {/* Template grid skeleton */}
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ width: 180, height: 14, borderRadius: 4, background: 'var(--color-ground-3)', marginBottom: '1rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 76, borderRadius: 8, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.07}s` }} />
            ))}
          </div>
        </div>

        {/* AI brief skeleton */}
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '1.5rem' }}>
          <div style={{ width: 140, height: 14, borderRadius: 4, background: 'var(--color-ground-3)', marginBottom: '0.75rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ height: 130, borderRadius: 8, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.1s' }} />
        </div>
      </div>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
