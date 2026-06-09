import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/require-api-auth";
import { getEventIntelligenceBrief } from "@/lib/you";
import { GoogleGenerativeAI } from "@google/generative-ai";
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const {
      eventType,
      scale = "medium",
      lang = "id",
    }: { eventType: string; scale?: string; lang?: "id" | "en" } = body;

    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    // 1. Fetch real-time market intelligence from You.com (3 parallel searches)
    const brief = await getEventIntelligenceBrief(
      eventType,
      scale as "small" | "medium" | "large" | "massive",
      lang
    );

    if (!brief || !brief.rawContext) {
      return NextResponse.json({ insights: null, sources: [] });
    }

    // 2. Ask Gemini to distill into 3 concise, actionable insights for the onboarding UI
    const isId = lang === "id";
    const langInstruction = isId
      ? "Tulis semua respons dalam Bahasa Indonesia yang natural dan profesional."
      : "Write all responses in natural, professional English.";

    const geminiPrompt = `
${langInstruction}

Kamu adalah AI Onboarding Advisor untuk RunIT — sistem operasional event berbasis AI.
Seorang pengguna baru saja memilih tipe event: **${eventType}** (skala: ${scale}).

Berikut adalah riset pasar real-time yang sudah dikumpulkan:
---
${brief.rawContext}
---

Tugas kamu:
Berdasarkan riset di atas, hasilkan TEPAT 3 insight onboarding yang singkat, spesifik, dan actionable.
Masing-masing insight HARUS:
- Relevan langsung dengan "${eventType}"
- Berbasis data nyata dari riset (bukan generik)
- Ditulis dalam 1-2 kalimat yang padat

Format respons sebagai JSON array:
[
  {
    "emoji": "emoji relevan (1 karakter)",
    "title": "Judul singkat (3-5 kata)",
    "insight": "Insight spesifik 1-2 kalimat berdasarkan riset"
  },
  ...
]

Kembalikan HANYA JSON array, tanpa markdown, tanpa penjelasan.
`;

    let insights: { emoji: string; title: string; insight: string }[] | null = null;
    try {
      const geminiResult = await model.generateContent(geminiPrompt);
      const raw = geminiResult.response.text().trim();
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn("[event-brief] Gemini parse failed, returning raw brief only:", parseErr);
    }

    // Collect top sources across all 3 query types
    const allSources = [
      ...brief.trends,
      ...brief.budgetBenchmarks,
      ...brief.bestPractices,
    ]
      .filter((r) => r.url && r.title)
      .slice(0, 6)
      .map((r) => ({ title: r.title, url: r.url, favicon: r.favicon_url }));

    return NextResponse.json({
      insights,
      sources: allSources,
      rawContext: brief.rawContext,
      fetchedAt: brief.fetchedAt,
    });
  } catch (err) {
    console.error("[event-brief/route.ts] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
