export default function WorkspaceSubpageLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <div style={{ width: 200, height: 28, borderRadius: 5, background: 'var(--color-ground-3)', marginBottom: '0.5rem', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
        <div style={{ width: 300, height: 16, borderRadius: 4, background: 'var(--color-ground-3)', animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.08s' }} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--color-ground-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '1rem',
            animation: `skeleton-pulse 1.4s ease-in-out infinite ${i * 0.08}s`,
          }}>
            <div style={{ width: '60%', height: 10, borderRadius: 3, background: 'var(--color-ground-3)', marginBottom: '0.5rem' }} />
            <div style={{ width: '40%', height: 20, borderRadius: 4, background: 'var(--color-ground-3)' }} />
          </div>
        ))}
      </div>

      {/* Main content block */}
      <div style={{
        background: 'var(--color-ground-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'skeleton-pulse 1.4s ease-in-out infinite 0.15s',
      }}>
        <div>
          <div style={{ width: 120, height: 10, borderRadius: 3, background: 'var(--color-ground-3)', marginBottom: '0.5rem' }} />
          <div style={{ width: 160, height: 18, borderRadius: 4, background: 'var(--color-ground-3)' }} />
        </div>
        <div style={{ width: 120, height: 36, borderRadius: 6, background: 'var(--color-ground-3)' }} />
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
