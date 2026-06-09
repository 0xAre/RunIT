'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEventStore, type EventData } from '@/store/eventStore';
import { Plus, LayoutDashboard, GitBranch, Zap, ChevronRight, Calendar, Users, Globe, Copy } from 'lucide-react';
import Link from 'next/link';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import DuplicateEventModal from '@/components/DuplicateEventModal';

export default function WorkspaceDashboard() {
  const router = useRouter();
  const { events, loadUserEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [duplicatingEvent, setDuplicatingEvent] = useState<EventData | null>(null);
  
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
      <nav className="flex items-center justify-between p-4 sm:px-8 border-b border-[var(--border)] sticky top-0 z-50" style={{
        background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)'
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
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-12 relative z-10">
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
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                width: '100%', maxWidth: '600px',
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass glass-hover"
                onClick={() => router.push(`/workspace/${event.id}/overview`)}
                style={{ 
                  padding: '1.5rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '1.25rem',
                  textDecoration: 'none', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="badge" style={{ color: 'var(--text-secondary)' }}>{event.type}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-emerald">
                      <div className="pulse-dot" style={{ width: '4px', height: '4px' }} />
                      {event.stage}
                    </span>
                    {/* Duplicate button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDuplicatingEvent(event); }}
                      title="Duplikasi event ini"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.25rem 0.5rem', borderRadius: 6,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-blue, #00ADB5)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-blue, #00ADB5)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                      }}
                    >
                      <Copy size={11} /> Duplikasi
                    </button>
                  </div>
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

        {/* Duplicate Modal */}
        {duplicatingEvent && (
          <DuplicateEventModal
            sourceEvent={duplicatingEvent}
            onClose={() => setDuplicatingEvent(null)}
          />
        )}
      </main>
    </div>
  );
}
