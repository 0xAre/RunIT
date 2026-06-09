import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/require-api-auth";
import { profileSponsorURLs } from "@/lib/you";
import { GoogleGenerativeAI } from "@google/generative-ai";
export const runtime = 'nodejs';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { urls, eventMasterPlan, lang = "id" } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required and must not be empty" },
        { status: 400 }
      );
    }

    // 1. Fetch sponsor website content via You.com Contents API
    const sponsorProfiles = await profileSponsorURLs(urls);

    // 2. Ask Gemini to generate personalized pitch strategy
    const langInstruction =
      lang === "en"
        ? "Generate the response in professional English."
        : "Buat respons dalam Bahasa Indonesia yang profesional.";

    const geminiPrompt = `
Kamu adalah AI Sponsorship Strategist milik RunIT — sistem perencanaan event.
${langInstruction}

Berikut adalah detail event (masterPlan singkat):
${eventMasterPlan ?? "Seminar/festival dengan target audiens muda."}

Berikut adalah profil perusahaan calon sponsor yang diambil dari website mereka:
---
${sponsorProfiles}
---

Tugas kamu untuk SETIAP calon sponsor:
1. Analisis KESELARASAN (alignment) antara profil perusahaan dengan tema/audiens event.
2. Identifikasi VALUE PROPOSITION terbaik yang bisa ditawarkan kepada mereka.
3. Buat DRAF EMAIL PITCHING yang dipersonalisasi (subject line + 3-4 paragraf).
4. Sertakan 2-3 benefit sponsorship yang paling relevan untuk perusahaan tersebut.
5. Format output per sponsor dengan header jelas.

Format output:
## [Nama Perusahaan]
### Alignment Score & Analisis
### Draft Email Pitching
---
`;

    const geminiResult = await model.generateContent(geminiPrompt);
    const pitchStrategy = geminiResult.response.text();

    return NextResponse.json({
      sponsorsAnalyzed: urls.length,
      rawProfiles: sponsorProfiles,
      pitchStrategy,
    });
  } catch (err) {
    console.error("[sponsor-profile/route.ts] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
