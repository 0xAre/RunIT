'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * App-level template — re-mounts on every route change.
 * Applies a lightweight entrance animation to smooth page transitions.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger entrance animation when route changes
    const el = wrapperRef.current;
    if (!el) return;

    // Cancel any existing animation
    el.style.animation = 'none';
    // Force reflow
    void el.offsetHeight;
    // Apply entrance animation
    el.style.animation = 'page-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) both';
  }, [pathname]);

  return (
    <div
      ref={wrapperRef}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  );
}
