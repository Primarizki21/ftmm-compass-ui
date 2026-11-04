# Temuan Verifikasi Sumber Katalog FTMM

Tanggal: 2026-11-03. Pembanding: 5 dokumen kurikulum 2021 (SK Rektor) dan Panduan
Pendidikan FTMM 2021–2025 dari Drive tim (`Dataset Matkul Prodi/Dokumen Mentah`).
Transkripsi tabel scan RN, TE, TI ada di `transcriptions/`; TRKB & TSD dibaca dari
teks PDF oleh `backend/verify_catalog_sources.py`.

## 1. Kesimpulan utama

1. **JSON Ekstrak tidak bisa dipakai langsung sebagai sumber canonical.** Ada salah
   kode, salah SKS, salah semester, dan matkul yang hilang di semua prodi kecuali
   matkul wajib TI.
2. **Dokumen resmi sendiri punya kesalahan**: RKK301 dobel (TRKB), MAA103 dobel (RN),
   kode tidak lengkap (`KKJ`, `KLJ`, `KNJ`, `PNJ`, `SIA`, `TET`), dan kode di tabel
   struktur ≠ kode di halaman deskripsi (mis. TRKB Metode Penelitian PNJ302 vs PNT497).
3. **Panduan Pendidikan 2022-2023, 2023-2024, 2024-2025 memuat tabel struktur yang
   identik satu sama lain**, tapi **berbeda dari dokumen kurikulum 2021** (paling
   banyak di RN). Panduan sudah membetulkan beberapa kesalahan dokumen 2021
   (mis. MAA102 Kalkulus 1).
4. **Prasyarat (teks) di JSON TRKB & TSD sama persis dengan PDF**; yang perlu dijaga
   hanya pemetaan teks → kode.

## 2. Kebijakan yang terkonfirmasi dari Panduan 2024-2025

| Aturan | Isi | Halaman |
|---|---|---|
| Skala nilai | A 4 · AB 3,5 · B 3 · BC 2,5 · C 2 · D 1 · E 0; **D = Lulus**, E = Tidak Lulus | 46-47 |
| Batas SKS dari IPS | IPS ≥ 3,00 → 24 · 2,51–2,99 → 20 · 2,00–2,50 → 18 · < 2,00 → 15 | 45 |
| Cumlaude | IPK 3,51–4,00, lulus tepat 8 semester, MBKM ≥ 10 sks | 47 |
| Beban lulus | minimal 144 sks dalam 8 semester | 28 |
| "menempuh X sks" | **tidak didefinisikan** — tetap keputusan reviewer | — |

## 3. Temuan per prodi (JSON vs dokumen kurikulum 2021)

**TRKB** (teks, hal 35-37)
- `PNJ` → **PNJ304**, 3 sks (JSON 2).
- `FIA304` Sistem Kontrol 3 sks (JSON 4).
- `RKS308` Robot Terbang: pilihan semester 7 (JSON semester 5).
- Tabel struktur memakai `PNJ302` Metode Penelitian dan `PNJ499` Skripsi; JSON memakai
  `PNT497`/`PNT499` dari halaman deskripsi.

**TSD** (teks, hal 37-41)
- Hilang dari JSON (14): MAT110 Matematika Lanjut, SIA206 Algoritma Pemrograman II,
  SID201 Basis Data, MAS204 Metode Statistika, SID207 Data Mining I, SIC306 Machine
  Learning, MNW401 Kewirausahaan, KNJ401 KKN-BBM, PNJ302 Metode Penelitian, MAS247,
  MAS330, MAS332, MAS334, MAS422.
- JSON `MAS104` Metode Statistika 3 sks & `MAS207` Data Mining I: di tabel struktur
  masing-masing **MAS204 (4 sks)** dan **SID207**. Tabel 4.2 hal 42 sendiri menulis
  perubahan kode MAS207 → MAS104, jadi dokumen TSD tidak konsisten.
- `SIA107` Algoritma Pemrograman I 3 sks (JSON 2). `BAE312` Bahasa Inggris II semester
  5 (JSON 3).

