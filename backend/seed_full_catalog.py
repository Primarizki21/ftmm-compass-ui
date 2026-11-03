"""Seeder katalog 5 prodi FTMM ke PostgreSQL (schema V2.1 RC1).

Sumber:
- database/seed/catalog_canonical.json  (struktur dari tabel Panduan Pendidikan 2024-2025)
- database/seed/reconciliation.json     (keputusan reviewer + bukti halaman)
- Ekstrak/derived/catalog_details.json  (opsional, gitignored: deskripsi/CPL; nama dosen tidak di-seed)

Idempoten: aman dijalankan berulang (upsert per kunci alami). Rule prasyarat milik
seeder (notes diawali 'seed:catalog') dibuat ulang setiap run; rule lain tidak disentuh.
Seeder tidak pernah menandai rule prasyarat 'verified' selama policy
verify_auto_parsed_prerequisites = false.

Jalankan dari root repo (DB harus sudah di-migrate: alembic upgrade head):
    uv run --directory backend python seed_full_catalog.py
"""

import asyncio
import hashlib
import json
import os
import re
from collections import Counter, defaultdict

from sqlalchemy import text

import reconcile_catalog as rc
from database import AsyncSessionLocal

SEED_DIR = rc.OUT_DIR
CATALOG_PATH = os.path.join(SEED_DIR, "catalog_canonical.json")
DECISIONS_PATH = os.path.join(SEED_DIR, "reconciliation.json")
DETAILS_PATH = os.path.join(rc.EKSTRAK_DIR, "derived", "catalog_details.json")
PDF_DIR = os.path.join(rc.EKSTRAK_DIR, "pdf")
RULE_TAG = "seed:catalog"

PROGRAM_NAMES = {code: name for code, name in rc.PROGRAMS.values()}
CURRICULUM_DOCS = {
    "TRKB": "754 KR KURIKULUM S1 TEKNIK ROBOTIKA KECERDASAN BUATAN FTMM stempel.pdf",
    "RN": "755 KR KURIKULUM S1 REKAYASA NANO TEKNOLOGI FTTM 2021 stempel (2).pdf",
    "TE": "756 KR KURIKULUM S1 TEKNIK ELEKTRO 2021 stempel.pdf",
    "TI": "757 KR KURIKULUM S1 TEKNIK INDUSTRI FTTM 2021 stempel.pdf",
    "TSD": "Dokumen Kurikulum TSD.pdf",
}
SCOPE_BY_CATEGORY = rc.SCOPE_BY_CATEGORY


