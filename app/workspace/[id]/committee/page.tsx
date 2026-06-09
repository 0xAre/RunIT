'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import { useLangStore } from '@/store/langStore';
import {
  Bot, MapPin, CheckCircle2, ChevronRight, Search, Loader2,
  Building2, RefreshCw, ArrowRight, Inbox, AlertCircle,
} from 'lucide-react';
import { dict } from '@/lib/i18n';
import type { OsmPlace } from '@/app/api/search/places/route';
import type { MapMarker } from '@/components/MapComponent';
import { SEARCH_CATEGORIES, type SearchCategory } from '@/components/VenuePickerMap';

/* ── Lazy imports (map + heavy components) ───────────────── */
const VenuePickerMap = dynamic(() => import('@/components/VenuePickerMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, background: 'var(--color-ground-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
    </div>
  ),
});

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });
const PlaceActionCard = dynamic(() => import('@/components/PlaceActionCard'), { ssr: false });

/* ── Geocode venue address ────────────────────────────────── */
async function geocodeVenue(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch('/api/search/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: address }),
    });
    const data = await res.json();
    return data.primary ? { lat: data.primary.lat, lng: data.primary.lng } : null;
  } catch { return null; }
}

/* ── Search places via script engine ─────────────────────── */
async function searchPlaces(lat: number, lng: number, category: SearchCategory, radiusKm: number, locationName: string): Promise<{ places: OsmPlace[], youRecommendations: any[] }> {
  const res = await fetch('/api/search/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, radiusKm, category, limit: 12, locationName }),
  });
  const data = await res.json();
  return {
    places: data.places || [],
    youRecommendations: data.youRecommendations || [],
  };
}

