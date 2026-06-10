import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchYouCom, deepResearch } from '@/lib/you';
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Call You.com API for additional context
    let webContext = "";
    try {
      const searchHits = await searchYouCom(prompt, { count: 3 });
      if (searchHits && searchHits.length > 0) {
        webContext = "Konteks referensi web (dari You.com):\n" + searchHits.map(h => `- ${h.title}: ${h.snippets?.[0] || ''}`).join("\n");
      }
    } catch (youErr) {
      console.warn('[Parse Brief] You.com search failed, continuing without web context:', youErr);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `Kamu adalah AI event brief parser untuk aplikasi RunIT.
Tugasmu adalah mengekstrak dan menginferensi informasi event dari deskripsi natural pengguna.

Dari input teks berikut, hasilkan JSON object dengan field-field ini:
- "name": nama event (string). Buat nama yang kreatif dan spesifik jika tidak disebutkan. JANGAN kosong.
- "type": jenis event, pilih salah satu: "Seminar/Conference", "Workshop", "Music Festival", "Campus Event", "Corporate Meeting", "Product Launch", "Hackathon", "Charity/Social Event", "Sports Event", "Exhibition", "Award Ceremony", "Webinar". Pilih yang paling relevan.
- "audience": target audiens (string, misal: "Mahasiswa IT", "Profesional bisnis", "Umum")
- "scale": inferensi dari jumlah peserta — "small" (<100), "medium" (100-500), "large" (500-2000), "massive" (>2000)
- "participants": perkiraan jumlah peserta (number, inferensi dari konteks jika tidak disebutkan)
- "budget": budget dalam format string (misal: "Rp 20.000.000" atau "Rp 5 juta"). Jika tidak disebutkan, inferensi perkiraan wajar.
- "timeline": kapan event akan diselenggarakan (string, misal: "1 minggu lagi", "3 Juni 2025", "akhir bulan ini")
- "venue": lokasi/venue (string). Kosongkan ("") jika tidak disebutkan.
- "teamSize": estimasi jumlah panitia yang dibutuhkan (number, inferensi dari skala event)
- "goals": tujuan utama event (string, 1-3 kalimat ringkas yang diformulasikan dari input)
- "constraints": kendala/catatan penting (string, misal: "sponsor masih dicari", "venue belum pasti"). Kosongkan ("") jika tidak ada.
- "organizerRole": "solo" jika terkesan sendirian, "chairman" jika ada tim. Default "solo".
- "suggestedContacts": array singkat dari kontak yang disarankan berdasarkan kebutuhan, maksimal 2 item. Contoh: [{"type": "external", "category": "sponsor", "placeholder": "Tambahkan sponsor yang Anda targetkan"}]

Inferensi secara cerdas dari konteks. Contoh:
- "workshop AI untuk mahasiswa" → type: "Workshop", audience: "Mahasiswa", scale: tergantung peserta
- "bikin event, cari sponsor" → constraints: "Sponsor masih dicari", suggestedContacts: [{type: "external", category: "sponsor", ...}]
- "panitia 20 orang" → organizerRole: "chairman", teamSize: 20

Kembalikan HANYA JSON tanpa markdown. Pastikan valid JSON.

Input pengguna:
"${prompt.replace(/"/g, '\\"')}"

${webContext}
`;

    let text = '';
    let usedEngine = '';
    
    try {
      console.log('[Parse Brief] Trying Gemini as primary engine...');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(systemPrompt);
      text = result.response.text();
      usedEngine = 'gemini';
    } catch (geminiErr) {
      console.warn('[Parse Brief] Gemini failed (possibly 503), falling back to You.com:', geminiErr);
      const youRes = await deepResearch(systemPrompt, 'lite');
      if (youRes && youRes.content) {
        text = youRes.content;
        usedEngine = 'you.com';
      } else {
        throw new Error('Both Gemini and You.com failed to generate content');
      }
    }

    text = text.replace(/```json\n?/ig, '').replace(/```\n?/g, '').trim();
    console.log(`[Parse Brief] Success using ${usedEngine}`);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    console.error('[Parse Brief] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
