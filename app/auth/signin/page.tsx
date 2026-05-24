"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { Zap, Lock, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/workspace'); // redirect to workspace root (will show list or create new)
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" />
      <div className="vignette" />
      <div className="noise-overlay" />

      <div className="auth-shell" style={{ position: 'relative', zIndex: 1 }}>
        <section style={{ padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #35f0ff, #84f57d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>RunIt</span>
          </Link>

          <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(53, 240, 255, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Lock size={18} color="var(--accent-cyan)" />
              </div>
              <div>
                <p className="mono-label" style={{ marginBottom: '0.35rem' }}>Access Console</p>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sign in to RunIt</h2>
              </div>
            </div>

            {error && <p style={{ color: 'var(--accent-rose)', marginBottom: '0.75rem' }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <input
                className="input-field"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button className="btn-primary" type="submit" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Sign In
                <ArrowRight size={16} />
              </button>
            </form>

            <p style={{ marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Sign Up</Link>
            </p>
          </div>
        </section>

        <aside className="auth-aside" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <div className="glass" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', borderRadius: '1.5rem' }}>
            <p className="mono-label" style={{ marginBottom: '1rem' }}>System Snapshot</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>
              Operational clarity, before chaos hits.
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem' }}>
              RunIt models your event like a mission control board. Simulate disruptions, validate dependencies, and coordinate teams with live AI guidance.
            </p>
            <pre className="ascii-column">
{`:: RUNIT SYSTEM ::
| STATUS  | READY
| SIMS    | 04 ACTIVE
| RISK    | LOW
| SYNC    | 99.2%
`}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
