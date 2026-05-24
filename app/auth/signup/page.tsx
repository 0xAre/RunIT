"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { ArrowRight, User, Mail, Lock } from 'lucide-react';

/* ── Colosseum CornerSquare — exact CSS from arena.colosseum.org ── */
function CornerFrame({
  variant = 'default',
}: {
  variant?: 'default' | 'primary' | 'secondary';
}) {
  /* Exact values from CornerSquare.Cn_FzXjG.css:
     .square: 4x4px, bg: #A0A0A0
     .primary > .square: bg: #70E1C8 (mint-bright)
     .vertical-line: top/bottom 0.75rem, w: 2px, bg: #1C1C1C
     .horizontal-line: left/right 0.75rem, h: 2px, bg: #1C1C1C
     .primary > .vertical/horizontal-line: bg: #04312C
  */
  const sqColor =
    variant === 'primary'   ? '#70E1C8' :
    variant === 'secondary' ? '#FF802B' :
    '#A0A0A0';

  const lineColor =
    variant === 'primary'   ? '#04312C' :
    variant === 'secondary' ? '#2B1400' :
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
      {/* Squares at all 4 corners */}
      <span style={{ ...sq, top: 0, left: 0 }} />
      <span style={{ ...sq, top: 0, right: 0 }} />
      <span style={{ ...sq, bottom: 0, left: 0 }} />
      <span style={{ ...sq, bottom: 0, right: 0 }} />
      {/* Vertical lines (left & right) */}
      <span style={{ ...vLine, left: 0 }} />
      <span style={{ ...vLine, right: 0 }} />
      {/* Horizontal lines (top & bottom) */}
      <span style={{ ...hLine, top: 0 }} />
      <span style={{ ...hLine, bottom: 0 }} />
    </>
  );
}

