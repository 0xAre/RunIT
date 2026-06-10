import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { canUseGoogleMapsServer, getServerMapsKey } from '@/lib/google-maps-config';

/* ── Types ──────────────────────────────────────────────────── */
export interface OsmPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  category: 'venue' | 'catering' | 'hotel' | 'equipment' | 'vendor' | 'sound_system' | 'other';
  distanceKm: number;
  score: number;
  source: 'openstreetmap' | 'google-places';
  rating?: number;           // Google rating (1-5)
  userRatingCount?: number;  // Google review count
  priceLevel?: 'FREE' | 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
  googlePlaceId?: string;
  googleMapsUrl?: string;
  tags: {
    phone?: string;
    website?: string;
    opening_hours?: string;
    email?: string;
    capacity?: string;
    description?: string;
    [key: string]: string | undefined;
  };
}

/* ── Google Places Category Mapping ──────────────────────── */
const GOOGLE_PLACE_TYPES: Record<string, string[]> = {
  venue: [
    'event_venue', 'convention_center', 'banquet_hall', 'auditorium',
    'performing_arts_theater', 'community_center', 'stadium',
  ],
  catering: [
    'catering_service', 'restaurant', 'meal_delivery', 'meal_takeaway',
    'food_delivery', 'cafe',
  ],
  hotel: [
    'hotel', 'motel', 'hostel', 'lodging', 'extended_stay_hotel',
    'bed_and_breakfast', 'resort_hotel',
  ],
  equipment: [
    'store', 'electronics_store', 'rental_service', 'furniture_store',
    'home_goods_store',
  ],
  sound_system: [
    'electronics_store', 'musical_instrument_store', 'home_audio_store',
    'rental_service',
  ],
  vendor: [
    'store', 'shopping_mall', 'wholesaler', 'supermarket',
    'department_store', 'convenience_store',
  ],
};

function resolveReferer(req: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  }
  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  if (origin) {
    try {
      return `${new URL(origin).origin}/`;
    } catch {
      // fall through to localhost default
    }
  }
  return 'http://localhost:3000/';
}

/* ── Google Places Nearby Search (API v1) ────────────────── */
async function searchGooglePlaces(
  lat: number, lng: number, radiusM: number, category: string, limit: number, referer: string
): Promise<OsmPlace[]> {
  const key = getServerMapsKey();
  if (!key) throw new Error('No server Google Maps API key');

  const includedTypes = GOOGLE_PLACE_TYPES[category] || GOOGLE_PLACE_TYPES.vendor;
  const radiusCapped = Math.min(radiusM, 50000); // Google max 50km

  const body = {
    includedTypes,
    maxResultCount: Math.min(limit, 20),
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusCapped,
      },
    }
  };

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'Referer': referer,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.regularOpeningHours',
        'places.googleMapsUri',
      ].join(','),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Places API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const places = (data.places || []) as {
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    googleMapsUri?: string;
  }[];

  return places
    .filter(p => p.location && p.displayName?.text)
    .map(p => {
      const plat = p.location!.latitude;
      const plng = p.location!.longitude;
      const distKm = haversineKm(lat, lng, plat, plng);

      const place: OsmPlace = {
        id: `google-${p.id}`,
        name: p.displayName!.text,
        lat: plat,
        lng: plng,
        address: p.formattedAddress || 'Alamat tidak tersedia',
        category: category as OsmPlace['category'],
        distanceKm: Math.round(distKm * 100) / 100,
        score: 0,
        source: 'google-places',
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        priceLevel: p.priceLevel as OsmPlace['priceLevel'],
        googlePlaceId: p.id,
        googleMapsUrl: p.googleMapsUri,
        tags: {
          phone: p.nationalPhoneNumber,
          website: p.websiteUri,
          opening_hours: p.regularOpeningHours?.weekdayDescriptions?.[0],
        },
      };

      place.score = scoreGooglePlace(place, radiusM / 1000);
      return place;
    })
    .filter(p => p.distanceKm <= radiusM / 1000)
    .sort((a, b) => a.distanceKm - b.distanceKm); // Sort strictly by distance to prioritize nearest
}

