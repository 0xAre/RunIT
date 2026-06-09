'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export default function StatsStrip() {
  const { lang } = useLangStore();
  const t = dict[lang];

  const stat1 = useCountUp(7);
  const stat2 = useCountUp(120);

  return (
    <section className="landing-statsstrip">
      <span className="landing-statsstrip-eyebrow">{t.statsStripEyebrow}</span>
      <div className="landing-statsstrip-grid">

        {/* Stat 1 — 7 Stages */}
        <motion.div
          ref={stat1.ref}
          className="landing-statsstrip-item"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-statsstrip-number">
            {stat1.count}
            {t.statsStrip1Suffix && (
              <span className="landing-statsstrip-suffix">{t.statsStrip1Suffix}</span>
            )}
          </div>
          <div className="landing-statsstrip-label">
            {t.statsStrip1Label.split('\n').map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </div>
        </motion.div>

        {/* Stat 2 — 120+ Scenarios */}
        <motion.div
          ref={stat2.ref}
          className="landing-statsstrip-item"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="landing-statsstrip-number">
            {stat2.count}
            <span className="landing-statsstrip-suffix">{t.statsStrip2Suffix}</span>
          </div>
          <div className="landing-statsstrip-label">
            {t.statsStrip2Label.split('\n').map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </div>
        </motion.div>

        {/* Stat 3 — ∞ AI Plans */}
        <motion.div
          className="landing-statsstrip-item"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="landing-statsstrip-number">
            {t.statsStrip3Num}
            {t.statsStrip3Suffix && (
              <span className="landing-statsstrip-suffix">{t.statsStrip3Suffix}</span>
            )}
          </div>
          <div className="landing-statsstrip-label">
            {t.statsStrip3Label.split('\n').map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
