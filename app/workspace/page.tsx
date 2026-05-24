'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import { Plus, LayoutDashboard, Database, Activity, GitBranch, Zap, ChevronRight, Calendar, Users, Globe } from 'lucide-react';
import Link from 'next/link';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

export default function WorkspaceDashboard() {
  const router = useRouter();
  const { events, loadUserEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  
  const { lang, toggleLang } = useLangStore();
  const t = dict[lang];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        await loadUserEvents();
      } catch (err) {
        console.error("Failed to load events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [loadUserEvents]);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column', position: 'relative'
    }}>
      {/* Background Grid */}
      <div className="grid-bg" />

      {/* Nav */}
      <nav style={{
        padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyItems: 'space-between',
        background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={14} color="var(--bg-primary)" style={{ fill: 'var(--bg-primary)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>RunIt</span>
          <span style={{ color: 'var(--border-strong)', margin: '0 0.5rem' }}>/</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{t.navWorkspace}</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={toggleLang} className="btn-ghost" style={{ padding: '0.4rem 0.6rem', gap: '0.3rem', fontSize: '0.8rem' }}>
            <Globe size={14} />
            {lang === 'en' ? 'EN' : 'ID'}
          </button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />
          <Link href="/workspace/new">
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
              <Plus size={14} />
              {t.navNewProject}
            </button>
          </Link>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>U</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            {t.dashTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {t.dashSubtitle}
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="spinner" />
          </div>
        ) : events.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              padding: '4rem 2rem', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
              border: '1px dashed var(--border-strong)', borderRadius: '12px',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={24} color="var(--text-secondary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{t.dashNoProjects}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                {t.dashNoProjectsDesc}
              </p>
            </div>
            <Link href="/workspace/new">
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}>
                <Plus size={16} />
                {t.dashCreateProjectBtn}
              </button>
            </Link>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass glass-hover"
                onClick={() => router.push(`/workspace/${event.id}/blueprint`)}
                style={{ 
                  padding: '1.5rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem',
                  textDecoration: 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="badge" style={{ color: 'var(--text-secondary)' }}>{event.type}</span>
                  <span className="badge badge-emerald">
                    <div className="pulse-dot" style={{ width: '4px', height: '4px' }} />
                    {event.stage}
                  </span>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                    {event.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <Calendar size={14} />
                    <span>{event.timeline}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <Users size={12} />
                      <span className="clean-label">{t.dashPax}</span>
                    </div>
                    <p style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>{event.participants.toLocaleString()}</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <GitBranch size={12} />
                      <span className="clean-label">{t.dashTasks}</span>
                    </div>
                    <p style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {event.blueprint ? (
                        Object.values(event.blueprint.divisions).reduce((acc: number, div: any) => acc + (div.tasks?.length || 0), 0)
                      ) : '0'}
                    </p>
                  </div>
                </div>

                <div style={{ 
                  marginTop: '0.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t.dashCreated} {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
                    {t.dashOpenProject}
                    <ChevronRight size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
