'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type EventData, type BudgetLineItem } from '@/store/eventStore';
import { useLangStore } from '@/store/langStore';
import type { Task, Division } from '@/store/eventStore';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/task-agents';
import {
  KanbanSquare, Calendar, CheckSquare, BarChart2,
  Bot, Send, Loader2, MessageCircle, X, ChevronDown,
  Clock, AlertTriangle, CheckCircle2, Circle, ArrowRight,
  Plus, Trash2, GripVertical, Download, MapPin, Users,
  Zap, Target, RefreshCw, Building2, ChevronRight, Sparkles,
  TrendingUp, Brain, Activity, DollarSign, Radio,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

/* Lazy imports */
const VenuePickerMap = dynamic(() => import('@/components/VenuePickerMap'), { ssr: false });
const PlaceActionCard = dynamic(() => import('@/components/PlaceActionCard'), { ssr: false });
const AiTaskAssistModal = dynamic(() => import('@/components/AiTaskAssistModal'), { ssr: false });
const VoiceCopilot = dynamic(() => import('@/components/VoiceCopilot'), { ssr: false });
const LiveTimelineAdjuster = dynamic(() => import('@/components/LiveTimelineAdjuster'), { ssr: false });
const CommsPanel = dynamic(() => import('@/components/CommsPanel'), { ssr: false });
import type { TimelineItem as LiveTimelineItem } from '@/components/LiveTimelineAdjuster';
import type { OsmPlace } from '@/app/api/search/places/route';

/* ── Types ───────────────────────────────────────────────── */
type Tab = 'tasks' | 'rundown' | 'confirm' | 'comms' | 'progress';
interface RundownItem { id: string; time: string; activity: string; pic: string; notes: string; }
interface ChatMsg { role: 'user' | 'assistant'; content: string; }

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#FF6369', high: '#FBBF24', medium: '#00ADB5', low: '#25D0AB',
};
const STATUS_CONFIG: Record<string, { color: string; icon: typeof Circle; label: string }> = {
  pending:     { color: 'var(--color-text-muted)', icon: Circle, label: 'Pending' },
  'in-progress': { color: '#FBBF24',             icon: Clock,         label: 'On Going' },
  done:        { color: '#25D0AB',               icon: CheckCircle2,  label: 'Selesai' },
  blocked:     { color: '#FF6369',               icon: AlertTriangle, label: 'Blocked' },
  delayed:     { color: '#F97316',               icon: AlertTriangle, label: 'Delayed' },
};

/* ── Helpers ─────────────────────────────────────────────── */
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}
function seededRundown(divisions: Division[]): RundownItem[] {
  const base: RundownItem[] = [
    { id: 'r0', time: '07:00', activity: 'Setup & Persiapan Venue', pic: 'Logistics', notes: 'Cek sound, proyektor, dekorasi' },
    { id: 'r1', time: '08:30', activity: 'Registrasi Peserta', pic: 'Divisi Acara', notes: 'Meja registrasi, name tag, snack' },
    { id: 'r2', time: '09:00', activity: 'Pembukaan', pic: 'MC', notes: 'Sambutan ketua panitia' },
    { id: 'r3', time: '09:30', activity: 'Sesi Utama', pic: 'Divisi Konten', notes: '' },
    { id: 'r4', time: '12:00', activity: 'Ishoma', pic: 'Divisi Konsumsi', notes: 'Makan siang + sholat' },
    { id: 'r5', time: '13:00', activity: 'Sesi Sore', pic: 'Divisi Konten', notes: '' },
    { id: 'r6', time: '15:30', activity: 'Penutupan & Foto Bersama', pic: 'MC', notes: 'Sertifikat, foto dokumentasi' },
    { id: 'r7', time: '16:00', activity: 'Beres-beres & Evaluasi', pic: 'Semua Divisi', notes: 'Rapat evaluasi H+1' },
  ];
  // Inject from divisions
  divisions.forEach((div, i) => {
    if (div.tasks[0] && !base.some(b => b.activity.includes(div.name))) {
      base.splice(3 + i, 0, {
        id: `rd-${div.id}`, time: `${9 + i}:30`, activity: div.name + ' — ' + div.tasks[0].title,
        pic: div.pic, notes: div.tasks[0].description?.slice(0, 60) || '',
      });
    }
  });
  return base;
}

