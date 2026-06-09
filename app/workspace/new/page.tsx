'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore, type OrganizerRole, type ContactPIC, type ExternalContact } from '@/store/eventStore';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';
import {
  ArrowLeft, ArrowRight, Calendar, Users, Building2, DollarSign,
  Target, UserCheck, Plus, Trash2, Crown, User,
  Sparkles, CheckCircle2, RotateCcw, Zap, BookOpen, Music, Trophy, Megaphone, Coffee, MapPin, X, Check, AlertCircle,
  Globe, TrendingUp, Loader2
} from 'lucide-react';
import DateRangePicker from '@/components/DateRangePicker';
import VenuePickerMap from '@/components/VenuePickerMap';
import type { OsmPlace } from '@/app/api/search/places/route';

// ── Display formatting helpers ──────────────────────────────────
const MONTH_NAMES_DISPLAY = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function formatTimelineDisplay(val: string): string {
  if (!val) return '';
  // Try ISO first
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const label = daysUntil > 0 ? `H-${daysUntil}` : daysUntil === 0 ? 'Hari ini' : 'Sudah lewat';
    return `${d.getDate()} ${MONTH_NAMES_DISPLAY[d.getMonth()]} ${d.getFullYear()} (${label})`;
  }
  return val;
}


// ── Quick-Start Templates ─────────────────────────────────────────
const QUICK_TEMPLATES = [
  {
    id: 'seminar',
    emoji: '🎓',
    icon: BookOpen,
    label: 'Seminar Kecil',
    desc: 'Workshop, talk, kuliah tamu',
    color: '#06b6d4',
    defaults: {
      type: 'Seminar/Conference',
      scale: 'small' as const,
      participants: 50,
      teamSize: 5,
      audience: 'Mahasiswa / profesional muda',
      goals: 'Menyelenggarakan seminar informatif yang terstruktur dan memberikan nilai tambah bagi peserta.',
    },
  },
  {
    id: 'meeting',
    emoji: '🤝',
    icon: Coffee,
    label: 'Rapat / Meeting',
    desc: 'Internal team, kurang 20 orang',
    color: '#10b981',
    defaults: {
      type: 'Corporate Meeting',
      scale: 'small' as const,
      participants: 15,
      teamSize: 2,
      audience: 'Tim internal organisasi',
      goals: 'Koordinasi tim yang efisien untuk pengambilan keputusan dan update progres.',
    },
  },
  {
    id: 'gathering',
    emoji: '🎉',
    icon: Users,
    label: 'Gathering',
    desc: 'Acara informal, sosial, komunitas',
    color: '#f59e0b',
    defaults: {
      type: 'Charity/Social Event',
      scale: 'medium' as const,
      participants: 80,
      teamSize: 10,
      audience: 'Anggota komunitas / organisasi',
      goals: 'Mempererat hubungan antar anggota dan menciptakan pengalaman bersama yang berkesan.',
    },
  },
  {
    id: 'competition',
    emoji: '🏆',
    icon: Trophy,
    label: 'Kompetisi',
    desc: 'Hackathon, lomba, turnamen',
    color: '#8b5cf6',
    defaults: {
      type: 'Hackathon',
      scale: 'medium' as const,
      participants: 120,
      teamSize: 15,
      audience: 'Peserta kompetisi dan juri',
      goals: 'Menyelenggarakan kompetisi yang fair, terorganisir, dan inspiratif bagi semua peserta.',
    },
  },
  {
    id: 'launch',
    emoji: '📢',
    icon: Megaphone,
    label: 'Peluncuran',
    desc: 'Product launch, demo day, press con',
    color: '#f43f5e',
    defaults: {
      type: 'Product Launch',
      scale: 'medium' as const,
      participants: 100,
      teamSize: 12,
      audience: 'Media, investor, dan publik',
      goals: 'Meluncurkan produk/inisiatif baru dengan dampak maksimal dan liputan yang luas.',
    },
  },
  {
    id: 'concert',
    emoji: '🎵',
    icon: Music,
    label: 'Festival / Konser',
    desc: 'Penampilan seni, music event',
    color: '#ec4899',
    defaults: {
      type: 'Music Festival',
      scale: 'large' as const,
      participants: 300,
      teamSize: 30,
      audience: 'Penonton umum dan penikmat seni',
      goals: 'Menyelenggarakan festival seni yang memukau dengan manajemen panggung dan penonton yang profesional.',
    },
  },
] as const;

