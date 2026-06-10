"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

/* ── Colosseum CornerSquare ── */
function CornerFrame({
  variant = 'default',
}: {
  variant?: 'default' | 'primary' | 'secondary';
}) {
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
      <span style={{ ...sq, top: 0, left: 0 }} />
      <span style={{ ...sq, top: 0, right: 0 }} />
      <span style={{ ...sq, bottom: 0, left: 0 }} />
      <span style={{ ...sq, bottom: 0, right: 0 }} />
      <span style={{ ...vLine, left: 0 }} />
      <span style={{ ...vLine, right: 0 }} />
      <span style={{ ...hLine, top: 0 }} />
      <span style={{ ...hLine, bottom: 0 }} />
    </>
  );
}

/* ── Labelled input field ── */
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

/* ── Page ── */

export default function SignInPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();
  const { loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/workspace');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      router.push('/workspace');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-in is not enabled in Firebase.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups.');
      } else {
        setError(err.message || 'An error occurred during sign-in.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-ground-0)', position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
      <div className="grid-bg" />
      <div className="ambient-glow" />

      {/* Minimal top bar */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        height: 'var(--nav-height)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-2xl)',
        justifyContent: 'space-between',
      }}>
        <BrandLogo href="/" size={28} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)',
          color: 'var(--color-text-muted)', letterSpacing: '0.08em',
        }}>
          SECURE AUTHORIZATION
        </span>
      </nav>

      {/* ── Centered Layout ── */}
      <main style={{
        position: 'relative', zIndex: 1, 
        minHeight: '100vh',
        paddingTop: 'calc(var(--nav-height) + var(--space-2xl))',
        paddingBottom: 'var(--space-3xl)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        
        <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', padding: '0 var(--space-md)' }}>
          {/* Title Header above the panel */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', fontSize: '2rem', 
              color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
              marginBottom: 'var(--space-xs)'
            }}>
              Welcome Back
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-body)' }}>
              Sign in to access your operational workspace.
            </p>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
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
              <span className="panel__title">ACCESS CONSOLE</span>
              <span className="ascii-fill" />
            </div>

            {/* Panel body */}
            <div style={{
              background: 'var(--color-ground-1)',
              border: '1px solid var(--color-border)', borderTop: 'none',
              borderBottomLeftRadius: 'var(--radius-xs)', borderBottomRightRadius: 'var(--radius-xs)',
              padding: 'var(--space-2xl)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
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

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn-secondary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', margin: 'var(--space-lg) 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <InputField id="email"    label="Email Address"   type="email"    placeholder="budi@runit.app"   value={email}    onChange={setEmail}    icon={Mail} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                  <Link href="/auth/forgot-password" style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', textDecoration: 'underline' }}>
                    Forgot password?
                  </Link>
                </div>
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
                      Authenticating...
                    </>
                  ) : (
                    <>Sign in with email <ArrowRight size={13} /></>
                  )}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2xl)' }}>
                Don't have an account?{' '}
                <Link href="/auth/signup" style={{
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-heading)', fontSize: 'var(--text-body-sm)',
                  textDecoration: 'underline',
                }}>
                  Create Account
                </Link>
              </p>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
