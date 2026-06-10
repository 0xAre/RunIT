import { NextRequest, NextResponse } from 'next/server';
import { requireAiRoute } from '@/lib/ai-route-guard';
import { GoogleGenerativeAI } from '@google/generative-ai';
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExecutionContext {
  eventName: string;
  eventType: string;
  timeline?: string;
  venue?: string;
  participants?: number;
  budget?: string;
  activeTab?: string;
  selectedTask?: string;
  completionPct?: number;
  pendingTaskCount?: number;
  divisions?: Array<{ name: string; taskCount: number; doneCount: number }>;
}

function buildSystemPrompt(ctx: ExecutionContext, lang: string): string {
  const isId = lang === 'id';
  const ctxLines = [
    `Event: "${ctx.eventName}" (${ctx.eventType})`,
    ctx.timeline ? `Tanggal: ${ctx.timeline}` : null,
    ctx.venue ? `Venue: ${ctx.venue}` : null,
    ctx.participants ? `Peserta: ${ctx.participants} orang` : null,
    ctx.budget ? `Budget: ${ctx.budget}` : null,
    ctx.completionPct != null ? `Progress: ${ctx.completionPct}% selesai` : null,
    ctx.pendingTaskCount != null ? `Task pending: ${ctx.pendingTaskCount}` : null,
    ctx.activeTab ? `Tab aktif: ${ctx.activeTab}` : null,
    ctx.selectedTask ? `Task dipilih: ${ctx.selectedTask}` : null,
    ctx.divisions?.length
      ? `Divisi: ${ctx.divisions.map(d => `${d.name} (${d.doneCount}/${d.taskCount} done)`).join(', ')}`
      : null,
  ].filter(Boolean).join('\n');

  if (isId) {
    return `Kamu adalah Asisten Eksekusi Event yang ahli untuk RunIT — platform manajemen event.
Kamu membantu tim panitia menyelesaikan task, membuat rundown, konfirmasi vendor, dan mengelola event hari-H.

KONTEKS EVENT SAAT INI:
${ctxLines}

PANDUAN RESPONS:
- Jawab singkat, praktis, dan actionable (max 3-4 paragraf)
- Gunakan bullet points untuk daftar task / langkah-langkah
- Jika ditanya tentang rundown, buat format jam per jam yang realistis
- Jika ditanya tentang vendor/venue, arahkan ke tab Konfirmasi di halaman ini
- Jika ada risiko, sebutkan mitigasinya
- Gunakan bahasa Indonesia yang natural dan profesional
- Tambahkan emoji sparingly untuk keterbacaan`;
  }

  return `You are an expert Event Execution Assistant for RunIT — an event management platform.
You help the organizing committee complete tasks, build rundowns, confirm vendors, and manage event day operations.

CURRENT EVENT CONTEXT:
${ctxLines}

RESPONSE GUIDELINES:
- Answer concisely and practically (max 3-4 paragraphs)
- Use bullet points for task lists / steps
- If asked about rundown, create a realistic hour-by-hour format
- If asked about vendors/venues, direct to the Confirmation tab on this page
- Mention mitigations when risks are present
- Be professional but approachable`;
}

export async function POST(req: NextRequest) {
  const authError = await requireAiRoute(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const {
      messages,
      context,
      lang = 'id',
    }: {
      messages: ChatMessage[];
      context: ExecutionContext;
      lang?: string;
    } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    /* Fallback if no API key */
    if (!process.env.GEMINI_API_KEY) {
      const fallbacks: Record<string, string> = {
        rundown: `Berikut contoh rundown untuk ${context.eventName}:\n\n• 07.00 – Persiapan venue & setup teknis\n• 08.30 – Registrasi peserta\n• 09.00 – Pembukaan & sambutan\n• 09.30 – Sesi utama\n• 12.00 – Ishoma\n• 13.00 – Sesi sore\n• 15.30 – Penutupan & dokumentasi\n• 16.00 – Beres-beres\n\nSesuaikan dengan detail acara Anda.`,
        venue: `Untuk konfirmasi venue ${context.venue || 'yang dipilih'}, gunakan tab **Konfirmasi** di halaman ini. Di sana Anda bisa mencari venue via peta dan membuat draft pesan konfirmasi otomatis.`,
        default: `Saya siap membantu pelaksanaan ${context.eventName}. Silakan tanyakan tentang:\n\n• **Rundown** — jadwal jam per jam event\n• **Task** — prioritas dan status pengerjaan\n• **Vendor** — konfirmasi dan komunikasi vendor\n• **Risiko** — antisipasi masalah hari-H`,
      };

      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      const reply = lastMsg.includes('rundown') ? fallbacks.rundown
        : lastMsg.includes('venue') || lastMsg.includes('vendor') ? fallbacks.venue
        : fallbacks.default;

      return NextResponse.json({ reply, isOffline: true });
    }

    const systemPrompt = buildSystemPrompt(context, lang);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: systemPrompt,
    });

    /* Build history (all but last message) */
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user' as 'user' | 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[Execution Chat]', err);
    return NextResponse.json({ error: 'Chat failed', reply: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }, { status: 500 });
  }
}