interface FormData {
  name: string; type: string; audience: string; scale: string;
  participants: number; budget: string; timeline: string; venue: string;
  teamSize: number; goals: string; constraints: string;
}

type ViewMode = 'start' | 'wizard' | 'review' | 'ai-loading' | 'quick-name';

// ── Market Intelligence Brief types ───────────────────────────
interface MarketInsight {
  emoji: string;
  title: string;
  insight: string;
}
interface MarketBriefSource {
  title?: string;
  url: string;
  favicon?: string;
}
interface MarketBriefData {
  insights: MarketInsight[] | null;
  sources: MarketBriefSource[];
  fetchedAt: string;
}

// ── All valid event types (kept for manual wizard) ─────────────
const eventTypes = [
  'Seminar/Conference', 'Workshop', 'Music Festival', 'Campus Event',
  'Corporate Meeting', 'Product Launch', 'Hackathon', 'Charity/Social Event',
  'Sports Event', 'Exhibition', 'Award Ceremony', 'Webinar', 'Other (Manual)'
];

function StepBadge({ label, active, done, stepNum }: { label: string; active: boolean; done: boolean; stepNum?: number }) {
  const bg = active ? 'var(--accent-blue-dim)' : done ? 'var(--bg-elevated)' : 'transparent';
  const border = active ? 'var(--accent-blue)' : done ? 'var(--accent-green)' : 'var(--border)';
  const color = active ? 'var(--accent-blue)' : done ? 'var(--accent-green)' : 'var(--text-muted)';
  return (
    <motion.span
      initial={false}
      animate={{ scale: active ? 1.05 : 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.35rem 0.75rem', borderRadius: 20,
        border: `1px solid ${border}`, background: bg,
        fontSize: '0.75rem', fontWeight: 600, color,
        transition: 'border-color 0.3s, color 0.3s, background 0.3s',
      }}>
      {stepNum && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: '50%',
          background: active ? 'var(--accent-blue)' : done ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)',
          color: active || done ? '#000' : 'var(--text-muted)',
          fontSize: '0.65rem', fontWeight: 700,
        }}>
          {done ? <CheckCircle2 size={11} /> : stepNum}
        </span>
      )}
      {!stepNum && done && <CheckCircle2 size={12} />}
      {label}
    </motion.span>
  );
}

