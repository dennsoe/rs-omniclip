# Catatan Rilis — RS OmniTools v2.1.2

Dokumen ini adalah **sumber catatan rilis** untuk release v2.1.2. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v2.1.2 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniTools v2.1.2 — System Monitor Akurat & Realtime + Framerate 4K

> Rilis ini menghadirkan **System Monitor yang dirombak total**: metrik CPU yang
> dulu menyesatkan (selalu ~100%) kini **akurat** dan mulus, data diperluas ke
> RAM, ruang disk, jaringan ↓↑, kecepatan unduh, serta jumlah worker aktif.
> UI didesain ulang agar **kompak, responsif, dan realtime**. Selain itu,
> **konversi Framerate dinonaktifkan total** saat preset **4K UHD** dipilih.

### 1. System Monitor — Akurat & Realtime

- **CPU kini akurat**: dinormalisasi ÷ jumlah core (100% = seluruh mesin, bukan
  1 core) + **EMA smoothing** (α=0.3) sehingga tidak lagi meloncat 0↔100.
- **Data nyata (bukan simulasi)**:
  - **RAM aplikasi** (RSS): persentase + used/total GB.
  - **Disk** volume output: bar = % terpakai, label "Dipakai X/Y GB", bebas di
    tooltip.
  - **Jaringan sistem ↓↑** (unduh/unggah) via delta akumulator OS
    (macOS/Linux/Windows).
  - **Kecepatan unduh** aplikasi + **badge ×N worker** saat FFmpeg/yt-dlp
    sedang memproses.

- **UI kompak & hidup**:
  - Grid 2 kolom (CPU|RAM · Disk|Jaringan) → widget jauh lebih pendek.
  - **Warna ambang batas** otomatis (nilai + bar + grafik): CPU >50 amber / >80
    merah; RAM >60 amber / >85 merah; Disk >75 amber / >90 merah.
  - **Grafik sparkline halus** (morph CSS) + efek ujung radar ping; grafik Disk
    dihapus (nilainya statis, bukan noise).
  - **Jaringan**: 2 pill halus (rolling number spring) dengan **icon statis**
    yang berdenyut — tanpa label/teks, bersih dan responsif.
  - Header **live indicator**, hover lift, danger pulse/glow.
  - **Kontainer lebar dimaksimalkan** (±93.5% lebar sidebar) — tidak ada lagi
    ruang kosong besar di kiri-kanan.

### 2. Framerate Dinonaktifkan di 4K UHD

- Saat preset **4K UHD** dipilih di Pembersih Video, dropdown **Framerate**
  otomatis **dinonaktifkan** dan di-reset ke "Pertahankan Asli".
- Guard ganda (UI + engine) memastikan **tidak ada konversi FPS** di 4K —
  menghindari upscale besar yang tidak berguna.

---

## Log perubahan (internal)

- `electron/main/index.ts`: CPU ÷ `LOGICAL_CORES` + `CPU_EMA_ALPHA` smoothing;
  payload `system:stats` + `workers`, `diskFreeMb/TotalMb`, `downloadSpeedBps`,
  `netRxBps/netTxBps`; RAM sistem (vm_stat) dihapus per keputusan user.
- `src/components/SystemMonitor.tsx`: `MetricCell` + `Sparkline` + `SpeedPill`
  (rolling number spring, icon statis); grafik CSS `transition: d`; warna
  ambang batas; grafik Disk dihapus; kontainer `mx-2 p-2` (93.5% sidebar).
- `electron/main/engine/processor.ts`: `buildFpsFilter` mengembalikan `''` saat
  preset `uhd` (4K) — tanpa konversi.
- `src/App.tsx`: dropdown Framerate disabled + reset ke `source` saat preset 4K.
- PR #42 (fix 4K) & PR #43 (System Monitor) — merged dengan merge commit.
