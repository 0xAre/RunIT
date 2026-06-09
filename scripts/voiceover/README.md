# 🎙️ Voiceover Generator — RunIT Pitching Video

## Struktur Folder

```
voiceover/
├── segment_01.txt          # Skrip: HOOK - Problem Statement
├── segment_02.txt          # Skrip: AI Blueprint Generator
├── segment_03.txt          # Skrip: AI Task Agents + Auto-Pilot
├── segment_04.txt          # Skrip: DAG Execution Engine + Simulation
├── segment_05.txt          # Skrip: Live Control Room + Voice AI Copilot
├── segment_06.txt          # Skrip: Post-Event + Closing
├── generate_voiceover.py   # Generator per segmen
├── concat_voiceover.py     # Gabungin semua segmen jadi satu file
└── output/
    ├── segment_01.mp3      # ~154 KB
    ├── segment_02.mp3      # ~212 KB
    ├── segment_03.mp3      # ~229 KB
    ├── segment_04.mp3      # ~233 KB
    ├── segment_05.mp3      # ~232 KB
    ├── segment_06.mp3      # ~199 KB
    └── voiceover_full.mp3  # Gabungan semua (jika ffmpeg tersedia)
```

## Cara Pakai

### 1. Edit Skrip (opsional)
Edit file `segment_XX.txt` sesuai keinginan.

### 2. Generate Voiceover
```powershell
python voiceover/generate_voiceover.py
```
Hasil: 6 file MP3 di folder `output/`

### 3. Gabungin (opsional, butuh ffmpeg)
```powershell
python voiceover/concat_voiceover.py
```
Hasil: 1 file `output/voiceover_full.mp3`

### 4. Import ke CapCut
- Buka CapCut → import semua `output/segment_*.mp3`
- Sync dengan screen recording per segmen
- Atau import `voiceover_full.mp3` langsung sebagai satu track

## Spesifikasi Audio

| Parameter | Value |
|-----------|-------|
| Engine | Microsoft Edge TTS (Neural) |
| Suara | id-ID-ArdiNeural (Cowok) |
| Pitch | +10Hz (excited/energetic) |
| Rate | +5% (natural tapi padat) |
| Format | MP3, 48kHz, mono |

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `ModuleNotFoundError: edge_tts` | `pip install edge-tts` |
| Suara terlalu cepat/lambat | Edit `RATE` di `generate_voiceover.py` (±10% range) |
| Suara kurang excited/datar | Edit `PITCH` di `generate_voiceover.py` (±15Hz range) |
| Mau ganti suara cewek | Edit `VOICE` jadi `id-ID-GadisNeural` |
| `ffmpeg` not found | Skip concat, import individual segments ke CapCut |
