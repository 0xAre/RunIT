'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useEventStore, type OrganizerRole, type ContactPIC, type ExternalContact } from '@/store/eventStore';
import {
  Zap, ArrowLeft, ArrowRight, Calendar, Users, Building2, DollarSign,
  Target, AlertCircle, UserCheck, Plus, Trash2, Crown, User,
  Sparkles, Edit3, ChevronDown, ChevronUp, CheckCircle2, RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useLangStore } from '@/store/langStore';
import { dict } from '@/lib/i18n';

/* ── Types ─────────────────────────────────────────── */
const eventTypes = [
  'Seminar/Conference', 'Workshop', 'Music Festival', 'Campus Event',
  'Corporate Meeting', 'Product Launch', 'Hackathon', 'Charity/Social Event',
  'Sports Event', 'Exhibition', 'Award Ceremony', 'Webinar', 'Other (Manual)'
];

interface FormData {
  name: string; type: string; audience: string; scale: string;
  participants: number; budget: string; timeline: string; venue: string;
  teamSize: number; goals: string; constraints: string;
}

type Mode = 'initial' | 'ai-loading' | 'review' | 'manual';

/* ── AI Loader Component ────────────────────────────── */
function AiLoader() {
  const dots = [0, 1, 2];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '3rem' }}
    >
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid rgba(0,173,181,${0.4 - i * 0.12})`,
          }}
            animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        <div style={{
          position: 'absolute', inset: '50%', transform: 'translate(-50%, -50%)',
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ADB5, #00D4E0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={14} color="#000" />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>AI sedang menganalisis brief Anda</p>
        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
          {dots.map(i => (
            <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-blue)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Field Row for Review Mode ──────────────────────── */
function ReviewField({
  label, value, onChange, type = 'text', children
}: {
  label: string; value: string | number; onChange?: (v: string) => void;
  type?: string; children?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
      <div style={{ minWidth: 140, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', paddingTop: '0.1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ flex: 1 }}>
        {children ? children : editing ? (
          <input
            autoFocus
            type={type}
            defaultValue={String(value)}
            onBlur={e => { onChange?.(e.target.value); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onChange?.((e.target as HTMLInputElement).value); setEditing(false); } }}
            style={{
              width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--accent-blue)',
              borderRadius: 6, padding: '0.35rem 0.6rem', color: 'var(--text-primary)',
              fontSize: '0.9rem', fontFamily: 'var(--font-sans)',
            }}
          />
        ) : (
          <button
            onClick={() => onChange && setEditing(true)}
            style={{
              background: 'none', border: 'none', cursor: onChange ? 'text' : 'default',
              textAlign: 'left', color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.9rem', padding: 0, fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            }}
          >
            <span style={{ flex: 1 }}>{value || '—'}</span>
            {onChange && <Edit3 size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function NewEventPage() {
  const router = useRouter();
  const { createEvent } = useEventStore();
  const { lang } = useLangStore();
  const t = dict[lang];

  const [mode, setMode] = useState<Mode>('initial');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState('');
  const [manualStep, setManualStep] = useState(0);
  const [customType, setCustomType] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [form, setForm] = useState<FormData>({
    name: '', type: '', audience: '', scale: 'medium',
    participants: 200, budget: '', timeline: '', venue: '',
    teamSize: 20, goals: '', constraints: '',
  });

  // Contact & Role state
  const [organizerRole, setOrganizerRole] = useState<OrganizerRole>('solo');
  const [picContacts, setPicContacts] = useState<ContactPIC[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [picBuf, setPicBuf] = useState({ name: '', role: '', whatsapp: '', email: '' });
  const [extBuf, setExtBuf] = useState({ name: '', category: 'vendor' as ExternalContact['category'], whatsapp: '', email: '' });
  const [contactsExpanded, setContactsExpanded] = useState(true);

  const update = (field: keyof FormData, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

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

  const handleSubmit = () => {
    const resolvedType = form.type === 'Other (Manual)' ? customType.trim() : form.type;
    if (!resolvedType || !form.name) return;
    const eventId = createEvent({
      ...form, type: resolvedType, agentActions: [],
      organizerRole, picContacts, externalContacts,
    });
    router.push(`/workspace/${eventId}/blueprint`);
  };

  // ── AI Brief Parsing ──────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setMode('ai-loading');
    setAiError('');
    try {
      const res = await fetch('/api/ai/parse-brief', {
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
      setMode('review');
    } catch (err: any) {
      setAiError('Gagal memproses brief. Coba lagi atau isi manual.');
      setMode('initial');
    }
  };

  const EXAMPLE_PROMPTS = [
    'Workshop AI generatif untuk 80 mahasiswa teknik di Bandung, 2 minggu lagi, budget 8 juta',
    'Festival musik indie outdoor 3 hari di Jakarta, target 2000 penonton, sedang cari sponsor',
    'Hackathon kampus 48 jam, 150 peserta, hadiah 30 juta, butuh mentor & sponsor teknologi',
  ];

  // ── Manual Steps ─────────────────────────────────────
  const scaleOptions = [
    { value: 'small', label: t.scaleSmall, desc: t.scaleSmallDesc },
    { value: 'medium', label: t.scaleMedium, desc: t.scaleMediumDesc },
    { value: 'large', label: t.scaleLarge, desc: t.scaleLargeDesc },
    { value: 'massive', label: t.scaleMassive, desc: t.scaleMassiveDesc },
  ];

  const manualSteps = [
    {
      title: t.formIdentityTitle, desc: t.formIdentityDesc, icon: Target,
      canProceed: !!(form.name && form.type && form.audience && (form.type !== 'Other (Manual)' || customType.trim())),
      fields: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label">{t.formEventName} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
            <input className="input-field" placeholder={t.formEventNamePh} value={form.name} onChange={e => update('name', e.target.value)} id="event-name-input" />
          </div>
          <div>
            <label className="form-label">{t.formEventType} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {eventTypes.map(type => (
                <button key={type} id={`event-type-${type.toLowerCase().replace(/[^a-z]/g, '-')}`}
                  onClick={() => update('type', type)}
                  style={{
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
            {form.type === 'Other (Manual)' && (
              <div style={{ marginTop: '1rem' }}>
                <label className="form-label">{t.formCustomType} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <input className="input-field" placeholder={t.formCustomTypePh} value={customType} onChange={e => setCustomType(e.target.value)} id="event-type-custom" />
              </div>
            )}
          </div>
          <div>
            <label className="form-label">{t.formTargetAudience} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
            <input className="input-field" placeholder={t.formTargetAudiencePh} value={form.audience} onChange={e => update('audience', e.target.value)} id="event-audience-input" />
          </div>
        </div>
      ),
    },
    {
      title: t.formLogisticsTitle, desc: t.formLogisticsDesc, icon: Building2,
      canProceed: !!(form.scale && form.venue),
      fields: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label">{t.formEventScale} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {scaleOptions.map(s => (
                <button key={s.value} id={`scale-${s.value}`} onClick={() => update('scale', s.value)} style={{
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
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label"><Users size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formExpectedPax}</label>
              <input type="number" className="input-field" value={form.participants} onChange={e => update('participants', parseInt(e.target.value))} id="participants-input" />
            </div>
            <div>
              <label className="form-label"><Users size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formCrewSize}</label>
              <input type="number" className="input-field" value={form.teamSize} onChange={e => update('teamSize', parseInt(e.target.value))} id="team-size-input" />
            </div>
          </div>
          <div>
            <label className="form-label"><Building2 size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formVenueLocation}</label>
            <input className="input-field" placeholder={t.formVenueLocationPh} value={form.venue} onChange={e => update('venue', e.target.value)} id="venue-input" />
          </div>
        </div>
      ),
    },
    {
      title: t.formResourcesTitle, desc: t.formResourcesDesc, icon: Calendar,
      canProceed: !!(form.budget && form.timeline),
      fields: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label"><DollarSign size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formBudgetAllocation}</label>
            <input className="input-field" placeholder={t.formBudgetAllocationPh} value={form.budget} onChange={e => update('budget', e.target.value)} id="budget-input" />
          </div>
          <div>
            <label className="form-label"><Calendar size={13} style={{ marginRight: '0.3rem', color: 'var(--text-muted)' }} />{t.formTimeline}</label>
            <input className="input-field" placeholder={t.formTimelinePh} value={form.timeline} onChange={e => update('timeline', e.target.value)} id="timeline-input" />
          </div>
        </div>
      ),
    },
    {
      title: t.formDirectivesTitle, desc: t.formDirectivesDesc, icon: AlertCircle,
      canProceed: !!form.goals,
      fields: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label">{t.formMissionObj} <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
            <textarea className="input-field" placeholder={t.formMissionObjPh} value={form.goals} onChange={e => update('goals', e.target.value)} style={{ minHeight: '120px' }} id="goals-input" />
          </div>
          <div>
            <label className="form-label">{t.formConstraints}</label>
            <textarea className="input-field" placeholder={t.formConstraintsPh} value={form.constraints} onChange={e => update('constraints', e.target.value)} style={{ minHeight: '100px' }} id="constraints-input" />
          </div>
        </div>
      ),
    },
  ];

  const currentManualStep = manualSteps[manualStep];
  const isManualLastStep = manualStep === manualSteps.length - 1;

  // ── Contacts Panel (shared for both review + manual last step) ──
  const ContactsPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Role */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          { val: 'solo' as OrganizerRole, Icon: User, label: 'Panitia Tunggal', desc: 'AI bantu hubungi vendor & pihak eksternal.' },
          { val: 'chairman' as OrganizerRole, Icon: Crown, label: 'Ketua Panitia', desc: 'AI bantu delegasi ke kepala divisi.' },
        ].map(({ val, Icon, label, desc }) => (
          <button key={val} id={`role-${val}`} onClick={() => setOrganizerRole(val)} style={{
            padding: '0.875rem', borderRadius: 8, textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            border: `1px solid ${organizerRole === val ? 'var(--accent-blue)' : 'var(--border)'}`,
            background: organizerRole === val ? 'var(--accent-blue-dim)' : 'var(--bg-primary)',
            color: organizerRole === val ? 'var(--accent-blue)' : 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Icon size={15} /><span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</span>
            </div>
            <p style={{ fontSize: '0.72rem', opacity: 0.8, lineHeight: 1.4 }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* Contacts inputs */}
      {organizerRole === 'chairman' ? (
        <div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>
            PIC / Kepala Divisi <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opsional)</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="input-field" placeholder="Nama PIC" value={picBuf.name} onChange={e => setPicBuf(b => ({ ...b, name: e.target.value }))} />
              <input className="input-field" placeholder="Jabatan" value={picBuf.role} onChange={e => setPicBuf(b => ({ ...b, role: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="input-field" placeholder="WA (628xxx)" value={picBuf.whatsapp} onChange={e => setPicBuf(b => ({ ...b, whatsapp: e.target.value }))} />
              <input className="input-field" placeholder="Email (opsional)" value={picBuf.email} onChange={e => setPicBuf(b => ({ ...b, email: e.target.value }))} />
            </div>
            <button id="add-pic-btn" onClick={addPic} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: 6, color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}>
              <Plus size={13} /> Tambah PIC
            </button>
          </div>
          {picContacts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, marginTop: '0.375rem' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{p.role}</span>
                {p.whatsapp && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>· {p.whatsapp}</span>}
              </div>
              <button onClick={() => setPicContacts(prev => prev.filter(c => c.id !== p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.625rem' }}>
            Kontak Eksternal <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(vendor, sponsor, venue — opsional)</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="input-field" placeholder="Nama (cth: CV Maju Jaya)" value={extBuf.name} onChange={e => setExtBuf(b => ({ ...b, name: e.target.value }))} />
              <select className="input-field" value={extBuf.category} onChange={e => setExtBuf(b => ({ ...b, category: e.target.value as ExternalContact['category'] }))} style={{ cursor: 'pointer' }}>
                <option value="vendor">Vendor</option>
                <option value="sponsor">Sponsor</option>
                <option value="venue">Venue</option>
                <option value="speaker">Pembicara</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="input-field" placeholder="WA (628xxx)" value={extBuf.whatsapp} onChange={e => setExtBuf(b => ({ ...b, whatsapp: e.target.value }))} />
              <input className="input-field" placeholder="Email (opsional)" value={extBuf.email} onChange={e => setExtBuf(b => ({ ...b, email: e.target.value }))} />
            </div>
            <button id="add-ext-btn" onClick={addExt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.875rem', background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue)', borderRadius: 6, color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-sans)', alignSelf: 'flex-start' }}>
              <Plus size={13} /> Tambah Kontak
            </button>
          </div>
          {externalContacts.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, marginTop: '0.375rem' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{c.category}]</span>
                {c.whatsapp && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>· {c.whatsapp}</span>}
              </div>
              <button onClick={() => setExternalContacts(prev => prev.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem', position: 'relative' }}>
      <div className="grid-bg" />
      <div className="ambient-glow" />

      {/* Nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/workspace" style={{ textDecoration: 'none' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={14} /> {t.navBack}
          </button>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={10} color="var(--bg-primary)" style={{ fill: 'var(--bg-primary)' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>RunIt</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 640, paddingTop: '5rem', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ── INITIAL: AI Prompt Screen ─────────────────────── */}
          {mode === 'initial' && (
            <motion.div key="initial" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {/* Hero title */}
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', background: 'rgba(0,173,181,0.08)', border: '1px solid rgba(0,173,181,0.25)', borderRadius: 20, marginBottom: '1.25rem' }}>
                  <Sparkles size={13} color="var(--accent-blue)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.04em' }}>AI EVENT BRIEF</span>
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                  Ceritakan event{' '}
                  <span style={{ background: 'linear-gradient(135deg, #00ADB5, #00D4E0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Anda
                  </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Ketik secara natural — AI akan menyusun brief secara otomatis.
                </p>
              </div>

              {/* Text area */}
              <div className="glass" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <textarea
                  ref={textareaRef}
                  id="ai-brief-input"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAiGenerate(); }}
                  placeholder={'Contoh: "Workshop AI untuk 100 mahasiswa di Surabaya, 2 minggu lagi, budget Rp 15 juta, butuh sponsor IT"'}
                  style={{
                    width: '100%', minHeight: 130, background: 'transparent', border: 'none',
                    color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.65,
                    resize: 'none', fontFamily: 'var(--font-sans)', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ctrl+Enter untuk generate</span>
                  <button
                    id="ai-generate-btn"
                    onClick={handleAiGenerate}
                    disabled={!aiPrompt.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.6rem 1.25rem', borderRadius: 8,
                      background: aiPrompt.trim() ? 'linear-gradient(135deg, #00ADB5, #00C7D4)' : 'var(--bg-elevated)',
                      border: 'none', color: aiPrompt.trim() ? '#000' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.875rem', cursor: aiPrompt.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Sparkles size={15} />
                    Generate Brief
                  </button>
                </div>
                {aiError && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{aiError}</p>}
              </div>

              {/* Example prompts */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Coba contoh ini</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button key={i} onClick={() => setAiPrompt(ex)} style={{
                      textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '0.625rem 0.875rem', cursor: 'pointer',
                      color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.4,
                      fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>atau</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <button
                id="manual-form-btn"
                onClick={() => setMode('manual')}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Edit3 size={14} /> Isi Form Manual
              </button>
            </motion.div>
          )}

          {/* ── AI LOADING ─────────────────────────────────────── */}
          {mode === 'ai-loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass" style={{ padding: '1rem' }}>
                <AiLoader />
              </div>
            </motion.div>
          )}

          {/* ── REVIEW MODE (AI filled) ────────────────────────── */}
          {mode === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', background: 'rgba(85,180,103,0.1)', border: '1px solid rgba(85,180,103,0.3)', borderRadius: 20, marginBottom: '1rem' }}>
                  <CheckCircle2 size={13} color="#55B467" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#55B467', letterSpacing: '0.04em' }}>BRIEF GENERATED</span>
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.375rem' }}>Review & Konfirmasi</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>AI sudah mengisi data di bawah. Edit sesuai kebutuhan, lalu klik <strong>Generate Blueprint</strong>.</p>
              </div>

              {/* Scrollable review form */}
              <div className="glass" style={{ overflow: 'hidden', marginBottom: '1rem' }}>
                {/* Event info */}
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Identitas Event</span>
                </div>
                <ReviewField label="Nama Event" value={form.name} onChange={v => update('name', v)} />
                <ReviewField label="Jenis Event" value={form.type}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {eventTypes.slice(0, -1).map(t => (
                      <button key={t} onClick={() => update('type', t)} style={{
                        padding: '0.2rem 0.625rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                        border: `1px solid ${form.type === t ? 'var(--accent-blue)' : 'var(--border)'}`,
                        background: form.type === t ? 'var(--accent-blue-dim)' : 'transparent',
                        color: form.type === t ? 'var(--accent-blue)' : 'var(--text-muted)',
                      }}>{t}</button>
                    ))}
                  </div>
                </ReviewField>
                <ReviewField label="Target Audiens" value={form.audience} onChange={v => update('audience', v)} />
                <ReviewField label="Tujuan Event" value={form.goals} onChange={v => update('goals', v)} />
                {form.constraints && <ReviewField label="Kendala" value={form.constraints} onChange={v => update('constraints', v)} />}

                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Logistik & Sumber Daya</span>
                </div>
                <ReviewField label="Skala" value={form.scale}>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {['small', 'medium', 'large', 'massive'].map(s => (
                      <button key={s} onClick={() => update('scale', s)} style={{
                        padding: '0.2rem 0.6rem', borderRadius: 20, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-sans)',
                        border: `1px solid ${form.scale === s ? 'var(--accent-blue)' : 'var(--border)'}`,
                        background: form.scale === s ? 'var(--accent-blue-dim)' : 'transparent',
                        color: form.scale === s ? 'var(--accent-blue)' : 'var(--text-muted)',
                      }}>{s}</button>
                    ))}
                  </div>
                </ReviewField>
                <ReviewField label="Peserta" value={form.participants} onChange={v => update('participants', v)} type="number" />
                <ReviewField label="Panitia" value={form.teamSize} onChange={v => update('teamSize', v)} type="number" />
                <ReviewField label="Budget" value={form.budget} onChange={v => update('budget', v)} />
                <ReviewField label="Timeline" value={form.timeline} onChange={v => update('timeline', v)} />
                <ReviewField label="Venue" value={form.venue || '—'} onChange={v => update('venue', v)} />

                {/* Contacts section */}
                <button
                  onClick={() => setContactsExpanded(e => !e)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', border: 'none', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Tim & Kontak (Opsional)</span>
                  {contactsExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                </button>
                <AnimatePresence>
                  {contactsExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '1.25rem 1rem' }}>
                        <ContactsPanel />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setMode('initial')}
                  className="btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                >
                  <RotateCcw size={13} /> Tulis Ulang
                </button>
                <button
                  id="submit-event-btn"
                  onClick={handleSubmit}
                  disabled={!form.name || !form.type || !form.goals}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', borderRadius: 8,
                    background: form.name && form.type && form.goals ? 'linear-gradient(135deg, #00ADB5, #00C7D4)' : 'var(--bg-elevated)',
                    border: 'none', color: form.name && form.type && form.goals ? '#000' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.9rem', cursor: form.name && form.type && form.goals ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                >
                  <Zap size={16} style={{ fill: 'currentColor' }} />
                  {t.formBtnGenerate}
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── MANUAL STEP FORM ──────────────────────────────── */}
          {mode === 'manual' && (
            <motion.div key={`manual-${manualStep}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <div className="glass" style={{ width: '100%', padding: '2.5rem', marginBottom: '1.5rem' }}>
                {/* Step header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{currentManualStep.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{currentManualStep.desc}</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <currentManualStep.icon size={19} color="var(--accent-blue)" />
                  </div>
                </div>
                <div style={{ marginBottom: '2rem' }}>{currentManualStep.fields}</div>
                {/* Contacts on last step */}
                {isManualLastStep && (
                  <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><UserCheck size={15} color="var(--accent-blue)" /> Tim & Kontak (Opsional)</p>
                    <ContactsPanel />
                  </div>
                )}
                {/* Nav */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <button className="btn-secondary" onClick={() => manualStep === 0 ? setMode('initial') : setManualStep(s => s - 1)} id="prev-step-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={14} /> {t.formBtnPrevious}
                  </button>
                  {isManualLastStep ? (
                    <button className="btn-primary" onClick={handleSubmit} disabled={!currentManualStep.canProceed} id="submit-event-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !currentManualStep.canProceed ? 0.5 : 1, cursor: !currentManualStep.canProceed ? 'not-allowed' : 'pointer' }}>
                      {t.formBtnGenerate} <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={() => setManualStep(s => s + 1)} disabled={!currentManualStep.canProceed} id="next-step-btn"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: !currentManualStep.canProceed ? 0.5 : 1, cursor: !currentManualStep.canProceed ? 'not-allowed' : 'pointer' }}>
                      {t.formBtnContinue} <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
              {/* Step dots (manual only) */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {manualSteps.map((_, i) => (
                  <div key={i} style={{ width: 28, height: 3, borderRadius: 2, background: i === manualStep ? 'var(--text-primary)' : i < manualStep ? 'var(--accent-blue)' : 'var(--border)' }} />
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`
        .form-label {
          display: flex; align-items: center; margin-bottom: 0.5rem;
          color: var(--text-primary); font-size: 0.9rem; font-weight: 500;
        }
      `}</style>
    </div>
  );
}
