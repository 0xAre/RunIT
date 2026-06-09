'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isBypassed } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const allowBypass = process.env.NODE_ENV !== 'production' && isBypassed;
      if (!user && !allowBypass) {
        router.push('/');
      }
    }
  }, [user, loading, isBypassed, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
        <div className="landing-step-circle" style={{ borderColor: 'var(--landing-teal)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const allowBypass = process.env.NODE_ENV !== 'production' && isBypassed;

  // Prevent rendering children briefly if redirecting
  if (!user && !allowBypass) {
    return null;
  }

  return <>{children}</>;
}
