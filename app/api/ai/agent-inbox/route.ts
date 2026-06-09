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

    const masterPlan = eventData.masterPlan;
    const tasks = masterPlan?.divisions?.flatMap((d: { tasks?: { title: string }[] }) => d.tasks || []) || [];
    const hasExecution = !!eventData.execution;

    // ── Role & Contact Context ────────────────────────────────────────────────────
    const organizerRole = eventData.organizerRole || 'solo';
    const isSolo = organizerRole === 'solo';
    const picContacts = eventData.picContacts || [];
    const externalContacts = eventData.externalContacts || [];

    const picList = picContacts.length > 0
      ? picContacts.map((c: any) => `- ${c.name} (${c.role})${c.whatsapp ? ' | WA: ' + c.whatsapp : ''}${c.email ? ' | Email: ' + c.email : ''}`).join('\n')
      : 'Belum ada PIC terdaftar';

    const extList = externalContacts.length > 0
      ? externalContacts.map((c: any) => `- ${c.name} (${c.category})${c.whatsapp ? ' | WA: ' + c.whatsapp : ''}${c.email ? ' | Email: ' + c.email : ''}`).join('\n')
      : 'Belum ada kontak eksternal';

    const roleContext = isSolo
      ? `USER ADALAH PANITIA TUNGGAL (Solo Organizer). Rekomendasi action harus fokus pada komunikasi langsung ke pihak eksternal (vendor, sponsor, venue, dll).

Daftar Kontak Eksternal yang tersedia:
${extList}`
      : `USER ADALAH KETUA PANITIA. Rekomendasi action harus fokus pada delegasi dan reminder kepada PIC/Kepala Divisi internal.

Daftar PIC Divisi yang tersedia:
${picList}`;

    const recipientInstructions = isSolo
      ? `Untuk setiap action, cantumkan kontak penerima yang paling relevan dari daftar external contacts di atas:
- "recipientName": nama penerima
- "recipientPhone": nomor WA (format 628xxx) jika tersedia, atau string kosong
- "recipientEmail": email jika tersedia, atau string kosong`
      : `Untuk setiap action, cantumkan PIC yang paling relevan dari daftar PIC di atas:
- "recipientName": nama PIC
- "recipientPhone": nomor WA PIC (format 628xxx) jika tersedia, atau string kosong
- "recipientEmail": email PIC jika tersedia, atau string kosong`;

    const prompt = `Kamu adalah AI Multi-Agent Event Management System untuk event "${eventData.name}" (${eventData.type}).
Venue: ${eventData.venue || 'TBD'} | Skala: ${eventData.scale} | Peserta: ${eventData.participants} | Budget: ${eventData.budget}

${roleContext}

Task saat ini dalam sistem: ${tasks.map((t: any) => t.title).join(', ')}
Status event: ${hasExecution ? 'SEDANG BERLANGSUNG (LIVE)' : 'Fase perencanaan'}.

Tugasmu: Buat 4-5 rekomendasi action MENDESAK yang spesifik dan realistis berdasarkan konteks event dan peran user.
Setiap action diusulkan oleh agent spesifik.

Agent yang tersedia:
- "logistics": venue, perlengkapan, transportasi
- "program": rundown, pembicara, konten
- "comms": komunikasi, publikasi, pengumuman
- "procurement": vendor, pembelian
- "crisis": mitigasi risiko dan kontingensi

Untuk setiap action item, hasilkan:
1. "agentType": salah satu agent di atas
2. "title": judul action yang pendek dan mendesak
3. "description": apa yang perlu dilakukan dan mengapa mendesak
4. "reasoning": reasoning spesifik dari agent (1-2 kalimat)
5. "whatsappDraft": pesan WA siap kirim (maks 100 kata, bahasa Indonesia natural)
6. "emailDraft": draft email profesional (3-4 kalimat)
7. "emailSubject": subject email
8. "telegramDraft": versi Telegram
9. "instagramDraft": caption/DM Instagram singkat
10. "recipientInstagram": username IG tanpa @ jika relevan
${recipientInstructions}

Kembalikan HANYA JSON array dengan 4-5 objek berikut:
[
  {
    "agentType": "logistics",
    "title": "string",
    "description": "string",
    "reasoning": "string",
    "whatsappDraft": "string",
    "emailDraft": "string",
    "emailSubject": "string",
    "recipientName": "string",
    "recipientPhone": "string",
    "recipientEmail": "string",
    "telegramDraft": "string",
    "instagramDraft": "string",
    "recipientInstagram": "string"
  }
]`;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const actions = JSON.parse(text);
      return NextResponse.json({ actions });
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI actions' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Agent Inbox] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