/* ── Main Page ────────────────────────────────────────────── */
export default function CommitteePage() {
  const { currentEvent, addAgentAction } = useEventStore();
  const { lang } = useLangStore();
  const t = dict[lang];
  const isId = lang === 'id';

  /* Phase state */
  type Phase = 'venue-search' | 'vendor-search';
  const [phase, setPhase] = useState<Phase>('venue-search');

  /* Venue coords */
  const [venueLat, setVenueLat] = useState<number>(-6.2088);
  const [venueLng, setVenueLng] = useState<number>(106.8456);
  const [venueName, setVenueName] = useState<string>('');
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [venueGeocoding, setVenueGeocoding] = useState(false);

  /* Vendor search state */
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('catering');
  const [radiusKm, setRadiusKm] = useState(3);
  const [vendorResults, setVendorResults] = useState<OsmPlace[]>([]);
  const [youResults, setYouResults] = useState<any[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [highlightedPlace, setHighlightedPlace] = useState<OsmPlace | null>(null);
  const [error, setError] = useState('');

  /* Derive whether venue is already set on the event */
  const existingVenue = currentEvent?.venue || '';

  /* Auto-geocode existing venue on mount */
  useEffect(() => {
    if (!existingVenue) return;
    setVenueGeocoding(true);
    geocodeVenue(existingVenue).then(coords => {
      if (coords) {
        setVenueLat(coords.lat);
        setVenueLng(coords.lng);
        setVenueAddress(existingVenue);
        setVenueName(existingVenue.split(',')[0]);
        setPhase('vendor-search');
      }
      setVenueGeocoding(false);
    });
  }, [existingVenue]);

  /* Venue confirmed from picker */
  const handleVenueConfirm = useCallback((lat: number, lng: number, name: string, address: string) => {
    setVenueLat(lat);
    setVenueLng(lng);
    setVenueName(name);
    setVenueAddress(address);
    setPhase('vendor-search');
    setVendorResults([]);
  }, []);

  /* Search vendors by category */
  const handleVendorSearch = useCallback(async (cat?: SearchCategory) => {
    const searchCat = cat || activeCategory;
    setVendorLoading(true);
    setError('');
    setVendorResults([]);
    setYouResults([]);
    try {
      const { places, youRecommendations } = await searchPlaces(venueLat, venueLng, searchCat, radiusKm, venueName || venueAddress);
      setVendorResults(places);
      setYouResults(youRecommendations);
      if (places.length === 0) setError(`Tidak ditemukan ${SEARCH_CATEGORIES.find(c => c.id === searchCat)?.label || 'tempat'} dalam radius ${radiusKm} km. Coba perbesar radius.`);
    } catch {
      setError('Gagal mencari. Periksa koneksi internet Anda.');
    } finally {
      setVendorLoading(false);
    }
  }, [venueLat, venueLng, venueName, venueAddress, activeCategory, radiusKm]);

  /* Add place to external contacts */
  const handleAddContact = useCallback((place: OsmPlace) => {
    addAgentAction({
      id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentType: 'procurement',
      title: `Kontak: ${place.name}`,
      description: place.address,
      reasoning: `Jarak: ${place.distanceKm} km — Skor: ${Math.round(place.score * 100)}%`,
      status: 'pending',
      category: (place.category === 'sound_system' ? 'vendor' : place.category) as 'venue' | 'vendor' | 'sponsor' | 'catering' | 'equipment' | 'permit' | 'comms' | 'other',
      commsPayload: {
        recipientName: place.name,
        recipientPhone: place.tags.phone || '',
        recipientEmail: place.tags.email || '',
        whatsappDraft: '',
        emailDraft: '',
        subject: '',
      },
      createdAt: new Date().toISOString(),
    });
  }, [addAgentAction]);

  /* Build map markers for vendor map */
  const vendorMapMarkers: MapMarker[] = vendorResults.map(p => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    category: (p.category === 'sound_system' ? 'equipment' : p.category) as MapMarker['category'],
    address: p.address,
    rating: `${Math.round(p.score * 100)}%`,
    reasoning: `${p.distanceKm} km dari venue`,
  }));

  if (!currentEvent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Event tidak ditemukan.</p>
      </div>
    );
  }

  if (venueGeocoding) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
        <Loader2 size={28} color="var(--color-mint)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Menentukan lokasi venue "{existingVenue}"...</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <div style={{ padding: '0.45rem', background: 'rgba(124,106,245,0.12)', borderRadius: 8 }}>
                <Bot size={20} color="#7C6AF5" />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {t.sideAiCommittee}
              </h1>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', maxWidth: 520, lineHeight: 1.5 }}>
              {isId
                ? 'Script mencari venue & vendor dari OpenStreetMap — AI hanya membuat draft pesan saat diminta.'
                : 'Script finds venues & vendors from OpenStreetMap — AI only drafts messages when requested.'}
            </p>
          </div>

          {/* Phase indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: phase === 'venue-search' ? 'rgba(124,106,245,0.12)' : 'rgba(37,208,171,0.1)', border: `1px solid ${phase === 'venue-search' ? 'rgba(124,106,245,0.3)' : 'rgba(37,208,171,0.3)'}` }}>
              <MapPin size={13} color={phase === 'venue-search' ? '#7C6AF5' : 'var(--color-mint)'} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: phase === 'venue-search' ? '#7C6AF5' : 'var(--color-mint)' }}>
                {phase === 'venue-search' ? '① Tentukan Venue' : '② Cari Vendor'}
              </span>
            </div>
            {phase === 'vendor-search' && (
              <button onClick={() => { setPhase('venue-search'); setVendorResults([]); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: 20, padding: '0.3rem 0.65rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <RefreshCw size={11} /> Ganti Venue
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* ═══ PHASE 1: VENUE SEARCH ═══════════════════════════ */}
          {phase === 'venue-search' && (
            <motion.div key="venue-search" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <Building2 size={16} color="#7C6AF5" />
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Pilih Lokasi Venue
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-2)', padding: '0.1rem 0.5rem', borderRadius: 10 }}>
                    Klik peta untuk pin
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {existingVenue
                    ? `Event ini mencantumkan venue "${existingVenue}" — tetapi lokasinya gagal terdeteksi. Cari manual di bawah.`
                    : 'Klik di peta untuk set pinpoint, atau ketik nama venue di kotak pencarian. Setelah venue dipilih, kita cari vendor terdekat.'}
                </p>

                <VenuePickerMap
                  initialLat={venueLat}
                  initialLng={venueLng}
                  initialAddress={venueAddress}
                  activeCategory="venue"
                  onVenueConfirm={handleVenueConfirm}
                  onResultsFetched={() => {}}
                  mapHeight={340}
                  showCategoryButtons={false}
                />
              </div>


            </motion.div>
          )}

          {/* ═══ PHASE 2: VENDOR SEARCH ══════════════════════════ */}
          {phase === 'vendor-search' && (
            <motion.div key="vendor-search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

              {/* Venue chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', background: 'rgba(37,208,171,0.08)', border: '1px solid rgba(37,208,171,0.25)', borderRadius: 10, marginBottom: '1rem' }}>
                <CheckCircle2 size={14} color="var(--color-mint)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-mint)' }}>Venue terpilih: </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{venueName || venueAddress}</span>
                </div>
                <MapPin size={12} color="var(--color-text-muted)" />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{venueLat.toFixed(4)}, {venueLng.toFixed(4)}</span>
              </div>

              {/* Layout: left cards + right map */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">

                {/* LEFT: Category + Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>

                  {/* Category tabs */}
                  <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.875rem' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem' }}>
                      Cari kebutuhan lain terdekat:
                    </p>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {SEARCH_CATEGORIES.filter(c => c.id !== 'venue').map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setActiveCategory(cat.id);
                            handleVendorSearch(cat.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.3rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                            border: `1px solid ${activeCategory === cat.id ? cat.color : 'var(--color-border)'}`,
                            background: activeCategory === cat.id ? `${cat.color}18` : 'transparent',
                            color: activeCategory === cat.id ? cat.color : 'var(--color-text-muted)',
                            cursor: 'pointer', transition: 'all 0.12s',
                          }}
                        >
                          <span>{cat.emoji}</span> {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Radius slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Radius:</span>
                      <input type="range" min={0.5} max={15} step={0.5} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} style={{ flex: 1, accentColor: '#7C6AF5', height: 4 }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C6AF5', minWidth: 42 }}>{radiusKm} km</span>
                      <button onClick={() => handleVendorSearch()} disabled={vendorLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', borderRadius: 7, background: '#7C6AF5', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        {vendorLoading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={11} />}
                        Cari
                      </button>
                    </div>
                  </div>

                  {/* Results */}
                  <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {vendorLoading && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '1rem', opacity: 1 - i * 0.2 }}>
                            <div style={{ height: 10, width: '30%', background: 'var(--color-ground-2)', borderRadius: 4, marginBottom: '0.5rem' }} />
                            <div style={{ height: 16, width: '65%', background: 'var(--color-ground-2)', borderRadius: 4, marginBottom: '0.375rem' }} />
                            <div style={{ height: 10, width: '80%', background: 'var(--color-ground-2)', borderRadius: 4 }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {error && !vendorLoading && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.875rem', background: 'rgba(255,99,105,0.07)', border: '1px solid rgba(255,99,105,0.25)', borderRadius: 10 }}>
                        <AlertCircle size={14} color="var(--color-red)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-red)', lineHeight: 1.5 }}>{error}</p>
                      </div>
                    )}

                    {!vendorLoading && vendorResults.length === 0 && !error && (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--color-ground-1)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                        <Inbox size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem', fontSize: '0.9rem' }}>
                          Pilih kategori untuk mulai
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                          Klik salah satu kategori di atas, lalu script akan mencari dari OpenStreetMap.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                          {['🍽️ Catering', '🏨 Hotel', '🔧 Equipment'].map(s => (
                            <span key={s} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', background: 'var(--color-ground-2)', borderRadius: 20, color: 'var(--color-text-muted)' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!vendorLoading && vendorResults.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{vendorResults.length} tempat ditemukan via OpenStreetMap</span>
                          <ChevronRight size={12} color="var(--color-text-muted)" />
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-mint)', fontWeight: 600 }}>Klik "Buat Draft Pesan" untuk aktifkan AI</span>
                        </div>
                        {vendorResults.map((place, i) => (
                          <PlaceActionCard
                            key={place.id}
                            place={place}
                            eventContext={{
                              name: currentEvent.name,
                              type: currentEvent.type,
                              date: currentEvent.timeline,
                              participants: currentEvent.participants,
                              budget: currentEvent.budget,
                            }}
                            index={i}
                            onHighlight={p => setHighlightedPlace(p)}
                            onAddContact={handleAddContact}
                          />
                        ))}
                      </>
                    )}

                    {/* Web Recommendations (You.com) */}
                    {!vendorLoading && youResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: vendorResults.length > 0 || error ? '0.5rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Web Recommendations</span>
                          <div style={{ height: 1, flex: 1, background: 'var(--color-border)' }} />
                          <span style={{ fontSize: '0.65rem', background: '#2B2D31', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: 4 }}>Powered by You.com</span>
                        </div>
                        {youResults.map((rec, i) => (
                          <a key={i} href={rec.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem', transition: 'all 0.2s' }}>
                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{rec.title}</p>
                            {rec.snippets && rec.snippets[0] && (
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rec.snippets[0]}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: Map */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0, position: 'sticky', top: 0 }}>
                  <div style={{ height: '100%', minHeight: 400 }}>
                    <MapComponent
                      center={[venueLat, venueLng]}
                      zoom={14}
                      radiusKm={radiusKm}
                      markers={vendorMapMarkers}
                      onMarkerClick={m => {
                        const place = vendorResults.find(p => p.id === m.id);
                        if (place) setHighlightedPlace(place);
                      }}
                      style={{ height: '100%', minHeight: 400 }}
                    />
                  </div>

                  {/* Highlighted place info */}
                  <AnimatePresence>
                    {highlightedPlace && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        style={{ padding: '0.75rem 1rem', background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                      >
                        <MapPin size={14} color="#7C6AF5" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlightedPlace.name}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{highlightedPlace.distanceKm} km dari venue · {Math.round(highlightedPlace.score * 100)}% match</p>
                        </div>
                        <button onClick={() => setHighlightedPlace(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>✕</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
