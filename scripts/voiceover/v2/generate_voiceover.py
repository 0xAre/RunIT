"""
RunIT Voiceover Generator V2
Menggunakan Edge-TTS (gratis, Microsoft neural voices)
Suara: id-ID-ArdiNeural (cowok, friendly)
Style: Excited/Energetic (pitch +10%, rate +5%)

V2: Skrip sudah di-optimasi untuk pelafalan TTS Bahasa Indonesia
- H-3 → "ha min tiga"
- H-7 → "ha min tujuh"
- 9 → "sembilan"
- 12 → "dua belas"
- RunIT → "RunIT" (tetap dibaca natural oleh Ardi)
- You.com → "You dot com"
- runit.app → "run it dot app"

Usage: python voiceover/v2/generate_voiceover.py
"""

import asyncio
import edge_tts
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

VOICE = "id-ID-ArdiNeural"
PITCH = "+10Hz"
RATE = "+5%"

SEGMENTS = [
    ("segment_01", "HOOK - Problem Statement"),
    ("segment_02", "AI Blueprint Generator"),
    ("segment_03", "AI Task Agents + Auto-Pilot"),
    ("segment_04", "DAG Execution Engine + Simulation"),
    ("segment_05", "Live Control Room + Voice AI Copilot"),
    ("segment_06", "Post-Event + Closing"),
]


async def generate(text: str, output_path: str) -> None:
    communicate = edge_tts.Communicate(
        text=text,
        voice=VOICE,
        pitch=PITCH,
        rate=RATE,
    )
    await communicate.save(output_path)


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename, label in SEGMENTS:
        txt_path = os.path.join(BASE_DIR, f"{filename}.txt")
        mp3_path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")

        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read().strip()

        print(f"[GENERATING] {label} ({filename})... ", end="", flush=True)
        await generate(text, mp3_path)

        size_kb = os.path.getsize(mp3_path) / 1024
        print(f"DONE ({size_kb:.0f} KB)")

    print(f"\nSemua voiceover V2 berhasil di-generate!")
    print(f"Output: {OUTPUT_DIR}")
    print("\nFile yang dihasilkan:")
    for filename, _ in SEGMENTS:
        print(f"  {filename}.mp3")


if __name__ == "__main__":
    asyncio.run(main())