/* ── AI Chat Panel ───────────────────────────────────────── */
function AIChatPanel({
  eventName, eventType, venue, timeline, participants, budget,
  activeTab, completionPct, pendingCount, divisions, selectedTask,
}: {
  eventName: string; eventType: string; venue?: string; timeline?: string;
  participants?: number; budget?: string; activeTab: string;
  completionPct: number; pendingCount: number;
  divisions: Array<{ name: string; taskCount: number; doneCount: number }>;
  selectedTask?: string;
}) {
  const { lang } = useLangStore();
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: 'assistant', content: lang === 'id'
      ? `Halo! Saya asisten eksekusi untuk **${eventName}**. Tanyakan apa saja — rundown, konfirmasi vendor, status task, atau antisipasi risiko hari-H. 🎯`
      : `Hi! I'm your execution assistant for **${eventName}**. Ask me anything — rundown, vendor confirmation, task status, or day-of risk management. 🎯`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const QUICK_PROMPTS = lang === 'id'
    ? ['Buatkan rundown hari-H', 'Risiko apa yang perlu diwaspadai?', 'Cek progress task sekarang', 'Draft konfirmasi venue']
    : ['Create day-of rundown', 'What risks to watch?', 'Check current task progress', 'Draft venue confirmation'];

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const sendMsg = useCallback(async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: userText };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiFetch('/api/ai/execution-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...msgs, userMsg],
          lang,
          context: { eventName, eventType, venue, timeline, participants, budget, activeTab, completionPct, pendingTaskCount: pendingCount, divisions, selectedTask },
        }),
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: 'assistant', content: data.reply || 'Maaf, coba lagi.' }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Koneksi bermasalah. Coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, lang, eventName, eventType, venue, timeline, participants, budget, activeTab, completionPct, pendingCount, divisions, selectedTask]);

  /* Simple markdown renderer */
  const renderMd = (text: string) => text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• /gm, '&#8226; ')
    .replace(/\n/g, '<br/>');

  return (
    <div style={{
      width: open ? 300 : 48, flexShrink: 0, transition: 'width 0.25s ease',
      display: 'flex', flexDirection: 'column',
      background: 'var(--color-ground-1)', borderLeft: '1px solid var(--color-border)',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', flexShrink: 0, width: '100%', textAlign: 'left' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,106,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={15} color="#7C6AF5" />
        </div>
        {open && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>AI Asisten</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>Execution Helper</p>
          </div>
        )}
        {open && <X size={14} color="var(--color-text-muted)" />}
      </button>

      {open && (
        <>
          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {msgs.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,106,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Bot size={13} color="#7C6AF5" />
                  </div>
                )}
                <div style={{
                  maxWidth: '85%', padding: '0.5rem 0.75rem', borderRadius: 10,
                  background: msg.role === 'user' ? 'rgba(124,106,245,0.15)' : 'var(--color-ground-2)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,106,245,0.25)' : 'var(--color-border)'}`,
                  fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--color-text-primary)',
                }}>
                  <span dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(124,106,245,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={13} color="#7C6AF5" />
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C6AF5', animation: `bounce 1.2s ease-in-out ${d * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '0.5rem 0.875rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => sendMsg(p)} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: 20, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.1s', lineHeight: 1.4 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C6AF5'; e.currentTarget.style.color = '#7C6AF5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >{p}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.4rem' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
              placeholder="Tanya sesuatu..."
              style={{ flex: 1, padding: '0.45rem 0.65rem', background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-primary)', fontSize: '0.78rem', outline: 'none', fontFamily: 'var(--font-sans)' }}
            />
            <button
              onClick={() => sendMsg()}
              disabled={!input.trim() || loading}
              style={{ padding: '0.45rem 0.65rem', borderRadius: 8, background: input.trim() ? '#7C6AF5' : 'var(--color-ground-2)', border: 'none', color: input.trim() ? '#fff' : 'var(--color-text-muted)', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center' }}
            >
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}
      <style>{`
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Tab 1: Task Board ───────────────────────────────────── */
function TaskBoard({ divisions, onTaskSelect, selectedTaskId, onUpdateStatus, onAssistClick }: {
  divisions: Division[];
  onTaskSelect: (task: Task) => void;
  selectedTaskId?: string;
  onUpdateStatus: (divId: string, taskId: string, status: Task['status']) => void;
  onAssistClick: (task: Task) => void;
}) {
  const statuses: Task['status'][] = ['pending', 'in-progress', 'done', 'blocked'];
  const allTasks = divisions.flatMap(d => d.tasks.map(t => ({ ...t, divisionName: d.name, divColor: d.color })));

  if (divisions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
        <KanbanSquare size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Belum ada Master Plan</p>
        <p style={{ fontSize: '0.82rem' }}>Generate master plan dulu dari halaman Master Plan untuk mendapatkan task board.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', height: '100%' }}>
      {statuses.map(st => {
        const cfg = STATUS_CONFIG[st];
        const StIcon = cfg.icon;
        const tasks = allTasks.filter(t => t.status === st);
        return (
          <div key={st} style={{ minWidth: 240, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.625rem', background: 'var(--color-ground-1)', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0 }}>
              <StIcon size={13} color={cfg.color} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'var(--color-ground-2)', color: 'var(--color-text-muted)', borderRadius: 20, padding: '0 0.4rem', fontWeight: 700 }}>{tasks.length}</span>
            </div>
            {/* Task cards */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <AnimatePresence>
                {tasks.map(task => (
                  <motion.div key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onTaskSelect(task)}
                    style={{
                      padding: '0.75rem', background: 'var(--color-ground-1)',
                      borderTop: `1px solid ${task.id === selectedTaskId ? '#7C6AF5' : 'var(--color-border)'}`,
                      borderRight: `1px solid ${task.id === selectedTaskId ? '#7C6AF5' : 'var(--color-border)'}`,
                      borderBottom: `1px solid ${task.id === selectedTaskId ? '#7C6AF5' : 'var(--color-border)'}`,
                      borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] || 'var(--color-border)'}`,
                      borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.12s',
                    }}
                  >
                    <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.35rem', lineHeight: 1.35 }}>{task.title}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: `${PRIORITY_COLOR[task.priority]}18`, color: PRIORITY_COLOR[task.priority], fontWeight: 700, textTransform: 'uppercase' }}>{task.priority}</span>
                      {task.category && (
                        <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: `${CATEGORY_COLORS[task.category]}18`, color: CATEGORY_COLORS[task.category], fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {CATEGORY_LABELS[task.category]}
                        </span>
                      )}
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: 'var(--color-ground-2)', color: task.divColor, fontWeight: 600 }}>{task.divisionName}</span>
                      {task.deadline && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={9} /> {task.deadline}</span>}
                    </div>
                    {/* Quick status change & AI Assist */}
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {statuses.filter(s => s !== st).map(ns => (
                          <button key={ns} onClick={e => { e.stopPropagation(); onUpdateStatus(task.divisionId, task.id, ns); }}
                            style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: 10, background: 'transparent', border: `1px solid ${STATUS_CONFIG[ns].color}40`, color: STATUS_CONFIG[ns].color, cursor: 'pointer' }}>
                            → {STATUS_CONFIG[ns].label}
                          </button>
                        ))}
                      </div>
                      <button onClick={e => { e.stopPropagation(); onAssistClick(task); }}
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 10, background: 'rgba(124,106,245,0.1)', border: '1px solid #7C6AF5', color: '#7C6AF5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                        <Bot size={11} /> AI Assist
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {tasks.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: 8, opacity: 0.6 }}>
                  Tidak ada task
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab 2: Rundown Builder ──────────────────────────────── */
function RundownBuilder({ divisions }: { divisions: Division[] }) {
  const [items, setItems] = useState<RundownItem[]>(() => seededRundown(divisions));
  const [editId, setEditId] = useState<string | null>(null);

  const update = (id: string, field: keyof RundownItem, val: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  };
  const addItem = () => {
    const last = items[items.length - 1];
    setItems(prev => [...prev, { id: `r${Date.now()}`, time: '', activity: '', pic: last?.pic || '', notes: '' }]);
  };
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const exportText = () => {
    const text = `RUNDOWN ACARA\n${'═'.repeat(40)}\n\n` +
      items.map(i => `${i.time.padEnd(6)} │ ${i.activity}\n${' '.repeat(9)}PIC: ${i.pic}${i.notes ? `\n${' '.repeat(9)}Catatan: ${i.notes}` : ''}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>📋 Rundown Hari-H</h3>
        <button onClick={exportText} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>
          <Download size={13} /> Salin Teks
        </button>
        <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', borderRadius: 8, background: 'rgba(37,208,171,0.1)', border: '1px solid var(--color-mint)', color: 'var(--color-mint)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}>
          <Plus size={13} /> Tambah Item
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 150px 36px', gap: '0.5rem', padding: '0.375rem 0.625rem', background: 'var(--color-ground-1)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          {['Waktu', 'Kegiatan', 'PIC', 'Catatan', ''].map(h => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {items.map((item, idx) => (
          <motion.div key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 150px 36px', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0.625rem', background: 'var(--color-ground-1)', borderRadius: 8, border: `1px solid ${editId === item.id ? 'var(--color-mint)' : 'var(--color-border)'}`, cursor: 'pointer' }}
            onClick={() => setEditId(editId === item.id ? null : item.id)}
          >
            <input value={item.time} onChange={e => update(item.id, 'time', e.target.value)} onClick={e => e.stopPropagation()} placeholder="08:00"
              style={{ width: '100%', padding: '0.25rem 0.4rem', background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', borderRadius: 5, color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace' }} />
            <input value={item.activity} onChange={e => update(item.id, 'activity', e.target.value)} onClick={e => e.stopPropagation()} placeholder="Nama kegiatan"
              style={{ width: '100%', padding: '0.25rem 0.4rem', background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: 600 }} />
            <input value={item.pic} onChange={e => update(item.id, 'pic', e.target.value)} onClick={e => e.stopPropagation()} placeholder="PIC"
              style={{ width: '100%', padding: '0.25rem 0.4rem', background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--color-text-secondary)', fontSize: '0.78rem' }} />
            <input value={item.notes} onChange={e => update(item.id, 'notes', e.target.value)} onClick={e => e.stopPropagation()} placeholder="Catatan..."
              style={{ width: '100%', padding: '0.25rem 0.4rem', background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--color-text-muted)', fontSize: '0.75rem' }} />
            <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '0.2rem' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FF6369'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab 3: Konfirmasi & Vendor ──────────────────────────── */
function ConfirmTab({ currentEvent }: { currentEvent: EventData }) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<OsmPlace[]>([]);
  const [confirmStatuses, setConfirmStatuses] = useState<Record<string, 'confirmed' | 'pending' | 'cancelled'>>({});

  const toggleStatus = (id: string) => {
    setConfirmStatuses(prev => {
      const next = { confirmed: 'pending', pending: 'cancelled', cancelled: 'confirmed' } as const;
      return { ...prev, [id]: next[prev[id] || 'pending'] };
    });
  };

  const statusColor = { confirmed: '#25D0AB', pending: '#FBBF24', cancelled: '#FF6369' };
  const statusLabel = { confirmed: '✅ Konfirmasi', pending: '⏳ Pending', cancelled: '❌ Batal' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>✅ Konfirmasi Venue & Vendor</h3>
        <button onClick={() => setShowSearch(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', borderRadius: 8, background: showSearch ? 'rgba(124,106,245,0.1)' : 'rgba(37,208,171,0.1)', border: `1px solid ${showSearch ? '#7C6AF5' : 'var(--color-mint)'}`, color: showSearch ? '#7C6AF5' : 'var(--color-mint)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}>
          {showSearch ? <><X size={13} /> Tutup Peta</> : <><MapPin size={13} /> Cari Venue/Vendor</>}
        </button>
      </div>

      {/* Search panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem' }}>
              <VenuePickerMap
                initialAddress={currentEvent.venue}
                onResultsFetched={setSearchResults}
                mapHeight={280}
                showCategoryButtons
              />
              {searchResults.length > 0 && (
                <div style={{ marginTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflow: 'auto' }}>
                  {searchResults.slice(0, 5).map((p, i) => (
                    <PlaceActionCard key={p.id} place={p} eventContext={{ name: currentEvent.name, type: currentEvent.type, date: currentEvent.timeline, participants: currentEvent.participants }} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing contacts */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Venue card */}
        {currentEvent.venue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <Building2 size={16} color="#7C6AF5" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{currentEvent.venue}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0' }}>Venue utama</p>
            </div>
            <button onClick={() => toggleStatus('venue-main')}
              style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 20, border: `1px solid ${statusColor[confirmStatuses['venue-main'] || 'pending']}40`, background: `${statusColor[confirmStatuses['venue-main'] || 'pending']}10`, color: statusColor[confirmStatuses['venue-main'] || 'pending'], cursor: 'pointer' }}>
              {statusLabel[confirmStatuses['venue-main'] || 'pending']}
            </button>
          </div>
        )}

        {/* External contacts */}
        {(currentEvent.externalContacts || []).map((c: import('@/store/eventStore').ExternalContact) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-ground-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              {c.category === 'venue' ? '🏛️' : c.category === 'sponsor' ? '💰' : c.category === 'speaker' ? '🎤' : c.category === 'vendor' ? '📦' : '📋'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{c.name}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.1rem 0 0', textTransform: 'capitalize' }}>{c.category}{c.whatsapp ? ` · ${c.whatsapp}` : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {c.whatsapp && (
                <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', textDecoration: 'none' }}>WA</a>
              )}
              <button onClick={() => toggleStatus(c.id)}
                style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 20, border: `1px solid ${statusColor[confirmStatuses[c.id] || 'pending']}40`, background: `${statusColor[confirmStatuses[c.id] || 'pending']}10`, color: statusColor[confirmStatuses[c.id] || 'pending'], cursor: 'pointer' }}>
                {statusLabel[confirmStatuses[c.id] || 'pending']}
              </button>
            </div>
          </div>
        ))}

        {(!currentEvent.venue && (!currentEvent.externalContacts || currentEvent.externalContacts.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 12 }}>
            <MapPin size={28} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>Belum ada kontak vendor</p>
            <p style={{ fontSize: '0.8rem' }}>Klik "Cari Venue/Vendor" untuk menemukan dan menyimpan kontak dari peta.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab 4: Progress & Analytics ───────────────────────────── */
function BudgetTrackerSection() {
  const budgetTracker = useEventStore(s => s.currentEvent?.budgetTracker);
  const updateBudgetItem = useEventStore(s => s.updateBudgetItem);
  const addBudgetItem = useEventStore(s => s.addBudgetItem);
  const initBudgetTracker = useEventStore(s => s.initBudgetTracker);

  if (!budgetTracker || budgetTracker.items.length === 0) {
    return (
      <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
        <DollarSign size={24} style={{ opacity: 0.3, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>Belum ada budget tracker</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Generate Budget Sheet dari task kategori "Budget" di AI Assist untuk auto-populate</p>
      </div>
    );
  }

  const { items, totalEstimated, totalActual, contingencyPercent } = budgetTracker;
  const variance = totalActual - totalEstimated;
  const variancePct = totalEstimated > 0 ? Math.round((variance / totalEstimated) * 100) : 0;
  const spentPct = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { estimated: 0, actual: 0, items: [] };
    acc[item.category].estimated += item.estimated;
    acc[item.category].actual += item.actual;
    acc[item.category].items.push(item);
    return acc;
  }, {} as Record<string, { estimated: number; actual: number; items: typeof items }>);

  const formatRp = (n: number) => {
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
    return `Rp ${n.toLocaleString('id-ID')}`;
  };

  return (
    <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <DollarSign size={14} color="#22c55e" /> Budget Tracker
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Est: <strong style={{ color: 'var(--color-text-primary)' }}>{formatRp(totalEstimated)}</strong></span>
          <span style={{ color: 'var(--color-text-muted)' }}>Actual: <strong style={{ color: totalActual > totalEstimated ? '#FF6369' : '#25D0AB' }}>{formatRp(totalActual)}</strong></span>
          <span style={{
            fontWeight: 700,
            color: variancePct > 10 ? '#FF6369' : variancePct > 0 ? '#FBBF24' : '#25D0AB',
          }}>
            {variancePct > 0 ? '+' : ''}{variancePct}%
          </span>
        </div>
      </div>

      {/* Overall bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '0.2rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Spent ({spentPct}%)</span>
          <span style={{ color: 'var(--color-text-muted)' }}>Remaining: {formatRp(Math.max(0, totalEstimated - totalActual))}</span>
        </div>
        <div style={{ height: 8, background: 'var(--color-ground-2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(spentPct, 100)}%`,
            background: spentPct > 90 ? '#FF6369' : spentPct > 70 ? '#FBBF24' : '#25D0AB',
            borderRadius: 4, transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Per-category breakdown */}
      {Object.entries(grouped).map(([cat, data]) => {
        const catPct = totalEstimated > 0 ? Math.round((data.estimated / totalEstimated) * 100) : 0;
        const catSpentPct = data.estimated > 0 ? Math.round((data.actual / data.estimated) * 100) : 0;
        return (
          <div key={cat}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{cat} ({catPct}%)</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{formatRp(data.estimated)}</span>
            </div>
            <div style={{ height: 5, background: 'var(--color-ground-2)', borderRadius: 2.5 }}>
              <div style={{ height: '100%', width: `${Math.min(catSpentPct, 100)}%`, background: catSpentPct > 90 ? '#FF6369' : catSpentPct > 70 ? '#FBBF24' : '#25D0AB', borderRadius: 2.5, transition: 'width 0.5s ease' }} />
            </div>
            {/* Expandable items */}
            {data.items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.68rem' }}>
                <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{item.name}</span>
                <span style={{ color: 'var(--color-text-muted)', width: 70, textAlign: 'right' }}>{formatRp(item.estimated)}</span>
                <input
                  type="number"
                  value={item.actual || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    updateBudgetItem(item.id, { actual: val, status: val > item.estimated ? 'over-budget' : val > 0 ? 'paid' : 'pending' });
                  }}
                  placeholder="0"
                  style={{
                    width: 70, padding: '0.15rem 0.3rem', background: 'var(--color-ground-2)',
                    border: `1px solid ${item.actual > item.estimated ? '#FF6369' : item.actual > 0 ? '#25D0AB' : 'var(--color-border)'}`,
                    borderRadius: 4, color: 'var(--color-text-primary)', fontSize: '0.68rem', textAlign: 'right',
                    outline: 'none',
                  }}
                />
                <span style={{
                  fontSize: '0.6rem', width: 50, textAlign: 'right',
                  color: item.status === 'over-budget' ? '#FF6369' : item.status === 'paid' ? '#25D0AB' : 'var(--color-text-muted)',
                  fontWeight: 600,
                }}>
                  {item.status === 'over-budget' ? 'OVER' : item.status === 'paid' ? 'OK' : '-'}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ProgressTab({ divisions, timeline, risks }: { divisions: Division[]; timeline?: string; risks?: Array<{ id: string; scenario: string; severity: string; mitigation: string }> }) {
  const allTasks = divisions.flatMap(d => d.tasks.map(t => ({ ...t, divName: d.name, divColor: d.color })));
  const done = allTasks.filter(t => t.status === 'done').length;
  const total = allTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const days = daysUntil(timeline);

  const aiResolved = allTasks.filter(t => t.resolveMethod === 'ai-auto' || t.resolveMethod === 'ai-manual').length;
  const hasCategory = allTasks.filter(t => t.category && t.category !== 'internal').length;
  const hasSourcing = allTasks.filter(t => t.sourcingResults).length;
  const needsApproval = allTasks.filter(t => t.needsApproval).length;
  const avgConfidence = allTasks.filter(t => t.confidenceScore != null).reduce((a, t) => a + (t.confidenceScore || 0), 0) / Math.max(1, allTasks.filter(t => t.confidenceScore != null).length);

  // Category distribution
  interface CategoryBucket { name: string; value: number; color: string }
  const catMap = new Map<string, CategoryBucket>();
  allTasks.filter(t => t.category).forEach(t => {
    const label = CATEGORY_LABELS[t.category!];
    if (!catMap.has(label)) catMap.set(label, { name: label, value: 0, color: CATEGORY_COLORS[t.category!] });
    catMap.get(label)!.value++;
  });
  const catPieData = Array.from(catMap.values()).sort((a, b) => b.value - a.value);

  // AI Coverage per division
  const divAiCoverage = divisions.map(div => {
    const divTasks = allTasks.filter(t => t.divisionId === div.id);
    const aiCount = divTasks.filter(t => t.resolveMethod === 'ai-auto' || t.resolveMethod === 'ai-manual').length;
    return { name: div.name, aiPct: divTasks.length > 0 ? Math.round((aiCount / divTasks.length) * 100) : 0, color: div.color };
  });

  // Estimated API cost (rough)
  const totalApiCalls = aiResolved + (allTasks.filter(t => t.category && t.category !== 'internal').length);
  const estimatedCost = (totalApiCalls * 0.003).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Countdown + overall */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div style={{ padding: '1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>H-Event</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: days !== null && days <= 7 ? '#FF6369' : days !== null && days <= 30 ? '#FBBF24' : '#25D0AB', lineHeight: 1 }}>
            {days !== null ? (days >= 0 ? `H-${days}` : `H+${Math.abs(days)}`) : '—'}
          </p>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Progress</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: pct >= 80 ? '#25D0AB' : pct >= 50 ? '#FBBF24' : '#FF6369', lineHeight: 1 }}>{pct}%</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{done}/{total} tasks</p>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>AI Coverage</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C6AF5', lineHeight: 1 }}>{total > 0 ? Math.round((aiResolved / total) * 100) : 0}%</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{aiResolved} AI-resolved</p>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Avg Confidence</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: avgConfidence >= 70 ? '#25D0AB' : avgConfidence >= 40 ? '#FBBF24' : '#FF6369', lineHeight: 1 }}>{avgConfidence ? Math.round(avgConfidence) : '—'}%</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>~${estimatedCost} API cost</p>
        </div>
      </div>

      {/* Category Distribution + AI Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Pie */}
        {catPieData.length > 0 && (
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={14} color="#7C6AF5" /> Task Categories
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                      {catPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value} tasks`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                {catPieData.slice(0, 6).map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text-primary)', flex: 1 }}>{c.name}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Coverage per Division */}
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Brain size={14} color="#7C6AF5" /> AI Coverage per Divisi
          </p>
          {divAiCoverage.map(d => (
            <div key={d.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: 'var(--color-text-primary)' }}>{d.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: d.aiPct > 0 ? '#7C6AF5' : 'var(--color-text-muted)' }}>{d.aiPct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-ground-2)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${d.aiPct}%`, background: d.aiPct > 0 ? '#7C6AF5' : 'transparent', borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confidence Spectrum (heatmap bar) */}
      {allTasks.filter(t => t.confidenceScore != null).length > 0 && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={14} color="#FBBF24" /> AI Confidence Distribution
          </p>
          <div style={{ display: 'flex', gap: '0.25rem', height: 32, borderRadius: 6, overflow: 'hidden' }}>
            {allTasks.filter(t => t.confidenceScore != null).sort((a, b) => (a.confidenceScore || 0) - (b.confidenceScore || 0)).map((t, i) => (
              <div key={i}
                title={`${t.title}: ${t.confidenceScore}%`}
                style={{
                  flex: 1, minWidth: 3,
                  background: (t.confidenceScore || 0) >= 70 ? '#25D0AB' : (t.confidenceScore || 0) >= 40 ? '#FBBF24' : '#FF6369',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
            <span>Low (0-39%)</span>
            <span>Medium (40-69%)</span>
            <span>High (70-100%)</span>
          </div>
        </div>
      )}

      {/* Approval Queue */}
      {needsApproval > 0 && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={14} /> Approval Queue ({needsApproval})
          </p>
          {allTasks.filter(t => t.needsApproval).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: 'var(--color-ground-2)', borderRadius: 6, fontSize: '0.78rem' }}>
              <AlertTriangle size={11} color="#FBBF24" />
              <span style={{ color: 'var(--color-text-primary)', flex: 1 }}>{t.title}</span>
              {t.category && (
                <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 10, background: `${CATEGORY_COLORS[t.category]}18`, color: CATEGORY_COLORS[t.category], fontWeight: 600 }}>
                  {CATEGORY_LABELS[t.category]}
                </span>
              )}
              <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>{t.divName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sourcing Coverage */}
      <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={14} color="#25D0AB" /> Sourcing & Intel Coverage
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8 }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7C6AF5', marginBottom: '0.1rem' }}>{hasCategory}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Categorized</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8 }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#25D0AB', marginBottom: '0.1rem' }}>{hasSourcing}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>With Web Intel</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8 }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FBBF24', marginBottom: '0.1rem' }}>{needsApproval}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Needs Approval</p>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--color-ground-2)', borderRadius: 8 }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00ADB5', marginBottom: '0.1rem' }}>~${estimatedCost}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Est. API Cost</p>
          </div>
        </div>
      </div>

      {/* ── Budget Tracker ────────────────────────────── */}
      <BudgetTrackerSection />

      {/* Per-division progress */}
      <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Progress per Divisi</p>
        {divisions.map(div => {
          const dPct = div.tasks.length > 0 ? Math.round((div.tasks.filter(t => t.status === 'done').length / div.tasks.length) * 100) : 0;
          return (
            <div key={div.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: div.color || 'var(--color-mint)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{div.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>PIC: {div.pic}</span>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: div.color || 'var(--color-mint)' }}>{dPct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--color-ground-2)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${dPct}%`, background: div.color || 'var(--color-mint)', borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
        {divisions.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Belum ada divisi dari master plan.</p>}
      </div>

      {/* Risks */}
      {risks && risks.length > 0 && (
        <div style={{ background: 'var(--color-ground-1)', border: '1px solid rgba(255,99,105,0.2)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FF6369', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={14} /> Risiko Perlu Diwaspadai</p>
          {risks.filter(r => r.severity === 'critical' || r.severity === 'high').map(r => (
            <div key={r.id} style={{ display: 'flex', gap: '0.625rem', padding: '0.625rem', background: 'var(--color-ground-2)', borderRadius: 8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: r.severity === 'critical' ? '#FF6369' : '#FBBF24', whiteSpace: 'nowrap', marginTop: 2 }}>{r.severity}</span>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)', margin: 0 }}>{r.scenario}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>💡 {r.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Execution Page ─────────────────────────────────── */
export default function ExecutionPage() {
  const { currentEvent, updateEventStage, saveCurrentEvent, updateTaskResolution, updateMasterPlan, classifyAllTasks: storeClassify } = useEventStore();
  const { lang } = useLangStore();
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assistingTask, setAssistingTask] = useState<Task | null>(null);
  const [batchResolving, setBatchResolving] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<Array<{ taskId: string; taskTitle: string; success: boolean }> | null>(null);
  const [showBatchResults, setShowBatchResults] = useState(false);

  const [liveTimelineItems, setLiveTimelineItems] = useState<LiveTimelineItem[]>([]);

  // Update task status in store
  const updateTaskStatus = useCallback((divId: string, taskId: string, status: Task['status']) => {
    if (!currentEvent?.masterPlan) return;
    // We update through local mutation reflected by Zustand
    const masterPlan = currentEvent.masterPlan;
    const div = masterPlan.divisions.find(d => d.id === divId);
    if (!div) return;
    const task = div.tasks.find(t => t.id === taskId);
    if (task) task.status = status;
    // Trigger Zustand re-render by updating masterPlan
    useEventStore.getState().updateMasterPlan({ ...masterPlan });
  }, [currentEvent]);

  const divisions = currentEvent?.masterPlan?.divisions || [];
  const allTasks = divisions.flatMap(d => d.tasks);
  const doneTasks = allTasks.filter(t => t.status === 'done').length;
  const completionPct = allTasks.length > 0 ? Math.round((doneTasks / allTasks.length) * 100) : 0;

  const handleVoiceCommand = useCallback(async (text: string) => {
    try {
      const res = await apiFetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventData: currentEvent,
          question: text,
          context: `Active tab: ${activeTab}. ${allTasks.length} tasks, ${doneTasks} done.`,
          lang: 'id',
        }),
      });
      const data = await res.json();
      if (data.reply) alert(data.reply);
    } catch { /* non-blocking */ }
  }, [currentEvent, activeTab, allTasks.length, doneTasks]);

  useEffect(() => {
    if (divisions.length > 0 && liveTimelineItems.length === 0) {
      const items: LiveTimelineItem[] = divisions.flatMap(d =>
        d.tasks.filter(t => t.status !== 'done').slice(0, 2).map(t => ({
          time: t.deadline || '09:00',
          activity: t.title,
          pic: d.pic,
          duration: 30,
          status: 'pending' as const,
        }))
      );
      if (items.length > 0) setLiveTimelineItems(items);
    }
  }, [divisions, liveTimelineItems.length]);

  const pendingTasks = allTasks.filter(t => t.status === 'pending');
  const hasSourcingData = allTasks.filter(t => t.sourcingResults || t.category);
  const categorizedTasks = allTasks.filter(t => t.category && t.category !== 'internal');

  const handleBatchResolve = useCallback(async () => {
    if (pendingTasks.length === 0) return;
    setBatchResolving(true);
    setBatchProgress({ done: 0, total: pendingTasks.length });
    setBatchResults(null);

    try {
      const tasksToSend = pendingTasks.map(t => ({
        id: t.id, title: t.title, description: t.description,
        deadline: t.deadline, priority: t.priority,
        divisionId: t.divisionId, divisionName: divisions.find(d => d.id === t.divisionId)?.name,
      }));

      const res = await apiFetch('/api/ai/resolve-all-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToSend, eventData: currentEvent }),
      });

      const data = await res.json();
      const results = data.results || [];

      const updates = results.filter((r: any) => r.success && r.resolution).map((r: any) => {
        const t = pendingTasks.find(t => t.id === r.taskId);
        const reso = r.resolution;
        let notes = `**Kategori:** ${reso.category || 'internal'} | **Confidence:** ${reso.confidenceScore || 0}%\n\n`;
        notes += `**Sourcing Intel:**\n${reso.sourcingSummary}\n\n`;
        if (reso.negotiationTip) notes += `**Tips Negosiasi:** ${reso.negotiationTip}\n\n`;
        notes += `**Langkah Eksekusi:**\n`;
        (reso.steps || []).forEach((s: string, i: number) => { notes += `${i + 1}. ${s}\n`; });
        if (reso.draftMessage) notes += `\n**Draft Pesan:**\n${reso.draftMessage}`;
        if (reso.recommendations?.length) {
          notes += `\n\n**Rekomendasi (${reso.category}):**\n`;
          reso.recommendations.forEach((rec: any, i: number) => {
            notes += `${i + 1}. ${rec.name} — ${rec.address} (${rec.rating})${rec.estimatedCost ? ' | Estimasi: ' + rec.estimatedCost : ''}\n   ${rec.reasoning}\n`;
          });
        }

        const sourcingResults = reso.recommendations?.length ? {
          recommendations: reso.recommendations,
          draftMessage: reso.draftMessage || '',
          sourceUrls: reso.recommendations.map((r: any) => r.sourceUrl).filter(Boolean),
          estimatedCost: reso.estimatedCost || reso.recommendations[0]?.estimatedCost || '',
        } : undefined;

        return {
          taskId: r.taskId, notes,
          category: reso.category,
          sourcingResults,
          confidenceScore: reso.confidenceScore,
          resolveMethod: 'ai-auto' as const,
        };
      });

      useEventStore.getState().batchUpdateTasks(updates);
      saveCurrentEvent();

      const stats = results.map((r: any) => ({
        taskId: r.taskId,
        taskTitle: tasksToSend.find(t => t.id === r.taskId)?.title || 'Unknown',
        success: r.success,
      }));

      setBatchResults(stats);
      setShowBatchResults(true);
      setBatchProgress({ done: results.filter((r: any) => r.success).length, total: pendingTasks.length });
    } catch (err: any) {
      setBatchResults([{ taskId: '', taskTitle: 'Error', success: false }]);
    } finally {
      setBatchResolving(false);
    }
  }, [pendingTasks, currentEvent, divisions, saveCurrentEvent]);

  const [autoPilotRunning, setAutoPilotRunning] = useState(false);
  const [autoPilotResults, setAutoPilotResults] = useState<Array<{ taskId: string; taskTitle: string; autoResolved: boolean; needsApproval: boolean; reason: string }> | null>(null);
  const [showAutoPilotResults, setShowAutoPilotResults] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [revising, setRevising] = useState(false);

  const autoClassifyTasks = useCallback(async () => {
    if (!currentEvent?.masterPlan) return;
    const allTasks = currentEvent.masterPlan.divisions.flatMap(d =>
      d.tasks.map(t => ({ id: t.id, title: t.title, description: t.description }))
    );
    if (!allTasks.length) return;

    setClassifying(true);
    try {
      const res = await apiFetch('/api/ai/classify-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: allTasks, eventData: currentEvent }),
      });
      if (res.ok) {
        const { classifications } = await res.json();
        storeClassify(classifications);
      }
    } catch { /* non-blocking */ } finally {
      setClassifying(false);
    }
  }, [currentEvent, storeClassify]);

  const handleRevisePlan = useCallback(async () => {
    if (!currentEvent?.masterPlan) return;
    const description = window.prompt(
      'Jelaskan perubahan besar yang memerlukan re-sync plan:',
      `Venue: ${currentEvent.venue} | Timeline: ${currentEvent.timeline}`
    );
    if (!description?.trim()) return;

    setRevising(true);
    try {
      const res = await apiFetch('/api/ai/revise-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPlan: currentEvent.masterPlan,
          eventData: currentEvent,
          delta: { description, changes: { venue: currentEvent.venue, timeline: currentEvent.timeline, budget: currentEvent.budget } },
          lang,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const { revisedMasterPlan } = await res.json();
      updateMasterPlan(revisedMasterPlan);
      saveCurrentEvent();
      await autoClassifyTasks();
      alert('Master plan berhasil di-sync ulang oleh AI.');
    } catch {
      alert('Gagal re-sync plan. Periksa koneksi atau API key.');
    } finally {
      setRevising(false);
    }
  }, [currentEvent, lang, updateMasterPlan, saveCurrentEvent, autoClassifyTasks]);

  const handleAutoPilot = useCallback(async () => {
    if (pendingTasks.length === 0) return;
    setAutoPilotRunning(true);
    setAutoPilotResults(null);

    try {
      const tasksToSend = pendingTasks.map(t => ({
        id: t.id, title: t.title, description: t.description,
        deadline: t.deadline, priority: t.priority,
        divisionId: t.divisionId, divisionName: divisions.find(d => d.id === t.divisionId)?.name,
        category: t.category,
      }));

      const res = await apiFetch('/api/ai/auto-resolve-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToSend, eventData: currentEvent }),
      });

      const data = await res.json();
      const results = data.results || [];

      // Apply auto-resolved tasks to store
      const storeUpdates = results
        .filter((r: any) => r.resolution)
        .map((r: any) => {
          const reso = r.resolution;
          let notes = `**Kategori:** ${r.category || 'internal'} | **Confidence:** ${reso.confidenceScore || 0}%\n\n`;
          notes += `**Sourcing Intel:**\n${reso.sourcingSummary}\n\n`;
          if (reso.negotiationTip) notes += `**Tips Negosiasi:** ${reso.negotiationTip}\n\n`;
          if (r.autoResolved) {
            notes += `**Langkah Eksekusi (Auto):**\n`;
            (reso.steps || []).forEach((s: string, i: number) => { notes += `${i + 1}. ${s}\n`; });
          }
          if (reso.draftMessage) notes += `\n**Draft Pesan:**\n${reso.draftMessage}`;
          if (reso.recommendations?.length) {
            notes += `\n\n**Rekomendasi (${r.category}):**\n`;
            reso.recommendations.forEach((rec: any, i: number) => {
              notes += `${i + 1}. ${rec.name} — ${rec.address} (${rec.rating})${rec.estimatedCost ? ' | Estimasi: ' + rec.estimatedCost : ''}\n`;
            });
          }

          const sourcingResults = reso.recommendations?.length ? {
            recommendations: reso.recommendations,
            draftMessage: reso.draftMessage || '',
            sourceUrls: reso.recommendations.map((rec: any) => rec.sourceUrl).filter(Boolean),
            estimatedCost: reso.estimatedCost || reso.recommendations[0]?.estimatedCost || '',
          } : undefined;

          return {
            taskId: r.taskId, notes,
            category: r.category,
            sourcingResults,
            confidenceScore: reso.confidenceScore,
            needsApproval: r.needsApproval || false,
            resolveMethod: 'ai-auto' as const,
          };
        });

      useEventStore.getState().applyAutoResolve(storeUpdates);
      saveCurrentEvent();

      const stats = results.map((r: any) => ({
        taskId: r.taskId,
        taskTitle: tasksToSend.find(t => t.id === r.taskId)?.title || 'Unknown',
        autoResolved: r.autoResolved,
        needsApproval: r.needsApproval,
        reason: r.reason,
      }));

      setAutoPilotResults(stats);
      setShowAutoPilotResults(true);
    } catch {
      setAutoPilotResults([{ taskId: '', taskTitle: 'Error', autoResolved: false, needsApproval: false, reason: 'Pipeline failed' }]);
    } finally {
      setAutoPilotRunning(false);
    }
  }, [pendingTasks, currentEvent, divisions, saveCurrentEvent]);

  useEffect(() => {
    if (currentEvent && currentEvent.stage !== 'execution') {
      updateEventStage('execution');
    }
  }, [currentEvent?.id, updateEventStage]);

  useEffect(() => {
    if (!currentEvent?.masterPlan) return;
    const uncategorized = currentEvent.masterPlan.divisions.flatMap(d => d.tasks).some(t => !t.category);
    if (uncategorized && !classifying) autoClassifyTasks();
  }, [currentEvent?.id, currentEvent?.masterPlan?.divisions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Event tidak ditemukan.</p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: typeof KanbanSquare; color: string }[] = [
    { id: 'tasks',    label: '📋 Task Board',       icon: KanbanSquare, color: 'var(--color-mint)' },
    { id: 'rundown',  label: '📅 Rundown Builder',  icon: Calendar,     color: '#FBBF24' },
    { id: 'confirm',  label: '✅ Konfirmasi',       icon: CheckSquare,  color: '#7C6AF5' },
    { id: 'comms',    label: '💬 Comms',            icon: MessageCircle, color: '#25D366' },
    { id: 'progress', label: '📊 Progress',         icon: BarChart2,    color: '#00ADB5' },
  ];

  const divisionStats = divisions.map(d => ({
    name: d.name, taskCount: d.tasks.length,
    doneCount: d.tasks.filter(t => t.status === 'done').length,
  }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
              <Target size={20} color="var(--color-stage-live, #55B467)" />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Execution Command Center</h1>
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.6rem', borderRadius: 20, background: 'rgba(85,180,103,0.1)', border: '1px solid rgba(85,180,103,0.25)', color: '#55B467', fontWeight: 700 }}>{completionPct}% done</span>
              <VoiceCopilot onVoiceCommand={handleVoiceCommand} />
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{currentEvent.name} · {currentEvent.type} · {allTasks.length} tasks</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {!currentEvent.masterPlan && (
              <button onClick={() => router.push(`/workspace/${params.id}/master-plan`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#FBBF24', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                <Zap size={13} /> Generate Master Plan Dulu
              </button>
            )}
            <button
              onClick={() => router.push(`/workspace/${params.id}/live`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 8,
                background: 'rgba(255,99,105,0.1)', border: '1px solid rgba(255,99,105,0.35)', color: 'var(--color-red)',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Radio size={13} />
              Open Mission Control
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ── AI Task Overview ────────────────────────────── */}
        {allTasks.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem',
            marginBottom: '0.875rem',
          }}>
            <div style={{ padding: '0.625rem 0.75rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={14} color="#7C6AF5" />
              <div>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>AI Resolved</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#7C6AF5', margin: 0 }}>
                  {allTasks.filter(t => t.resolveMethod === 'ai-auto' || t.resolveMethod === 'ai-manual').length}
                  <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> / {allTasks.length}</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '0.625rem 0.75rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={14} color="#FBBF24" />
              <div>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>Categorized</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FBBF24', margin: 0 }}>
                  {categorizedTasks.length}
                  <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> tasks</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '0.625rem 0.75rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} color="#25D0AB" />
              <div>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>Sourcing Intel</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25D0AB', margin: 0 }}>
                  {hasSourcingData.length}
                  <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> with data</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '0.625rem 0.75rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={14} color="#00ADB5" />
              <div>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>Pending</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: pendingTasks.length > 0 ? '#FBBF24' : '#25D0AB', margin: 0 }}>
                  {pendingTasks.length}
                  <span style={{ fontSize: '0.6rem', fontWeight: 400, color: 'var(--color-text-muted)' }}> need action</span>
                </p>
              </div>
            </div>
            {/* Batch resolve button */}
            {pendingTasks.length > 0 && (
              <button
                onClick={handleBatchResolve}
                disabled={batchResolving}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: 8, cursor: batchResolving ? 'not-allowed' : 'pointer',
                  background: batchResolving ? 'rgba(124,106,245,0.05)' : 'rgba(124,106,245,0.1)',
                  border: '1px solid rgba(124,106,245,0.3)', color: '#7C6AF5',
                  fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem',
                  opacity: batchResolving ? 0.7 : 1,
                }}
              >
                {batchResolving ? (
                  <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Processing {batchProgress.done}/{batchProgress.total}...</>
                ) : (
                  <><Sparkles size={13} /> Resolve {pendingTasks.length} Tasks</>
                )}
              </button>
            )}
            <button
              onClick={autoClassifyTasks}
              disabled={classifying}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: 8, cursor: classifying ? 'not-allowed' : 'pointer',
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: '#FBBF24',
                fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem',
                opacity: classifying ? 0.7 : 1,
              }}
            >
              {classifying ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
              {classifying ? 'Classifying...' : 'Classify'}
            </button>
            <button
              onClick={handleRevisePlan}
              disabled={revising}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: 8, cursor: revising ? 'not-allowed' : 'pointer',
                background: 'rgba(0,173,181,0.08)', border: '1px solid rgba(0,173,181,0.3)', color: '#00ADB5',
                fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem',
                opacity: revising ? 0.7 : 1,
              }}
            >
              {revising ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
              {revising ? 'Re-syncing...' : 'AI Re-sync Plan'}
            </button>
            {/* Auto-Pilot button */}
            {pendingTasks.length > 0 && (
              <button
                onClick={handleAutoPilot}
                disabled={autoPilotRunning}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: 8, cursor: autoPilotRunning ? 'not-allowed' : 'pointer',
                  background: autoPilotRunning ? 'rgba(37,208,171,0.05)' : 'rgba(37,208,171,0.1)',
                  border: '1px solid rgba(37,208,171,0.3)', color: '#25D0AB',
                  fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem',
                  opacity: autoPilotRunning ? 0.7 : 1,
                }}
              >
                {autoPilotRunning ? (
                  <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Auto-Pilot running...</>
                ) : (
                  <><Zap size={13} /> Auto-Pilot</>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Batch Results Popup ────────────────────────── */}
        <AnimatePresence>
          {showBatchResults && batchResults && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ marginBottom: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                {batchResults.filter(r => r.success).length}/{batchResults.length} tasks resolved ✨
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flex: 1 }}>
                {batchResults.filter(r => r.success).map(r => r.taskTitle).join(', ')}
              </span>
              <button onClick={() => setShowBatchResults(false)}
                style={{ padding: '0.25rem 0.5rem', borderRadius: 5, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}>
                OK
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Auto-Pilot Results Popup ────────────────────── */}
        <AnimatePresence>
          {showAutoPilotResults && autoPilotResults && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ marginBottom: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Zap size={14} color="#25D0AB" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)', flex: 1 }}>
                  Auto-Pilot Complete: {autoPilotResults.filter(r => r.autoResolved).length} auto-resolved, {autoPilotResults.filter(r => r.needsApproval).length} need approval
                </span>
                <button onClick={() => setShowAutoPilotResults(false)}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: 5, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}>
                  OK
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 150, overflow: 'auto' }}>
                {autoPilotResults.filter(r => r.taskId).map(r => (
                  <div key={r.taskId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem' }}>
                    {r.autoResolved ? (
                      <CheckCircle2 size={12} color="#25D0AB" />
                    ) : r.needsApproval ? (
                      <AlertTriangle size={12} color="#FBBF24" />
                    ) : (
                      <X size={12} color="#FF6369" />
                    )}
                    <span style={{ color: 'var(--color-text-primary)', flex: 1 }}>{r.taskTitle}</span>
                    <span style={{
                      fontSize: '0.65rem', padding: '0.08rem 0.4rem', borderRadius: 10,
                      background: r.autoResolved ? 'rgba(37,208,171,0.1)' : r.needsApproval ? 'rgba(251,191,36,0.1)' : 'rgba(255,99,105,0.1)',
                      color: r.autoResolved ? '#25D0AB' : r.needsApproval ? '#FBBF24' : '#FF6369',
                      fontWeight: 600,
                    }}>
                      {r.autoResolved ? 'Auto ✓' : r.needsApproval ? 'Approval' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar */}
        <div className="flex flex-wrap md:flex-nowrap gap-1 p-1 bg-[var(--color-ground-1)] rounded-[10px] border border-[var(--color-border)]">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem 0.5rem', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 600, background: isActive ? `${tab.color}18` : 'transparent', color: isActive ? tab.color : 'var(--color-text-muted)', outline: isActive ? `1px solid ${tab.color}30` : 'none' }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body: Tab content + AI chat panel ────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-ground-0)' }}>
        {/* Main content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'tasks' && (
              <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                <TaskBoard divisions={divisions} selectedTaskId={selectedTask?.id} onTaskSelect={setSelectedTask} onUpdateStatus={updateTaskStatus} onAssistClick={setAssistingTask} />
              </motion.div>
            )}
            {activeTab === 'rundown' && (
              <motion.div key="rundown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <RundownBuilder divisions={divisions} />
                {liveTimelineItems.length > 0 && (
                  <LiveTimelineAdjuster
                    items={liveTimelineItems}
                    onUpdateItem={(idx, updates) => {
                      setLiveTimelineItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
                    }}
                    onShiftTimeline={(minutes) => {/* future: integrate with DAG engine delay propagation */}}
                  />
                )}
              </motion.div>
            )}
            {activeTab === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                <ConfirmTab currentEvent={currentEvent} />
              </motion.div>
            )}
            {activeTab === 'comms' && (
              <motion.div key="comms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
                <CommsPanel event={currentEvent} />
              </motion.div>
            )}
            {activeTab === 'progress' && (
              <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProgressTab divisions={divisions} timeline={currentEvent.timeline} risks={currentEvent.masterPlan?.risks} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Chat Sidepanel */}
        <AIChatPanel
          eventName={currentEvent.name}
          eventType={currentEvent.type}
          venue={currentEvent.venue}
          timeline={currentEvent.timeline}
          participants={currentEvent.participants}
          budget={currentEvent.budget}
          activeTab={activeTab}
          completionPct={completionPct}
          pendingCount={allTasks.filter(t => t.status === 'pending').length}
          divisions={divisionStats}
          selectedTask={selectedTask?.title}
        />
      </div>

      {assistingTask && currentEvent && (
        <AiTaskAssistModal
          task={assistingTask}
          eventData={currentEvent}
          onClose={() => setAssistingTask(null)}
          onApply={(notes, attachments) => {
            updateTaskResolution(assistingTask.id, notes, attachments);
            setAssistingTask(null);
            saveCurrentEvent(); // ensure it saves after update
          }}
        />
      )}
    </div>
  );
}
