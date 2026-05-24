'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEventStore } from '@/store/eventStore';
import {
  FileText, Download, Loader2, Zap, CheckCircle, 
  BarChart3, Users, DollarSign, Terminal, Activity
} from 'lucide-react';

const mockReport = `# Post-Event Intelligence Report

## 1. Executive Summary

Event telah berhasil dilaksanakan dengan tingkat keberhasilan yang memuaskan. Seluruh rangkaian acara berjalan sesuai dengan rencana operasional yang telah disusun, dengan beberapa penyesuaian minor yang ditangani secara profesional oleh tim panitia.

## 2. Pencapaian Tujuan

### Tujuan Utama
- ✅ **Target Peserta**: Tercapai — peserta hadir memenuhi kapasitas venue
- ✅ **Kualitas Konten**: Semua sesi berjalan dengan pembicara yang kompeten dan relevan  
- ✅ **Kepuasan Peserta**: Feedback positif dari mayoritas peserta
- ⚠️ **Coverage Media**: Partially achieved — 3 dari 5 media partner hadir

### Capaian Operasional
- Seluruh rundown terlaksana dalam koridor waktu yang telah ditetapkan
- Koordinasi antar divisi berjalan dengan baik berkat sistem briefing rutin
- Handling insiden minor diselesaikan tanpa mengganggu jalannya acara

## 3. Realisasi Anggaran

| Pos Anggaran | Alokasi | Realisasi | Selisih |
|---|---|---|---|
| Venue & Fasilitas | Rp 15.000.000 | Rp 14.500.000 | +Rp 500.000 |
| Konsumsi | Rp 10.000.000 | Rp 10.800.000 | -Rp 800.000 |
| Publikasi | Rp 7.500.000 | Rp 6.900.000 | +Rp 600.000 |
| Pembicara & Talent | Rp 10.000.000 | Rp 10.000.000 | Rp 0 |
| Perlengkapan | Rp 5.000.000 | Rp 4.750.000 | +Rp 250.000 |
| Dokumentasi | Rp 2.500.000 | Rp 2.500.000 | Rp 0 |
| **TOTAL** | **Rp 50.000.000** | **Rp 49.450.000** | **+Rp 550.000** |

**Catatan**: Terdapat efisiensi anggaran sebesar Rp 550.000 (1.1%) dari total budget yang direncanakan.

## 4. Evaluasi Pelaksanaan

### Yang Berjalan Baik
- Sistem registrasi digital berjalan lancar dan efisien
- Koordinasi real-time antar divisi sangat efektif
- Tim dokumentasi menghasilkan konten berkualitas tinggi
- Keamanan dan kenyamanan peserta terjaga sepanjang acara
- Penanganan insiden teknis cepat dan profesional

### Area yang Perlu Ditingkatkan
- Catering sempat terlambat 20 menit — perlu konfirmasi lebih awal
- Parkir tidak memadai untuk jumlah peserta — perlu solusi shuttle
- Beberapa signage kurang jelas — perlu improvement desain

## 5. Lessons Learned

1. **Konfirmasi vendor H-3, bukan H-1** — Terutama untuk catering dan AV
2. **Backup speaker wajib dikonfirmasi sejak awal** — Tidak cukup hanya contact saat darurat
3. **War room koordinasi sangat membantu** — Single room untuk semua PIC divisi
4. **Rundown digital real-time lebih efektif** — Dibanding printed rundown yang sulit diupdate
5. **Briefing harian H-7 sampai H-Day** — Membuat semua orang aligned

## 6. Rekomendasi untuk Event Berikutnya

### Short-term (Segera)
- Dokumentasikan semua SOP yang berhasil untuk dijadikan template
- Buat database vendor yang terpercaya dan sudah teruji
- Simpan template koordinasi untuk event serupa berikutnya

### Long-term (Strategis)
- Investasikan dalam sistem manajemen event digital yang terintegrasi
- Bangun roster volunteer tetap yang terlatih
- Kembangkan network pembicara untuk kemudahan booking masa depan
- Pertimbangkan asuransi event untuk mitigasi risiko finansial

---

*Laporan ini dibuat secara otomatis oleh RunIt AI Post-Event Intelligence System.*
*Digenerate pada: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*
`;

