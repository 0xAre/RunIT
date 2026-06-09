# 🎬 RunIt — Video Pitching Script (2-3 Menit)

## Panduan Lengkap Skrip Demo + Mekanisme Perekaman

---

# BAGIAN 1 — SKRIP VIDEO

---

## SEGMEN 1: HOOK / PROBLEM STATEMENT
### Durasi: 0:00 – 0:20 (20 detik)

---

### VISUAL: 0:00 – 0:10

**[Screen: Fullscreen — B-Roll Footage Chaos]**

- Footage 1: WhatsApp grup event dengan 500+ chat belum dibaca, orang-orang panik
- Footage 2: Spreadsheet rundown acara yang berantakan, cell ditimpa-timpa
- Footage 3: Seseorang stres memegang kepala di depan laptop
- Footage 4: Walkie-talkie static noise, orang teriak-teriak di venue
- Overlay teks (muncul satu per satu dengan animasi fade-in):
  - *"73% event mengalami operational chaos di H-3."*
  - *"85% koordinasi event masih di WhatsApp."*
  - *"Rata-rata 12 revisi rundown per event."*

### VISUAL: 0:10 – 0:20

**[Screen: Cut ke layar RunIT — Logo + Tagline]**

- Background: dark gradient ("Colosseum" theme, `#0a0a0f` ke `#1a1a2e`)
- Logo RunIT di tengah — animasi scale-in dengan subtle glow
- Tagline muncul di bawah logo (fade-in + slide-up):
  - *"AI Operational Intelligence for Events"*
- Subtitle fade-in: *"Turn event chaos into operational clarity."*

### VOICEOVER:

```
"Pernah nggak sih, kamu jadi ketua acara, H-3 masih chaos?
Timeline berubah terus. PIC susah dihubungin.
Vendor cancel mendadak. Sponsor mundur.
Semua koordinasi masih numpuk di WhatsApp dan Google Sheets.

Itu sebabnya kami membangun RunIT.
AI Operational Intelligence pertama di dunia
yang khusus menangani operational chaos dalam event execution."
```

---

## SEGMEN 2: EVENT INITIATION + AI BLUEPRINT GENERATOR
### Durasi: 0:20 – 0:55 (35 detik)

---

### VISUAL: 0:20 – 0:28

**[Screen: Landing Page RunIT]**

- Landing page `app/page.tsx` terlihat
- Cursor bergerak ke tombol **"Create New Event"** — klik
- Halaman wizard `app/workspace/new/page.tsx` muncul
- Form wizard terisi dengan cepat (fast-forward typing effect atau pre-typed):
  - **Event Name:** *"Tech Innovation Summit 2026"*
  - **Event Type:** *Seminar & Exhibition* (pilih dari dropdown)
  - **Scale:** *Large (200–500 pax)*
  - **Budget:** *IDR 150.000.000*
  - **Date:** *15–16 Agustus 2026*
  - **Venue:** *Jakarta Convention Center*
- Cursor klik tombol **"Generate AI Master Plan"**

### VISUAL: 0:28 – 0:40

**[Screen: AI Master Plan Generation]**

- Loading spinner animasi — tampilan "Gemini AI sedang menyusun master plan..."
- Progress indicator: *"Analyzing event type..."* → *"Structuring divisions..."* → *"Mapping dependencies..."* → *"Calculating timeline..."* → *"Identifying risks..."*
- Master Plan muncul dengan animasi reveal — konten bertahap:
  1. **9 Divisi Otomatis:** Acara, Materi, Publikasi, Perlengkapan, Konsumsi, Sponsor, Keamanan, Kesehatan, Kesekretariatan
  2. **Critical Path Tasks** — ditandai merah
  3. **Timeline** dari H-30 sampai H+1
  4. **Budget Breakdown** per divisi

### VISUAL: 0:40 – 0:55

**[Screen: Master Plan Detail View]**

- Scroll perlahan melalui master plan `app/workspace/[id]/master-plan/page.tsx`
- Highlight dengan zoom pada:
  - Risk assessment section
  - Dependency mapping
  - Budget allocation chart
