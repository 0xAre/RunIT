'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Globe, Clock, Star, MessageCircle, Mail,
  Send, Copy, CheckCircle2, ChevronDown, ChevronUp, UserPlus,
  Loader2, Building2, Utensils, Package, Wrench, Hotel,
} from 'lucide-react';
import type { OsmPlace } from '@/app/api/search/places/route';

/* ── Category config ──────────────────────────────────────── */
const CAT_CONFIG: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  venue:       { icon: Building2, color: '#7C6AF5', label: 'Venue' },
  catering:    { icon: Utensils,  color: '#FBBF24', label: 'Catering' },
  hotel:       { icon: Hotel,     color: '#00ADB5', label: 'Hotel' },
  equipment:   { icon: Wrench,    color: '#F97316', label: 'Equipment' },
  sound_system:{ icon: Package,   color: '#EC4899', label: 'Sound System' },
  vendor:      { icon: Package,   color: '#25D0AB', label: 'Vendor' },
  other:       { icon: MapPin,    color: '#A0A0A0', label: 'Lainnya' },
};

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 0.7) return { text: 'Sangat Sesuai', color: '#25D0AB' };
  if (score >= 0.45) return { text: 'Sesuai', color: '#FBBF24' };
  return { text: 'Kurang Data', color: '#A0A0A0' };
}

const PRICE_LEVEL: Record<string, string> = {
  FREE: 'Gratis', INEXPENSIVE: '💰', MODERATE: '💰💰',
  EXPENSIVE: '💰💰💰', VERY_EXPENSIVE: '💰💰💰💰',
};

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem' }}>
      <span style={{ color: '#FBBF24', letterSpacing: '-1px' }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
      <span style={{ color: '#FBBF24', fontWeight: 700 }}>{rating.toFixed(1)}</span>
      {count && <span style={{ color: 'var(--color-text-muted)' }}>({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})</span>}
    </span>
  );
}

interface DraftData {
  whatsapp: string;
  email: string;
  subject: string;
  telegram?: string;
}

interface PlaceActionCardProps {
  place: OsmPlace;
  eventContext: { name: string; type: string; date?: string; participants?: number; budget?: string };
  index?: number;
  onAddContact?: (place: OsmPlace) => void;
  onHighlight?: (place: OsmPlace) => void;
}