**RN** (scan, PDF hal 43-46)
- `BA1101` → **BAI101** (salah ketik ekstraksi).
- Praktikum Nanoteknologi 1-4 (RNS201/202/301/303): **2 sks** (JSON 1).
- `RNT301` "Nanobiomedis" dan `RNM301` "Rekayasa Material" (JSON menambah "Pengantar").
- Kode tidak lengkap di dokumen: KKJ, KNJ, KLJ, PNJ.

**TE** (scan, PDF hal 39-43) — paling banyak salah
- Kode beda: BHP103→PHP103, SPL201→TEL101, SPL202→TEL201, TBE201→TEE201,
  TBE202→TEE202, TBO201→TEU201, TPB203→TEE203, TEE202→TEL202 (Sistem Tenaga Listrik),
  TES203 adalah Sinyal dan Sistem (Sistem Kontrol = TEL203), MAT207→MAA207.
- SKS beda: FID103 & FID104 2 sks (JSON 3), SIA105 3 (JSON 2), TEE201 4 (JSON 3),
  TEK201 2, TES201 2, TES202 2, TEU201 4, MAS243 4, TEL307 2, TES305 2, TEL402 3.
- Semester beda: banyak praktikum & MAT201/MAS243 bergeser satu semester.
- `SIA106` Praktikum Pemrograman Komputer sudah digabung ke SIA105 (Tabel 4.2 hal 43).

**TI** (scan, PDF hal 35-38)
- Semua matkul wajib cocok.
- **20 matkul pilihan konsentrasi tidak ada di JSON** (Ergonomi, Sistem Manufaktur,
  Rekayasa Sistem, Umum).

## 4. Status 26 keputusan reviewer

Lihat field `pdf_check` per item di `reconciliation.json`:
19 terkonfirmasi, 6 bertentangan dengan PDF, 2 terselesaikan oleh PDF, 1 belum bisa
dipastikan.

## 4b. Perbaikan setelah review (2026-11-03, sore)

Diputuskan (Darryl): struktur katalog diambil dari **tabel Panduan Pendidikan 2024-2025**
(`backend/build_catalog.py` → `catalog_canonical.json`), detail dari JSON/dokumen 2021.

- 400 baris (282 kode unik) untuk 5 prodi; **37/37 total SKS per semester cocok** dengan
  angka Sub-Jumlah/Jumlah yang tercetak di tabel.
- Kesalahan JSON yang otomatis hilang karena tidak lagi dipakai sebagai struktur: kode
  TE (TBE201, TBO201, SPL201, …), SKS & semester salah, `BA1101`, MAA103 dobel, `PNJ`,
  KKJ301/KKJ302, PNT497 vs PNJ302, 14 matkul TSD & 20 pilihan TI yang hilang.
- Kode tidak lengkap TE (KLJ, KNJ, PNJ×2) dilengkapi menjadi KLJ301, KNJ401, PNJ495,
  PNJ499 karena prodi lain di Panduan yang sama memakai kode itu.
- Salah ketik Panduan TSD `AGK401 Agama Konghucu II` dikoreksi ke AGC401.
- Prasyarat: 205/216 terpetakan otomatis (nama & kode lama dari dokumen 2021 dipakai
  sebagai alias); 11 sisanya diputuskan reviewer. 27/28 keputusan ber-bukti PDF.
- Prasyarat matkul yang tidak ada di JSON (MAT110, SIA206, SID201, …) diambil dari
  halaman deskripsi dokumen TSD 2021.

## 4c. Cross-check website FTMM & Drive, dan keputusan item terbuka (2026-11-03, malam)

**Sumber yang dicek ulang**
- Drive tim: tidak ada sumber struktur kurikulum lain. Tab sheet "Ground Truth NLP"
  (PanduanAkademik/PKL/Skripsi/Yudisium, GT_*) adalah potongan teks untuk chatbot;
  `silabus (OLD)` hanya TSD versi lama; `Katalog_Mata_Kuliah_369` = salinan JSON.
