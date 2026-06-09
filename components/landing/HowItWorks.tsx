'use client';

import { motion } from 'framer-motion';
import { Play, GitBranch, Shield, Radio } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

const STEP_ICONS = [Play, GitBranch, Shield, Radio];

export default function HowItWorks() {
  const { lang } = useLangStore();
  const t = dict[lang];

  const steps = [
    {
      num: '01',
      icon: STEP_ICONS[0],
      title: t.howItWorksStep1Title,
      desc: t.howItWorksStep1Desc,
    },
    {
      num: '02',
      icon: STEP_ICONS[1],
      title: t.howItWorksStep2Title,
      desc: t.howItWorksStep2Desc,
    },
    {
      num: '03',
      icon: STEP_ICONS[2],
      title: t.howItWorksStep3Title,
      desc: t.howItWorksStep3Desc,
    },
    {
      num: '04',
      icon: STEP_ICONS[3],
      title: t.howItWorksStep4Title,
      desc: t.howItWorksStep4Desc,
    },
  ];

  return (
    <section className="landing-how-linear-section" id="how-it-works">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Section header */}
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="landing-section-eyebrow">{t.howItWorksEyebrow}</span>
          <h2 className="landing-section-title">
            {t.howItWorksTitle}<br />
            <span className="teal">{t.howItWorksTitle2}</span>
          </h2>
        </motion.div>

        {/* Linear steps grid */}
        <div className="landing-how-linear-steps">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                className="landing-how-linear-step"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Number badge */}
                <div className="landing-how-linear-num">{step.num}</div>

                {/* Icon */}
                <div className="landing-how-linear-icon">
                  <Icon size={22} />
                </div>

                {/* Content */}
                <h3 className="landing-how-linear-title">{step.title}</h3>
                <p className="landing-how-linear-desc">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
