"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ArrowRight, Mail } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-ground-0)', position: 'relative' }}>
      <div className="grid-bg" />

      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        height: 'var(--nav-height)', display: 'flex', alignItems: 'center',
        padding: '0 var(--space-2xl)', justifyContent: 'space-between',
      }}>
        <BrandLogo href="/" size={28} />
      </nav>

      <main style={{
        position: 'relative', zIndex: 1, minHeight: '100vh',
        paddingTop: 'calc(var(--nav-height) + var(--space-2xl))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-2xl)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              Reset password
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          <div style={{
            background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xs)', padding: 'var(--space-2xl)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--color-mint)', fontWeight: 600, marginBottom: '1rem' }}>
                  Check your inbox for a password reset link.
                </p>
                <button type="button" className="btn-primary" onClick={() => router.push('/auth/signin')} style={{ width: '100%' }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{
                    background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)',
                    borderRadius: 'var(--radius-xs)', padding: 'var(--space-md)',
                    color: 'var(--color-red)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)',
                  }}>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <label htmlFor="email" style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      id="email"
                      className="input-field"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ paddingLeft: 36, width: '100%' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                    {loading ? 'Sending…' : <>Send reset link <ArrowRight size={13} /></>}
                  </button>
                </form>
              </>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-xl)' }}>
              <Link href="/auth/signin" style={{ color: 'var(--color-text-primary)', textDecoration: 'underline' }}>
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
