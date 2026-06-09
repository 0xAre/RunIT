export default function WorkspaceIdLoading() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--color-ground-0)',
    }}>
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex flex-col flex-shrink-0" style={{
        width: 'var(--sidebar-width)',
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-ground-1)',
      }}>
        {/* Logo row */}
        <div style={{
          height: 'var(--nav-height)',
          padding: '0 1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ width: 80, height: 20, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: 32, height: 22, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
        </div>

        {/* Project banner */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ width: '60%', height: 10, borderRadius: 3, background: 'var(--color-ground-3)', marginBottom: '0.5rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: '85%', height: 16, borderRadius: 4, background: 'var(--color-ground-3)', marginBottom: '0.4rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.05s' }} />
          <div style={{ width: 80, height: 18, borderRadius: 9, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.1s' }} />
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ width: '60%', height: 10, borderRadius: 3, background: 'var(--color-ground-3)', marginBottom: '0.5rem', marginLeft: '0.5rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.75rem', borderRadius: 6,
              background: i === 0 ? 'var(--color-ground-3)' : 'transparent',
              animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.06}s`,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--color-ground-3)', flexShrink: 0 }} />
              <div style={{ width: `${55 + Math.random() * 30}%`, height: 12, borderRadius: 3, background: 'var(--color-ground-3)' }} />
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Breadcrumb bar skeleton */}
        <div style={{
          background: 'var(--color-ground-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          height: 50,
          flexShrink: 0,
        }}>
          <div style={{ width: 80, height: 14, borderRadius: 3, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ flex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ width: 60, height: 12, borderRadius: 3, background: 'var(--color-ground-3)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.05}s` }} />
            ))}
          </div>
          <div style={{ width: 100, height: 26, borderRadius: 13, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
        </div>

        {/* Page content skeleton */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: 200, height: 28, borderRadius: 5, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
          <div style={{ width: '50%', height: 16, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.08s' }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 100, borderRadius: 8, background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.1}s` }} />
            ))}
          </div>
          <div style={{ height: 200, borderRadius: 8, background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', marginTop: '0.5rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.15s' }} />
        </div>
      </main>

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