def sha256(path):
    if not os.path.exists(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_inputs():
    with open(CATALOG_PATH, encoding="utf-8") as f:
        catalog = json.load(f)
    with open(DECISIONS_PATH, encoding="utf-8") as f:
        decisions = json.load(f)
    details = {}
    if os.path.exists(DETAILS_PATH):
        with open(DETAILS_PATH, encoding="utf-8") as f:
            details = json.load(f)
    rc.POLICIES.update(decisions.get("policies", {}))
    return catalog, decisions, details


def course_rows(catalog):
    for prog, data in catalog["programs"].items():
        for r in data["courses"]:
            if not r.get("hold_reason"):
                yield prog, r


def canonical_names(catalog, decisions):
    """Satu nama global per kode: keputusan reviewer, kalau tidak ada nama terbanyak."""
    names = defaultdict(list)
    for _, r in course_rows(catalog):
        names[r["code"]].append(r["name"])
    chosen = {}
    for code, ns in names.items():
        decision = (decisions["items"].get(f"identity_conflict:{code}") or {}).get("decision") or {}
        chosen[code] = decision.get("canonical_name") or Counter(ns).most_common(1)[0][0]
    return chosen, names


def scope_by_code(catalog):
    """Kategori unsur (a-d) hanya tercetak di sebagian tabel; pakai yang ada untuk kode yang sama."""
    scopes = {}
    for _, r in course_rows(catalog):
        if r.get("category") and r["code"] not in scopes:
            scopes[r["code"]] = SCOPE_BY_CATEGORY[r["category"]]
    return scopes


def credit_components(r):
    """kuliah/tutorial/praktikum hanya diisi kalau kolomnya jelas dan jumlahnya cocok."""
    parts, total = r.get("credit_parts") or [], r["credits"]
    if r.get("practicum_credits"):
        return r.get("lecture_credits"), None, r["practicum_credits"]
    if len(parts) == 4 and sum(parts[:3]) == total:
        return parts[0], parts[1], parts[2]
    if len(parts) == 3 and sum(parts[:2]) == total:
        return parts[0], None, parts[1]
    return None, None, None


async def scalar(session, sql, **params):
    return (await session.execute(text(sql), params)).scalar()


async def upsert_source_document(session, title, doc_type, file_name, academic_year, derived_from=None, notes=None):
    existing = await scalar(session, "SELECT source_document_id FROM source_documents WHERE file_name = :f", f=file_name)
    params = dict(t=title, dt=doc_type, f=file_name, ay=academic_year, cs=sha256(os.path.join(PDF_DIR, file_name))
                  or sha256(os.path.join(rc.EKSTRAK_DIR, file_name)), d=derived_from, n=notes)
    if existing:
        await session.execute(text("""
            UPDATE source_documents SET document_title = :t, document_type = :dt, academic_year_label = :ay,
                   checksum_sha256 = COALESCE(:cs, checksum_sha256), derived_from_source_document_id = :d,
                   verification_notes = :n
            WHERE source_document_id = :id"""), {**params, "id": existing})
        return existing
    return await scalar(session, """
        INSERT INTO source_documents (document_title, document_type, academic_year_label, file_name,
               checksum_sha256, derived_from_source_document_id, verification_notes)
        VALUES (:t, :dt, :ay, :f, :cs, :d, :n) RETURNING source_document_id""", **params)


async def seed(session):
    catalog, decisions, details = load_inputs()
    stats = Counter()

    # 1. Dokumen sumber (provenance)
    panduan_id = await upsert_source_document(
        session, "Panduan Pendidikan FTMM UNAIR 2024-2025", "panduan_akademik", catalog["source"], "2024/2025",
        notes="Sumber struktur katalog (Tabel 4.1-4.5). " + catalog["curriculum_label"])
    doc_ids = {}
    for prog, file_name in CURRICULUM_DOCS.items():
        doc_ids[prog] = await upsert_source_document(
            session, f"Dokumen Kurikulum S1 {PROGRAM_NAMES[prog]} 2021", "kurikulum", file_name, "2021",
            notes="Sumber deskripsi, CPL, dan teks prasyarat.")
    for path in sorted(os.listdir(rc.EKSTRAK_DIR)) if os.path.isdir(rc.EKSTRAK_DIR) else []:
        if path.startswith("FIX ") and path.endswith(".json"):
            prog = next(p for k, (p, _) in rc.PROGRAMS.items() if k.split()[-1].upper() in path.upper())
            await upsert_source_document(session, f"Ekstrak JSON {PROGRAM_NAMES[prog]}", "dataset_extract", path,
                                         "2021", derived_from=doc_ids[prog],
                                         notes="Hasil ekstraksi tim; hanya dipakai untuk detail, bukan struktur.")
    stats["source_documents"] = await scalar(session, "SELECT count(*) FROM source_documents")

    # 2. Prodi & kurikulum
    curriculum_ids = {}
    for prog in catalog["programs"]:
        await session.execute(text("""
            INSERT INTO study_programs (program_code, program_name) VALUES (:c, :n)
            ON CONFLICT (program_code) DO NOTHING"""), dict(c=prog, n=PROGRAM_NAMES[prog]))
        sp_id = await scalar(session, "SELECT study_program_id FROM study_programs WHERE program_code = :c", c=prog)
        curriculum_ids[prog] = await scalar(session, """
            INSERT INTO curricula (study_program_id, source_document_id, curriculum_name, curriculum_year,
                   minimum_graduation_credits, standard_duration_semesters)
            VALUES (:sp, :sd, :n, 2021, 144, 8)
            ON CONFLICT (study_program_id, curriculum_year)
            DO UPDATE SET source_document_id = EXCLUDED.source_document_id, curriculum_name = EXCLUDED.curriculum_name
            RETURNING curriculum_id""", sp=sp_id, sd=panduan_id,
            n=f"Kurikulum 2021 {PROGRAM_NAMES[prog]} (Panduan 2024-2025)")

    # 3. Matkul global + alias
    chosen, all_names = canonical_names(catalog, decisions)
    course_ids = {}
    for code, name in sorted(chosen.items()):
        course_ids[code] = await scalar(session, """
            INSERT INTO courses (course_code, course_name) VALUES (:c, :n)
            ON CONFLICT (course_code) DO UPDATE SET course_name = EXCLUDED.course_name, is_active = true
            RETURNING course_id""", c=code, n=name)
    aliases = set()
    for prog, r in course_rows(catalog):
        cid = course_ids[r["code"]]
        for alias, kind in ((r["name"], "name"), (r.get("json_name"), "name"),
                            (r.get("code_as_printed"), "code"), (r.get("json_code"), "code")):
            if alias and alias not in (chosen[r["code"]], r["code"]):
                aliases.add((cid, alias, kind))
    for cid, alias, kind in sorted(aliases, key=str):
        await session.execute(text("""
            INSERT INTO course_aliases (course_id, alias_text, alias_type, source_document_id)
            VALUES (:c, :a, :k, :sd) ON CONFLICT (course_id, alias_text, alias_type) DO NOTHING"""),
            dict(c=cid, a=alias, k=kind, sd=panduan_id))
    stats["courses"], stats["course_aliases"] = len(course_ids), len(aliases)

    # 4. Matkul per kurikulum + staging/provenance
    scopes = scope_by_code(catalog)
    cc_ids = {}            # (prog, code) -> curriculum_course_id
    cc_by_record = {}      # (prog, record_key) -> curriculum_course_id
    seen_records = set()
    for prog, r in course_rows(catalog):
        lec, tut, prac = credit_components(r)
        sem = r["semester"]
        term = None if sem is None else ("ganjil" if sem % 2 else "genap")
        detail = details.get(f"{prog}:{r['code']}:{r['name']}") or {}
        verified = not (r.get("code_provisional") or r.get("code_inferred"))
        cc_id = await scalar(session, """
            INSERT INTO curriculum_courses (curriculum_id, course_id, credits_total, lecture_credits, tutorial_credits,
                   practicum_credits, recommended_semester, term, course_type, course_scope, description,
                   verification_status)
            VALUES (:cur, :c, :cr, :lec, :tut, :prac, :sem, :term, :type, :scope, :desc, :vs)
            ON CONFLICT (curriculum_id, course_id) DO UPDATE SET
                credits_total = EXCLUDED.credits_total, lecture_credits = EXCLUDED.lecture_credits,
                tutorial_credits = EXCLUDED.tutorial_credits, practicum_credits = EXCLUDED.practicum_credits,
                recommended_semester = EXCLUDED.recommended_semester, term = EXCLUDED.term,
                course_type = EXCLUDED.course_type, course_scope = EXCLUDED.course_scope,
                description = COALESCE(EXCLUDED.description, curriculum_courses.description),
                verification_status = EXCLUDED.verification_status, is_active = true
            RETURNING curriculum_course_id""",
            cur=curriculum_ids[prog], c=course_ids[r["code"]], cr=r["credits"], lec=lec, tut=tut, prac=prac,
            sem=sem, term=term, type=r["block"], scope=scopes.get(r["code"], "program_studi"),
            desc=detail.get("deskripsi"), vs="verified" if verified else "unverified")
        cc_ids[(prog, r["code"])] = cc_id
        record_key = f"P{r['page']}-{r['no']}-{r['code']}"
        cc_by_record[(prog, record_key)] = cc_id
        record_key = f"{prog}:{record_key}"  # unik per dokumen: satu Panduan memuat 5 prodi
        seen_records.add(record_key)
        payload = {k: v for k, v in r.items() if k not in ("details",)}
        await session.execute(text("""
            INSERT INTO catalog_source_records (source_document_id, source_record_key, source_locator,
                   extraction_version, raw_program_name, raw_course_code, raw_course_name, raw_credits,
                   raw_semester, raw_course_type, raw_prerequisite_text, raw_payload, import_status, review_notes)
            VALUES (:sd, :k, :loc, 'build_catalog v1', :prog, :code, :name, :cr, :sem, :type, :pre,
                    CAST(:payload AS jsonb), 'needs_review', :notes)
            ON CONFLICT (source_document_id, source_record_key) DO UPDATE SET
                source_locator = EXCLUDED.source_locator, raw_course_code = EXCLUDED.raw_course_code,
                raw_course_name = EXCLUDED.raw_course_name, raw_credits = EXCLUDED.raw_credits,
                raw_semester = EXCLUDED.raw_semester, raw_course_type = EXCLUDED.raw_course_type,
                raw_prerequisite_text = EXCLUDED.raw_prerequisite_text, raw_payload = EXCLUDED.raw_payload,
                review_notes = EXCLUDED.review_notes"""),
            dict(sd=panduan_id, k=record_key, loc=f"hal {r['page']} no {r['no']}", prog=PROGRAM_NAMES[prog],
                 code=r.get("code_as_printed") or r["code"], name=r["name"], cr=str(r["credits"]),
                 sem=None if sem is None else str(sem), type=r["block"],
                 pre=" | ".join(r.get("prerequisites_raw") or []) or None,
                 payload=json.dumps(payload, ensure_ascii=False),
                 notes=("kode sementara" if r.get("code_provisional") else
                        "kode dilengkapi dari prodi lain" if r.get("code_inferred") else None)))
    stats["curriculum_courses"] = len(cc_ids)

    # 5. Kelompok pilihan: agama, konsentrasi, dan pool pilihan (untuk node minimum_choice_sks)
    groups = defaultdict(lambda: {"members": set()})
    for prog, r in course_rows(catalog):
        if r["code"].startswith("AG"):
            level = "1" if r["code"][-3] == "1" else "2"
            g = groups[(prog, f"AGAMA-{level}")]
            g.update(name=f"Agama {level}", type="religion", min=1, max=1, credits=r["credits"])
            g["members"].add(r["code"])
        if r["block"] in ("wajib_konsentrasi", "pilihan") and r.get("concentration") and r["concentration"] != "Umum":
            slug = re.sub(r"[^A-Z]+", "-", r["concentration"].upper()).strip("-")[:30]
            g = groups[(prog, f"KONS-{slug}")]
            g.update(name=r["concentration"], type="concentration", min=0, max=None, credits=0)
            g["members"].add(r["code"])
        if r["block"] == "pilihan":
            g = groups[(prog, "PILIHAN")]
            g.update(name="Mata kuliah pilihan", type="elective_pool", min=0, max=None, credits=0)
            g["members"].add(r["code"])
    group_ids = {}
    for (prog, gcode), g in sorted(groups.items()):
        gid = await scalar(session, """
            INSERT INTO curriculum_choice_groups (curriculum_id, group_code, group_name, group_type,
                   minimum_choices, maximum_choices, minimum_credits, notes)
            VALUES (:cur, :code, :name, :type, :min, :max, :cr, :notes)
            ON CONFLICT (curriculum_id, group_code) DO UPDATE SET group_name = EXCLUDED.group_name,
                group_type = EXCLUDED.group_type, minimum_choices = EXCLUDED.minimum_choices,
                maximum_choices = EXCLUDED.maximum_choices, minimum_credits = EXCLUDED.minimum_credits
            RETURNING curriculum_choice_group_id""",
            cur=curriculum_ids[prog], code=gcode, name=g["name"], type=g["type"], min=g["min"], max=g["max"],
            cr=g["credits"], notes=RULE_TAG)
        group_ids[(prog, gcode)] = gid
        members = [cc_ids[(prog, c)] for c in sorted(g["members"])]
        await session.execute(text("""
            DELETE FROM curriculum_choice_group_courses
            WHERE curriculum_choice_group_id = :g AND NOT (curriculum_course_id = ANY(:m))"""), dict(g=gid, m=members))
        for m in members:
            await session.execute(text("""
                INSERT INTO curriculum_choice_group_courses (curriculum_choice_group_id, curriculum_course_id)
                VALUES (:g, :m) ON CONFLICT DO NOTHING"""), dict(g=gid, m=m))
    stats["choice_groups"] = len(group_ids)

    # 6. Rule prasyarat (dibuat ulang setiap run; hanya rule milik seeder)
    await session.execute(text(f"""
        DELETE FROM course_requirement_nodes WHERE course_requirement_rule_id IN (
            SELECT course_requirement_rule_id FROM course_requirement_rules
            WHERE notes LIKE '{RULE_TAG}%' AND verification_status = 'unresolved')"""))
    await session.execute(text(f"""
        DELETE FROM course_requirement_rules
        WHERE notes LIKE '{RULE_TAG}%' AND verification_status = 'unresolved'"""))
    analysis = rc.analyse()
    skipped = []
    for key, p in analysis["prerequisites"].items():
        prog, code, record_key = key.split(":", 2)
        target = cc_by_record.get((prog, record_key))
        if not target:
            skipped.append((key, "matkul tidak di-seed"))
            continue
        item = decisions["items"].get(f"prerequisite:{key}") or {}
        decision = item.get("decision") or {}
        action = decision.get("action") or ("accept" if p["status"] == "auto_parsed" else "unresolved")
        leaves = decision.get("leaves") if action in ("override", "advisory") else p["proposed_leaves"]
        if action == "unresolved":
            leaves = []
        evidence = item.get("evidence") or ("auto" if p["status"] == "auto_parsed" else "data_only")
        notes = f"{RULE_TAG} | {action} | evidence={evidence}"
        if item.get("note"):
            notes += f" | {item['note']}"
        rule_id = await scalar(session, """
            INSERT INTO course_requirement_rules (curriculum_course_id, catalog_source_record_id, raw_expression, notes)
            VALUES (:cc, (SELECT catalog_source_record_id FROM catalog_source_records
                          WHERE source_document_id = :sd AND source_record_key = :prog || ':' || :rk), :raw, :notes)
            RETURNING course_requirement_rule_id""",
            cc=target, sd=panduan_id, prog=prog, rk=record_key, raw=p["raw_expression"], notes=notes)
        stats["requirement_rules"] += 1
        built = []
        for leaf in leaves:
            if leaf["node_type"] in ("course_passed", "course_taken_or_concurrent"):
                ref = cc_ids.get((prog, leaf["course_code"]))
                if not ref or ref == target:
                    skipped.append((key, f"leaf {leaf['course_code']} tidak ada di kurikulum / menunjuk diri sendiri"))
                    continue
                built.append((leaf["node_type"], ref, None, None))
            elif leaf["node_type"] == "minimum_choice_sks":
                gid = group_ids.get((prog, "PILIHAN"))
                if not gid:
                    skipped.append((key, "tidak ada pool pilihan"))
                    continue
                built.append((leaf["node_type"], None, gid, leaf["threshold_value"]))
            else:
                built.append((leaf["node_type"], None, None, leaf["threshold_value"]))
        built = list(dict.fromkeys(built))
        if not built:
            continue
        root = await scalar(session, """
            INSERT INTO course_requirement_nodes (course_requirement_rule_id, node_order, node_type)
            VALUES (:r, 1, 'all') RETURNING course_requirement_node_id""", r=rule_id)
        for order, (ntype, ref, gid, threshold) in enumerate(built, 1):
            await session.execute(text("""
                INSERT INTO course_requirement_nodes (course_requirement_rule_id, parent_node_id, node_order,
                       node_type, referenced_curriculum_course_id, referenced_choice_group_id, threshold_value)
                VALUES (:r, :p, :o, :t, :ref, :g, :th)"""),
                dict(r=rule_id, p=root, o=order, t=ntype, ref=ref, g=gid, th=threshold))
            stats["requirement_nodes"] += 1
    stats["requirement_skipped_leaves"] = len(skipped)

    # Dijalankan setelah rule seeder dibuat ulang, karena rule lama masih menunjuk record lama.
    # Record staging lama (kunci berubah) yang tidak pernah dipetakan dibuang.
    stale = await session.execute(text("""
        DELETE FROM catalog_source_records r
        WHERE r.source_document_id = :sd AND r.import_status IN ('pending', 'needs_review')
          AND NOT (r.source_record_key = ANY(:keys))
          AND NOT EXISTS (SELECT 1 FROM course_requirement_rules x
                          WHERE x.catalog_source_record_id = r.catalog_source_record_id
                            AND x.notes NOT LIKE :tag)"""),
        dict(sd=panduan_id, keys=sorted(seen_records), tag=RULE_TAG + "%"))
    stats["stale_source_records_removed"] = stale.rowcount
    return stats, skipped


async def main():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            stats, skipped = await seed(session)
    for k, v in stats.items():
        print(f"[SEED] {k}: {v}")
    for key, why in skipped:
        print(f"  [SKIP] {key}: {why}")


if __name__ == "__main__":
    asyncio.run(main())