- Tampilkan bahwa semua item bisa diedit (klik edit icon di satu task — muncul inline editor)
- Tampilkan tombol **"Regenerate"** — cursor hover untuk menunjukkan AI bisa dipanggil ulang

### VOICEOVER:

```
"Cukup masukkan jenis event, skala, budget, dan tanggal.
Dalam hitungan detik, AI kami langsung menyusun
master plan operasional yang super lengkap.

Bukan cuma to-do list biasa.
RunIT menghasilkan: 9 divisi operasional,
task dengan deadline dan dependency,
critical path analysis, budget breakdown,
risiko, dan timeline dari H-30 sampai H+1.

Semuanya bisa diedit, direvisi, atau di-regenerate ulang.
Fleksibel penuh — karena kami tahu event itu dinamis."
```

---

## SEGMEN 3: AI TASK AGENTS + AUTO-PILOT RESOLUTION
### Durasi: 0:55 – 1:25 (30 detik)

---

### VISUAL: 0:55 – 1:06

**[Screen: Task List View]**

- Buka halaman `app/workspace/[id]/tasks/page.tsx`
- Tampilkan task list yang sudah terisi dari master plan
- Scroll ke salah satu task: *"Cari dan booking venue alternatif"*
- Klik task → modal `AiTaskAssistModal` muncul
- Tampilkan AI agent yang bekerja:
  - *"Researching venue options via You.com..."*
  - *"Fetching live pricing data..."*
  - *"Generating WhatsApp draft for vendor..."*
- Hasil muncul: 3 opsi venue dengan:
  - Foto venue (dari web research)
  - Harga sewa per hari
  - Kapasitas
  - Kontak vendor
  - Draft pesan WhatsApp siap kirim

### VISUAL: 1:06 – 1:15

**[Screen: Agent Specialization]**

- Tampilkan grid agent types (dari `lib/task-agents.ts`):
  - Venue Sourcing Agent
  - Vendor Procurement Agent
  - Sponsorship Agent
  - Speaker/Talent Agent
  - Communications Agent
  - Logistics Agent
  - Permit & Legal Agent
  - Crisis Management Agent
  - Budget & Finance Agent
  - Program & Rundown Agent
  - Equipment & Technical Agent
  - Internal Coordination Agent
- Hover di setiap agent, muncul tooltip: *"Menggunakan keyword + You.com livecrawl untuk research real-time"*

### VISUAL: 1:15 – 1:25

**[Screen: Auto-Pilot Mode]**

- Switch ke halaman `app/workspace/[id]/agent-pilot/page.tsx`
- Klik tombol **"Activate Auto-Pilot"**
- Animasi: task satu per satu berubah status dari "pending" → "resolved"
- Counter tasks resolved: 12/15... 15/15
- 3 task tersisa di-flag dengan badge oranye: *"⚠ Needs Human Approval"* (untuk budget approval, legal, crisis)
- Cursor klik salah satu flagged task → lihat rekomendasi AI, tinggal approve/reject

### VOICEOVER:

```
"Ini bukan sekadar task management.
RunIT punya 12 specialized AI agents
yang benar-benar menyelesaikan task.

Masing-masing agent terkoneksi ke internet via You.com,
jadi research-nya real-time dan grounded.
AI mencari vendor beneran, bukan halusinasi.
Menyusun draft WhatsApp yang tinggal kirim.
Bahkan bikin proposal sponsorship lengkap.

Satu klik Auto-Pilot,
dan puluhan task kelar otomatis.
Task yang butuh keputusan manusia —
seperti budget besar atau legal —
di-flag khusus. Kamu tinggal review dan approve."
```

---

## SEGMEN 4: DAG EXECUTION ENGINE + SIMULATION
### Durasi: 1:25 – 1:55 (30 detik)

---

### VISUAL: 1:25 – 1:36

**[Screen: Dependency Graph View]**

- Buka halaman `app/workspace/[id]/dependencies/page.tsx`
- React Flow canvas muncul — node-node task terhubung dengan edge panah
- Zoom in ke graph:
  - Node hijau = task selesai
  - Node biru = task in progress
  - Node abu-abu = task pending
  - Edge tebal merah = **Critical Path**
