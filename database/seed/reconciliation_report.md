# Laporan Rekonsiliasi Katalog FTMM

Dibuat otomatis oleh `backend/reconcile_catalog.py`. Jangan diedit manual;
keputusan diisi di `reconciliation.json`.

## Ringkasan

- Baris mata kuliah: **411**
- Kode unik lintas prodi: **283**
- Kode dipakai ≥2 prodi: **46**
- Kode format tidak valid: **0**
- Duplikat kode dalam satu prodi: **0**
- Konflik identitas (kode sama, nama beda): **17**
- Variasi kosmetik nama (otomatis jadi alias): **8**
- Beda SKS antar prodi untuk matkul yang sama (wajar, disimpan per kurikulum): **6**
- Matkul berprasyarat: **216** — terpetakan otomatis **205**, perlu review **11**
- Total item keputusan untuk reviewer: **28**

## Sumber

| Prodi | File | Baris | Tahun | SHA-256 |
|---|---|---|---|---|
| TSD | Panduan Pendidikan FTMM UNAIR 2024-2025.pdf | 82 | - | `-` |
| RN | Panduan Pendidikan FTMM UNAIR 2024-2025.pdf | 79 | - | `-` |
| TRKB | Panduan Pendidikan FTMM UNAIR 2024-2025.pdf | 72 | - | `-` |
| TE | Panduan Pendidikan FTMM UNAIR 2024-2025.pdf | 95 | - | `-` |
| TI | Panduan Pendidikan FTMM UNAIR 2024-2025.pdf | 83 | - | `-` |

## 1. Kode format tidak valid

Ditolak oleh CHECK `courses_code_format_check`; wajib diperbaiki atau ditahan.


## 2. Duplikat kode dalam satu prodi

Satu kurikulum tidak boleh punya kode yang sama dua kali (UNIQUE curriculum_id, course_id).


## 3. Konflik identitas lintas prodi

Kode sama tapi nama berbeda secara substansi. `courses.course_code` UNIQUE global, jadi harus diputuskan.

- **`AGB101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Budha · 2 SKS · wajib
  - RN sem 1 · Agama Budha I · 2 SKS · wajib
  - TRKB sem 1 · Agama Budha · 2 SKS · wajib
  - TE sem 1 · Agama Budha · 2 SKS · wajib
  - TI sem 1 · Agama Budha I · 2 SKS · wajib
- **`AGC101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Konghucu · 2 SKS · wajib
  - RN sem 1 · Agama Konghucu I · 2 SKS · wajib
  - TRKB sem 1 · Agama Konghucu · 2 SKS · wajib
  - TE sem 1 · Agama Konghucu · 2 SKS · wajib
  - TI sem 1 · Agama Konghucu I · 2 SKS · wajib
- **`AGH101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Hindu · 2 SKS · wajib
  - RN sem 1 · Agama Hindu I · 2 SKS · wajib
  - TRKB sem 1 · Agama Hindu · 2 SKS · wajib
  - TE sem 1 · Agama Hindu · 2 SKS · wajib
  - TI sem 1 · Agama Hindu I · 2 SKS · wajib
- **`AGI101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Islam · 2 SKS · wajib
  - RN sem 1 · Agama Islam I · 2 SKS · wajib
  - TRKB sem 1 · Agama Islam · 2 SKS · wajib
  - TE sem 1 · Agama Islam · 2 SKS · wajib
  - TI sem 1 · Agama I · 2 SKS · wajib
- **`AGI401`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 6 · Agama Islam II · 2 SKS · wajib
  - RN sem 6 · Agama Islam 2 · 2 SKS · wajib
  - TRKB sem 7 · Agama Islam II · 2 SKS · wajib
  - TE sem 5 · Agama Islam II · 2 SKS · wajib
  - TI sem 8 · Agama 2 · 2 SKS · wajib
