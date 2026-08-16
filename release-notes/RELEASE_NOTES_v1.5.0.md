# Catatan Rilis — RS OmniClip v1.5.0

Dokumen ini adalah **sumber catatan rilis** untuk release v1.5.0. Bagian
"Body release" di bawah siap disalin ke **detail release GitHub** (mis.
`gh release create v1.5.0 --notes "<isi dari bagian Body release>"`).

---

## Body release (salin ke detail release GitHub)

## RS OmniClip v1.5.0 — Performa Kampanye

> Fitur besar baru: dashboard analisis performa iklan **Meta Ads** vs komisi
> **Shopee Affiliate** dengan pencocokan tag otomatis dan rekomendasi AI.
> Semua diolah lokal di perangkat Anda, tanpa login/auth.

### 1. Menu "Performa Kampanye" (Baru)
- Menu sidebar baru dengan wizard unggah **3 laporan CSV**:
  Meta Ads, Pesanan Shopee Affiliate, dan Klik Shopee (opsional).
- Ada **data demo bawaan** — langsung coba tanpa file asli.
- Pencocokan tag affiliate ke nama iklan **otomatis** (aturan *Contains* /
  *Exact* dapat diatur).

### 2. Tabel Kampanye
- Kolom lengkap: Tag/Nama Iklan, Spend (Meta), Klik Meta, Klik Shopee, Orders,
  Komisi (Shopee), ROI/Status.
- **Pencarian** tag/nama iklan + **sortir** per kolom.
- Badge status: **Winning** (ROI ≥ 120%), **BEP**, **Boncos** (rugi).
- Klik baris untuk detail: Net Profit, CPC, CPA, konversi, nilai penjualan,
  dan daftar ID pesanan.

### 3. KPI & Laporan Keuangan
- Total Spend, Komisi Bersih, Net Profit/Loss, ROAS (ROI).
- Perbandingan klik Meta vs Shopee + **efisiensi link**.
- **PPN dinamis** (default 12%) → Beban PPN, Total Spend+Pajak, Net Profit
  & ROI pasca pajak.
- Filter **status pesanan** (otomatis mengecualikan Batal/Refund) dan filter
  **tanggal** (7/30 hari, bulan ini).

### 4. Grafik & Performa Harian
- Grafik batang Spend vs Komisi per tag; diagram lingkaran status pesanan.
- Laporan kinerja **per tanggal** dengan rincian **per jam** + baris TOTAL.

### 5. Diagnostik & Data Tidak Terpetakan
- Panel validasi kolom CSV yang terdeteksi + status tag (hijau cocok /
  kuning tidak cocok).
- Bagian khusus untuk iklan Meta tanpa tag dan pesanan Shopee organik.

### 6. Workspace & Ekspor
- Simpan/muat/ekspor/impor **workspace** (multi-profil) — tersimpan aman di
  perangkat (main process).
- **Ekspor CSV** hasil analisis (kompatibel Excel, BOM UTF-8).

### 7. Asisten AI (Opsional)
- Chat analisis otomatis: identifikasi kampanye *winning*, solusi *boncos*,
  deteksi tag rusak, strategi scaling.
- Kunci Gemini diatur di Pengaturan (disimpan lokal, **bukan login**).
- Tanpa kunci, seluruh tabel/grafik tetap berfungsi penuh.

### Catatan teknis
- Deps baru: `papaparse` (parsing CSV), `recharts` (grafik).
- AI berjalan via main process (CSP renderer tetap aman).

---

## Log perubahan (referensi internal — tidak disalin ke detail release)

### v1.5.0 (2026-08-16)
- `feat: Performa Kampanye — analisis Meta Ads vs komisi Shopee Affiliate`
  (`832070d`, PR #30 → merge commit `53ce562`).
  - Menu sidebar baru `performa` + `src/views/CampaignView.tsx`.
  - `src/lib/campaign/*` (types, csv, dataProcessor, demoData, format) — port
    logika dari rs-9, gaya rs-omni.
  - `src/components/campaign/*` (tabel, KPI, grafik, diagnostik, unmapped,
    date range, AI advisor).
  - `electron/main/engine/campaign.ts` (workspace store + Gemini `ai:analyze`).
  - IPC `analytics:*` + `ai:*`; `AppConfig.geminiApiKey`; preferensi
    `omni.campaign.*`.
  - Audit forensik: 4 bug diperbaiki (diagnostik kolom, AI auto-audit spam,
    preset tanggal UTC, stale filename).
  - Validasi: get_errors bersih, typecheck/lint/build PASS, E2E browser.