export default function PlaceActionCard({
  place,
  eventContext,
  index = 0,
  onAddContact,
  onHighlight,
}: PlaceActionCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const [showDraft, setShowDraft] = useState(false);
  const [draftTab, setDraftTab] = useState<'wa' | 'email' | 'tg'>('wa');
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const cfg = CAT_CONFIG[place.category] || CAT_CONFIG.other;
  const Icon = cfg.icon;
  const sl = scoreLabel(place.score);

  const loadDraft = async () => {
    if (draft) { setShowDraft(true); return; }
    setDraftLoading(true);
    try {
      const res = await apiFetch('/api/search/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place, eventContext }),
      });
      const data = await res.json();
      setDraft(data);
      setShowDraft(true);
    } catch {
      /* use fallback */
    } finally {
      setDraftLoading(false);
    }
  };

  const draftContent: Record<'wa' | 'email' | 'tg', string> = {
    wa: draft?.whatsapp || '',
    email: draft ? `Subject: ${draft.subject}\n\n${draft.email}` : '',
    tg: draft?.telegram || draft?.whatsapp || '',
  };

  const copy = async () => {
    await navigator.clipboard.writeText(draftContent[draftTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waLink = draft?.whatsapp
    ? `https://wa.me/?text=${encodeURIComponent(draft.whatsapp)}`
    : place.tags.phone
      ? `https://wa.me/${place.tags.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo, kami dari panitia ${eventContext.name}`)}`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      style={{
        background: 'var(--color-ground-1)',
        border: `1px solid ${index === 0 ? `${cfg.color}40` : 'var(--color-border)'}`,
        borderRadius: 12, overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* TOP PICK badge */}
      {index === 0 && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
          color: '#000', fontSize: '0.6rem', fontWeight: 800,
          padding: '0.18rem 0.6rem', borderBottomLeftRadius: 8,
          letterSpacing: '0.06em',
        }}>TOP PICK</div>
      )}

      {/* Card header */}
      <div style={{ padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={cfg.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cfg.label}</span>
            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: 20, background: 'var(--color-ground-2)', color: sl.color, fontWeight: 700 }}>{sl.text}</span>
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text-primary)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {place.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              <MapPin size={10} /> {place.distanceKm} km
            </span>
            {/* Google Rating */}
            {place.rating && <StarRating rating={place.rating} count={place.userRatingCount} />}
            {/* Price level */}
            {place.priceLevel && place.priceLevel !== 'FREE' && (
              <span style={{ fontSize: '0.7rem', color: '#FBBF24' }}>{PRICE_LEVEL[place.priceLevel]}</span>
            )}
            {place.tags.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-mint)' }}>
                <Phone size={10} /> Ada kontak
              </span>
            )}
            {place.tags.website && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#7C6AF5' }}>
                <Globe size={10} /> Website
              </span>
            )}
            {/* Data source badge */}
            <span style={{
              fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700,
              background: place.source === 'google-places' ? 'rgba(66,133,244,0.12)' : 'rgba(160,160,160,0.1)',
              color: place.source === 'google-places' ? '#4285F4' : 'var(--color-text-muted)',
              border: `1px solid ${place.source === 'google-places' ? 'rgba(66,133,244,0.25)' : 'var(--color-border)'}`,
            }}>
              {place.source === 'google-places' ? 'Google' : 'OSM'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.2rem', flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Address */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <MapPin size={13} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{place.address}</span>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {place.tags.opening_hours && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                    <Clock size={10} /> {place.tags.opening_hours}
                  </div>
                )}
                {place.tags.capacity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                    <Star size={10} /> Kapasitas: {place.tags.capacity}
                  </div>
                )}
                {place.tags.phone && (
                  <a href={`tel:${place.tags.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '0.2rem 0.5rem', borderRadius: 6, textDecoration: 'none' }}>
                    <Phone size={10} /> {place.tags.phone}
                  </a>
                )}
                {place.tags.website && (
                  <a href={place.tags.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#7C6AF5', background: 'rgba(124,106,245,0.1)', padding: '0.2rem 0.5rem', borderRadius: 6, textDecoration: 'none' }}>
                    <Globe size={10} /> Website
                  </a>
                )}
              </div>

              {/* Score bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Skor Relevansi</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: sl.color }}>{Math.round(place.score * 100)}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--color-ground-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${place.score * 100}%`, background: sl.color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Draft pesan */}
              {showDraft && draft && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--color-ground-0)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', gap: '0.375rem', padding: '0.625rem', borderBottom: '1px solid var(--color-border)' }}>
                    {(['wa', 'email', 'tg'] as const).map(tab => {
                      const labels = { wa: 'WhatsApp', email: 'Email', tg: 'Telegram' };
                      const colors = { wa: '#25D366', email: '#EA4335', tg: '#2CA5E0' };
                      return (
                        <button key={tab} onClick={() => setDraftTab(tab)} style={{
                          padding: '0.2rem 0.625rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                          border: `1px solid ${draftTab === tab ? colors[tab] : 'var(--color-border)'}`,
                          background: draftTab === tab ? `${colors[tab]}18` : 'transparent',
                          color: draftTab === tab ? colors[tab] : 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}>{labels[tab]}</button>
                      );
                    })}
                  </div>
                  <div style={{ padding: '0.75rem', fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>
                    {draftContent[draftTab]}
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.375rem' }}>
                    <button onClick={copy} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.375rem', borderRadius: 6, background: 'var(--color-ground-2)', border: '1px solid var(--color-border)', color: copied ? 'var(--color-mint)' : 'var(--color-text-secondary)', fontSize: '0.72rem', cursor: 'pointer' }}>
                      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'Tersalin!' : 'Salin'}
                    </button>
                    {draftTab === 'wa' && waLink && (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.375rem', borderRadius: 6, background: '#25D366', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                        <MessageCircle size={12} /> Buka WA
                      </a>
                    )}
                    {draftTab === 'email' && (
                      <a href={`mailto:${place.tags.email || ''}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.email)}`} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.375rem', borderRadius: 6, background: '#EA4335', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                        <Mail size={12} /> Buka Email
                      </a>
                    )}
                    {draftTab === 'tg' && (
                      <a href={`https://t.me/share/url?text=${encodeURIComponent(draft.telegram || draft.whatsapp)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.375rem', borderRadius: 6, background: '#2CA5E0', color: '#fff', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}>
                        <Send size={12} /> Buka Telegram
                      </a>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Google Maps button */}
                {place.googleMapsUrl && (
                  <a
                    href={place.googleMapsUrl}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 7, background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.3)', color: '#4285F4', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <MapPin size={12} /> Google Maps
                  </a>
                )}
                {/* Highlight on map (OSM) */}
                {onHighlight && !place.googleMapsUrl && (
                  <button onClick={() => onHighlight(place)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 7, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    <MapPin size={12} /> Peta
                  </button>
                )}
                <button
                  onClick={loadDraft}
                  disabled={draftLoading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 7, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`, color: cfg.color, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  {draftLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={12} />}
                  {draftLoading ? 'Membuat draft...' : showDraft ? 'Refresh Draft' : 'Buat Draft Pesan'}
                </button>
                {onAddContact && (
                  <button
                    onClick={() => { onAddContact(place); setAdded(true); }}
                    disabled={added}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 7, background: added ? 'rgba(37,208,171,0.1)' : 'transparent', border: `1px solid ${added ? 'var(--color-mint)' : 'var(--color-border)'}`, color: added ? 'var(--color-mint)' : 'var(--color-text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: added ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {added ? <CheckCircle2 size={12} /> : <UserPlus size={12} />} {added ? 'Disimpan' : 'Simpan'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