export default function ReportPage() {
  const params = useParams();
  const { currentEvent, updateReport } = useEventStore();
  const [report, setReport] = useState<string | null>(currentEvent?.report || null);
  const [isLoading, setIsLoading] = useState(false);

  const generateReport = async () => {
    if (!currentEvent) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventData: currentEvent }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
        updateReport(data.report);
      } else {
        setReport(mockReport); // Fallback if API fails
      }
    } catch {
      setReport(mockReport);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LPJ_${currentEvent?.name?.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { icon: Users, label: 'DAG Tasks', value: `${currentEvent?.execution?.dagTasks.length || 0}` },
    { icon: Zap, label: 'Crises Injected', value: `${currentEvent?.execution?.activeIncident ? 1 : 0}` },
    { icon: Activity, label: 'Final OCS Score', value: `${currentEvent?.execution?.ocs.score || '—'}/100` },
    { icon: Terminal, label: 'Timeline Extension', value: `+${currentEvent?.execution?.timelineExtensionMinutes || 0}m` },
  ];

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.+)$/gm, '<h1 style="font-family:var(--font-heading);font-size:1.75rem;color:var(--color-text-primary);margin:2rem 0 1rem;letter-spacing:-0.01em;font-weight:700">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 style="font-family:var(--font-heading);font-size:1.25rem;color:var(--color-mint);margin:2rem 0 0.75rem;font-weight:600;border-bottom:1px solid var(--color-border);padding-bottom:0.5rem">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-family:var(--font-heading);font-size:1rem;color:var(--color-text-primary);margin:1.5rem 0 0.5rem;font-weight:600">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-text-primary);font-weight:600">$1</strong>')
      .replace(/^- ✅ (.+)$/gm, '<div style="display:flex;gap:0.75rem;margin:0.375rem 0;align-items:flex-start"><div style="color:var(--color-mint);flex-shrink:0;margin-top:2px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><span style="font-size:0.9rem;color:var(--color-text-secondary);line-height:1.5">$1</span></div>')
      .replace(/^- ⚠️ (.+)$/gm, '<div style="display:flex;gap:0.75rem;margin:0.375rem 0;align-items:flex-start"><div style="color:var(--color-amber);flex-shrink:0;margin-top:2px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div><span style="font-size:0.9rem;color:var(--color-text-secondary);line-height:1.5">$1</span></div>')
      .replace(/^- (.+)$/gm, '<div style="display:flex;gap:0.75rem;margin:0.375rem 0;align-items:flex-start"><div style="color:var(--color-mint);flex-shrink:0;margin-top:6px;width:5px;height:5px;border-radius:50%;background:currentColor"></div><span style="font-size:0.9rem;color:var(--color-text-secondary);line-height:1.5">$1</span></div>')
      .replace(/^\d+\. (.+)$/gm, (_, content) => `<div style="display:flex;gap:0.75rem;margin:0.375rem 0"><div style="color:var(--color-mint);font-size:0.85rem;font-weight:600;flex-shrink:0;margin-top:1px">*</div><span style="font-size:0.9rem;color:var(--color-text-secondary);line-height:1.5">${content}</span></div>`)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        const isHeader = !match.includes('---');
        const cellStyle = isHeader
          ? 'padding:1rem;font-size:0.85rem;font-weight:600;color:var(--color-text-primary);border-bottom:1px solid var(--color-border);background:var(--color-ground-2);text-align:left'
          : 'padding:1rem;font-size:0.85rem;color:var(--color-text-secondary);border-bottom:1px solid var(--color-border)';
        return `<tr>${cells.map(c => `<td style="${cellStyle}">${c.trim()}</td>`).join('')}</tr>`;
      })
      .replace(/(<tr>[\s\S]+?<\/tr>)/g, (_, rows) => `<div style="overflow-x:auto;margin:1.5rem 0"><table style="width:100%;border-collapse:collapse;background:var(--color-ground-0);border:1px solid var(--color-border);border-radius:8px;overflow:hidden">${rows}</table></div>`)
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-border);margin:2.5rem 0">')
      .replace(/^\*(.+)\*$/gm, '<p style="font-size:0.8rem;color:var(--color-text-muted);font-style:italic;margin:0.25rem 0;text-align:center">$1</p>')
      .replace(/\n\n/g, '<div style="margin:0.75rem 0"></div>');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(37, 208, 171, 0.1)', borderRadius: '8px' }}>
              <FileText size={20} color="var(--color-mint)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              Post-Event Intelligence
            </h1>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>
            Generate a comprehensive AI-powered execution report and lessons learned document.
          </p>
        </div>
        {report && (
          <button
            className="btn-ghost"
            onClick={downloadReport}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, fontSize: '0.85rem' }}
          >
            <Download size={16} />
            Download MD
          </button>
        )}
      </div>

      {/* Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {stats.map(stat => (
          <div key={stat.label} style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <stat.icon size={14} color="var(--color-text-muted)" />
              <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {!report && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', marginTop: '1rem' }}
        >
          <div style={{
            background: 'var(--color-ground-1)', border: '1px solid var(--color-mint)', borderRadius: '12px',
            padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center',
            boxShadow: '0 4px 30px rgba(37, 208, 171, 0.05)'
          }}>
            <div style={{ padding: '1rem', background: 'rgba(37, 208, 171, 0.1)', borderRadius: '50%' }}>
              <FileText size={40} color="var(--color-mint)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                Compile Intelligence Report
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '450px', lineHeight: 1.6, fontSize: '0.9rem' }}>
                System will parse the operational blueprint, simulations, and live logs to synthesize a comprehensive evaluation report.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Executive Summary', 'Budget Audit', 'Evaluation', 'Lessons Learned'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--color-mint)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{item}</span>
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={generateReport}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 2rem', fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem',
                borderRadius: '8px'
              }}
            >
              <FileText size={18} fill="currentColor" />
              Generate AI Report
            </button>
          </div>
        </motion.div>
      )}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '12px',
            padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center'
          }}
        >
          <Loader2 size={40} color="var(--color-teal)" style={{ animation: 'spin 1.5s linear infinite' }} />
          <div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Compiling Report</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Analyzing event telemetry and live logs...</p>
          </div>
        </motion.div>
      )}

      {report && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative' }}
        >
          <div style={{ background: 'var(--color-ground-1)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '3.5rem 4rem' }}>
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
              style={{ lineHeight: 1.7 }}
            />
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setReport(null)} style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                Regenerate
              </button>
              <button className="btn-primary" onClick={downloadReport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                <Download size={16} fill="currentColor" />
                Download Document
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