- Highlight dengan cursor mengikuti critical path dari start ke end node
- Info panel di samping: *"Critical Path: 18 task — Total durasi: 14 hari — Jika 1 task terlambat, seluruh event mundur"*

### VISUAL: 1:36 – 1:46

**[Screen: DAG Execution Mode]**

- Switch ke `app/workspace/[id]/execution/page.tsx`
- Tampilkan DAG execution dashboard:
  - Topological order progress bar
  - OCS (Operational Confidence Score) gauge — animasi jarum di 87%
  - Metrics cards: Tasks Done, On Track, At Risk, Blocked
- Animasi: satu task selesai → node berubah warna hijau → downstream task unlock
- Tampilkan efek propagasi otomatis

### VISUAL: 1:46 – 1:55

**[Screen: Disruption Simulation]**

- Buka halaman `app/workspace/[id]/simulate/page.tsx`
- Interface simulasi: dropdown pilih skenario
- Pilih *"Keynote Speaker terlambat 30 menit"* → klik **"Simulate"**
- DAG langsung berubah:
  - Node terdampak berubah jadi oranye/merah dengan animasi ripple
  - Panel: *"12 task terdampak. Total delay: +90 menit. Budget impact: +IDR 3.2jt."*
  - AI-generated contingency plan muncul:
    1. *"Swap sesi speaker dengan panel diskusi"*
    2. *"Perpanjang coffee break 15 menit"*
    3. *"Kirim WhatsApp blast ke semua divisi"*
- Klik **"Apply Contingency"** → DAG update otomatis

### VOICEOVER:

```
"Ini fitur yang bikin RunIt benar-benar berbeda:
DAG Execution Engine.

Semua task dimodelkan sebagai dependency graph.
AI menghitung critical path —
task mana yang benar-benar nggak boleh meleset.
Ada Operational Confidence Score yang update real-time.

Dan yang paling powerful: Simulasi.
Mau lihat apa yang terjadi
kalau speaker telat 30 menit?
Atau listrik mati di main hall?
Atau sponsor utama mundur H-7?

Satu klik — AI langsung menunjukkan
efek dominonya ke seluruh operasional,
lengkap dengan contingency plan yang siap dieksekusi."
```

---

## SEGMEN 5: LIVE CONTROL ROOM + VOICE AI COPILOT
### Durasi: 1:55 – 2:20 (25 detik)

---

### VISUAL: 1:55 – 2:06

**[Screen: Live Control Room]**

- Buka halaman `app/workspace/[id]/live/page.tsx`
- Mission-control style dashboard:
  - DAG real-time di kiri — node update warna live
  - OCS gauge di kanan atas — animasi real-time
  - Crew status panel: daftar PIC dengan status hijau (checked-in) / merah (MIA)
  - Timeline bar di bawah: progress event dari sesi ke sesi
  - Smart alerts panel: notifikasi muncul *"⚠ Vendor catering belum konfirmasi"*

### VISUAL: 2:06 – 2:14

**[Screen: Voice AI Copilot Demonstration]**

- Tampilkan Voice AI button (ikon microphone) — klik
- Overlay teks di layar menunjukkan interaksi:

  > **Presenter (suara):** *"Apa status vendor sound system?"*
  >
  > **AI Copilot (teks di layar + suara):** *"Vendor sound system — CV Suara Pro — sudah confirmed. Kontrak signed. Technical rider submitted. Setup dijadwalkan H-1 jam 14:00. PIC: Andi (0812-xxxx-xxxx). Semua dokumen lengkap."*

- Interaksi kedua:

  > **Presenter:** *"Ada issue apa hari ini?"*
  >
  > **AI Copilot:** *"Saat ini ada 2 at-risk tasks: publikasi Instagram belum tayang untuk sesi keynote, dan coffee break H+1 belum ada vendor cadangan. Rekomendasi: publikasikan sekarang via template yang sudah disiapkan. Untuk coffee break, tim Konsumsi sedang mencari opsi terdekat."*

### VISUAL: 2:14 – 2:20

**[Screen: Incident Response]**

