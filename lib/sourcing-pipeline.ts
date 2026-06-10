import type { EventData, TaskCategory } from '@/store/eventStore';
import { detectTaskCategory, getAgentConfig } from '@/lib/task-agents';
import { sourceForTaskCategory } from '@/lib/you';
import { generateWithFallback } from '@/lib/gemini';
import {
  geocodeQuery,
  searchNearbyPlaces,
  formatPlacesContext,
  type OsmPlace,
} from '@/lib/places-search';

export interface SourcingRequest {
  query: string;
  taskTitle?: string;
  locationContext?: string;
  eventData?: Partial<EventData>;
  lat?: number;
  lng?: number;
  category?: TaskCategory;
}

export interface SourcingRecommendation {
  name: string;
  address: string;
  reasoning: string;
  rating: string;
  estimatedCost?: string;
  sourceUrl?: string;
  placeId?: string;
  distanceKm?: number;
}

export interface SourcingResult {
  recommendations: SourcingRecommendation[];
  whatsappDraft: string;
  emailDraft: string;
  sourcingSummary: string;
  category: TaskCategory;
  places: OsmPlace[];
  sources: { youCom: boolean; places: string };
}

const TASK_TO_PLACES_CATEGORY: Partial<Record<TaskCategory, string>> = {
  venue: 'venue',
  vendor: 'vendor',
  catering: 'catering',
  logistics: 'hotel',
  equipment: 'equipment',
};

export async function runLiveSourcing(input: SourcingRequest): Promise<SourcingResult> {
  const task = {
    title: input.taskTitle || input.query,
    description: input.query,
  };
  const eventData = input.eventData || {
    name: input.locationContext || 'Event',
    type: 'Event',
    scale: 'medium',
    participants: 100,
    budget: '',
    venue: input.locationContext || '',
    audience: '',
  };

  const category = input.category || detectTaskCategory(task as any, eventData as EventData);
  const agentConfig = getAgentConfig(category);
  const sourcingQuery = input.query || agentConfig.sourcingQueryTemplate(task as any, eventData as EventData);

  // Phase 1: You.com livecrawl (same as resolve-task)
  let youContext = '';
  try {
    const { context } = await sourceForTaskCategory(sourcingQuery, category);
    youContext = context || '';
  } catch (err) {
    console.warn('[Sourcing] You.com failed:', err);
  }

  // Phase 2: Places/OSM when coordinates available
  let places: OsmPlace[] = [];
  let placesSource = 'none';
  const placesCategory = TASK_TO_PLACES_CATEGORY[category];

  if (placesCategory) {
    let lat = input.lat;
    let lng = input.lng;

    if ((!lat || !lng) && (input.locationContext || eventData.venue)) {
      const geo = await geocodeQuery(input.locationContext || eventData.venue || '');
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    if (lat && lng) {
      const result = await searchNearbyPlaces(lat, lng, placesCategory, { radiusKm: 8, limit: 8 });
      places = result.places;
      placesSource = result.source;
    }
  }

  const placesContext = formatPlacesContext(places);
  const combinedContext = [youContext, placesContext].filter(Boolean).join('\n\n') || 'Tidak ada data web/maps ditemukan.';

  if (!process.env.GEMINI_API_KEY) {
    const mapRecs = places.slice(0, 3).map(p => ({
      name: p.name,
      address: p.address,
      reasoning: `Ditemukan via ${p.source} — ${p.distanceKm} km dari lokasi acara`,
      rating: p.rating ? `${p.rating}/5` : 'N/A',
      sourceUrl: p.googleMapsUrl || p.tags.website,
      placeId: p.id,
      distanceKm: p.distanceKm,
    }));

    return {
      recommendations: mapRecs,
      whatsappDraft: `Halo, kami sedang mencari ${input.taskTitle || 'vendor'} untuk acara ${eventData.name}. Apakah tersedia?`,
      emailDraft: `Subject: Inquiry — ${input.taskTitle || input.query}\n\nDear Sir/Madam,\n\nWe are organizing ${eventData.name} and would like to inquire about availability and pricing.\n\nThank you.`,
      sourcingSummary: `Ditemukan ${places.length} lokasi dari Maps/OSM. You.com: ${youContext ? 'ya' : 'tidak'}.`,
      category,
      places,
      sources: { youCom: !!youContext, places: placesSource },
    };
  }

  const prompt = `You are RunIT's Live Sourcing Agent. You MUST ground recommendations ONLY in the provided web/maps data below. Do NOT invent venues or vendors not supported by the data.

Event: ${eventData.name} (${eventData.type})
Task: ${input.taskTitle || 'Sourcing'}
User query: "${input.query}"
Location context: "${input.locationContext || eventData.venue || 'Unknown'}"
Category: ${category}

REAL SOURCING DATA (use this exclusively):
${combinedContext}

Instructions:
1. Recommend 3-5 options ONLY from the data above. If fewer exist, return what is available.
2. Prefer Maps/OSM entries when present — they are verified real places.
3. For each recommendation include name, address, reasoning, rating (from data or "N/A"), optional estimatedCost in IDR.
4. Draft a polite WhatsApp inquiry message in Indonesian.
5. Draft a formal email for booking/quotation.
6. Write a brief sourcingSummary of findings.

Return ONLY valid JSON:
{
  "recommendations": [
    { "name": "string", "address": "string", "reasoning": "string", "rating": "string", "estimatedCost": "string", "sourceUrl": "string" }
  ],
  "whatsappDraft": "string",
  "emailDraft": "string",
  "sourcingSummary": "string"
}`;

  try {
    const text = await generateWithFallback(prompt, true);
    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    let recommendations: SourcingRecommendation[] = (parsed.recommendations || []).map((r: any) => ({
      name: r.name || '',
      address: r.address || '',
      reasoning: r.reasoning || '',
      rating: r.rating || 'N/A',
      estimatedCost: r.estimatedCost,
      sourceUrl: r.sourceUrl,
    }));

    // Fallback: use raw places if Gemini returned empty
    if (!recommendations.length && places.length) {
      recommendations = places.slice(0, 5).map(p => ({
        name: p.name,
        address: p.address,
        reasoning: `Verified via ${p.source}`,
        rating: p.rating ? `${p.rating}/5` : 'N/A',
        sourceUrl: p.googleMapsUrl || p.tags.website,
        placeId: p.id,
        distanceKm: p.distanceKm,
      }));
    }

    return {
      recommendations,
      whatsappDraft: parsed.whatsappDraft || '',
      emailDraft: parsed.emailDraft || '',
      sourcingSummary: parsed.sourcingSummary || `Found ${recommendations.length} options from live data.`,
      category,
      places,
      sources: { youCom: !!youContext, places: placesSource },
    };
  } catch (err) {
    console.error('[Sourcing] Gemini synthesis failed:', err);
    const fallbackRecs = places.slice(0, 5).map(p => ({
      name: p.name,
      address: p.address,
      reasoning: `From ${p.source}`,
      rating: p.rating ? `${p.rating}/5` : 'N/A',
      sourceUrl: p.googleMapsUrl || p.tags.website,
      placeId: p.id,
      distanceKm: p.distanceKm,
    }));

    return {
      recommendations: fallbackRecs,
      whatsappDraft: `Halo, kami mencari ${input.taskTitle} untuk acara ${eventData.name}. Mohon info ketersediaan dan harga.`,
      emailDraft: `Inquiry: ${input.taskTitle} for ${eventData.name}`,
      sourcingSummary: youContext || `Maps data: ${places.length} places. AI synthesis failed.`,
      category,
      places,
      sources: { youCom: !!youContext, places: placesSource },
    };
  }
}