- **`AGK101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Katolik · 2 SKS · wajib
  - RN sem 1 · Agama Katolik I · 2 SKS · wajib
  - TRKB sem 1 · Agama Katolik · 2 SKS · wajib
  - TE sem 1 · Agama Katolik · 2 SKS · wajib
  - TI sem 1 · Agama Katolik I · 2 SKS · wajib
- **`AGP101`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 1 · Agama Protestan · 2 SKS · wajib
  - RN sem 1 · Agama Protestan I · 2 SKS · wajib
  - TRKB sem 1 · Agama Protestan · 2 SKS · wajib
  - TE sem 1 · Agama Protestan · 2 SKS · wajib
  - TI sem 1 · Agama Protestan I · 2 SKS · wajib
- **`FID105`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - RN sem 3 · Praktikum Fisika Dasar 2 · 1 SKS · wajib
  - TI sem 2 · Fisika Dasar II (Praktikum) · 1 SKS · wajib
- **`KID105`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - RN sem 1 · Kimia Dasar · 2 SKS · wajib
  - TRKB sem 1 · Kimia Dasar · 2 SKS · wajib
  - TE sem 1 · Kimia Dasar · 2 SKS · wajib
  - TI sem 1 · Kimia · 2 SKS · wajib
- **`KLJ301`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 6 · Praktek Kerja Lapangan · 2 SKS · wajib
  - RN sem 7 · Praktek Kerja Lapangan · 2 SKS · wajib
  - TE sem 6 · Praktek Kerja Lapangan · 2 SKS · wajib
  - TI sem 7 · PKL · 2 SKS · wajib
- **`KNJ401`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 7 · KKN-BBM · 3 SKS · wajib
  - RN sem 7 · Kuliah Kerja Nyata · 3 SKS · wajib
  - TE sem 7 · Kuliah Kerja Nyata · 3 SKS · wajib
  - TI sem 8 · Kuliah Kerja Nyata · 3 SKS · wajib
- **`MAL104`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TRKB sem 2 · Aljabar Linier · 3 SKS · wajib
  - TE sem 2 · Aljabar Linier dan Sistem Diskrit · 3 SKS · wajib
- **`MAS243`** — _nama mirip tapi SKS beda — cek PDF_
  - TRKB sem 4 · Probabilitas, Statistika dan Proses Stokastik · 3 SKS · wajib
  - TE sem 5 · Probabilitas, Statistik dan Proses Stokastik · 4 SKS · wajib
- **`MNM106`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 2 · Komunikasi dan Pengembangan Diri · 2 SKS · wajib
  - RN sem 1 · Kemampuan Komunikasi dan Pengembangan Diri · 2 SKS · wajib
  - TRKB sem 2 · Komunikasi dan Pengembangan Diri · 2 SKS · wajib
  - TE sem 2 · Komunikasi dan Pengembangan Diri · 2 SKS · wajib
  - TI sem 2 · Komunikasi dan Pengembangan Diri · 2 SKS · wajib
- **`PHP103`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 2 · Logika dan Pemikiran Kritis · 2 SKS · wajib
  - RN sem 1 · Logika dan Pemikiran Kritis · 2 SKS · wajib
  - TRKB sem 2 · Logika dan Pemikiran Kritis · 2 SKS · wajib
  - TE sem 2 · Logika dan Pemikiran Kritis · 2 SKS · wajib
  - TI sem 2 · Logika dan Pemikiran Kiritis · 2 SKS · wajib
- **`SIA105`** — _kemungkinan matkul BERBEDA — salah satu kode kemungkinan salah, cek PDF_
  - TRKB sem 2 · Dasar Pemrograman · 3 SKS · wajib
  - TE sem 3 · Pemrograman Komputer · 3 SKS · wajib
- **`TNM102`** — _kemungkinan matkul sama (beda penulisan) — pilih nama canonical_
  - TSD sem 3 · Teknologi Hijau · 2 SKS · wajib
  - TRKB sem 3 · Teknologi Hijau · 2 SKS · wajib
  - TE sem 3 · Green Technology · 2 SKS · wajib
  - TI sem 7 · Teknologi Hijau · 2 SKS · wajib

## 4. Variasi kosmetik (alias otomatis)

Dianggap matkul yang sama; nama pertama jadi canonical, sisanya masuk `course_aliases`.

- `AGB401`: Agama Budha 2 / Agama Budha II
- `AGC401`: Agama Konghucu 2 / Agama Konghucu II
- `AGH401`: Agama Hindu 2 / Agama Hindu II
- `AGK401`: Agama Katolik 2 / Agama Katolik II
- `AGP401`: Agama Protestan 2 / Agama Protestan II
- `FID101`: Fisika Dasar 1 / Fisika Dasar I
- `FID104`: Fisika Dasar 2 / Fisika Dasar II
- `PNJ302`: Metode Penelitian / Metode penelitian

## 5. Beda SKS untuk matkul yang sama

Bukan error: SKS disimpan di `curriculum_courses`, per prodi. Dicatat untuk dicek ke PDF.

- `KKJ302` Magang Industri: RN=4, TI=3
- `MNK204` Manajemen Proyek: TE=2, TI=3
- `PNJ495` Proposal Skripsi: TSD=2, RN=2, TE=2, TI=1
- `PNJ499` Skripsi: TSD=4, RN=6, TRKB=6, TE=6, TI=5
- `SIC203` Pengantar Kecerdasan Buatan: TSD=3, TE=2
- `TIU201` Otomasi Industri: TRKB=3, TI=2

## 6. Nama sama, kode berbeda

Info saja — bisa matkul berbeda per prodi, bisa juga salah ketik kode.

- bahasa inggris: RN:BAE110, TE:BAE111, TI:BAE110, TRKB:BAE111, TSD:BAE110
- fisika dasar 1: RN:FID101, TE:FID103, TI:FID103, TRKB:FID101
- kimia dasar: RN:KID105, TE:KID105, TRKB:KID105, TSD:KID101
- kuliah kerja nyata: RN:KNJ401, TE:KNJ401, TI:KNJ401, TRKB:KNT401
- mekanika teknik: TI:TNM103, TRKB:RKU101
- pemrograman komputer: TE:SIA105, TI:SIA101
- praktek kerja lapangan: RN:KLJ301, TE:KLJ301, TRKB:KLT301, TSD:KLJ301
- proposal skripsi: RN:PNJ495, TE:PNJ495, TI:PNJ495, TRKB:PNT498, TSD:PNJ495
- rangkaian listrik: TE:TEE201, TRKB:TML306
- sistem kontrol: TE:TEL203, TRKB:FIA304

## 7. Prasyarat yang perlu review

Leaf yang berhasil dipetakan ditulis sebagai usulan; teks yang gagal dipetakan ada di 'tidak terpetakan'.

- **RN:PNJ499** — raw: _Lulus Proposal Penelitian_
  - ❓ "Proposal Penelitian" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: PNJ302 (metode penelitian), PNJ495 (proposal skripsi))
- **RN:RND202** — raw: _Fisika Dasar | Kimia Dasar_
  - ✅ course_passed → KID105
  - ❓ "Fisika Dasar" — nama ada di prodi lain, tidak di kurikulum ini (kandidat: TSD:FID113)
- **RN:RNM202** — raw: _Fisika Dasar 1 & 2 | Kimia Dasar 1 & 2_
  - ✅ course_passed → FID101
  - ✅ course_passed → FID104
  - ✅ course_passed → KID103
  - ❓ "Kimia Dasar 1" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: KID103 (kimia dasar 2), KID105 (kimia dasar), FID101 (fisika dasar 1))
- **RN:RNT301** — raw: _Biologi Sel dan Molekuler | Aplikasi Nanoteknologi_
  - ✅ course_passed → BIS201
  - ❓ "Aplikasi Nanoteknologi" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: FID205 (fisika nanoteknologi), RNS302 (aplikasi nanoteknologi dalam industri), RND201 (dasar nanoteknologi 2))
- **RN:RNT303** — raw: _Pengantar Nanoteknologi 1 & 2 | Fisika Modern_
  - ✅ course_passed → RND101
  - ✅ course_passed → RND201
  - ❓ "Fisika Modern" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: FID104 (fisika dasar 2), FID101 (fisika dasar 1))
- **RN:RNT402** — raw: _Fisika Modern_
  - ❓ "Fisika Modern" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: FID104 (fisika dasar 2), FID101 (fisika dasar 1))
- **TRKB:RKK301** — raw: _Matematika Diskrit | PBO | Kecerdasan Buatan | Probabilitas, | Statistika, dan Proses Stokastik_
  - ✅ course_passed → MAL204
  - ✅ course_passed → MAT302
  - ✅ course_passed → MAS243
  - ❓ "PBO" — nama tidak cocok persis dengan matkul di prodi ini
- **TRKB:RKK302** — raw: _Matematika Diskrit | PBO | Kecerdasan Buatan | Probabilitas, | Statistika, dan Proses Stokastik_
  - ✅ course_passed → MAL204
  - ✅ course_passed → MAT302
  - ✅ course_passed → MAS243
  - ❓ "PBO" — nama tidak cocok persis dengan matkul di prodi ini
- **TRKB:RKS301** — raw: _CAD_
  - ❓ "CAD" — nama tidak cocok persis dengan matkul di prodi ini
- **TRKB:RKS308** — raw: _CAD, Dasar Pemrograman dan Rangkaian Listrik_
  - ✅ course_passed → SIA105
  - ✅ course_passed → TML306
  - ❓ "CAD" — nama tidak cocok persis dengan matkul di prodi ini
- **TSD:SID207** — raw: _Eksplorasi dan Visualisasi Data dan Algoritma | Pemrograman I_
  - ✅ course_passed → SID205
  - ❓ "Algoritma" — nama tidak cocok persis dengan matkul di prodi ini
  - ❓ "Pemrograman I" — nama tidak cocok persis dengan matkul di prodi ini (kandidat: MAA311 (pemrograman linier), SIA303 (pemrograman lanjut), SIA107 (algoritma pemrograman 1))
