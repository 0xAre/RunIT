export default function LandingLoading() {
  return (
    <div style={{ background: '#000', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Nav skeleton */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '4rem',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 80, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'lskel 1.4s ease-in-out infinite' }} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ width: 40, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'lskel 1.4s ease-in-out infinite' }} />
          <div style={{ width: 100, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'lskel 1.4s ease-in-out infinite 0.1s' }} />
        </div>
      </div>

      {/* Hero skeleton */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: '1.5rem', padding: '6rem 2rem 4rem',
      }}>
        <div style={{ width: 200, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.06)', animation: 'lskel 1.4s ease-in-out infinite' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 380, height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.08)', animation: 'lskel 1.4s ease-in-out infinite 0.1s' }} />
          <div style={{ width: 280, height: 56, borderRadius: 8, background: 'rgba(0,173,181,0.12)', animation: 'lskel 1.4s ease-in-out infinite 0.15s' }} />
        </div>
        <div style={{ width: 320, height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.06)', animation: 'lskel 1.4s ease-in-out infinite 0.2s' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ width: 140, height: 44, borderRadius: 6, background: 'rgba(0,173,181,0.2)', animation: 'lskel 1.4s ease-in-out infinite 0.25s' }} />
          <div style={{ width: 120, height: 44, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'lskel 1.4s ease-in-out infinite 0.3s' }} />
        </div>
      </div>

      <style>{`
        @keyframes lskel {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
