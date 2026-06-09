import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  variant?: 'workspace' | 'landing';
  wordmarkClassName?: string;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  href = '/',
  size = 32,
  showWordmark = true,
  variant = 'workspace',
  wordmarkClassName = '',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const isLanding = variant === 'landing';

  const content = (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(8, size * 0.3) }}
    >
      <Image
        src="/logo.png"
        alt="RunIT logo"
        width={size}
        height={size}
        priority={priority}
        style={{ borderRadius: Math.max(4, size * 0.18), flexShrink: 0 }}
      />
      {showWordmark && (
        <span
          className={wordmarkClassName || (isLanding ? 'landing-wordmark' : '')}
          style={
            isLanding
              ? undefined
              : {
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }
          }
        >
          Run
          {isLanding ? (
            <em>IT</em>
          ) : (
            <em style={{ fontStyle: 'normal', color: 'var(--color-mint)' }}>IT</em>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}
