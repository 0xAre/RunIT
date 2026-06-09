import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { eventData } = await req.json();

    if (!eventData?.name) {
      return NextResponse.json({ error: 'Missing event data' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const organizerRole = eventData.organizerRole || 'solo';
    const isSolo = organizerRole === 'solo';
    const externalContacts = eventData.externalContacts || [];
    const picContacts = eventData.picContacts || [];

    const extList = externalContacts.length > 0
      ? externalContacts.map((c: { name: string; category: string; whatsapp?: string; email?: string }) =>
          `- ${c.name} (${c.category})${c.whatsapp ? ' | WA: ' + c.whatsapp : ''}`
        ).join('\n')
      : 'Belum ada — AI akan sarankan pihak yang perlu dihubungi';

    const picList = picContacts.length > 0
      ? picContacts.map((c: { name: string; role: string; whatsapp?: string }) =>
          `- ${c.name} (${c.role})${c.whatsapp ? ' | WA: ' + c.whatsapp : ''}`
        ).join('\n')
      : 'Belum ada PIC terdaftar';

    const roleBlock = isSolo
      ? `User adalah panitia tunggal. Fokus: cari & hubungi vendor, venue, sponsor, kebutuhan logistik.\nKontak eksternal yang sudah ada:\n${extList}`
      : `User adalah ketua panitia. Fokus: delegasi ke PIC divisi + vendor eksternal bila perlu.\nPIC internal:\n${picList}\nKontak eksternal:\n${extList}`;

    const prompt = `Kamu adalah AI Panitia Event — bertindak seperti sekretariat panitia profesional yang menghemat SDM dan waktu.

MASALAH YANG DISELESAIKAN: Membuat event butuh banyak orang dan waktu untuk cari vendor, gedung, catering, dll.
PERAN KAMU: Cari kebutuhan operasional, usulkan vendor/venue relevan, dan SIAPKAN DRAFT PESAN saja (user yang kirim lewat WA/IG/Telegram/Email).

EVENT:
- Nama: ${eventData.name}
- Jenis: ${eventData.type}
- Audiens: ${eventData.audience || '-'}
- Skala: ${eventData.scale} | Peserta: ${eventData.participants}
- Venue (rencana): ${eventData.venue || 'belum ditentukan'}
- Budget: ${eventData.budget || 'belum ditentukan'}
- Timeline: ${eventData.timeline || '-'}
- Tujuan: ${eventData.goals || '-'}
- Kendala: ${eventData.constraints || '-'}

${roleBlock}

Buat 5-6 action prioritas untuk fase AWAL persiapan event (venue, vendor kunci, sponsor, publikasi awal, perizinan jika relevan).
Setiap action HARUS punya rekomendasi tempat/vendor realistis (seolah hasil riset) dan draft pesan SIAP EDIT.

Kembalikan HANYA JSON array:
[
  {
    "agentType": "logistics|program|comms|procurement|crisis",
    "title": "string (judul singkat)",
    "description": "string (apa yang harus dilakukan)",
    "reasoning": "string (mengapa ini prioritas)",
    "category": "venue|vendor|sponsor|catering|equipment|permit|comms|other",
    "recommendations": [
      { "name": "string", "address": "string", "reasoning": "string", "rating": "string" }
    ],
    "whatsappDraft": "string (bahasa Indonesia, natural)",
    "emailDraft": "string",
    "emailSubject": "string",
    "telegramDraft": "string",
    "instagramDraft": "string (caption/DM singkat untuk Instagram, max 80 kata)",
    "recipientName": "string",
    "recipientPhone": "string (628xxx atau kosong)",
    "recipientEmail": "string",
    "recipientInstagram": "string (username tanpa @ atau kosong)"
  }
]`;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const actions = JSON.parse(text);
    return NextResponse.json({ actions });
  } catch (error) {
    console.error('[Committee Sourcing] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
