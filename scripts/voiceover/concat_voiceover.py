"""
Gabungin semua voiceover jadi satu file MP3
Buat preview full atau upload langsung ke CapCut sebagai satu track

Usage: python voiceover/concat_voiceover.py
"""

import os
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

SEGMENTS = [
    "segment_01.mp3",
    "segment_02.mp3",
    "segment_03.mp3",
    "segment_04.mp3",
    "segment_05.mp3",
    "segment_06.mp3",
]


def concat_ffmpeg():
    list_path = os.path.join(OUTPUT_DIR, "concat_list.txt")
    output_path = os.path.join(OUTPUT_DIR, "voiceover_full.mp3")

    with open(list_path, "w", encoding="utf-8") as f:
        for seg in SEGMENTS:
            seg_path = os.path.join(OUTPUT_DIR, seg)
            f.write(f"file '{seg_path}'\n")

    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", list_path, "-c", "copy", output_path,
        ],
        check=False,
    )

    os.remove(list_path)

    if os.path.exists(output_path):
        size_kb = os.path.getsize(output_path) / 1024
        print(f"Full voiceover: {output_path} ({size_kb:.0f} KB)")
    else:
        print("ffmpeg not found or failed. Skip concatenation.")
        print("Just import individual segment_01.mp3 ~ segment_06.mp3 ke CapCut.")


if __name__ == "__main__":
    concat_ffmpeg()
