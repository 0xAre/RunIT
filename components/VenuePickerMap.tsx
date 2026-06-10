'use client';

import { apiFetch } from '@/lib/api-fetch';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Navigation, MapPin, X, SlidersHorizontal,
  Building2, Utensils, Package, Hotel, Wrench, Music,
} from 'lucide-react';
import type { OsmPlace } from '@/app/api/search/places/route';
import type { MapMarker } from '@/components/MapComponent';
import type { LocationSuggestion } from '@/lib/location-search';

/* Lazy-load map to avoid SSR */
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', minHeight: 300, background: 'var(--color-ground-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-muted)' }} />
    </div>
  ),
});

/* ── Category config ─────────────────────────────────────── */
export type SearchCategory = 'venue' | 'catering' | 'hotel' | 'equipment' | 'sound_system' | 'vendor';

export const SEARCH_CATEGORIES: { id: SearchCategory; icon: typeof Building2; label: string; emoji: string; color: string }[] = [
  { id: 'venue',        icon: Building2, label: 'Venue',        emoji: '🏛️', color: '#7C6AF5' },
  { id: 'catering',    icon: Utensils,  label: 'Catering',     emoji: '🍽️', color: '#FBBF24' },
  { id: 'hotel',       icon: Hotel,     label: 'Hotel / Penginapan', emoji: '🏨', color: '#00ADB5' },
  { id: 'equipment',   icon: Wrench,    label: 'Perlengkapan', emoji: '🔧', color: '#F97316' },
  { id: 'sound_system',icon: Music,     label: 'Sound System', emoji: '🎤', color: '#EC4899' },
  { id: 'vendor',      icon: Package,   label: 'Vendor Lain',  emoji: '📦', color: '#25D0AB' },
];

/* ── Geocode / Reverse Geocode ─────────────────────────── */
async function geocodeSearch(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const res: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: query, componentRestrictions: { country: 'id' } }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(status);
        });
      });
      if (res && res.length > 0) {
        const primary = res[0];
        return {
          lat: primary.geometry.location.lat(),
          lng: primary.geometry.location.lng(),
          displayName: primary.formatted_address,
        };
      }
    } catch (e) {
      console.log('Client geocoder failed, falling back...', e);
    }
  }

  try {
    const res = await apiFetch('/api/search/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return data.primary || data.results?.[0] || null;
  } catch { return null; }
}

async function fetchAutocompleteSuggestions(input: string): Promise<LocationSuggestion[]> {
  try {
    const res = await apiFetch('/api/search/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const data = await res.json();
    return data.predictions || [];
  } catch {
    return [];
  }
}

async function resolveSuggestion(suggestion: LocationSuggestion): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (suggestion.lat !== undefined && suggestion.lng !== undefined) {
    return {
      lat: suggestion.lat,
      lng: suggestion.lng,
      displayName: suggestion.description,
    };
  }
  return geocodeSearch(suggestion.description);
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const res: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK') resolve(results);
          else reject(status);
        });
      });
      if (res && res.length > 0) {
        return res[0].formatted_address;
      }
    } catch (e) {
      console.log('Client reverse geocoder failed, falling back...', e);
    }
  }

  // Fallback to OSM API
  try {
    const res = await apiFetch('/api/search/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reverse: true, lat, lng }),
    });
    const data = await res.json();
    return data.displayName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
}

/* ── Props ──────────────────────────────────────────────── */
interface VenuePickerMapProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  activeCategory?: SearchCategory;
  /** Called when user confirms a venue (lat, lng, name) */
  onVenueConfirm?: (lat: number, lng: number, name: string, address: string) => void;
  /** Called when results are fetched — for parent to show PlaceActionCards */
  onResultsFetched?: (results: OsmPlace[]) => void;
  /** Height of map area */
  mapHeight?: number;
  /** If false, hide the category buttons (vendor-search mode) */
  showCategoryButtons?: boolean;
}

