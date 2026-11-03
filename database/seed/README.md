# Seed Katalog FTMM (Sprint 7)

Pipeline untuk mengisi katalog 5 prodi FTMM (TSD, RN, TRKB, TE, TI) ke PostgreSQL schema V2.1 RC1.

```
PDF resmi (Drive tim: Dataset Matkul Prodi/Dokumen Mentah)  ──┐
Ekstrak/FIX *.json (detail: deskripsi, CPL, teks prasyarat) ──┤
                                                              ▼
backend/build_catalog.py      → database/seed/catalog_canonical.json   (struktur, di-commit)
                              → Ekstrak/derived/catalog_details.json   (deskripsi/CPL/dosen, TIDAK di-commit)
backend/reconcile_catalog.py  → database/seed/reconciliation.json      (keputusan reviewer + bukti halaman)
                              → database/seed/reconciliation_report.md
backend/seed_full_catalog.py  → PostgreSQL
```

## Menjalankan

Seeder hanya butuh file yang sudah di-commit (deskripsi otomatis ikut kalau
`Ekstrak/derived/catalog_details.json` ada di laptop).

```bash
docker compose up -d postgres
uv run --directory backend alembic upgrade head
uv run --directory backend python seed_full_catalog.py
```

Membangun ulang katalog (butuh PDF di `Ekstrak/pdf/` dan 5 JSON di `Ekstrak/`):

```bash
uv run --with pypdf --directory backend python build_catalog.py
uv run --directory backend python reconcile_catalog.py
```

Seeder idempoten: aman dijalankan berulang, baris yang hilang dari katalog dinonaktifkan
(`is_active = false`), rule prasyarat milik seeder (`notes` diawali `seed:catalog`) dibuat ulang.

## Sumber kebenaran

| Data | Sumber | Catatan |
|---|---|---|
| Kode, nama, SKS, semester, wajib/pilihan | Tabel 4.1-4.5 **Panduan Pendidikan FTMM 2024-2025** (identik 2022-2023 & 2023-2024) | 37/37 total SKS per semester cocok dengan Sub-Jumlah/Jumlah tercetak |
| Deskripsi, CPL, teks prasyarat | Dokumen kurikulum 2021 per prodi (lewat JSON Ekstrak; TSD & TRKB juga dari teks PDF; pilihan TI dari OCR) | |
| Aturan nilai, batas SKS, cumlaude | Panduan 2024-2025 hal 45-47 | belum di-seed (bukan scope kartu) |

Bukti per keputusan ada di `reconciliation.json` (field `evidence`: `pdf` / `inferred`, dan `pdf_check`).
Ringkasan temuan lengkap: `source_findings.md`. Transkripsi tabel PDF scan: `transcriptions/`.

## Status data di database

- `curriculum_courses.verification_status = 'verified'` hanya untuk baris yang tercetak persis di tabel resmi;
  kode sementara (`RKKX301`, `RNSX301`), kode yang dilengkapi (TE: KLJ301, KNJ401, PNJ495, PNJ499) dan
  alternatif agama TI bertanda `unverified`.
- **Semua** `course_requirement_rules` berstatus `unresolved` (belum ada verifikasi manusia), jadi belum
  dipakai sebagai aturan authoritative oleh Planner.
- Kode berhuruf **X** (`RKKX301`, `RNSX301`) adalah placeholder, bukan kode resmi.