- Buka `app/workspace/[id]/incident/page.tsx`
- Simulasikan insiden: input *"Power outage di Main Hall — 10 menit"* → klik **"Assess Impact"**
- AI response instant:
  - **Severity:** HIGH (merah)
  - **Divisi terdampak:** Acara, Perlengkapan, Teknis
  - **Propagasi:** 8 task terpengaruh
  - **Fallback Plan:** dialihkan ke generator + sesi dialihkan ke Hall B
  - **WhatsApp Blast Draft:** muncul otomatis — tinggal kirim ke grup koordinasi

### VOICEOVER:

```
"Saat hari-H tiba, RunIt berubah jadi Mission Control Room.
Pantau semua task real-time.
Lihat Operational Confidence Score.
Cek status kru — siapa sudah on-site, siapa belum.

Dan yang paling canggih: Voice AI Copilot.
Kamu bisa tanya langsung pakai suara —
'Bagaimana status vendor?'
'Ada issue apa hari ini?'
AI langsung jawab dengan data real-time dari sistem.

Kalau terjadi insiden?
AI langsung assess dampaknya ke semua divisi,
berikan fallback plan,
dan susun WhatsApp blast ke seluruh tim.
Krisis tertangani dalam hitungan detik."
```

---

## SEGMEN 6: POST-EVENT + CLOSING
### Durasi: 2:20 – 2:45 (25 detik)

---

### VISUAL: 2:20 – 2:28

**[Screen: Post-Event Intelligence]**

- Buka `app/workspace/[id]/report/page.tsx`
- Tampilkan report summary yang di-generate:
  - LPJ (Laporan Pertanggungjawaban) otomatis
  - Financial reconciliation: budget vs actual
  - Sponsor performance report
  - Post-event survey hasil
  - Lessons learned
  - **"Save as Template"** button — untuk event berikutnya

### VISUAL: 2:28 – 2:45

**[Screen: Closing / CTA]**

- Kembali ke logo RunIT di tengah layar (dark background)
- Value propositions muncul satu per satu (animasi slide-in dari kiri):

  | Icon | Feature |
  |------|---------|
  | 🧠 | AI Master Plan Generator |
  | 🤖 | 12+ Specialized AI Task Agents |
  | 🔗 | DAG Execution Engine |
  | 🎯 | Live Mission Control Room |
  | 🔊 | Voice AI Copilot |
  | 🔄 | Simulation & Contingency Engine |
  | 📊 | Post-Event Intelligence |

- Logo + tagline di bawah:
  - *"RunIT — AI Operational Intelligence for Events"*
  - *"Turn event chaos into operational clarity."*

- CTA muncul:
  - *"🚀 runit.app"*
  - QR code di pojok kanan bawah (animasi fade-in)

### VOICEOVER:

```
"Dan setelah event selesai?
RunIt bikin LPJ, laporan keuangan,
rekomendasi perbaikan —
bahkan template yang bisa dipakai lagi
untuk event berikutnya.

Sekali pakai RunIt,
seluruh operational intelligence
tersimpan dan bisa digunakan kembali.

RunIt.
Dari master plan sampai eksekusi tanpa chaos.
AI Operational Intelligence untuk event execution.

Coba sekarang di runit.app.
Let's turn event chaos into operational clarity."
```

---

# BAGIAN 2 — MEKANISME PEREKAMAN

---

## PERSIAPAN TEKNIS

### Environment Setup

| Item | Detail |
|------|--------|
| **Dev Server** | `npm run dev` dijalankan, pastikan hot reload lancar |
| **Firebase** | Firebase emulator atau production project aktif, autentikasi Google berfungsi |
| **API Keys** | Gemini API + You.com API keys aktif dan memiliki kuota cukup |
| **Akun Demo** | Siapkan akun yang sudah login dan memiliki event *"Tech Innovation Summit 2026"* dengan data sample lengkap (master plan, tasks, dependencies, committee) |
| **Browser** | Chrome/Edge terbaru, incognito mode untuk menghindari ekstensi mengganggu |

### Hardware & Software Rekaman

| Tool | Versi | Fungsi |
|------|-------|--------|
| **OBS Studio** | 30.0+ | Screen recording utama |
| **Audacity** | 3.5+ | Voiceover recording (alternatif: langsung rekam di OBS) |
| **CapCut Desktop** | 4.0+ | Video editing & assembly |
| **Microphone** | External USB/XLR | Rekam voiceover (JANGAN pakai built-in mic laptop) |
| **Headphone** | Closed-back | Monitoring saat rekam voiceover |

