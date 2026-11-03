-- Query yang diukur (jalankan di DB benchmark setelah timetable_bench_data.sql).
-- Q1: cek bentrok satu timetable (pola pemakaian API Timetable Builder)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM v_timetable_conflicts
WHERE timetable_id = (SELECT timetable_id FROM timetables ORDER BY timetable_id LIMIT 1);
-- Q2: seluruh view (kasus terburuk, mis. laporan admin)
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM v_timetable_conflicts;
-- Q3: Course Finder, pencarian substring nama/kode/alias dalam satu kurikulum
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.course_code, c.course_name, cc.recommended_semester
FROM curriculum_courses cc JOIN courses c USING (course_id)
WHERE cc.curriculum_id = (SELECT curriculum_id FROM curricula ORDER BY curriculum_id LIMIT 1)
  AND (lower(c.course_name) LIKE '%data%' OR lower(c.course_code) LIKE '%data%'
       OR EXISTS (SELECT 1 FROM course_aliases a WHERE a.course_id = c.course_id AND lower(a.alias_text) LIKE '%data%'));
-- Q4: kelas yang bertabrakan dengan slot Senin 08:00-10:00 (filter "slot kosong" di Timetable Builder)
EXPLAIN (ANALYZE, BUFFERS)
SELECT class_section_id FROM class_schedules
WHERE day_of_week = 1 AND start_time < time '10:00' AND end_time > time '08:00';
