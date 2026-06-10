import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { GoogleGenerativeAI } from '@google/generative-ai';
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;
  try {
    const { eventData } = await req.json();

    if (!eventData) {
      return NextResponse.json({ error: 'Missing eventData' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const masterPlan = eventData.masterPlan;
    const organizerRole = eventData.organizerRole || 'solo';
    const isSolo = organizerRole === 'solo';
    const externalContacts = eventData.externalContacts || [];
    const picContacts = eventData.picContacts || [];

    // Build a summary of tasks from masterPlan
    const allTasks = masterPlan?.divisions?.flatMap((d: any) =>
      d.tasks.map((t: any) => ({ ...t, divisionName: d.name }))
    ) || [];

    // Pick the highest-priority tasks for initial execution (pre-production)
    const criticalTasks = allTasks
      .filter((t: any) => t.priority === 'critical' || t.priority === 'high')
      .slice(0, 5);

    const taskSummary = criticalTasks.length > 0
      ? criticalTasks.map((t: any) =>
          `- [${t.priority.toUpperCase()}] ${t.title} (Divisi: ${t.divisionName}, Deadline: ${t.deadline || 'TBD'})`
        ).join('\n')
      : allTasks.slice(0, 5).map((t: any) =>
          `- ${t.title} (Divisi: ${t.divisionName})`
        ).join('\n');

    const contactContext = isSolo
      ? externalContacts.length > 0
        ? `Kontak eksternal yang tersedia:\n${externalContacts.map((c: any) => `- ${c.name} (${c.category}): WA ${c.whatsapp || '-'}`).join('\n')}`
        : 'Belum ada kontak eksternal yang didaftarkan.'
      : picContacts.length > 0
        ? `Tim kepala divisi yang tersedia:\n${picContacts.map((c: any) => `- ${c.name} (${c.role}): WA ${c.whatsapp || '-'}`).join('\n')}`
        : 'Belum ada kepala divisi yang didaftarkan.';

    const prompt = `Kamu adalah AI Auto-Pilot untuk event organizer aplikasi RunIT.
Tugasmu adalah menganalisis master plan event dan secara AKTIF menjalankan perencanaan awal.

EVENT:
- Nama: ${eventData.name}
- Jenis: ${eventData.type}
- Skala: ${eventData.scale} (${eventData.participants} peserta)
- Budget: ${eventData.budget}
- Timeline: ${eventData.timeline}
- Venue: ${eventData.venue || 'Belum ditentukan'}
- Lokasi Inferred: ${eventData.venue || 'Indonesia (kota tidak diketahui)'}
- Target Audiens: ${eventData.audience}
- Tujuan: ${eventData.goals}
- Peran Penyelenggara: ${isSolo ? 'Panitia Tunggal (Solo)' : 'Ketua Panitia (ada tim)'}

TASK PRIORITAS DARI BLUEPRINT:
${taskSummary}

${contactContext}

Tugasmu: Hasilkan 3-5 "Agent Action" yang AKTIF dan KONKRET. Setiap action adalah sesuatu yang bisa segera dilakukan.

Untuk setiap action, kamu harus:
1. Mengidentifikasi kebutuhan spesifik dari masterPlan
2. Memberikan REKOMENDASI NYATA (bukan template) — misalnya nama venue sungguhan, tips negosiasi spesifik, contoh vendor kategori tertentu
3. Membuat draft pesan yang sudah siap dikirim

Kembalikan HANYA JSON array berikut (tanpa markdown):
[
  {
    "agentType": "logistics" | "comms" | "procurement" | "program" | "crisis",
    "title": "Judul action singkat (maks 8 kata)",
    "description": "Deskripsi 1-2 kalimat tentang apa yang AI sudah lakukan/analisis",
    "reasoning": "Mengapa ini prioritas pertama yang harus diselesaikan (1-2 kalimat)",
    "category": "venue" | "vendor" | "sponsor" | "team" | "media" | "logistics" | "budget",
    "recommendations": [
      {
        "name": "Nama spesifik tempat/vendor/orang",
        "address": "Alamat atau kota atau link (spesifik)",
        "reasoning": "Kenapa ini direkomendasikan untuk event ini (spesifik, bukan generik)",
        "estimatedCost": "Estimasi biaya dalam Rupiah",
        "rating": "Estimasi rating / reputasi"
      }
    ],
    "whatsappDraft": "Draft pesan WA yang sudah langsung bisa dikirim (gunakan nama dari recommendations[0] jika ada). Bahasa Indonesia, natural, singkat maks 120 kata.",
    "emailDraft": "Draft body email profesional 2-3 paragraf",
    "emailSubject": "Subject email yang spesifik",
    "recipientType": "${isSolo ? 'external' : 'pic'}",
    "targetContact": "Siapa yang harus dihubungi (nama dari kontak terdaftar jika ada, atau 'Calon Vendor' dll)"
  }
]

PENTING:
- Rekomendasi harus NYATA dan SPESIFIK untuk jenis event "${eventData.type}" di "${eventData.venue || 'Indonesia'}" dengan budget "${eventData.budget}"
- Jangan buat rekomendasi generik seperti "Venue A", "Vendor B" — berikan nama yang sungguhan dan masuk akal
- Draft pesan harus siap kirim, bukan template dengan placeholder kosong
- Prioritaskan berdasarkan timeline "${eventData.timeline}"`;

    const aiResult = await model.generateContent(prompt);
    const text = aiResult.response.text()
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let actions;
    try {
      actions = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 });
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('[Auto-Pilot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