- Website ftmm.unair.ac.id (sitemap, 1.150 URL). Dokumen relevan ada sebagai flipbook:
  `kurikulum-s1-teknik-robotika-dan-kecerdasan-buatan-ftmm`, `panduan-pendidikan-ftmm`,
  `pedoman-pendidikan-2022-2023`, `spesifikasi-program-studi-teknik-industri`,
  13 × `silabus-mk-teknik-elektro-*` (termasuk "MK Pilihan Sistem/Rekayasa Manufaktur",
  yang isinya tampak TI), `informasi-krs-*`. **Tidak bisa diunduh otomatis**: situs
  memakai proteksi bot F5 (TSPD) dan flipbook baru memuat PDF setelah interaksi
  manual. Artikel "Apa yang dipelajari di prodi …" terbit Mei 2020 (sebelum kurikulum
  2021), jadi tidak dipakai.

**Keputusan (dibuat Claude atas permintaan Darryl, berdasarkan bukti)**
1. **Semester MK pilihan TE (22)**: diisi dari field *Semester* di halaman deskripsi
   dokumen TE 2021 (lewat JSON): pilihan konsentrasi = semester 7 (cocok dengan slot
   "Pilihan Konsentrasi 8 sks" di semester 7 tabel), pilihan umum = semester 5.
2. **Semester MK pilihan TI (19)**: dokumen TI 2021 hal 138-159 (OCR) menulis
   *"Semester: Mata Kuliah Pilihan"* — memang tidak ada semester tetap. Tidak dikarang:
   ditandai `semester_free`. Schema perlu dilonggarkan lewat migrasi Alembic di PR
   seeder: `recommended_semester` & `term` boleh NULL hanya untuk `course_type`
   pilihan/pilihan_terbatas. Slot tabel TI: MK Pilihan 1 sem 6, 2 sem 7, 3-4 sem 8.
3. **RN baris tanpa kode**: "Sintesis Nanokomposit (Praktikum)" → praktikum RNM201 dan
   "Fabrikasi divais nano (Praktikum)" → praktikum RNT302 (pola tabel sama dengan baris
   31/34/41/49). "Nanoteknologi terapan 2 (Praktikum)" 3 sks sem 6 tidak punya induk
   dan tidak punya kode → diberi kode sementara RNSX301 (lihat tabel asumsi di bawah).
4. **Deskripsi kosong**: 14 matkul TSD diambil dari dokumen TSD 2021 (teks). 19 pilihan
   TI diambil dari OCR (`Ekstrak/ocr/TI_descriptions.json`, kualitas OCR mentah —
   perlu dikoreksi sebelum ditampilkan).
5. **Commit**: hanya struktur (`catalog_canonical.json`, `reconciliation.json`,
   transkripsi tabel, laporan). Deskripsi, CPL, nama dosen, dan OCR disimpan di
   `Ekstrak/derived/catalog_details.json` & `Ekstrak/ocr/` (gitignored) mengikuti aturan tim.
6. **Versi RN**: tetap Panduan 2024-2025 (terbaru, identik 3 edisi, sudah membetulkan
   MAA102/KKJ302). Konfirmasi Kaprodi RN dianjurkan tapi tidak memblokir seeding.

**Tidak bisa dipastikan dari dokumen mana pun → asumsi paling masuk akal (Darryl setuju, 2026-11-03)**

Semua di bawah masuk DB berstatus `unverified` / rule `unresolved`, jadi tampil di aplikasi
tapi tidak dianggap resmi dan tidak memblokir Planner. Ganti di `reconciliation.json` /
`build_catalog.py` kalau ada konfirmasi prodi, lalu jalankan ulang seeder.

| Item | Asumsi | Alasan |
|---|---|---|
| TRKB Sistem Temu Kembali Informasi | kode sementara **RKKX301** (alias tertulis: RKK301) | RKK301 milik Pembelajaran Mesin (praktikum RKK302); RKK301-307 sudah terpakai, menebak RKK308 berisiko bentrok |
| RN Nanoteknologi terapan 2 (Praktikum), 3 sks wajib sem 6 | kode sementara **RNSX301** | penerus RNS301 'Nanoteknologi terapan 1'; ikut dihitung di total wajib sem 6 tabel resmi |
| Prasyarat RND202 "Fisika Dasar" | FID101 Fisika Dasar 1 | konsisten dengan "Kimia Dasar" = KID105 (yang pertama di seri) |
| Prasyarat RNT303/RNT402 "Fisika Modern" | saran (advisory) RND204 Nanosains Kuantum | materi fisika modern (kuantum/atom/zat padat) ada di RND204; tidak memblokir |