### OBS Configuration

```
Settings > Video:
  - Base Resolution: 1920 x 1080
  - Output Resolution: 1920 x 1080
  - FPS: 60

Settings > Output > Recording:
  - Encoder: NVIDIA NVENC H.264 (atau x264 jika tidak ada GPU NVIDIA)
  - Rate Control: CQP
  - CQ Level: 18
  - Preset: P5 (Slow - Good Quality)
  - Format: MKV (remux ke MP4 setelah selesai)

Scenes:
  - Scene "Screen": Display Capture (primary monitor, 1920x1080)
  - Scene "Webcam": Video Capture Device + Display Capture (PIP)
  - Scene "Logo": Image Source (logo RunIT) + Color Source (dark background)
```

---

## TAHAPAN PEREKAMAN — STEP BY STEP

### FASE A: PREPARATION (30 menit sebelum rekam)

| Step | Action |
|------|--------|
| **A1** | Restart komputer untuk memastikan performa maksimal |
| **A2** | Tutup semua aplikasi tidak perlu (Slack, Spotify, Steam, dll) |
| **A3** | Kill semua proses background yang memakan CPU/RAM |
| **A4** | Buka browser, login ke RunIT dengan akun demo |
| **A5** | Navigasikan ke setiap halaman yang akan direkam untuk pre-load cache |
| **A6** | Sembunyikan bookmark bar (Ctrl+Shift+B di Chrome) |
| **A7** | Set zoom browser ke 100% |
| **A8** | Masuk Fullscreen (F11) |
| **A9** | Test OBS — pastikan screen capture berfungsi, tidak ada frame drop |
| **A10** | Test microphone — rekam sample 10 detik, dengarkan kembali |

### FASE B: SCREEN RECORDING (One-take per segmen)

#### Segmen 1 — Hook (0:00 – 0:20)

| Step | Action |
|------|--------|
| B1-1 | Mulai OBS recording |
| B1-2 | Tampilkan B-roll footage (putar video pre-prepared di VLC fullscreen) — 10 detik |
| B1-3 | Cut ke halaman landing RunIT (Alt+Tab) — 10 detik |
| B1-4 | Stop recording |


| Step | Action |
|------|--------|
| B1-1 | Mulai OBS recording |
| B1-2 | Tampilkan B-roll footage (putar video pre-prepared di VLC fullscreen) — 10 detik |
| B1-3 | Cut ke halaman landing RunIT (Alt+Tab) — 10 detik |
| B1-4 | Stop recording |

#### Segmen 2 — AI Master Plan (0:20 – 0:55)

| Step | Action |
|------|--------|
| B2-1 | Mulai OBS recording |
| B2-2 | Di landing page, klik **"Create New Event"** |
| B2-3 | Isi form wizard (data sudah pre-typed di notepad, copy-paste untuk kecepatan) |
| B2-4 | Klik **"Generate AI Master Plan"** |
| B2-5 | Tunggu loading (3-5 detik) — pastikan animasi loading terlihat |
| B2-6 | Scroll master plan yang muncul, tunjuk critical path, budget |
| B2-7 | Demo edit task (klik edit icon, ketik sesuatu, save) |
| B2-8 | Stop recording |

#### Segmen 3 — AI Task Agents (0:55 – 1:25)

| Step | Action |
|------|--------|
| B3-1 | Mulai OBS recording |
| B3-2 | Navigasi ke halaman Tasks |
| B3-3 | Scroll ke task *"Cari vendor sound system"*, klik |
| B3-4 | AI Task Assist modal muncul — biarkan terlihat proses thinking AI |
| B3-5 | Tampilkan hasil research (scroll hasilnya perlahan) |
| B3-6 | Switch ke halaman Auto-Pilot |
| B3-7 | Klik **"Activate Auto-Pilot"** — animasi task resolved |
| B3-8 | Stop recording |

#### Segmen 4 — DAG Engine (1:25 – 1:55)

