-- Data dummy untuk benchmark v_timetable_conflicts & pencarian katalog.
-- HANYA untuk database benchmark terpisah (dibuat dari template DB dev yang sudah di-seed).
-- Trigger validasi dimatikan sementara (session_replication_role = replica) supaya bulk insert cepat;
-- angka di bawah mendekati skala FTMM: ~400 matkul dibuka, 3 kelas per matkul, 3.000 mahasiswa.
BEGIN;
SET LOCAL session_replication_role = replica;
SELECT setseed(0.42);

INSERT INTO academic_periods (academic_year_start, term, is_active) VALUES (2026, 'ganjil', true);

INSERT INTO course_offerings (academic_period_id, course_id, offering_code)
SELECT (SELECT academic_period_id FROM academic_periods LIMIT 1), course_id, 'BENCH-' || course_code
FROM courses;

INSERT INTO offering_components (course_offering_id, component_code, component_type)
SELECT course_offering_id, 'T', 'lecture' FROM course_offerings;

INSERT INTO class_sections (offering_component_id, section_code)
SELECT oc.offering_component_id, s FROM offering_components oc CROSS JOIN unnest(ARRAY['A','B','C']) s;

-- 1-2 pertemuan per kelas, Senin-Jumat 07:00-17:00, durasi 100/150 menit
INSERT INTO class_schedules (class_section_id, day_of_week, start_time, end_time, room_name)
SELECT cs.class_section_id, d, t, t + (CASE WHEN random() < 0.5 THEN interval '100 min' ELSE interval '150 min' END), 'Ruang ' || (1 + floor(random()*30))::int
FROM class_sections cs
CROSS JOIN LATERAL (
    SELECT DISTINCT 1 + floor(random()*5)::int AS d, time '07:00' + (floor(random()*8) * interval '60 min') AS t
    FROM generate_series(1, 1 + (random() < 0.4 AND cs.class_section_id IS NOT NULL)::int)
) x
ON CONFLICT DO NOTHING;

INSERT INTO users (email, full_name, role)
SELECT 'bench' || g || '@example.test', 'Bench ' || g, 'student' FROM generate_series(1, 3000) g;

INSERT INTO student_curriculum_assignments (user_id, curriculum_id)
SELECT u.user_id, (SELECT curriculum_id FROM curricula ORDER BY random() + (u.user_id IS NULL)::int LIMIT 1)
FROM users u WHERE u.email LIKE 'bench%';

INSERT INTO timetables (user_id, student_curriculum_assignment_id, academic_period_id, is_active)
SELECT a.user_id, a.student_curriculum_assignment_id, (SELECT academic_period_id FROM academic_periods LIMIT 1), true
FROM student_curriculum_assignments a JOIN users u USING (user_id) WHERE u.email LIKE 'bench%';

-- 8 kelas acak per timetable
INSERT INTO timetable_items (timetable_id, class_section_id)
SELECT t.timetable_id, s.class_section_id
FROM timetables t
CROSS JOIN LATERAL (SELECT class_section_id FROM class_sections ORDER BY random() + (t.timetable_id IS NULL)::int LIMIT 8) s
ON CONFLICT DO NOTHING;

COMMIT;
ANALYZE;
SELECT (SELECT count(*) FROM class_sections) sections, (SELECT count(*) FROM class_schedules) schedules,
       (SELECT count(*) FROM timetables) timetables, (SELECT count(*) FROM timetable_items) items;