Huruf **X** pada kode sementara menandai placeholder: tetap lolos CHECK format kode, tapi
tidak mungkin bentrok dengan kode resmi.

| TI agama (ditemukan saat review akhir) | 'AGI101 Agama I' & 'AG401 Agama 2' diperluas ke 6 alternatif AGx101 (sem 1) / AGx401 (sem 8), `unverified` | Tabel TI hanya mencetak satu baris generik; tanpa ini mahasiswa TI non-Muslim tidak punya MK agama. Empat prodi lain di Panduan yang sama memakai 6 alternatif |

- Teks prasyarat RN/TE/TI berasal dari JSON (dokumen 2021 scan); sudah dicek ulang per halaman pada review 2026-11-05 (lihat bagian berikut).

## Verifikasi ulang ke `Dokumen_Mentah` (2026-11-05)

Sembilan PDF sumber (Panduan 2021-2025 + 5 dokumen kurikulum 2021) di-OCR ulang di lokal
(`Dokumen_Mentah/`, gitignored; teks OCR tidak di-commit). Temuan yang mengubah/mengunci asumsi:

| Item | Bukti dokumen | Keputusan |
|---|---|---|
| TRKB Sistem Temu Kembali Informasi | Dokumen TRKB 2021 **bertentangan internal**: tabel semester hal cetak 23 menulis `RKK301`; ringkasan Tabel 4.3 hal cetak 25 menulis `SIC301`; deskripsi Tabel 4.59 hal cetak 90 menulis `RKK301` | placeholder `RKKX301` dipertahankan, `provisional_codes` diperbarui; butuh konfirmasi prodi |
| RN Nanoteknologi terapan 2 (Praktikum) | Panduan 2022-2023, 2023-2024, 2024-2025 sama-sama mencetak baris 57 **tanpa kode** (hal cetak 30); dokumen RN 2021 memakai nama lain (`Praktikum Nanoteknologi 3/4`) | placeholder `RNSX301` dipertahankan |
| TI Agama 2 | Panduan hal cetak 43 dan kurikulum TI 2021 hal cetak 11: kolom kode baris "Agama 2" **kosong**; hanya "AGI101 Agama 1" yang tercetak (TI 2021 hal 9) | keputusan `identity_conflict:AGI401` dipertahankan, status `partial` |
| TE PKL/KKN/Proposal/Skripsi | Kurikulum TE 2021 mencetak kode tidak lengkap/kosong: `KLJ` kosong (hal cetak 125), `PNJ` (hal 143, 146), `KNJ` (hal 144) | `code_inferred` tetap; tidak ada kode definitif |
| RND202 Kinetika dan Termodinamika | Tabel 4.5.41 hal cetak 88: **Prasyarat: Fisika Modern** — bukan "Fisika Dasar" seperti di JSON Ekstrak | keputusan diubah ke Fisika Modern → `FID205` (pemetaan hal cetak 4 butir 5a), tetap `unresolved`; JSON Ekstrak terbukti salah untuk baris ini |
| RNT303 Nanoteknologi Konversi dan Penyimpanan Energi | Tabel 4.5.58 hal cetak 106: "Pengantar Nanoteknologi 1 dan 2, Fisika Modern" | advisory RND204 diganti `FID205` |
| RNT402 Kenanomagnetan | Tabel 4.5.80 hal cetak 131: **Prasyarat: Fisika Modern** | advisory RND204 diganti `FID205` |
| "menempuh X sks" (8 rule: TSD 80/108, TE 80/110/114, TRKB 80/110) | Frasa hanya muncul di kolom Prasyarat; Panduan 2021-2025 dan dokumen prodi **tidak mendefinisikan**; RN memakai "harus menempuh 146 sks" dalam arti menyelesaikan | policy `sks_verbs_completed` tidak diubah; `sks_verbs_note` diperbarui dengan kutipan, semua rule tetap `unresolved` |

Catatan: pemetaan "Fisika Modern → Fisika Nanoteknologi" berasal dari tabel perubahan kurikulum
RN 2021 (bukan pernyataan bahwa keduanya ekuivalen secara isi); SKS Panduan untuk `FID205` (2)
berbeda dengan dokumen (3). Karena itu rule tetap `unresolved` dan tidak memblokir Planner.
