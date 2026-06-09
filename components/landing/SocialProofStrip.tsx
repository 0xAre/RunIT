'use client';

import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

const COMMUNITIES = [
  'BEM UI', 'BEM ITB', 'BEM UGM', 'COMPFEST', 'GEMASTIK',
  'BEM ITS', 'Himakom', 'HMJ Informatika', 'BEM Undip',
  'KSM Tech', 'BEM UNPAD', 'HMIF ITB', 'OSIS Nasional',
  'BEM Unsri', 'Komunitas AI Indonesia', 'BEM BINUS',
];

// Double the array for seamless infinite scroll
const ITEMS = [...COMMUNITIES, ...COMMUNITIES];

export default function SocialProofStrip() {
  const { lang } = useLangStore();
  const t = dict[lang];

  return (
    <section className="landing-socialproof" aria-label="Trusted communities">
      <span className="landing-socialproof-label">{t.socialProofLabel}</span>
      <div className="landing-socialproof-track-wrap">
        <div className="landing-socialproof-track" aria-hidden="true">
          {ITEMS.map((name, i) => (
            <span key={i} className="landing-socialproof-item">
              {name}
              <span className="landing-socialproof-sep" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
