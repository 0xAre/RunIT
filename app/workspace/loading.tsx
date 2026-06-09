export default function WorkspaceLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Nav skeleton */}
      <div style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 80, height: 18, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ width: 120, height: 36, borderRadius: 6, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
      </div>

      {/* Content skeleton */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ width: 240, height: 32, borderRadius: 6, background: 'var(--color-ground-3)', marginBottom: '0.75rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 320, height: 16, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.1s' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--color-ground-1)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 80, height: 22, borderRadius: 11, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1}s` }} />
                <div style={{ width: 80, height: 22, borderRadius: 11, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1}s` }} />
              </div>
              <div>
                <div style={{ width: '70%', height: 22, borderRadius: 4, background: 'var(--color-ground-3)', marginBottom: '0.5rem', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1 + 0.05}s` }} />
                <div style={{ width: '50%', height: 16, borderRadius: 4, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1 + 0.1}s` }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ height: 60, borderRadius: 8, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1 + 0.15}s` }} />
                <div style={{ height: 60, borderRadius: 8, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1 + 0.2}s` }} />
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
