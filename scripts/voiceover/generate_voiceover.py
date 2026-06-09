"""
RunIT Voiceover Generator
Menggunakan Edge-TTS (gratis, Microsoft neural voices)
Suara: id-ID-ArdiNeural (cowok, friendly)
Style: Excited/Energetic (pitch +10%, rate +5%)

Usage: python voiceover/generate_voiceover.py
"""

import asyncio
import edge_tts
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

VOICE = "id-ID-ArdiNeural"

# Pitch: +10% buat excited/energetic
# Rate: +5% biar natural tapi tetep padat
PITCH = "+10Hz"
RATE = "+5%"

SEGMENTS = [
    ("segment_01", "HOOK - Problem Statement"),
    ("segment_02", "AI Master Plan Generator"),
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
    for filename, label in SEGMENTS:
        txt_path = os.path.join(BASE_DIR, f"{filename}.txt")
        mp3_path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")

        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read().strip()

        print(f"[GENERATING] {label} ({filename})... ", end="", flush=True)
        await generate(text, mp3_path)

        size_kb = os.path.getsize(mp3_path) / 1024
        print(f"DONE ({size_kb:.0f} KB)")

    print("\nSemua voiceover berhasil di-generate!")
    print(f"Output: {OUTPUT_DIR}")
    print("\nFile yang dihasilkan:")
    for filename, _ in SEGMENTS:
        print(f"  {filename}.mp3")


if __name__ == "__main__":
    asyncio.run(main())
