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
      if (!user && !isBypassed) {
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

  // Prevent rendering children briefly if redirecting
  if (!user && !isBypassed) {
    return null;
  }

  return <>{children}</>;
}