export default function NewEventPage() {
  const router = useRouter();
  const { createEvent } = useEventStore();
  const { lang } = useLangStore();
  const t = dict[lang];

  const [view, setView] = useState<ViewMode>('start');
  const [currentStep, setCurrentStep] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<typeof QUICK_TEMPLATES[number] | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickBudget, setQuickBudget] = useState('');
  const [quickTimeline, setQuickTimeline] = useState('');
  const [quickVenue, setQuickVenue] = useState('');
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [venuePickerTarget, setVenuePickerTarget] = useState<'quick' | 'wizard'>('quick');

  const [customType, setCustomType] = useState('');
  const [form, setForm] = useState<FormData>({
    name: '', type: '', audience: '', scale: 'medium',
    participants: 200, budget: '', timeline: '', venue: '',
    teamSize: 20, goals: '', constraints: ''
  });

  const [organizerRole, setOrganizerRole] = useState<OrganizerRole>('solo');
  const [picContacts, setPicContacts] = useState<ContactPIC[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [picBuf, setPicBuf] = useState({ name: '', role: '', whatsapp: '', email: '' });
  const [extBuf, setExtBuf] = useState({ name: '', category: 'vendor' as ExternalContact['category'], whatsapp: '', email: '' });

  // Market Intelligence Brief state (You.com integration)
  const [marketBrief, setMarketBrief] = useState<MarketBriefData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const marketContextRef = useRef<string | null>(null);

  // Validation state
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showErrors, setShowErrors] = useState(false);

  // Venue modal results
  const [venueResults, setVenueResults] = useState<OsmPlace[]>([]);
  const [showVenueResults, setShowVenueResults] = useState(false);

  // ── Wizard validation ──────────────────────────────────────
  const stepErrors = useMemo(() => {
    const errs: string[] = [];
    if (currentStep === 0) {
      if (!form.name.trim()) errs.push('name');
      if (!form.type) errs.push('type');
      if (form.type === 'Other (Manual)' && !customType.trim()) errs.push('customType');
      if (!form.goals.trim()) errs.push('goals');
    }
    if (currentStep === 1) {
      if (!form.scale) errs.push('scale');
      if (!form.audience.trim()) errs.push('audience');
    }
    return errs;
  }, [currentStep, form.name, form.type, form.goals, form.scale, form.audience, customType]);

  const isFieldInvalid = (field: string) => showErrors && stepErrors.includes(field);

  const update = (field: keyof FormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => { const next = new Set(prev); next.add(field); return next; });
  };

  const addPic = () => {
    if (!picBuf.name.trim()) return;
    setPicContacts(prev => [...prev, { id: `pic-${Date.now()}`, ...picBuf }]);
    setPicBuf({ name: '', role: '', whatsapp: '', email: '' });
  };

  const addExt = () => {
    if (!extBuf.name.trim()) return;
    setExternalContacts(prev => [...prev, { id: `ext-${Date.now()}`, ...extBuf }]);
    setExtBuf({ name: '', category: 'vendor', whatsapp: '', email: '' });
  };

  // ── Fetch Market Intelligence Brief (You.com) ──────────────────
  const fetchMarketBrief = useCallback(async (
    eventType: string,
    scale: string = 'medium'
  ) => {
    if (!eventType) return;
    setBriefLoading(true);
    setMarketBrief(null);
    marketContextRef.current = null;
    try {
      const res = await apiFetch('/api/ai/event-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, scale, lang }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setMarketBrief(data);
      marketContextRef.current = data.rawContext ?? null;
    } catch {
      // Fail silently — market brief is enhancement, not critical
    } finally {
      setBriefLoading(false);
    }
  }, [lang]);

  const handleAiPrefill = async () => {
    if (!aiPrompt.trim()) return;
    setView('ai-loading');
    setAiError('');
    try {
      const res = await apiFetch('/api/ai/parse-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed');
      const d = json.data;
      setForm({
        name: d.name || '',
        type: eventTypes.includes(d.type) ? d.type : 'Other (Manual)',
        audience: d.audience || '',
        scale: d.scale || 'medium',
        participants: Number(d.participants) || 200,
        budget: d.budget || '',
        timeline: d.timeline || '',
        venue: d.venue || '',
        teamSize: Number(d.teamSize) || 20,
        goals: d.goals || '',
        constraints: d.constraints || '',
      });
      if (!eventTypes.includes(d.type) && d.type) setCustomType(d.type);
      if (d.organizerRole) setOrganizerRole(d.organizerRole);
      setView('wizard');
      setCurrentStep(0);
      // Fetch market brief for the parsed event type
      fetchMarketBrief(d.type || '', d.scale || 'medium');
    } catch {
      setAiError('Gagal memproses brief. Coba lagi atau isi manual.');
      setView('start');
    }
  };

  // ── Smart Defaults helper ──────────────────────────────────────
  const applySmartDefaults = (f: FormData): FormData => ({
    ...f,
    budget: f.budget.trim() || 'Fleksibel (disesuaikan)',
    venue: f.venue.trim() || 'TBD (akan dikonfirmasi)',
    timeline: f.timeline.trim() || (() => {
      const d = new Date(); d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    })(),
    participants: f.participants || 50,
  });

  // ── Quick Launch (from template) ───────────────────────────────
  const handleQuickLaunch = () => {
    if (!selectedTemplate || !quickName.trim()) return;
    const d = selectedTemplate.defaults;
    const baseForm: FormData = {
      name: quickName.trim(),
      type: d.type,
      audience: d.audience,
      scale: d.scale,
      participants: d.participants,
      teamSize: d.teamSize,
      goals: d.goals,
      budget: quickBudget,
      timeline: quickTimeline,
      venue: quickVenue,
      constraints: '',
    };
    const finalForm = applySmartDefaults(baseForm);
    const eventId = createEvent({
      ...finalForm,
      agentActions: [],
      organizerRole: d.teamSize <= 3 ? 'solo' : 'chairman',
      picContacts: [],
      externalContacts: [],
    });
    // Pass marketContext to master plan via sessionStorage so workspace/master-plan page can read it
    if (marketContextRef.current) {
      sessionStorage.setItem(`market-context-${eventId}`, marketContextRef.current);
    }
    router.push(`/workspace/${eventId}/master-plan`);
  };

  const handleSubmit = () => {
    const resolvedType = form.type === 'Other (Manual)' ? customType.trim() : form.type;
    if (!resolvedType || !form.name || !form.goals) return;
    const finalForm = applySmartDefaults(form);
    const eventId = createEvent({
      ...finalForm,
      type: resolvedType,
      agentActions: [],
      organizerRole,
      picContacts,
      externalContacts,
    });
    // Pass marketContext to master plan via sessionStorage so workspace/master-plan page can read it
    if (marketContextRef.current) {
      sessionStorage.setItem(`market-context-${eventId}`, marketContextRef.current);
    }
    router.push(`/workspace/${eventId}/master-plan`);
  };

  const scaleOptions = [
    { value: 'small', label: t.scaleSmall, desc: t.scaleSmallDesc },
    { value: 'medium', label: t.scaleMedium, desc: t.scaleMediumDesc },
    { value: 'large', label: t.scaleLarge, desc: t.scaleLargeDesc },
    { value: 'massive', label: t.scaleMassive, desc: t.scaleMassiveDesc },
  ];

  const steps = [t.formStepBasics, t.formStepLogistics, t.formStepTeam, t.formReviewTitle];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', position: 'relative' }}>
      <div className="grid-bg" />
      <div className="ambient-glow" />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/workspace" style={{ textDecoration: 'none' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={14} /> {t.navBack}
          </button>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={10} color="var(--bg-primary)" style={{ fill: 'var(--bg-primary)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>RunIt</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 720, paddingTop: '5rem', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {view === 'start' && (
            <motion.div key="start" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{t.formStartTitle}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t.formStartSubtitle}</p>
              </div>

              {/* ⚡ Quick-Start Templates */}
              <div className="glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Zap size={15} color="#f59e0b" style={{ fill: 'rgba(245,158,11,0.15)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Quick-Start — Pilih Template
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                    Master Plan siap &lt; 60 detik
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" style={{ marginBottom: selectedTemplate ? '1.25rem' : 0 }}>
                  {QUICK_TEMPLATES.map(tpl => {
                    const isSelected = selectedTemplate?.id === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(isSelected ? null : tpl);
                          if (!isSelected) {
                            setQuickName('');
                            fetchMarketBrief(tpl.defaults.type, tpl.defaults.scale);
                          } else {
                            setMarketBrief(null);
                            setBriefLoading(false);
                          }
                        }}
                        style={{
                          padding: '0.75rem 0.625rem',
                          borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${isSelected ? tpl.color : 'var(--border)'}`,
                          background: isSelected ? `${tpl.color}12` : 'var(--bg-primary)',
                          color: isSelected ? tpl.color : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <div style={{ fontSize: '1.25rem', marginBottom: '0.3rem' }}>{tpl.emoji}</div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: isSelected ? tpl.color : 'var(--text-primary)', margin: 0 }}>{tpl.label}</p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>{tpl.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Quick-name + optional fields when template selected */}
                {selectedTemplate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div>
                        <label className="form-label">
                          Nama {selectedTemplate.label} <span style={{ color: 'var(--accent-rose)' }}>*</span>
                        </label>
                        <input
                          className="input-field"
                          autoFocus
                          value={quickName}
                          onChange={e => setQuickName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && quickName.trim()) handleQuickLaunch(); }}
                          placeholder={`cth: ${selectedTemplate.label} Tim Alpha`}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                            <Calendar size={11} style={{ marginRight: 3 }} />
                            Tanggal / Timeline
                          </label>
                          <DateRangePicker
                            value={quickTimeline}
                            onChange={(isoVal, _formatted) => setQuickTimeline(isoVal)}
                            placeholder="Pilih Tanggal"
                            minDate={new Date()}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                            <Building2 size={11} style={{ marginRight: 3 }} />
                            Venue
                          </label>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              className="input-field"
                              value={quickVenue}
                              onChange={e => setQuickVenue(e.target.value)}
                              placeholder="Aula / Online / TBD"
                              style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setVenuePickerTarget('quick');
                                setShowVenuePicker(true);
                              }}
                              style={{
                                padding: '0 0.6rem', borderRadius: 8,
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Pilih dari Peta"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>
                            <DollarSign size={11} style={{ marginRight: 3 }} />
                            Budget
                          </label>
                          <input
                            className="input-field"
                            value={quickBudget}
                            onChange={e => setQuickBudget(e.target.value)}
                            placeholder="Rp 5.000.000"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleQuickLaunch}
                        disabled={!quickName.trim()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          padding: '0.7rem 1.25rem', borderRadius: 8,
                          background: quickName.trim()
                            ? `linear-gradient(135deg, ${selectedTemplate.color}, ${selectedTemplate.color}cc)`
                            : 'var(--bg-elevated)',
                          border: 'none',
                          color: quickName.trim() ? '#000' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '0.9rem', cursor: quickName.trim() ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Zap size={15} style={{ fill: quickName.trim() ? 'rgba(0,0,0,0.3)' : 'none' }} />
                        ⚡ Launch Master Plan Sekarang
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Market Intelligence Brief Panel ── */}
                <AnimatePresence>
                  {(briefLoading || marketBrief) && (
                    <motion.div
                      key="market-brief"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        marginTop: '0.875rem',
                        borderRadius: 10,
                        border: '1px solid rgba(0,173,181,0.3)',
                        background: 'rgba(0,173,181,0.05)',
                        overflow: 'hidden',
                      }}>
                        {/* Header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid rgba(0,173,181,0.2)',
                          background: 'rgba(0,173,181,0.08)',
                        }}>
                          <Globe size={13} color="#00ADB5" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00ADB5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Market Intelligence
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            Real-time · You.com
                          </span>
                        </div>

                        {/* Loading state */}
                        {briefLoading && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 1.25rem' }}>
                            <Loader2 size={14} color="#00ADB5" style={{ animation: 'spin 1.5s linear infinite' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Mengambil insight terkini dari web...
                            </span>
                          </div>
                        )}

                        {/* Insights */}
                        {!briefLoading && marketBrief?.insights && (
                          <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {marketBrief.insights.map((insight, i) => (
                              <div key={i} style={{
                                display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                                padding: '0.625rem 0.75rem',
                                background: 'var(--bg-elevated)',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                              }}>
                                <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.2 }}>{insight.emoji}</span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                                    {insight.title}
                                  </p>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                    {insight.insight}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {/* Sources */}
                            {marketBrief.sources.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', paddingTop: '0.375rem' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sumber:</span>
                                {marketBrief.sources.slice(0, 4).map((s, i) => (
                                  <a
                                    key={i}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                      fontSize: '0.65rem', color: 'var(--text-muted)',
                                      padding: '0.15rem 0.4rem', borderRadius: 4,
                                      border: '1px solid var(--border)',
                                      background: 'var(--bg-primary)',
                                      textDecoration: 'none',
                                      transition: 'color 0.15s, border-color 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#00ADB5'; e.currentTarget.style.borderColor = '#00ADB5'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                  >
                                    {s.favicon && <img src={s.favicon} alt="" width={10} height={10} style={{ borderRadius: 2, objectFit: 'contain' }} />}
                                    {new URL(s.url).hostname.replace('www.', '')}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* No insights fallback */}
                        {!briefLoading && marketBrief && !marketBrief.insights && (
                          <p style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Data pasar ditemukan. Master Plan akan menggunakan konteks ini.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Brief section */}
              <div className="glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <label className="form-label">{t.formStartAiLabel}</label>
                <textarea
                  ref={textareaRef}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAiPrefill(); }}
                  placeholder={t.formStartAiPlaceholder}
                  style={{
                    width: '100%', minHeight: 130, background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.65,
                    resize: 'vertical', fontFamily: 'var(--font-sans)', outline: 'none',
                    padding: '0.75rem', borderRadius: 8
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.formStartAiHint}</span>
                  <button
                    onClick={handleAiPrefill}
                    disabled={!aiPrompt.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 1rem', borderRadius: 8,
                      background: aiPrompt.trim() ? 'linear-gradient(135deg, #00ADB5, #00C7D4)' : 'var(--bg-elevated)',
                      border: 'none', color: aiPrompt.trim() ? '#000' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.85rem', cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Sparkles size={15} /> {t.formStartAiBtn}
                  </button>
                </div>
                {aiError && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{aiError}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => { setView('wizard'); setCurrentStep(0); }}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <RotateCcw size={14} /> {t.formStartSkipBtn}
                </button>
              </div>
            </motion.div>
          )}

          {view === 'ai-loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <Sparkles size={20} color="var(--accent-blue)" />
                <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>{t.formAiLoadingDesc}</p>
              </div>
            </motion.div>
          )}

          {view === 'wizard' && (
            <motion.div key={`wizard-${currentStep}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <div className="glass" style={{ width: '100%', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{t.formWizardTitle}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.formWizardSubtitle}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  {steps.slice(0, 3).map((label, idx) => (
                    <StepBadge
                      key={label}
                      stepNum={idx + 1}
                      label={label}
                      active={currentStep === idx}
                      done={currentStep > idx}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Progress
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {Math.round(((currentStep + 1) / 3) * 100)}%
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 2,
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                  }}>
                    <motion.div
                      initial={false}
                      animate={{ width: `${((currentStep + 1) / 3) * 100}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 2,
                        background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-mint, #25D0AB))',
                      }}
                    />
                  </div>
                </div>

                {currentStep === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label className="form-label">{t.formEventName} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                      <input
                        className="input-field"
                        value={form.name}
                        onChange={e => update('name', e.target.value)}
                        style={isFieldInvalid('name') ? { borderColor: 'var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : undefined}
                      />
                      {isFieldInvalid('name') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Nama acara wajib diisi</span>}
                    </div>
                    <div>
                      <label className="form-label">{t.formEventType} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" style={isFieldInvalid('type') ? { padding: '0.5rem', borderRadius: 8, border: '1px solid var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : undefined}>
                        {eventTypes.map(type => (
                          <button key={type} onClick={() => update('type', type)} style={{
                            padding: '0.6rem 0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                            border: `1px solid ${form.type === type ? 'var(--accent-blue)' : 'var(--border)'}`,
                            background: form.type === type ? 'var(--accent-blue-dim)' : 'var(--bg-primary)',
                            color: form.type === type ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: 500,
                          }}>
                            {type === 'Other (Manual)' && lang === 'id' ? 'Lainnya (Manual)' : type}
                          </button>
                        ))}
                      </div>
                      {isFieldInvalid('type') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Pilih tipe acara</span>}
                      {form.type === 'Other (Manual)' && (
                        <div style={{ marginTop: '1rem' }}>
                          <label className="form-label">{t.formCustomType} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                          <input
                            className="input-field"
                            value={customType}
                            onChange={e => setCustomType(e.target.value)}
                            style={isFieldInvalid('customType') ? { borderColor: 'var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : undefined}
                          />
                          {isFieldInvalid('customType') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Isi tipe acara kustom</span>}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="form-label">{t.formMissionObj} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                      <textarea
                        className="input-field"
                        value={form.goals}
                        onChange={e => update('goals', e.target.value)}
                        style={{ minHeight: '120px', ...(isFieldInvalid('goals') ? { borderColor: 'var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : {}) }}
                      />
                      {isFieldInvalid('goals') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Tujuan / misi acara wajib diisi</span>}
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label className="form-label">{t.formEventScale} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={isFieldInvalid('scale') ? { padding: '0.5rem', borderRadius: 8, border: '1px solid var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : undefined}>
                        {scaleOptions.map(s => (
                          <button key={s.value} onClick={() => update('scale', s.value)} style={{
                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                            border: `1px solid ${form.scale === s.value ? 'var(--accent-blue)' : 'var(--border)'}`,
                            background: form.scale === s.value ? 'var(--accent-blue-dim)' : 'var(--bg-primary)',
                            color: form.scale === s.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-sans)',
                          }}>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{s.label}</p>
                            <p style={{ fontSize: '0.75rem', opacity: form.scale === s.value ? 1 : 0.7 }}>{s.desc}</p>
                          </button>
                        ))}
                      </div>
                      {isFieldInvalid('scale') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Pilih skala acara</span>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label"><Users size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formTargetAudience} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                        <input
                          className="input-field"
                          value={form.audience}
                          onChange={e => update('audience', e.target.value)}
                          style={isFieldInvalid('audience') ? { borderColor: 'var(--accent-rose)', boxShadow: '0 0 0 1px var(--accent-rose)' } : undefined}
                        />
                        {isFieldInvalid('audience') && <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>Target audiens wajib diisi</span>}
                      </div>
                      <div>
                        <label className="form-label"><Users size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formExpectedPax}</label>
                        <input type="number" className="input-field" value={form.participants} onChange={e => update('participants', parseInt(e.target.value))} />
                      </div>
                    </div>

                    <div>
                      <label className="form-label"><Building2 size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formVenueLocation}</label>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <input className="input-field" value={form.venue} onChange={e => update('venue', e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                        <button
                          type="button"
                          onClick={() => {
                            setVenuePickerTarget('wizard');
                            setShowVenuePicker(true);
                          }}
                          style={{
                            padding: '0 0.6rem', borderRadius: 8,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Pilih dari Peta"
                        >
                          <MapPin size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label"><DollarSign size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formBudgetAllocation}</label>
                        <input className="input-field" value={form.budget} onChange={e => update('budget', e.target.value)} />
                      </div>
                      <div>
                        <DateRangePicker
                          label={t.formTimeline}
                          value={form.timeline}
                          minDate={new Date()}
                          onChange={(isoVal, _formatted) => {
                            update('timeline', isoVal);
                          }}
                        />
                      </div>
                    </div>

                  </div>
                )}

                {currentStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label className="form-label">{t.formConstraints} <span style={{ color: 'var(--text-muted)' }}>({t.formOptional})</span></label>
                      <textarea className="input-field" value={form.constraints} onChange={e => update('constraints', e.target.value)} style={{ minHeight: '100px' }} />
                    </div>

                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <UserCheck size={15} color="var(--accent-blue)" /> Struktur Tim & Kontak
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {[{ val: 'solo' as OrganizerRole, Icon: User, label: 'Panitia Tunggal' }, { val: 'chairman' as OrganizerRole, Icon: Crown, label: 'Ketua Panitia' }]
                          .map(({ val, Icon, label }) => (
                            <button key={val} onClick={() => {
                              setOrganizerRole(val);
                              if (val === 'solo') update('teamSize', 1);
                              else update('teamSize', 10);
                            }} style={{
                              padding: '0.875rem', borderRadius: 8, textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                              border: `1px solid ${organizerRole === val ? 'var(--accent-blue)' : 'var(--border)'}`,
                              background: organizerRole === val ? 'var(--accent-blue-dim)' : 'var(--bg-primary)',
                              color: organizerRole === val ? 'var(--accent-blue)' : 'var(--text-secondary)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Icon size={15} /><span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</span>
                              </div>
                            </button>
                          ))}
                      </div>

                      {organizerRole === 'chairman' ? (
                        <div>
                          <div style={{ marginBottom: '1.25rem' }}>
                            <label className="form-label"><Users size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formCrewSize}</label>
                            <input type="number" className="input-field" value={form.teamSize} onChange={e => update('teamSize', parseInt(e.target.value))} />
                          </div>
                          
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>PIC / Kepala Divisi ({t.formOptional})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input className="input-field" placeholder="Nama PIC" value={picBuf.name} onChange={e => setPicBuf(b => ({ ...b, name: e.target.value }))} />
                              <input className="input-field" placeholder="Jabatan" value={picBuf.role} onChange={e => setPicBuf(b => ({ ...b, role: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input className="input-field" placeholder="WA (628xxx)" value={picBuf.whatsapp} onChange={e => setPicBuf(b => ({ ...b, whatsapp: e.target.value }))} />
                              <input className="input-field" placeholder="Email (opsional)" value={picBuf.email} onChange={e => setPicBuf(b => ({ ...b, email: e.target.value }))} />
                            </div>
                            <button onClick={addPic} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: 6, color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}>
                              <Plus size={13} /> Tambah PIC
                            </button>
                          </div>
                          {picContacts.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, marginTop: '0.375rem' }}>
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.role}</span>
                              </div>
                              <button onClick={() => setPicContacts(prev => prev.filter(c => c.id !== p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>Kontak Eksternal ({t.formOptional})</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input className="input-field" placeholder="Nama (cth: CV Maju Jaya)" value={extBuf.name} onChange={e => setExtBuf(b => ({ ...b, name: e.target.value }))} />
                              <select className="input-field" value={extBuf.category} onChange={e => setExtBuf(b => ({ ...b, category: e.target.value as ExternalContact['category'] }))} style={{ cursor: 'pointer' }}>
                                <option value="vendor">Vendor</option>
                                <option value="sponsor">Sponsor</option>
                                <option value="venue">Venue</option>
                                <option value="speaker">Pembicara</option>
                                <option value="other">Lainnya</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input className="input-field" placeholder="WA (628xxx)" value={extBuf.whatsapp} onChange={e => setExtBuf(b => ({ ...b, whatsapp: e.target.value }))} />
                              <input className="input-field" placeholder="Email (opsional)" value={extBuf.email} onChange={e => setExtBuf(b => ({ ...b, email: e.target.value }))} />
                            </div>
                            <button onClick={addExt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: 6, color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}>
                              <Plus size={13} /> Tambah Kontak
                            </button>
                          </div>
                          {externalContacts.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, marginTop: '0.375rem' }}>
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{c.category}]</span>
                              </div>
                              <button onClick={() => setExternalContacts(prev => prev.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <button className="btn-secondary" onClick={() => currentStep === 0 ? setView('start') : setCurrentStep(s => s - 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={14} /> {t.formBtnPrevious}
                  </button>
                  {currentStep === 2 ? (
                    <button className="btn-primary" onClick={() => { setShowErrors(false); setView('review'); }} disabled={!form.goals} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !form.goals ? 0.5 : 1, cursor: !form.goals ? 'not-allowed' : 'pointer' }}>
                      {t.formReviewTitle} <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        if (stepErrors.length > 0) { setShowErrors(true); return; }
                        setShowErrors(false);
                        setCurrentStep(s => s + 1);
                      }}
                      disabled={!form.name || !form.type || (currentStep === 0 && form.type === 'Other (Manual)' && !customType.trim())}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (!form.name || !form.type) ? 0.5 : 1, cursor: (!form.name || !form.type) ? 'not-allowed' : 'pointer' }}
                    >
                      {t.formBtnContinue} <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="glass" style={{ padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', background: 'rgba(85,180,103,0.1)', border: '1px solid rgba(85,180,103,0.3)', borderRadius: 20, marginBottom: '1rem' }}>
                    <CheckCircle2 size={13} color="#55B467" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#55B467', letterSpacing: '0.04em' }}>{t.formReviewBadge}</span>
                  </div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>{t.formReviewTitle}</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t.formReviewSubtitle}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: t.formEventName, value: form.name },
                    { label: t.formEventType, value: form.type === 'Other (Manual)' ? customType : form.type },
                    { label: t.formTargetAudience, value: form.audience },
                    { label: t.formVenueLocation, value: form.venue },
                    { label: t.formExpectedPax, value: form.participants.toLocaleString() },
                    { label: t.formBudgetAllocation, value: form.budget },
                    { label: t.formTimeline, value: formatTimelineDisplay(form.timeline) },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{item.label}</p>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.value || '—'}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { setView('wizard'); setCurrentStep(0); }} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <RotateCcw size={13} /> {t.formReviewBack}
                  </button>
                  <button onClick={handleSubmit} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Target size={14} /> {t.formReviewConfirm} <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showVenuePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: 'var(--bg-primary)',
                borderRadius: 16,
                padding: '1.5rem',
                width: '100%',
                maxWidth: 600,
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Pilih Lokasi Venue</h3>
                <button
                  onClick={() => setShowVenuePicker(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>
              <VenuePickerMap
                activeCategory="venue"
                mapHeight={300}
                onResultsFetched={(results) => {
                  setVenueResults(results);
                  setShowVenueResults(results.length > 0);
                }}
                onVenueConfirm={(lat, lng, name, address) => {
                  if (venuePickerTarget === 'quick') setQuickVenue(name);
                  else update('venue', name);
                  setShowVenuePicker(false);
                }}
              />

              {/* Venue result cards */}
              <AnimatePresence>
                {showVenueResults && venueResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: '0.75rem' }}
                  >
                    <div style={{
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.75rem',
                    }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={13} color="var(--accent-blue)" />
                        {venueResults.length} venue ditemukan di area ini
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 240, overflowY: 'auto' }}>
                        {venueResults.map((place) => (
                          <button
                            key={place.id}
                            onClick={() => {
                              if (venuePickerTarget === 'quick') setQuickVenue(place.name);
                              else update('venue', place.name);
                              setShowVenuePicker(false);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.6rem',
                              padding: '0.6rem 0.75rem', borderRadius: 8,
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'var(--font-sans)',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'var(--accent-blue)';
                              e.currentTarget.style.background = 'var(--accent-blue-dim)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--bg-elevated)';
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: 'var(--accent-blue-dim)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Building2 size={16} color="var(--accent-blue)" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {place.name}
                              </p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.15rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {place.address || `${place.distanceKm} km dari titik pusat`}
                              </p>
                            </div>
                            <div style={{
                              padding: '0.15rem 0.5rem', borderRadius: 12,
                              background: 'rgba(85,180,103,0.12)',
                              fontSize: '0.65rem', fontWeight: 700, color: '#55B467',
                              flexShrink: 0,
                            }}>
                              {Math.round(place.score * 100)}%
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .form-label {
          display: flex; align-items: center; margin-bottom: 0.5rem;
          color: var(--text-primary); font-size: 0.9rem; font-weight: 500;
        }
      `}</style>
    </div>
  );
}
