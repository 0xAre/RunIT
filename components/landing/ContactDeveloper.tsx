'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { ExternalLink, Send, Check, MessageSquare } from 'lucide-react';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

/* GitHub SVG icon (lucide-react doesn't ship it in this version) */
function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234C5.662 21.2 4.967 19.083 4.967 19.083c-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.419-1.305.762-1.605C6.955 16.97 4.48 16.08 4.48 11.44c0-1.338.478-2.432 1.264-3.29-.127-.31-.548-1.556.12-3.246 0 0 1.03-.33 3.375 1.258A11.741 11.741 0 0 1 12 5.809a11.74 11.74 0 0 1 3.062.412C17.543 4.621 18.573 4.95 18.573 4.95c.668 1.69.247 2.936.12 3.246.787.858 1.263 1.952 1.263 3.29 0 4.65-2.48 5.527-4.844 5.817.38.327.719.974.719 1.962v2.907c0 .32.218.694.825.576C20.565 21.798 24 17.302 24 12 24 5.373 18.627 0 12 0z" />
    </svg>
  );
}

/* ── Constants ───────────────────────────────────────────── */

const GH_USER   = '0xAre';
const GH_AVATAR = `https://github.com/${GH_USER}.png?size=200`;
const GH_URL    = `https://github.com/${GH_USER}`;
const CHAR_LIMIT = 280;

// Hardcoded preview menfess bubbles (3 most authentic ones)
const PREVIEW_BUBBLES = [
  { id: 1, text: 'RunIT literally saved my HIMA event last month 🙏 please keep going' },
  { id: 2, text: 'Would love an export to PDF feature for the event report!' },
  { id: 3, text: 'Bro the simulate stage is actually genius, never thought of that' },
];

/* ── Component ────────────────────────────────────────────── */