/* ── Labelled input field ─────────────────────────────────────── */
function InputField({
  id, label, type, placeholder, value, onChange, icon: Icon,
}: {
  id: string; label: string; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; icon: any;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-body-sm)',
          fontWeight: 400,
          color: 'var(--color-text-primary)',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon
          size={13}
          style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)', pointerEvents: 'none',
          }}
        />
        <input
          id={id}
          className="input-field"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingLeft: 36 }}
          required
          autoComplete="off"
        />
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function SignUpPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      if (userCred.user) {
        await updateProfile(userCred.user, { displayName: name });
      }
      router.push('/workspace');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-ground-0)', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" />
      <div className="ambient-glow" />

      {/* Minimal top bar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        height: 'var(--nav-height)',
        background: 'var(--color-ground-0)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-2xl)',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-heading)', fontSize: '1rem',
          fontWeight: 700, color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}>
          Run<em style={{ fontStyle: 'normal', color: 'var(--color-mint)' }}>IT</em>
        </Link>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)',
          color: 'var(--color-text-muted)', letterSpacing: '0.08em',
        }}>
          OPERATIONAL EXECUTION SYSTEM
        </span>
      </nav>

      {/* ── Layout ── */}
      <div
        className="auth-shell"
        style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-height)' }}
      >

        {/* ── LEFT: Form ── */}
        <section style={{
          padding: 'var(--space-3xl)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '1px solid var(--color-border)',
        }}>
          {/* ASCII columns left/right (Colosseum signup aesthetic) */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
            <CornerFrame variant="primary" />

            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: 'var(--space-md) var(--space-lg)',
              background: 'var(--color-ground-2)',
              border: '1px solid var(--color-border)',
              borderBottom: '2px solid var(--color-border-subtle)',
              borderTopLeftRadius: 'var(--radius-xs)', borderTopRightRadius: 'var(--radius-xs)',
            }}>
              <span className="panel__title">CREATE YOUR ACCOUNT</span>
              <span className="ascii-fill" />
            </div>

            {/* Panel body */}
            <div style={{
              background: 'var(--color-ground-1)',
              border: '1px solid var(--color-border)', borderTop: 'none',
              borderBottomLeftRadius: 'var(--radius-xs)', borderBottomRightRadius: 'var(--radius-xs)',
              padding: 'var(--space-2xl)',
            }}>
              {error && (
                <div style={{
                  background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-xs)', padding: 'var(--space-md) var(--space-lg)',
                  color: 'var(--color-red)', fontSize: 'var(--text-body-sm)',
                  fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-lg)',
                }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <InputField id="name"     label="Display Name"    type="text"     placeholder="Budi Santoso"     value={name}     onChange={setName}     icon={User} />
                <InputField id="email"    label="Email Address"   type="email"    placeholder="budi@runit.app"   value={email}    onChange={setEmail}    icon={Mail} />
                <InputField id="password" label="Password"        type="password" placeholder=""                 value={password} onChange={setPassword} icon={Lock} />

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', marginTop: 'var(--space-xs)', justifyContent: 'center' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                      Initializing...
                    </>
                  ) : (
                    <>Continue with email <ArrowRight size={13} /></>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', margin: 'var(--space-lg) 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>

              <p style={{ textAlign: 'center', fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)' }}>
                Already have an account?{' '}
                <Link href="/auth/signin" style={{
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-heading)', fontSize: 'var(--text-body-sm)',
                  textDecoration: 'underline',
                }}>
                  Login
                </Link>
              </p>
            </div>
          </div>

          <p style={{
            textAlign: 'center', fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)',
            maxWidth: '420px', margin: 'var(--space-2xl) auto 0', lineHeight: 1.6,
          }}>
            By creating your account, you agree to our{' '}
            <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>Terms of Service</span>{' '}and{' '}
            <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </section>

        {/* ── RIGHT: Aside Preview ── */}
        <aside
          className="auth-aside"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-3xl)',
            background: 'var(--color-ground-0)',
          }}
        >
          <div style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <CornerFrame variant="default" />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: 'var(--space-md) var(--space-lg)',
              background: 'var(--color-ground-2)',
              border: '1px solid var(--color-border)',
              borderBottom: '2px solid var(--color-border-subtle)',
              borderTopLeftRadius: 'var(--radius-xs)', borderTopRightRadius: 'var(--radius-xs)',
            }}>
              <span className="panel__title">EVENT OPS PROFILE</span>
              <span className="ascii-fill" />
            </div>

            {/* Body */}
            <div style={{
              background: 'var(--color-ground-1)',
              border: '1px solid var(--color-border)', borderTop: 'none',
              borderBottomLeftRadius: 'var(--radius-xs)', borderBottomRightRadius: 'var(--radius-xs)',
              padding: 'var(--space-2xl)',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-h3)',
                marginBottom: 'var(--space-md)', lineHeight: 1.25,
              }}>
                Build a reusable<br />execution blueprint.
              </h2>
              <p style={{
                color: 'var(--color-text-secondary)', lineHeight: 1.7,
                marginBottom: 'var(--space-2xl)', fontSize: 'var(--text-body)',
              }}>
                Create events, generate AI blueprints, and run simulations
                that keep your team aligned before live execution.
              </p>

              {/* Terminal block */}
              <pre className="ascii-column">{`:: WORKSPACE INIT ::
──────────────────────────────
  EVENTS    ··  01 READY
  OPS MAP   ··  PENDING
  SIMS      ··  00 QUEUED
  AI CORE   ··  ONLINE
  STATUS    ··  AWAITING AGENT
──────────────────────────────`}</pre>

              {/* Stage badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginTop: 'var(--space-lg)' }}>
                {[
                  ['Blueprint', 'blueprint'],
                  ['Dependencies', 'dependencies'],
                  ['Simulate', 'simulate'],
                  ['Live', 'live'],
                  ['Incident', 'incident'],
                  ['Report', 'report'],
                ].map(([label, stage]) => (
                  <span key={stage} className="badge" data-stage={stage} style={{ fontSize: 'var(--text-label)' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