| Step | Action |
|------|--------|
| B4-1 | Mulai OBS recording |
| B4-2 | Navigasi ke halaman Dependencies |
| B4-3 | React Flow graph muncul — zoom in, pan around |
| B4-4 | Trace critical path dengan cursor (edge merah) |
| B4-5 | Switch ke halaman Execution — lihat OCS gauge, metrics |
| B4-6 | Switch ke halaman Simulate |
| B4-7 | Pilih skenario *"Speaker terlambat 30 menit"*, klik Simulate |
| B4-8 | Tampilkan hasil: impacted nodes, contingency plan |
| B4-9 | Stop recording |

#### Segmen 5 — Live Control Room (1:55 – 2:20)

| Step | Action |
|------|--------|
| B5-1 | Mulai OBS recording |
| B5-2 | Navigasi ke halaman Live |
| B5-3 | Tampilkan dashboard — pan dari kiri ke kanan perlahan |
| B5-4 | Klik Voice AI button — tampilkan interaksi (simulasi: text overlay pre-prepared) |
| B5-5 | Navigasi ke halaman Incident |
| B5-6 | Input insiden *"Power outage"*, klik Assess Impact |
| B5-7 | Tampilkan hasil: severity, fallback plan, WhatsApp draft |
| B5-8 | Stop recording |

#### Segmen 6 — Closing (2:20 – 2:45)

| Step | Action |
|------|--------|
| B6-1 | Mulai OBS recording |
| B6-2 | Navigasi ke halaman Report |
| B6-3 | Scroll hasil report — LPJ, financial, lessons learned |
| B6-4 | Switch ke OBS Scene "Logo" — tampilkan logo RunIT + value props |
| B6-5 | Biarkan 5 detik di akhir untuk QR code + CTA |
| B6-6 | Stop recording |

### FASE C: VOICEOVER RECORDING

#### Setup Voiceover

```
Buka Audacity:
  - Project Rate: 48000 Hz
  - Input: External Microphone
  - Track: Mono

Rekam per segmen (agar mudah sinkronisasi nanti):
  File > New
  Rekam segmen (ikuti skrip di atas)
  File > Export > Export as WAV
  Nama file: voiceover_segmen_1.wav, voiceover_segmen_2.wav, dst.
```

#### Teknik Voiceover

| Tips | Detail |
|------|--------|
| **Jarak mic** | 15-20 cm dari mulut, gunakan pop filter |
| **Posisi** | Duduk tegak, jangan membungkuk |
| **Tempo** | Sedikit lebih cepat dari presentasi normal (150-160 kata/menit) |
| **Energi** | Tinggi dan excited di hook, confident dan tenang di demo, powerful di closing |
| **Jeda** | 0.5 detik antar kalimat, 1 detik antar paragraf |
| **Warm up** | Baca skrip 2-3 kali tanpa rekam sebelum take sesungguhnya |

### FASE D: AUDIO POST-PROCESSING (di Audacity)

| Step | Efek | Setting |
|------|------|---------|
| D1 | Noise Reduction | Select silence → Effect > Noise Reduction > Get Profile → Select all → Apply |
| D2 | Compressor | Effect > Compressor: Threshold -18dB, Ratio 3:1, Attack 10ms, Release 100ms |
| D3 | Equalizer | Bass boost +2dB (100Hz), Presence boost +3dB (3kHz), High cut di 16kHz |
| D4 | Normalize | Effect > Normalize: Peak -3dB |
| D5 | De-esser | Effect > De-esser (jika ada sibilance) |
| D6 | Export | Export as WAV 48kHz 24-bit |

### FASE E: VIDEO EDITING (di CapCut Desktop)

#### Import dan Assembly

| Step | Action |
|------|--------|
| E1 | Buat project baru: 1920x1080, 30fps |
| E2 | Import semua screen recording (Segmen 1-6) ke media library |
| E3 | Import semua voiceover WAV (Segmen 1-6) |
| E4 | Import B-roll footage (chaos scenes) |
| E5 | Import background music (royalty-free instrumental) |

#### Timeline Assembly (urutan layer)

