import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
export const runtime = 'nodejs';


export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  country?: string;
  boundingBox?: [number, number, number, number];
}

/* ── Google Geocoding API ──────────────────────────────────── */
async function geocodeGoogle(query: string): Promise<GeocodeResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('No Google Maps API key');

  const encoded = encodeURIComponent(query);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}&language=id&region=ID`;

  const res = await fetch(url, { 
    headers: { 'Referer': 'http://localhost:3000/' },
    signal: AbortSignal.timeout(8000) 
  });
  if (!res.ok) throw new Error(`Google Geocoding error: ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Google Geocoding: ${data.status}`);
  }

  return (data.results as {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number }; viewport?: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } } };
    address_components?: { long_name: string; types: string[] }[];
  }[]).map(r => {
    const city = r.address_components?.find(c =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    )?.long_name;
    const country = r.address_components?.find(c => c.types.includes('country'))?.long_name;
    const vp = r.geometry.viewport;

    return {
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      displayName: r.formatted_address,
      city,
      country,
      boundingBox: vp
        ? [vp.southwest.lat, vp.northeast.lat, vp.southwest.lng, vp.northeast.lng]
        : undefined,
    } satisfies GeocodeResult;
  });
}

/* ── Google Reverse Geocoding ─────────────────────────────── */
async function reverseGeocodeGoogle(lat: number, lng: number): Promise<GeocodeResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('No Google Maps API key');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=id`;

  const res = await fetch(url, { 
    headers: { 'Referer': 'http://localhost:3000/' },
    signal: AbortSignal.timeout(8000) 
  });
  if (!res.ok) throw new Error(`Google Reverse Geocoding error: ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Google Reverse Geocoding: ${data.status}`);
  }

  const r = data.results[0] as {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components?: { long_name: string; types: string[] }[];
  };

  // Build short display name: building/establishment + road + city
  const comps = r.address_components || [];
  const establishment = comps.find(c => c.types.includes('establishment') || c.types.includes('premise'))?.long_name;
  const road = comps.find(c => c.types.includes('route'))?.long_name;
  const suburb = comps.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality'))?.long_name;
  const city = comps.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'))?.long_name;
  const country = comps.find(c => c.types.includes('country'))?.long_name;

  const shortParts = [establishment, road, suburb, city].filter(Boolean);
  const displayName = shortParts.length > 0 ? shortParts.join(', ') : r.formatted_address;

  return { lat, lng, displayName, city, country };
}

/* ── Nominatim fallback ──────────────────────────────────── */
async function geocodeNominatim(query: string): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=3&accept-language=id&countrycodes=id`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RunIT-EventApp/1.0 (contact@runit.app)', 'Accept-Language': 'id' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return [];

  return data.slice(0, 3).map((item: {
    lat: string; lon: string; display_name: string;
    address?: { city?: string; town?: string; county?: string; country?: string };
    boundingbox?: string[];
  }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
    city: item.address?.city || item.address?.town || item.address?.county || '',
    country: item.address?.country || '',
    boundingBox: item.boundingbox
      ? [parseFloat(item.boundingbox[0]), parseFloat(item.boundingbox[1]), parseFloat(item.boundingbox[2]), parseFloat(item.boundingbox[3])] as [number, number, number, number]
      : undefined,
  }));
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=id`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RunIT-EventApp/1.0', 'Accept-Language': 'id' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim reverse error: ${res.status}`);

  const data = await res.json();
  const addr = data.address || {};
  const displayName = [
    addr.building || addr.amenity || addr.tourism,
    addr.road,
    addr.suburb || addr.village || addr.hamlet,
    addr.city || addr.town || addr.county,
  ].filter(Boolean).join(', ') || data.display_name || '';

  return {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lon),
    displayName,
    city: addr.city || addr.town || addr.county || '',
    country: addr.country || '',
  };
}

/* ── POST handler ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { query, reverse, lat, lng } = body as {
      query?: string;
      reverse?: boolean;
      lat?: number;
      lng?: number;
    };

    const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY;

    /* ── Reverse geocoding ─── */
    if (reverse && lat !== undefined && lng !== undefined) {
      let result;
      let source = 'google';
      try {
        if (!hasGoogleKey) throw new Error('No Google Maps API Key');
        result = await reverseGeocodeGoogle(lat, lng);
      } catch (gErr) {
        console.warn(`[Reverse Geocode] Google failed, falling back to Nominatim:`, gErr);
        try {
          result = await reverseGeocodeNominatim(lat, lng);
          source = 'openstreetmap';
        } catch (nErr) {
          console.warn(`[Reverse Geocode] Nominatim also failed:`, nErr);
          result = { lat, lng, displayName: `${lat}, ${lng}` };
          source = 'none';
        }
      }
      return NextResponse.json({ ...result, source });
    }

    /* ── Forward geocoding ─── */
    if (query) {
      let results: GeocodeResult[] = [];
      let source = 'google';
      try {
        if (!hasGoogleKey) throw new Error('No Google Maps API Key');
        results = await geocodeGoogle(query);
      } catch (gErr) {
        console.warn(`[Forward Geocode] Google failed, falling back to Nominatim:`, gErr);
        try {
          results = await geocodeNominatim(query);
          source = 'openstreetmap';
        } catch (nErr) {
          console.warn(`[Forward Geocode] Nominatim also failed:`, nErr);
          results = [];
          source = 'none';
        }
      }
      return NextResponse.json({ results, primary: results[0] || null, source });
    }

    return NextResponse.json({ error: 'Provide query or lat+lng for reverse' }, { status: 400 });

  } catch (err: unknown) {
    console.error('[Geocode]', err);
    return NextResponse.json({ results: [], primary: null, source: 'error', error: 'Geocoding failed' }, { status: 500 });
  }
}
