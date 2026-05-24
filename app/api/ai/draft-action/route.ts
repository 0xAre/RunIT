import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { task, eventData, agentType } = await req.json();

    if (!task || !eventData) {
      return NextResponse.json({ error: 'Missing task or event data' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const organizerRole = eventData.organizerRole || 'solo';
    const isSolo = organizerRole === 'solo';

    // ── Build Recipient Context ─────────────────────────────────────────────
    const picContacts = eventData.picContacts || [];
    const externalContacts = eventData.externalContacts || [];

    // Find matching PIC if chairman: match by divisionId or closest role
    const taskDivisionId = task.divisionId || '';
    const matchedPic = picContacts.find((c: any) => c.divisionId === taskDivisionId)
      || picContacts[0] || null;

    // Find matching external contact if solo: match by task keywords
    const taskTitle = (task.title || '').toLowerCase();
    const matchedExternal = externalContacts.find((c: any) => {
      const cat = c.category?.toLowerCase() || '';
      if (taskTitle.includes('vendor') && cat === 'vendor') return true;
      if (taskTitle.includes('sponsor') && cat === 'sponsor') return true;
      if (taskTitle.includes('venue') && cat === 'venue') return true;
      if (taskTitle.includes('speaker') && cat === 'speaker') return true;
      return false;
    }) || externalContacts[0] || null;

    const recipient = isSolo ? matchedExternal : matchedPic;
    const recipientName = recipient?.name || (isSolo ? 'Pihak Terkait' : 'Kepala Divisi');
    const recipientPhone = recipient?.whatsapp || '';
    const recipientEmail = recipient?.email || '';
    const recipientTelegram = recipient?.telegram || recipientPhone;
    const recipientRole = isSolo
      ? (matchedExternal?.category || 'vendor')
      : (matchedPic?.role || 'PIC Divisi');

    // ── Build contact lists for context ────────────────────────────────────
    const picList = picContacts.length > 0
      ? picContacts.map((c: any) => `- ${c.name} (${c.role})`).join('\n')
      : 'Belum ada PIC terdaftar';

    const extList = externalContacts.length > 0
      ? externalContacts.map((c: any) => `- ${c.name} (${c.category})`).join('\n')
      : 'Belum ada kontak eksternal terdaftar';

    // ── Prompt ─────────────────────────────────────────────────────────────
    const prompt = isSolo
      ? `Kamu adalah AI Event Assistant yang membantu seorang Panitia Tunggal (solo organizer) mengelola event "${eventData.name}".

TASK YANG PERLU DITINDAKLANJUTI:
- Nama Task: ${task.title}
- Deskripsi: ${task.description || '-'}
- Status: ${task.status}
- Deadline: ${task.deadline || 'H-0'}
- Prioritas: ${task.priority}

PENERIMA:
- Nama: ${recipientName}
- Kategori: ${recipientRole}

KONTEKS EVENT:
- Jenis: ${eventData.type}
- Skala: ${eventData.scale} (${eventData.participants} peserta)
- Venue: ${eventData.venue || 'TBD'}
- Timeline: ${eventData.timeline}

Tugas kamu: Buat 3 draft pesan komunikasi yang siap dikirim kepada ${recipientName} terkait task di atas.
Gunakan bahasa Indonesia yang natural, singkat, dan profesional.

Kembalikan HANYA JSON berikut (tanpa markdown):
{
  "whatsappDraft": "Pesan WA ringkas (maks 150 kata), langsung to the point, tidak perlu subject",
  "emailDraft": "Body email profesional (3-4 paragraf pendek), formal namun hangat",
  "emailSubject": "Subject email yang spesifik dan jelas",
  "telegramDraft": "Pesan Telegram (sama seperti WA, bisa sedikit lebih formal)",
  "reasoning": "Mengapa tindakan ini penting dan mendesak (1-2 kalimat)",
  "agentType": "${agentType || 'logistics'}"
}`
      : `Kamu adalah AI Event Assistant yang membantu seorang Ketua Panitia mengelola tim dan mengingatkan kepala divisi untuk event "${eventData.name}".

TASK YANG PERLU DITINDAKLANJUTI:
- Nama Task: ${task.title}
- Deskripsi: ${task.description || '-'}
- Status: ${task.status}
- Deadline: ${task.deadline || 'H-0'}
- Prioritas: ${task.priority}

KEPALA DIVISI YANG DITUJU:
- Nama: ${recipientName}
- Role: ${recipientRole}

DAFTAR PIC DIVISI:
${picList}

KONTEKS EVENT:
- Jenis: ${eventData.type}
- Skala: ${eventData.scale} (${eventData.participants} peserta)
- Venue: ${eventData.venue || 'TBD'}
- Timeline: ${eventData.timeline}

Tugas kamu: Sebagai Ketua Panitia, buat 3 draft pesan kepada ${recipientName} untuk mengingatkan atau mendelegasikan tugas terkait task di atas.
Gunakan bahasa Indonesia yang natural — seperti ketua menghubungi anggota tim. Hangat, tegas, dan tidak kaku.

Kembalikan HANYA JSON berikut (tanpa markdown):
{
  "whatsappDraft": "Pesan WA informal-profesional (maks 100 kata), langsung to the point seperti grup WA kepanitiaan",
  "emailDraft": "Email kepada kepala divisi yang sedikit lebih formal (2-3 paragraf)",
  "emailSubject": "Subject email yang spesifik",
  "telegramDraft": "Pesan Telegram (sama dengan WA)",
  "reasoning": "Mengapa reminder ini penting sekarang (1-2 kalimat)",
  "agentType": "${agentType || 'program'}"
}`;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(text);

    return NextResponse.json({
      ...parsed,
      recipientName,
      recipientPhone,
      recipientEmail,
      recipientTelegram,
    });
  } catch (error) {
    console.error('[Draft Action] Error:', error);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}
