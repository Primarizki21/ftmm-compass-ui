# Benchmark Indeks & `v_timetable_conflicts`

Tanggal: 2026-11-03 · PostgreSQL 16.15 (Docker, laptop dev) · median 7 run `EXPLAIN ANALYZE`

## Cara mengulang

```bash
# DB benchmark terpisah, salinan DB dev yang sudah di-seed katalog
docker exec -i ftmm-compass-postgres psql -U postgres -c "CREATE DATABASE ftmm_bench TEMPLATE ftmm_compass_dev"
docker exec -i ftmm-compass-postgres psql -U postgres -d ftmm_bench < database/bench/timetable_bench_data.sql
docker exec -i ftmm-compass-postgres psql -U postgres -d ftmm_bench < database/bench/benchmark_queries.sql
```

`timetable_bench_data.sql` mematikan trigger validasi sementara (`session_replication_role = replica`)
dan **hanya** boleh dijalankan di DB benchmark.

## Skala data dummy

284 matkul dibuka · 852 kelas (A/B/C) · 1.178 jadwal Senin–Jumat · 3.000 mahasiswa ·
3.000 timetable aktif · 24.000 item (8 kelas/mahasiswa, dipilih acak → 14.095 bentrok).

## Hasil

| Query | Sebelum migrasi | Sesudah `c4d2e6f8a1b3` | Rencana sesudah |
|---|---|---|---|
| Q1 bentrok **satu** timetable (pola API) | 0,47–0,61 ms | 0,72–0,83 ms | index `timetable_items_section_unique` + `idx_class_schedules_day_time` |
| Q2 **seluruh** view (3.000 mahasiswa) | 23,2 ms | 22,7–24,9 ms | hash join, seq scan (membaca semua baris) |
| Q3 Course Finder `LIKE '%data%'` | 0,39 ms | 0,37 ms | seq scan (tabel ±400 baris) |
| Q4 kelas bentrok slot Senin 08–10 | 0,12 ms | 0,11 ms | `idx_class_schedules_day_time` |

## Kesimpulan

1. **Target < 15 ms tercapai untuk pemakaian nyata** (Q1, cek per timetable): < 1 ms.
2. **Q2 (seluruh view) tidak bisa dipercepat dengan indeks**: query harus membaca seluruh
   24.000 item dua kali; hash join sudah rencana optimal. Aplikasi wajib selalu memfilter
   `WHERE timetable_id = ...`. Kalau suatu saat butuh laporan bentrok semua mahasiswa,
   pakai materialized view / job terjadwal, bukan indeks.
3. `v_timetable_conflicts` **sudah tertutup indeks schema V2.1 RC1**
   (`timetable_items_section_unique`, `class_schedules_slot_unique`), termasuk FK
   `timetable_items` yang diminta kartu.
4. Indeks trigram tidak dipakai planner selama katalog masih ±400 baris (seq scan lebih
   murah); disiapkan karena `LIKE '%x%'` tidak pernah bisa memakai B-tree.
5. `idx_class_schedules_day_time` membuat Q1 ±0,2 ms lebih lambat (planner memilih nested
   loop) tapi dipertahankan: `class_schedules` bertambah setiap semester dan Q4 butuh indeks
   saat tabel membesar.
6. Total ukuran 5 indeks baru: ±248 kB.

## Catatan untuk review schema (Sprint 8)

- `idx_class_schedules_section_id` redundan dengan `class_schedules_slot_unique`
  (kolom terdepan sama) — kandidat dihapus.
- 12 FK audit (`source_document_id`, `verified_by_user_id`, `resolved_by_user_id`,
  `final_grade`) belum berindeks; jarang di-query, tapi menghapus baris induknya akan
  memicu seq scan karena `ON DELETE RESTRICT`.
