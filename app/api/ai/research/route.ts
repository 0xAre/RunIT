import { NextRequest, NextResponse } from "next/server";
import { deepResearch, ResearchEffort } from "@/lib/you";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, effort = "standard", eventContext, lang = "id" } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    // 1. Run You.com Research API
    const research = await deepResearch(question, effort as ResearchEffort);

    if (!research) {
      return NextResponse.json(
        { error: "You.com Research API gagal merespons. Coba lagi." },
        { status: 502 }
      );
    }

    // 2. Ask Gemini to contextualize the research result into RunIT's event framing
    const langInstruction =
      lang === "en"
        ? "Respond in professional English."
        : "Jawab dalam Bahasa Indonesia yang profesional.";

    const sourcesText = research.sources
      .slice(0, 5)
      .map((s, i) => `[${i + 1}] ${s.title ?? "Untitled"}: ${s.url}`)
      .join("\n");

    const geminiPrompt = `
Kamu adalah AI Operational Intelligence milik RunIT — sistem perencanaan dan eksekusi event.
${langInstruction}

Konteks Event: ${eventContext ?? "Belum ada informasi event."}

Pertanyaan yang diajukan oleh tim:
"${question}"

Berikut adalah hasil riset mendalam dari web (sudah bersitasi):
---
${research.content}
---

Sumber:
${sourcesText}

Tugas kamu:
1. Rangkum insight paling RELEVAN dan ACTIONABLE untuk perencanaan event ini.
2. Jika ada risiko atau peluang, highlight dengan jelas.
3. Berikan 2-3 REKOMENDASI KONKRET yang bisa langsung ditindaklanjuti oleh panitia.
4. Pertahankan sitasi dari sumber aslinya jika relevan.
5. Format menggunakan Markdown yang bersih.
`;

    const geminiResult = await model.generateContent(geminiPrompt);
    const aiInsight = geminiResult.response.text();

    return NextResponse.json({
      question,
      effort,
      rawResearch: research.content,
      sources: research.sources,
      aiInsight,
    });
  } catch (err) {
    console.error("[research/route.ts] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