export default function ContactDeveloper() {
  const { lang } = useLangStore();
  const t = dict[lang];

  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charLeft   = CHAR_LIMIT - message.length;
  const charPct    = (message.length / CHAR_LIMIT) * 100;
  const isWarn     = charLeft <= 60 && charLeft > 20;
  const isDanger   = charLeft <= 20;
  const isEmpty    = message.trim().length === 0;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (isEmpty || message.length > CHAR_LIMIT) return;
    // Opsi A: open GitHub Issues pre-filled
    const issueUrl = `${GH_URL}/RunIT/issues/new?title=${encodeURIComponent('[Menfess]')}&body=${encodeURIComponent(message)}`;
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
    }, 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isEmpty) {
      handleSend();
    }
  };

  return (
    <section className="dev-section" id="contact">

      {/* Section header */}
      <motion.div
        className="landing-section-header"
        style={{ maxWidth: 980, margin: '0 auto 3rem' }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <span className="landing-section-eyebrow">{t.devEyebrow}</span>
        <h2 className="landing-section-title">
          {t.devTitle}<br />
          <span className="teal">{t.devTitle2}</span>
        </h2>
        <p className="landing-section-subtitle">{t.devSubtitle}</p>
      </motion.div>

      {/* Main grid */}
      <div className="dev-grid">

        {/* ── Left: Developer Card ──────────────────────── */}
        <motion.div
          className="dev-card"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Online status */}
          <div className="dev-online">
            <span className="dev-online-dot" />
            {t.devOnline}
          </div>

          {/* Avatar + name */}
          <div className="dev-avatar-row">
            <div className="dev-avatar-ring">
              {avatarError ? (
                <div className="dev-avatar-fallback">0x</div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={GH_AVATAR}
                  alt={`${GH_USER} GitHub Avatar`}
                  onError={() => setAvatarError(true)}
                />
              )}
            </div>
            <div>
              <div className="dev-name">{GH_USER}</div>
              <div className="dev-role">{t.devRole}</div>
            </div>
          </div>

          <div className="dev-divider" />

          {/* GitHub link */}
          <a
            href={GH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dev-gh-btn"
          >
            <GithubIcon size={13} />
            <span className="dev-gh-btn-text">{t.devGithubLink}</span>
            <ExternalLink size={11} className="dev-gh-arrow" />
          </a>

          <div className="dev-divider" />

          {/* Menfess preview feed */}
          <span className="dev-feed-label">{t.devFeedLabel}</span>
          {PREVIEW_BUBBLES.map((bubble, i) => (
            <motion.div
              key={bubble.id}
              className="dev-bubble"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.4 }}
            >
              <span className="dev-bubble-anon">anon_{String(100 + bubble.id * 37).slice(-3)}</span>
              <span className="dev-bubble-text">{bubble.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Right: Menfess Form ───────────────────────── */}
        <motion.div
          className="menfess-card"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {sent ? (
              /* Success state */
              <motion.div
                key="success"
                className="menfess-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="menfess-success-icon">
                  <Check size={22} />
                </div>
                <div className="menfess-success-title">{t.menfessSentBtn}</div>
                <div className="menfess-success-sub">
                  {lang === 'id'
                    ? 'GitHub Issues terbuka di tab baru'
                    : 'GitHub Issues opened in new tab'}
                </div>
              </motion.div>
            ) : (
              /* Form state */
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header */}
                <div className="menfess-icon-row">
                  <div className="menfess-icon-wrap">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div className="menfess-header-title">{t.menfessTitle}</div>
                  </div>
                </div>
                <span className="menfess-header-sub">{t.menfessSubtitle}</span>

                {/* Textarea */}
                <div className="menfess-textarea-wrap">
                  <textarea
                    ref={textareaRef}
                    className="menfess-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, CHAR_LIMIT))}
                    onKeyDown={handleKeyDown}
                    placeholder={t.menfessPlaceholder}
                    rows={4}
                    aria-label="Menfess message"
                  />
                </div>

                {/* Character counter */}
                <div className="menfess-counter-row">
                  <div className="menfess-char-bar">
                    <div
                      className={`menfess-char-fill${isDanger ? ' danger' : isWarn ? ' warn' : ''}`}
                      style={{ width: `${Math.min(charPct, 100)}%` }}
                    />
                  </div>
                  <span className={`menfess-counter${isDanger ? ' danger' : isWarn ? ' warn' : ''}`}>
                    {charLeft} {t.menfessCharLimit}
                  </span>
                </div>

                {/* Anon badges */}
                <div className="menfess-badges">
                  <span className="menfess-badge">
                    <span className="menfess-badge-dot" />
                    {t.menfessAnonBadge}
                  </span>
                  <span className="menfess-badge">
                    <span className="menfess-badge-dot" />
                    {t.menfessNoTrackBadge}
                  </span>
                  <span className="menfess-badge">
                    <span className="menfess-badge-dot" />
                    GitHub Issues
                  </span>
                </div>

                {/* Send button */}
                <button
                  className="menfess-btn"
                  onClick={handleSend}
                  disabled={isEmpty || message.length > CHAR_LIMIT}
                  aria-label="Send menfess"
                >
                  {t.menfessSendBtn}
                  <Send size={15} />
                </button>

                {/* Keyboard shortcut hint */}
                <div className="menfess-alt" style={{ marginTop: '0.625rem', marginBottom: '0.625rem' }}>
                  <span style={{ opacity: 0.4 }}>
                    {lang === 'id' ? 'atau tekan' : 'or press'}{' '}
                    <kbd style={{
                      fontFamily: 'var(--font-dot)', fontSize: '0.55rem',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '4px', padding: '1px 4px',
                    }}>
                      ⌘ Enter
                    </kbd>
                  </span>
                </div>

                {/* Alt link — GitHub profile */}
                <div className="menfess-alt">
                  {t.menfessAltText}{' '}
                  <a href={GH_URL} target="_blank" rel="noopener noreferrer">
                    github.com/{GH_USER}
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