/* ── Scoring for Google Places ───────────────────────────── */
function scoreGooglePlace(place: OsmPlace, radiusKm: number): number {
  // Distance score (closer = better) — 30%
  const distScore = Math.max(0, (radiusKm - place.distanceKm) / radiusKm) * 0.3;
  // Rating score — 40% (Google rating 1-5 → 0-1)
  const ratingScore = place.rating ? ((place.rating - 1) / 4) * 0.4 : 0.1;
  // Popularity score — 20% (more reviews = more legit)
  const popScore = place.userRatingCount
    ? Math.min(1, place.userRatingCount / 200) * 0.2
    : 0;
  // Contact info completeness — 10%
  const hasPhone = !!place.tags.phone;
  const hasWebsite = !!place.tags.website;
  const contactScore = ((hasPhone ? 1 : 0) + (hasWebsite ? 1 : 0)) / 2 * 0.1;

  return Math.min(1, Math.round((distScore + ratingScore + popScore + contactScore) * 100) / 100);
}

/* ── Overpass QL Templates (OSM fallback) ───────────────── */
function buildOverpassQuery(lat: number, lng: number, radiusM: number, category: string): string {
  const bbox = `(around:${radiusM},${lat},${lng})`;
  const filters: Record<string, string[]> = {
    venue: [
      `node["amenity"~"conference_centre|event_venue|community_centre|social_centre|hall"]${bbox};`,
      `way["amenity"~"conference_centre|event_venue|community_centre|social_centre|hall"]${bbox};`,
      `node["leisure"="hall"]${bbox};`,
      `node["building"~"civic|hall|public"]${bbox};`,
      `node["amenity"="theatre"]${bbox};`,
      `node["tourism"="attraction"]["name"]${bbox};`,
    ],
    catering: [
      `node["amenity"~"restaurant|catering|cafe"]${bbox};`,
      `way["amenity"~"restaurant|catering"]${bbox};`,
      `node["shop"="deli"]${bbox};`,
    ],
    hotel: [
      `node["tourism"~"hotel|hostel|motel|guest_house"]${bbox};`,
      `way["tourism"~"hotel|hostel|motel"]${bbox};`,
    ],
    equipment: [
      `node["shop"~"electronics|rental"]${bbox};`,
      `node["amenity"="rental"]${bbox};`,
      `node["shop"="musical_instrument"]${bbox};`,
    ],
    sound_system: [
      `node["shop"="musical_instrument"]${bbox};`,
      `node["amenity"="rental"]${bbox};`,
    ],
    vendor: [
      `node["shop"~"general|party|event|decoration|printing"]${bbox};`,
      `node["office"~"company|logistics|supplier"]${bbox};`,
    ],
  };
  const lines = filters[category] || filters.vendor;
  return `[out:json][timeout:20];\n(\n  ${lines.join('\n  ')}\n);\nout body;\n>;\nout skel qt;`;
}

/* ── Haversine Distance ───────────────────────────────────── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Scoring (OSM) ──────────────────────────────────────── */
function scoreOsmPlace(place: OsmPlace, radiusKm: number): number {
  const distScore = Math.max(0, (radiusKm - place.distanceKm) / radiusKm) * 0.4;
  const hasPhone = !!(place.tags.phone || place.tags['contact:phone']);
  const hasWebsite = !!(place.tags.website || place.tags['contact:website']);
  const hasHours = !!place.tags.opening_hours;
  const hasCapacity = !!place.tags.capacity;
  const completeness = ((hasPhone ? 1 : 0) + (hasWebsite ? 1 : 0) + (hasHours ? 1 : 0) + (hasCapacity ? 0.5 : 0)) / 3.5;
  const completenessScore = completeness * 0.35;
  const name = place.name || '';
  const nameScore = name.length > 5 && !/^(node|way|rel)/i.test(name) ? 0.25 : 0.05;
  return Math.min(1, distScore + completenessScore + nameScore);
}

