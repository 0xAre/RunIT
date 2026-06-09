'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const AVATARS = [
  { initials: 'AR', bg: '#00ADB5' },
  { initials: 'BK', bg: '#848DFF' },
  { initials: 'CW', bg: '#55B467' },
  { initials: 'DY', bg: '#FBBF24' },
  { initials: 'EF', bg: '#FF6369' },
  { initials: 'GH', bg: '#00ADB5' },
  { initials: 'IR', bg: '#6E78FF' },
  { initials: 'JA', bg: '#55B467' },
  { initials: 'KL', bg: '#848DFF' },
  { initials: 'MN', bg: '#FBBF24' },
  { initials: 'OP', bg: '#00ADB5' },
];

export default function CommunitySection() {
  const { lang } = useLangStore();
  const t = dict[lang];
  const { user } = useAuth();
  const router = useRouter();

  const handleJoin = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push('/auth/signin');
    }
  };

  return (
    <section className="landing-community">
      <div className="landing-community-inner">

        {/* Avatar grid */}
        <motion.div
          className="landing-community-avatars"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {AVATARS.map((av, i) => (
            <div
              key={i}
              className="landing-community-avatar"
              style={{ background: av.bg, zIndex: AVATARS.length - i }}
              title={`Panitia ${av.initials}`}
            >
              {av.initials}
            </div>
          ))}
          <div
            className="landing-community-avatar landing-community-more"
            style={{ zIndex: 0 }}
          >
            120+
          </div>
        </motion.div>

        {/* Eyebrow */}
        <motion.span
          className="landing-community-eyebrow"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {t.communityEyebrow}
        </motion.span>

        {/* Title */}
        <motion.h2
          className="landing-community-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {t.communityTitle}
          <br />
          <span className="teal">{t.communityTitle2}</span>
        </motion.h2>

        {/* Description */}
        <motion.p
          className="landing-community-desc"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.22 }}
        >
          {t.communityDesc}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="landing-community-ctas"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link
            href="/workspace/new"
            onClick={handleJoin}
            className="landing-btn-primary"
          >
            {t.communityJoinBtn}
          </Link>
          <Link
            href="/workspace/new"
            onClick={handleJoin}
            className="landing-btn-secondary"
          >
            {t.communityWorkspaceBtn}
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
