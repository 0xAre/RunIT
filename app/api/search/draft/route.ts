import { NextRequest, NextResponse } from 'next/server';
import type { OsmPlace } from '@/app/api/search/places/route';
import { generateWithFallback } from '@/lib/gemini';

interface EventContext {
  name: string;
  type: string;
  date?: string;
  participants?: number;
  budget?: string;
  organizerName?: string;
}

interface DraftRequest {
  place: OsmPlace;
  eventContext: EventContext;
  draftType?: 'inquiry' | 'booking' | 'sponsor_pitch';
}

interface DraftResponse {
  whatsapp: string;
  email: string;
  subject: string;
  telegram?: string;
}

function buildFallbackDraft(place: OsmPlace, ctx: EventContext): DraftResponse {
  const greeting = `Halo, kami dari panitia ${ctx.name}`;
  const wa = `${greeting}. Kami tertarik untuk menggunakan ${place.name} untuk acara ${ctx.type} kami${ctx.date ? ` pada ${ctx.date}` : ''}${ctx.participants ? ` dengan ${ctx.participants} peserta` : ''}. Bisakah kami mendapatkan informasi ketersediaan dan harga? Terima kasih 🙏`;
  const email = `${greeting}.\n\nKami sedang merencanakan acara "${ctx.name}" (${ctx.type})${ctx.date ? ` pada ${ctx.date}` : ''} dan tertarik dengan layanan ${place.name}.\n\nMohon informasikan:\n1. Ketersediaan pada tanggal tersebut\n2. Paket harga yang tersedia${ctx.participants ? `\n3. Kapasitas untuk ${ctx.participants} peserta` : ''}\n\nTerima kasih atas perhatiannya.\n\nHormat kami,\nTim Panitia ${ctx.name}`;
  return {
    whatsapp: wa,
    email,
    subject: `Permintaan Informasi untuk Event: ${ctx.name}`,
    telegram: wa,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: DraftRequest = await req.json();
    const { place, eventContext: ctx, draftType = 'inquiry' } = body;

    if (!place || !ctx?.name) {
      return NextResponse.json({ error: 'place and eventContext.name required' }, { status: 400 });
    }

    /* ── Ultra-minimal AI prompt (≈ 150–250 token input) ────── */
    const draftTypeLabel =
      draftType === 'booking'
        ? 'pemesanan resmi'
        : draftType === 'sponsor_pitch'
        ? 'penawaran kerjasama sponsor'
        : 'permintaan informasi & harga';

    const prompt = `Buat draft ${draftTypeLabel} untuk menghubungi "${place.name}" (${place.address || 'Indonesia'}) tentang event "${ctx.name}" (${ctx.type}${ctx.participants ? `, ${ctx.participants} peserta` : ''}${ctx.date ? `, ${ctx.date}` : ''}).

Kembalikan JSON saja:
{"whatsapp":"...(maks 100 kata, informal tapi sopan)","email":"...(2-3 paragraf profesional)","subject":"...","telegram":"...(sama dengan whatsapp)"}`;

    try {
      const textResult = await generateWithFallback(prompt);
      const text = textResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const draft: DraftResponse = JSON.parse(text);
      return NextResponse.json(draft);
    } catch (aiErr) {
      console.error('[Draft] AI Generation failed, using hardcoded fallback:', aiErr);
      return NextResponse.json(buildFallbackDraft(place, ctx));
    }
  } catch (err) {
    console.error('[Draft]', err);
    return NextResponse.json({ error: 'Draft generation failed' }, { status: 500 });
  }
}