/* ── Build address from OSM tags ────────────────────────── */
function buildAddress(tags: Record<string, string | undefined>): string {
  const parts = [
    tags['addr:street'] && tags['addr:housenumber']
      ? `${tags['addr:street']} No. ${tags['addr:housenumber']}`
      : tags['addr:street'],
    tags['addr:suburb'] || tags['addr:village'],
    tags['addr:city'] || tags['addr:county'],
    tags['addr:state'],
  ].filter(Boolean);
  return parts.join(', ') || 'Alamat tidak tersedia';
}

/* ── OSM Fallback Search ────────────────────────────────── */
async function searchOsmPlaces(
  lat: number, lng: number, radiusKm: number, category: string, limit: number
): Promise<OsmPlace[]> {
  const radiusM = Math.min(radiusKm * 1000, 25000);
  const query = buildOverpassQuery(lat, lng, radiusM, category);

  const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'RunIT-EventApp/1.0 (contact@runit.app)'
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(18000),
  });
  if (!overpassRes.ok) throw new Error(`Overpass API error: ${overpassRes.status}`);

  const osmData = await overpassRes.json();
  const elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] =
    osmData.elements || [];

  const places: OsmPlace[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:id'] || '';
    if (!name || name.length < 2) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const distKm = haversineKm(lat, lng, elLat, elLng);
    if (distKm > radiusKm) continue;

    const place: OsmPlace = {
      id: `osm-${el.type}-${el.id}`,
      name,
      lat: elLat,
      lng: elLng,
      address: buildAddress(tags),
      category: category as OsmPlace['category'],
      distanceKm: Math.round(distKm * 100) / 100,
      score: 0,
      source: 'openstreetmap',
      tags: {
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
        opening_hours: tags.opening_hours,
        email: tags.email || tags['contact:email'],
        capacity: tags.capacity,
        description: tags.description,
      },
    };
    place.score = Math.round(scoreOsmPlace(place, radiusKm) * 100) / 100;
    places.push(place);
  }

  places.sort((a, b) => a.distanceKm - b.distanceKm); // Sort strictly by distance to prioritize nearest
  return places.slice(0, limit);
}

import { searchYouCom } from '@/lib/you';

export const runtime = 'nodejs';


/* ── POST handler ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { lat, lng, radiusKm = 5, category = 'venue', limit = 15, locationName = '' } = body as {
      lat: number; lng: number; radiusKm?: number; category?: string; limit?: number; locationName?: string;
    };

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const categoryLabel = {
      venue: 'venue event',
      catering: 'jasa catering',
      hotel: 'penginapan hotel',
      equipment: 'sewa perlengkapan event',
      sound_system: 'sewa sound system',
      vendor: 'vendor event'
    }[category] || 'vendor';

    let places: OsmPlace[] = [];
    let source = 'google-places';

    try {
      places = await searchOsmPlaces(lat, lng, radiusKm, category, limit);
      source = 'openstreetmap-overpass';
      console.log(`[Search Places] OSM: ${places.length} results for ${category}`);
    } catch (osmErr) {
      console.warn('[Search Places] OSM failed:', osmErr);
      places = [];
    }

    const referer = resolveReferer(req);

    if (!places.length && canUseGoogleMapsServer()) {
      try {
        places = await searchGooglePlaces(lat, lng, radiusKm * 1000, category, limit, referer);
        source = 'google-places';
        console.log(`[Search Places] Google: ${places.length} results for ${category}`);
      } catch (gErr) {
        console.warn('[Search Places] Google Places failed:', gErr);
      }
    }

    // Fetch recommendations from You.com in parallel (no await blocking the main places if we don't want to, but we await here for simplicity)
    let youRecommendations: any[] = [];
    try {
      const queryArea = locationName ? locationName.split(',')[0] : 'area ini';
      youRecommendations = await searchYouCom(`rekomendasi ${categoryLabel} terbaik di ${queryArea}`, { count: 3 });
    } catch (yErr) {
      console.warn(`[Search Places] You.com search failed:`, yErr);
    }

    return NextResponse.json({
      places,
      youRecommendations,
      total: places.length,
      center: { lat, lng },
      radiusKm,
      category,
      source,
    });

  } catch (err: unknown) {
    console.error('[Search Places]', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ places: [], youRecommendations: [], total: 0, error: msg, source: 'error' });
  }
}
