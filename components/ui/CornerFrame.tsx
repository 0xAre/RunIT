export function CornerFrame({
  variant = 'default',
}: {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning';
}) {
  const sqColor =
    variant === 'primary' ? 'var(--color-mint)' :
    variant === 'secondary' ? 'var(--color-ground-8)' :
    variant === 'danger' ? 'var(--color-red)' :
    variant === 'warning' ? 'var(--color-amber)' :
    '#A0A0A0';

  const lineColor =
    variant === 'primary' ? 'rgba(37, 208, 171, 0.3)' :
    variant === 'danger' ? 'rgba(255, 99, 105, 0.3)' :
    variant === 'warning' ? 'rgba(251, 191, 36, 0.3)' :
    '#1C1C1C';

  const sq: React.CSSProperties = {
    position: 'absolute', width: 4, height: 4, background: sqColor, zIndex: 3,
  };
  const vLine: React.CSSProperties = {
    position: 'absolute', top: '0.75rem', bottom: '0.75rem', width: 2, background: lineColor, zIndex: 3,
  };
  const hLine: React.CSSProperties = {
    position: 'absolute', left: '0.75rem', right: '0.75rem', height: 2, background: lineColor, zIndex: 3,
  };

  return (
    <>
      <span style={{ ...sq, top: 0, left: 0 }} />
      <span style={{ ...sq, top: 0, right: 0 }} />
      <span style={{ ...sq, bottom: 0, left: 0 }} />
      <span style={{ ...sq, bottom: 0, right: 0 }} />
      
      <span style={{ ...vLine, left: 0 }} />
      <span style={{ ...vLine, right: 0 }} />
      <span style={{ ...hLine, top: 0 }} />
      <span style={{ ...hLine, bottom: 0 }} />
    </>
  );
}
