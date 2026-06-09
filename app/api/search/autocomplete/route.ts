import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input } = body as { input?: string };

    if (!input || !input.trim()) {
      return NextResponse.json({ predictions: [] });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'No GOOGLE_MAPS_API_KEY configured' }, { status: 500 });
    }

    const encoded = encodeURIComponent(input);
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&key=${key}&language=id&components=country:id`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Google Autocomplete error: ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Autocomplete: ${data.status}`);
    }

    const predictions = (data.predictions || []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }));

    return NextResponse.json({ predictions });
  } catch (err: unknown) {
    console.error('[Autocomplete]', err);
    return NextResponse.json({ predictions: [], error: 'Autocomplete failed' }, { status: 500 });
  }
}
