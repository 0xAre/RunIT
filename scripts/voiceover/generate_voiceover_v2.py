"""
RunIT Voiceover Generator V2
Fonetik Bahasa Indonesia — semua istilah asing ditulis dalam pelafalan natural

Usage: python voiceover/generate_voiceover_v2.py
"""

import asyncio
import edge_tts
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output_v2")

VOICE = "id-ID-ArdiNeural"
PITCH = "+10Hz"
RATE = "+5%"

SEGMENTS = [
    ("segment_01_v2", "HOOK - Problem Statement"),
    ("segment_02_v2", "AI Blueprint Generator"),
    ("segment_03_v2", "AI Task Agents + Auto-Pilot"),
    ("segment_04_v2", "DAG Execution Engine + Simulation"),
    ("segment_05_v2", "Live Control Room + Voice AI Copilot"),
    ("segment_06_v2", "Post-Event + Closing"),
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
        mp3_path = os.path.join(OUTPUT_DIR, f"{filename.replace('_v2', '')}.mp3")

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
        print(f"  {filename.replace('_v2', '')}.mp3")


if __name__ == "__main__":
    asyncio.run(main())
