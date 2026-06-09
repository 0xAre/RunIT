'use client';

import { motion } from 'framer-motion';
import { Zap, Shield, Radio } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import { ChromaCard } from './ChromaGrid';

export default function ValueProps() {
  const { lang } = useLangStore();
  const t = dict[lang];

  const cards = [
    {
      icon: Zap,
      tag: 'AI-NATIVE',
      tagColor: '#00ADB5',
      tagBorder: 'rgba(0,173,181,0.25)',
      tagBg: 'rgba(0,173,181,0.06)',
      gradientFrom: 'rgba(8,58,61,0.85)',
      gradientTo: 'rgba(0,0,0,0)',
      spotlightColor: 'rgba(0,173,181,0.13)',
      title: t.valueProp1Title,
      desc: t.valueProp1Desc,
    },
    {
      icon: Shield,
      tag: 'PRE-FLIGHT',
      tagColor: '#FBBF24',
      tagBorder: 'rgba(251,191,36,0.25)',
      tagBg: 'rgba(251,191,36,0.06)',
      gradientFrom: 'rgba(50,36,4,0.85)',
      gradientTo: 'rgba(0,0,0,0)',
      spotlightColor: 'rgba(251,191,36,0.10)',
      title: t.valueProp2Title,
      desc: t.valueProp2Desc,
    },
    {
      icon: Radio,
      tag: 'LIVE OPS',
      tagColor: '#55B467',
      tagBorder: 'rgba(85,180,103,0.25)',
      tagBg: 'rgba(85,180,103,0.06)',
      gradientFrom: 'rgba(14,52,20,0.85)',
      gradientTo: 'rgba(0,0,0,0)',
      spotlightColor: 'rgba(85,180,103,0.12)',
      title: t.valueProp3Title,
      desc: t.valueProp3Desc,
      wide: true,
    },
  ];

  return (
    <section className="landing-section landing-value-props">
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="landing-section-eyebrow">{t.valuePropEyebrow}</span>
          <h2 className="landing-section-title">
            {t.valuePropTitle}<br />
            <span className="teal">{t.valuePropTitle2}</span>
          </h2>
        </motion.div>

        <div className="landing-value-grid">
          {cards.map((card, i) => {
            const isWide = card.wide;
            return (
              <motion.div
                key={card.tag}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={isWide ? 'landing-value-card-wide' : 'landing-value-card'}
              >
                <ChromaCard
                  gradientFrom={card.gradientFrom}
                  gradientTo={card.gradientTo}
                  spotlightColor={card.spotlightColor}
                  style={{ height: '100%' }}
                >
                  <div className="landing-card-icon" style={{
                    background: card.tagBg,
                    borderColor: card.tagBorder,
                  }}>
                    <card.icon size={20} color={card.tagColor} />
                  </div>
                  <span className="landing-card-tag" style={{
                    borderColor: card.tagBorder,
                    color: card.tagColor,
                    background: card.tagBg,
                  }}>
                    {card.tag}
                  </span>
                  <h3 className="landing-card-title">{card.title}</h3>
                  <p className="landing-card-desc">{card.desc}</p>
                </ChromaCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