export default function VenuePickerMap({
  initialLat = -6.2088,
  initialLng = 106.8456,
  initialAddress = '',
  activeCategory: externalCategory,
  onVenueConfirm,
  onResultsFetched,
  mapHeight = 320,
  showCategoryButtons = true,
}: VenuePickerMapProps) {
  const [center, setCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [addressLabel, setAddressLabel] = useState(initialAddress || 'Jakarta, Indonesia');
  const [radiusKm, setRadiusKm] = useState(3);
  const [category, setCategory] = useState<SearchCategory>(externalCategory || 'venue');
  const [searching, setSearching] = useState(false);
  const [places, setPlaces] = useState<OsmPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'google-places' | 'openstreetmap-overpass' | null>(null);
  const [youResults, setYouResults] = useState<any[]>([]);
  
  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<LocationSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [, setMapsLoaded] = useState(false);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Maps script
  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval>;
    async function loadMaps() {
      if ((window as any).google?.maps) {
        setMapsLoaded(true);
        return;
      }
      if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
        checkInterval = setInterval(() => {
          if ((window as any).google?.maps) {
            clearInterval(checkInterval);
            setMapsLoaded(true);
          }
        }, 500);
        return;
      }
      try {
        const res = await apiFetch('/api/config/maps');
        const data = await res.json();
        if (data.apiKey) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => setMapsLoaded(true);
          document.head.appendChild(script);
        }
      } catch (e) {
        console.error('Failed to load Google Maps API', e);
      }
    }
    loadMaps();
    return () => { if (checkInterval) clearInterval(checkInterval); };
  }, []);

  /* Build map markers from OSM places */
  const mapMarkers: MapMarker[] = places.map(p => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    category: (p.category === 'sound_system' ? 'equipment' : p.category) as MapMarker['category'],
    address: p.address,
    rating: `${Math.round(p.score * 100)}% match`,
    reasoning: `Jarak: ${p.distanceKm} km${p.tags.phone ? ' · Ada kontak' : ''}`,
  }));

  /* Address search box with autocomplete debounce */
  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    setSearchError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!val.trim()) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    
    debounceRef.current = setTimeout(async () => {
      setQueryLoading(true);
      setSearchError('');
      try {
        const predictions = await fetchAutocompleteSuggestions(val);
        setAutocompleteResults(predictions);
        setShowAutocomplete(predictions.length > 0);
      } catch (e) {
        console.error('Autocomplete error', e);
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      } finally {
        setQueryLoading(false);
      }
    }, 300);
  };

  const applySearchResult = (result: { lat: number; lng: number; displayName: string }) => {
    setCenter([result.lat, result.lng]);
    setAddressLabel(result.displayName);
    setSearchQuery('');
    setAutocompleteResults([]);
    setShowAutocomplete(false);
    setSearchError('');
  };

  const runLocationSearch = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    setQueryLoading(true);
    setSearchError('');

    let suggestions = autocompleteResults;
    if (!suggestions.length) {
      suggestions = await fetchAutocompleteSuggestions(query);
      setAutocompleteResults(suggestions);
    }

    if (suggestions.length > 0) {
      const best = suggestions[0];
      const resolved = await resolveSuggestion(best);
      setQueryLoading(false);
      if (resolved) {
        applySearchResult(resolved);
        return;
      }
    }

    const direct = await geocodeSearch(query.includes('indonesia') ? query : `${query}, Indonesia`);
    setQueryLoading(false);
    if (direct) {
      applySearchResult(direct);
      return;
    }

    setSearchError('Lokasi tidak ditemukan. Pilih salah satu rekomendasi di bawah atau coba tambahkan kota (mis. Jakarta).');
    setShowAutocomplete(suggestions.length > 0);
  };

  const handleSelectAutocomplete = async (suggestion: LocationSuggestion) => {
    setShowAutocomplete(false);
    setSearchQuery(suggestion.description);
    setQueryLoading(true);
    setSearchError('');
    const result = await resolveSuggestion(suggestion);
    setQueryLoading(false);
    if (result) {
      applySearchResult(result);
    } else {
      setSearchError('Gagal memuat lokasi. Coba pilih rekomendasi lain.');
    }
  };

  /* Click on map → set new center, reverse geocode */
  const handleLocationPick = useCallback(async (lat: number, lng: number) => {
    setCenter([lat, lng]);
    const addr = await reverseGeocode(lat, lng);
    setAddressLabel(addr);
  }, []);

  /* Geolocation */
  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCenter([lat, lng]);
        const addr = await reverseGeocode(lat, lng);
        setAddressLabel(addr);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  /* Script search */
  const handleSearch = async (cat?: SearchCategory) => {
    const searchCat = cat || category;
    setSearching(true);
    setPlaces([]);
    try {
      const res = await apiFetch('/api/search/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: center[0], lng: center[1], radiusKm, category: searchCat, limit: 12, locationName: addressLabel }),
      });
      const data = await res.json();
      const results: OsmPlace[] = data.places || [];
      setPlaces(results);
      setYouResults(data.youRecommendations || []);
      setDataSource(data.source || null);
      onResultsFetched?.(results);
    } catch (err) {
      console.error('[VenuePickerMap] search error', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ── Address search bar ──────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={async e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                await runLocationSearch(searchQuery);
              }
            }}
            onFocus={() => {
              if (autocompleteResults.length > 0) setShowAutocomplete(true);
            }}
            placeholder="Ketik lokasi (Gedung SMESCO)..."
            style={{
              width: '100%', padding: '0.6rem 4.5rem 0.6rem 2.25rem', borderRadius: 8,
              background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button onClick={async () => {
             if (debounceRef.current) clearTimeout(debounceRef.current);
             if (searchQuery.trim()) await runLocationSearch(searchQuery);
          }} style={{ position: 'absolute', right: '0.3rem', background: '#7C6AF5', color: '#fff', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {queryLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Cari'}
          </button>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showAutocomplete && autocompleteResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                  background: 'var(--color-ground-1)', border: '1px solid var(--color-border)',
                  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1100,
                  overflow: 'hidden'
                }}
              >
                {autocompleteResults.map((res, i) => (
                  <button
                    key={res.placeId || `${res.description}-${i}`}
                    onClick={() => handleSelectAutocomplete(res)}
                    style={{
                      width: '100%', padding: '0.6rem 0.875rem', textAlign: 'left',
                      background: 'transparent', border: 'none', borderBottom: i < autocompleteResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                      color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.15rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-ground-2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{res.mainText}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                      {res.secondaryText || res.description}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={handleGeolocate} disabled={geoLoading} title="Lokasi Saya" style={{ padding: '0 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-ground-1)', color: geoLoading ? 'var(--color-mint)' : 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {geoLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={15} />}
        </button>
        <button onClick={() => setShowRadius(r => !r)} title="Atur radius" style={{ padding: '0 0.75rem', borderRadius: 8, border: `1px solid ${showRadius ? 'var(--color-mint)' : 'var(--color-border)'}`, background: showRadius ? 'rgba(37,208,171,0.08)' : 'var(--color-ground-1)', color: showRadius ? 'var(--color-mint)' : 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <SlidersHorizontal size={15} />
        </button>
      </div>

      {searchError && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ color: 'var(--color-red)', fontSize: '0.75rem', paddingLeft: '0.5rem', marginTop: '-0.25rem' }}>
          {searchError}
        </motion.div>
      )}

      {/* Radius slider */}
      <AnimatePresence>
        {showRadius && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.875rem', background: 'var(--color-ground-1)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              <MapPin size={13} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Radius pencarian</span>
              <input type="range" min={0.5} max={20} step={0.5} value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} style={{ flex: 1, accentColor: '#7C6AF5', height: 4 }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7C6AF5', minWidth: 50, textAlign: 'right' }}>{radiusKm} km</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current location label */}
      {addressLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-ground-1)', padding: '0.35rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          <MapPin size={11} color="var(--color-mint)" />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addressLabel}</span>
          {onVenueConfirm && (
            <button onClick={() => onVenueConfirm(center[0], center[1], addressLabel.split(',')[0] || 'Venue', addressLabel)}
              style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-mint)', background: 'rgba(37,208,171,0.12)', border: '1px solid var(--color-mint)', borderRadius: 4, padding: '0.15rem 0.5rem', cursor: 'pointer', flexShrink: 0 }}>
              Pilih lokasi ini ✓
            </button>
          )}
        </div>
      )}

      {/* Category buttons */}
      {showCategoryButtons && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {SEARCH_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setCategory(cat.id);
                handleSearch(cat.id);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                border: `1px solid ${category === cat.id ? cat.color : 'var(--color-border)'}`,
                background: category === cat.id ? `${cat.color}18` : 'transparent',
                color: category === cat.id ? cat.color : 'var(--color-text-muted)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div style={{ height: mapHeight, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
        <MapComponent
          center={center}
          zoom={14}
          radiusKm={radiusKm}
          markers={mapMarkers}
          interactive
          showCrosshair
          centerLabel={addressLabel ? addressLabel.split(',')[0] : undefined}
          onLocationPick={handleLocationPick}
          style={{ height: '100%', minHeight: mapHeight }}
        />
        {/* Click hint overlay */}
        {places.length === 0 && !searching && (
          <div style={{
            position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(20,22,28,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '0.35rem 0.875rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: '0.4rem', pointerEvents: 'none',
          }}>
            <MapPin size={11} /> Klik peta untuk pindah pin
          </div>
        )}
        {/* Data source badge — top right */}
        {dataSource && places.length > 0 && (
          <div style={{
            position: 'absolute', top: '0.6rem', right: '0.6rem',
            background: dataSource === 'google-places' ? 'rgba(66,133,244,0.9)' : 'rgba(37,208,171,0.85)',
            backdropFilter: 'blur(6px)',
            border: `1px solid ${dataSource === 'google-places' ? 'rgba(66,133,244,0.6)' : 'rgba(37,208,171,0.4)'}`,
            borderRadius: 20, padding: '0.25rem 0.625rem',
            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: '0.3rem', pointerEvents: 'none',
            zIndex: 1000,
          }}>
            {dataSource === 'google-places' ? '📍 Google Maps' : '🗺️ OpenStreetMap'}
          </div>
        )}
        {/* Searching overlay */}
        {searching && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: 12 }}>
            <Loader2 size={28} color="#4285F4" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Mencari vendor terdekat...</p>
          </div>
        )}
      </div>

      {/* Search button */}
      <button
        onClick={() => handleSearch()}
        disabled={searching}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          padding: '0.65rem', borderRadius: 10,
          background: searching ? 'var(--color-ground-2)' : 'linear-gradient(135deg, #7C6AF5, #00ADB5)',
          border: 'none', color: searching ? 'var(--color-text-muted)' : '#fff',
          fontWeight: 700, fontSize: '0.875rem', cursor: searching ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)', transition: 'all 0.15s', position: 'relative',
        }}
      >
        {searching
          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Mencari...</>
          : <><Search size={15} /> Cari {SEARCH_CATEGORIES.find(c => c.id === category)?.label || 'Tempat'} di Area Ini</>
        }
        {places.length > 0 && !searching && (
          <span style={{
            position: 'absolute', top: -8, right: -8,
            background: '#f43f5e', color: '#fff',
            borderRadius: 20, padding: '0.1rem 0.45rem',
            fontSize: '0.65rem', fontWeight: 800,
            minWidth: 20, textAlign: 'center',
            boxShadow: '0 2px 6px rgba(244,63,94,0.4)',
          }}>
            {places.length}
          </span>
        )}
      </button>

      {/* No results */}
      {!searching && places.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '2rem 1.5rem',
          background: 'var(--color-ground-1)', borderRadius: 12,
          border: '1px dashed var(--color-border)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.6 }}>🔍</div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.35rem' }}>
            Belum ada {SEARCH_CATEGORIES.find(c => c.id === category)?.label} ditemukan
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
            📍 Klik tombol <strong style={{ color: '#7C6AF5' }}>Cari</strong> di bawah atau pilih kategori vendor<br />
            🔄 Geser pin di peta untuk mencari di area lain<br />
            📏 Perbesar radius hingga <strong style={{ color: 'var(--color-mint)' }}>20 km</strong> untuk jangkauan lebih luas
          </p>
        </div>
      )}

      {/* Web Recommendations (You.com) */}
      {!searching && youResults.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