```
Layer 1 (Video):  Screen recording — Segmen 1 → 2 → 3 → 4 → 5 → 6
Layer 2 (Video):  B-roll footage (Segmen 1)
Layer 3 (Video):  Logo screen (Segmen 6 closing)
Layer 4 (Audio):  Voiceover — Segmen 1 → 2 → 3 → 4 → 5 → 6
Layer 5 (Audio):  Background music (dipangkan volume -18dB)
Layer 6 (Text):   Overlay teks penjelasan
```

#### Editing Detail

| Timeline | Action |
|----------|--------|
| **Segmen 1** | Potong loading/pause yang tidak perlu. Tambahkan B-roll di atas screen recording untuk 10 detik pertama. Teks overlay statistik dengan animasi typewriter. |
| **Segmen 2** | Fast-forward bagian typing form wizard (speed 2x) atau potong dan gunakan pre-filled form. Fokuskan pada hasil master plan. Zoom in 110% pada bagian budget chart. |
| **Segmen 3** | Potong bagian loading AI yang terlalu lama (maks 3 detik). Teks overlay nama agent saat hover. |
| **Segmen 4** | Zoom in pada critical path. Tambahkan highlight border merah tipis di sekitar node terdampak. |
| **Segmen 5** | Text overlay untuk voice AI interaksi (simulasi percakapan). Tampilkan sebagai "chat bubble" style. |
| **Segmen 6** | Transisi smooth ke logo screen. Teks value props fade-in staggered. QR code fade-in di akhir. |
| **Transisi** | Cross-dissolve 0.5 detik antar segmen. JANGAN pakai transisi fancy (star wipe, cube spin, dll). |

#### Background Music

| Kriteria | Detail |
|----------|--------|
| **Genre** | Instrumental electronic / ambient tech / cinematic |
| **Tempo** | 110-120 BPM |
| **Mood** | Modern, confident, inspiring |
| **Sumber rekomendasi** | Epidemic Sound (berbayar), YouTube Audio Library (gratis), Artlist (berbayar), Pixabay Music (gratis) |
| **Volume** | -18dB sampai -22dB (jangan sampai menutupi voiceover) |
| **Fade** | Fade in 1 detik di awal, fade out 2 detik di akhir |

### FASE F: FINAL EXPORT & QUALITY CHECK

#### Export Settings (CapCut)

```
Resolution: 1920 x 1080 (1080p)
Frame Rate: 30 fps
Format: MP4 (H.264)
Bitrate: 16-20 Mbps (VBR, 2-pass)
Audio: AAC, 320kbps, 48kHz, Stereo
```

#### Quality Assurance Checklist

| # | Cek | ✓ |
|---|-----|---|
| 1 | Durasi total antara 2:30 – 3:00 menit | ☐ |
| 2 | Tidak ada screen recording yang kosong / freeze | ☐ |
| 3 | Voiceover jelas, tidak ada noise, tidak terpotong | ☐ |
| 4 | Volume voiceover vs BGM seimbang (voiceover jelas terdengar) | ☐ |
| 5 | Semua teks overlay terbaca jelas (kontras cukup terhadap background) | ☐ |
| 6 | Tidak ada loading screen yang mengganggu | ☐ |
| 7 | Tidak ada informasi sensitif terekspos (API key, password, data user asli) | ☐ |
| 8 | Tidak ada pop-up notifikasi OS yang terekam | ☐ |
| 9 | Tidak ada cursor yang idle terlalu lama | ☐ |
| 10 | CTA dan QR code jelas di akhir video | ☐ |
| 11 | Di-tonton ulang 2x — sekali fokus visual, sekali fokus audio | ☐ |
| 12 | Di-tonton oleh 1-2 orang lain untuk feedback | ☐ |

---

## ALTERNATIF CEPAT: ONE-TAKE RECORDING

Jika waktu terbatas, gunakan metode one-take:

### Setup One-Take

| Setup | Detail |
|-------|--------|
| **OBS Scene** | Screen capture (fullscreen) + Webcam PIP di pojok kanan bawah |
| **Audio** | Mic langsung sebagai input OBS (tidak perlu voiceover terpisah) |
| **Skrip** | Buka skrip di monitor kedua atau cetak di kertas — sebagai panduan, JANGAN dibaca kata-per-kata |
| **Teleprompter** | Opsional: gunakan teleprompter app di tablet/laptop kedua |

