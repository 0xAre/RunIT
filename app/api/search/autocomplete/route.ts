import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { rankByQuery, type LocationSuggestion } from '@/lib/location-search';
import { canUseGoogleMapsServer, getServerMapsKey } from '@/lib/google-maps-config';
export const runtime = 'nodejs';

async function autocompleteGoogle(input: string): Promise<LocationSuggestion[]> {
  const key = getServerMapsKey();
  if (!key) throw new Error('No server Google Maps API key');

  const encoded = encodeURIComponent(input);
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${key}&language=id&components=country:id`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Google Autocomplete error: ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Autocomplete: ${data.status}`);
  }

  return (data.predictions || []).map((p: {
    place_id: string;
    description: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
}

async function autocompleteNominatim(input: string): Promise<LocationSuggestion[]> {
  const encoded = encodeURIComponent(input);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=8&accept-language=id&countrycodes=id`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'RunIT-EventApp/1.0 (contact@runit.app)', 'Accept-Language': 'id' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim autocomplete error: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return [];

  return data.map((item: {
    place_id?: number;
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    address?: { city?: string; town?: string; county?: string; state?: string; country?: string };
  }) => {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.county || '';
    const region = [city, addr.state, addr.country].filter(Boolean).join(', ');
    const mainText = item.name || item.display_name.split(',')[0] || item.display_name;

    return {
      placeId: item.place_id ? String(item.place_id) : undefined,
      description: item.display_name,
      mainText,
      secondaryText: region,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    } satisfies LocationSuggestion;
  });
}

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { input } = body as { input?: string };

    if (!input || !input.trim()) {
      return NextResponse.json({ predictions: [] });
    }

    const query = input.trim();
    let predictions: LocationSuggestion[] = [];
    let source = 'openstreetmap';

    try {
      predictions = await autocompleteNominatim(query);
    } catch (nErr) {
      console.warn('[Autocomplete] Nominatim failed:', nErr);
    }

    if (!predictions.length && canUseGoogleMapsServer()) {
      try {
        predictions = await autocompleteGoogle(query);
        source = 'google';
      } catch (gErr) {
        console.warn('[Autocomplete] Google failed:', gErr);
      }
    }

    const ranked = rankByQuery(query, predictions).slice(0, 8);

    return NextResponse.json({ predictions: ranked, source });
  } catch (err: unknown) {
    console.error('[Autocomplete]', err);
    return NextResponse.json({ predictions: [], error: 'Autocomplete failed' }, { status: 500 });
  }
}
