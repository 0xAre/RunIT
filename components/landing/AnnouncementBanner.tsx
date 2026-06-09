'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

const BANNER_KEY = 'runit-banner-dismissed-v2';

export default function AnnouncementBanner({
  onVisibilityChange,
}: {
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const { lang } = useLangStore();
  const t = dict[lang];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_KEY);
    const show = !dismissed;
    setVisible(show);
    onVisibilityChange?.(show);
  }, [onVisibilityChange]);

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1');
    setVisible(false);
    onVisibilityChange?.(false);
  };

  if (!visible) return null;

  return (
    <div className="landing-announcement" role="banner" aria-label="Announcement">
      <span className="landing-announcement-dot" aria-hidden="true" />
      <span className="landing-announcement-text">{t.announcementText}</span>
      <Link href="/workspace/new" className="landing-announcement-cta">
        {t.announcementCta} →
      </Link>
      <button
        className="landing-announcement-dismiss"
        onClick={dismiss}
        aria-label="Dismiss announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}