### Proses One-Take

| Step | Action |
|------|--------|
| 1 | Buka semua tab browser yang diperlukan: landing page, workspace, master-plan, tasks, dependencies, simulate, live, incident, report |
| 2 | Mulai OBS recording |
| 3 | Jalankan demo sesuai skrip — jika salah, pause 2 detik, ulangi bagian itu, lanjutkan (potong saat editing) |
| 4 | Selesai — stop recording |
| 5 | Edit: potong bagian yang salah, percepat bagian lambat (speed 1.2x), tambahkan teks overlay dan BGM |
| 6 | Export |

**Estimasi waktu one-take:** 1-2 jam total (termasuk editing).

---

## ASSETS YANG DIPERLUKAN

### B-Roll Footage (Stock Video)

| Deskripsi | Durasi | Sumber |
|-----------|--------|--------|
| WhatsApp grup dengan chat berantakan | 5 detik | Pexels / self-record |
| Spreadsheet berantakan | 3 detik | Pexels / self-record |
| Orang stres di depan laptop | 3 detik | Pexels / Pixabay |
| Event venue dengan kru panik | 5 detik | Pexels / self-record |
| Event sukses — crowd bertepuk tangan | 5 detik | Pexels / self-record |

### Graphics & Overlays

| Asset | Ukuran | Format |
|-------|--------|--------|
| Logo RunIT (high-res) | 512x512 | PNG (transparent) |
| Logo RunIT (horizontal) | 1200x400 | PNG (transparent) |
| QR Code ke runit.app | 300x300 | PNG |
| Icon untuk 12 AI agents | 64x64 | SVG/PNG |
| Background dark gradient | 1920x1080 | PNG/JPG |

### Audio

| Asset | Durasi | Sumber |
|-------|--------|--------|
| Background Music | 3:00 | YouTube Audio Library / Epidemic Sound / Artlist |
| Sound Effect: klik mouse (opsional) | 0.1 detik | Freesound.org |
| Sound Effect: success chime (opsional) | 1 detik | Freesound.org |
| Sound Effect: whoosh transition (opsional) | 0.5 detik | Freesound.org |

---

## TROUBLESHOOTING REKAMAN

| Masalah | Solusi |
|---------|--------|
| Frame drop / lag saat screen record | Turunkan OBS bitrate, tutup aplikasi lain, rekam di 30fps bukan 60fps |
| Voiceover terdengar echo | Rekam di ruangan dengan karpet, tirai, atau tambahkan selimut di dinding |
| AI response terlalu lambat | Pre-warm Gemini dengan menjalankan query 1-2x sebelum rekam |
| Screen flicker saat rekam | Matikan G-Sync/FreeSync, set monitor ke 60Hz |
| Loading spinner terlalu lama | Edit potong bagian loading, sisakan 2-3 detik saja, gunakan speed ramp |
| Voiceover tidak sinkron dengan screen | Di CapCut: detach audio dari video, lalu manual align waveform |

---

## FINAL NOTES

1. **Bahasa:** Skrip di atas dalam Bahasa Indonesia (campuran santai-formal). Jika lomba mengharuskan bahasa Inggris — terjemahkan skrip dan pastikan tone tetap natural. Atau gunakan versi bilingual dengan subtitle.

2. **Durasi:** Total target 2:45. Jika terlalu panjang, potong Segmen 4 (DAG) atau Segmen 6 (Closing). JANGAN potong Segmen 1 (Hook) — itu yang menjual.

3. **Test Run:** Lakukan minimal 1x dry run penuh sebelum take sesungguhnya. Catat timing setiap segmen dengan stopwatch.

4. **Backup:** Simpan semua raw footage dan project file di hard drive eksternal. Jangan hanya di satu tempat.

5. **Kontak jika ada masalah teknis:** Siapkan tim teknis (1-2 orang) yang bisa bantu troubleshoot OBS, CapCut, atau environment dev.

---

**Good luck dengan lombanya! 🚀**

*Script ini akan terus di-update sesuai feedback dari test run.*
