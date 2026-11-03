"""Rekonsiliasi katalog 5 prodi FTMM dari Ekstrak/*.json sebelum seeding.

Script ini TIDAK menyentuh database. Outputnya:
- database/seed/reconciliation_report.md  -> laporan untuk dibaca manusia
- database/seed/reconciliation.json       -> usulan + keputusan (diisi reviewer)

Keputusan yang sudah diisi di reconciliation.json tidak akan ditimpa saat
script dijalankan ulang, jadi aman di-run berkali-kali.

Jalankan dari root repo:
    uv run --directory backend python reconcile_catalog.py
"""

import difflib
import glob
import hashlib
import json
import os
import re
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EKSTRAK_DIR = os.path.join(REPO_ROOT, "Ekstrak")
OUT_DIR = os.path.join(REPO_ROOT, "database", "seed")
REPORT_PATH = os.path.join(OUT_DIR, "reconciliation_report.md")
DECISIONS_PATH = os.path.join(OUT_DIR, "reconciliation.json")

CODE_RE = re.compile(r"^[A-Z]+[0-9]{3,4}$")

# Kebijakan global; nilainya bisa diubah reviewer di reconciliation.json -> "policies".
DEFAULT_POLICIES = {
    # 'menempuh X SKS' dianggap sudah lulus X SKS (diputuskan Darryl, 2026-11-03).
    "sks_verbs_completed": ["lulus", "menempuh"],
    "sks_verbs_attempted": ["mengambil"],
}
POLICIES = dict(DEFAULT_POLICIES)

# Label prodi di JSON -> master study_programs (kode sama dengan backend/seed.py)
PROGRAMS = {
    "teknologi sains data": ("TSD", "Teknologi Sains Data"),
    "teknik robotika dan kecerdasan buatan": ("TRKB", "Teknik Robotika & Kecerdasan Buatan"),
    "rekayasa nanoteknologi": ("RN", "Rekayasa Nanoteknologi"),
    "teknik industri": ("TI", "Teknik Industri"),
    "teknik elektro": ("TE", "Teknik Elektro"),
}

ROMAN = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5"}
SPELLING = {"budha": "buddha", "konghucu": "khonghucu", "pemorgraman": "pemrograman"}


def normalize_program(label):
    key = re.sub(r"^s1\s+", "", label.strip().lower())
    if key not in PROGRAMS:
        raise ValueError(f"Label prodi tidak dikenal: {label!r}")
    return PROGRAMS[key]


def normalize_name(name):
    """Kunci pembanding nama: huruf kecil, romawi->arab, ejaan disamakan."""
    words = re.sub(r"[^a-z0-9& ]", " ", name.lower()).split()
    words = [SPELLING.get(ROMAN.get(w, w), ROMAN.get(w, w)) for w in words]
    return " ".join(words)


def normalize_type(raw):
    """jenis di JSON -> (course_type, course_scope) sesuai CHECK constraint."""
    t = raw.strip().lower()
    scope = "program_studi"
    if "universitas" in t or "nasional" in t:
        scope = "universitas"
    elif "fakultas" in t:
        scope = "fakultas"
    if t.startswith("wajib"):
        return "wajib", scope
    if t.startswith("peminatan"):
        return "wajib_konsentrasi", scope
    if t.startswith("pilihan peminatan"):
        return "pilihan_terbatas", scope
    return "pilihan", scope


CANONICAL_PATH = os.path.join(OUT_DIR, "catalog_canonical.json")
SCOPE_BY_CATEGORY = {"a": "universitas", "b": "program_studi", "c": "fakultas", "d": "fakultas"}


def load_canonical_rows():
    """Baris dari katalog canonical (tabel Panduan) hasil backend/build_catalog.py."""
    with open(CANONICAL_PATH, encoding="utf-8") as f:
        catalog = json.load(f)
    for prog, data in catalog["programs"].items():
        rows = []
        for r in data["courses"]:
            if r.get("hold_reason"):
                continue
            sem = r["semester"]
            rows.append({
                "program": prog,
                "source_file": catalog["source"],
                "record_key": f"P{r['page']}-{r['no']}-{r['code']}",
                "code": r["code"],
                "name": r["name"],
                "credits": r["credits"],
                "semester": sem,
                "term": None if sem is None else ("ganjil" if sem % 2 else "genap"),
                "raw_type": r["block"],
                "course_type": r["block"],
                "course_scope": SCOPE_BY_CATEGORY.get(r.get("category"), "program_studi"),
                "prerequisites": r.get("prerequisites_raw") or [],
                # Nama/kode versi dokumen 2021 (JSON) untuk memetakan prasyarat yang ditulis dengan nama lama.
                "aliases": [r["json_name"]] if r.get("json_name") and r["json_name"] != r["name"] else [],
                "legacy_code": r.get("json_code") if r.get("json_code") != r["code"] else None,
            })
        yield {"file_name": catalog["source"], "program_code": prog}, rows


def load_rows(include_raw=False):
    if not include_raw and os.path.exists(CANONICAL_PATH):
        yield from load_canonical_rows()
        return
    for path in sorted(glob.glob(os.path.join(EKSTRAK_DIR, "FIX *.json"))):
        rows = []
        with open(path, "rb") as f:
            raw = f.read()
        data = json.loads(raw.decode("utf-8"))
        meta = data["metadata"]
        code, name = normalize_program(meta["program_studi"])
        source = {
            "file_name": os.path.basename(path),
            "checksum_sha256": hashlib.sha256(raw).hexdigest(),
            "document_title": meta["source_document"],
            "academic_year_label": meta.get("tahun_ajaran"),
            "program_code": code,
            "program_name": name,
        }
        for i, mk in enumerate(data["mata_kuliah"]):
            course_type, scope = normalize_type(mk["jenis"])
            rows.append({
                "program": code,
                "source_file": source["file_name"],
                "record_key": f"{mk['id']}#{i + 1}",
                "code": (mk["kode_mk"] or "").strip(),
                "name": re.sub(r"\s+", " ", mk["nama_mk"]).strip(),
                "credits": mk["sks"],
                "semester": mk["semester"],
                "term": "ganjil" if mk["semester"] % 2 else "genap",
                "raw_type": mk["jenis"],
                "course_type": course_type,
                "course_scope": scope,
                "prerequisites": [re.sub(r"\s+", " ", p).strip() for p in mk["prasyarat"]],
            })
            if include_raw:
                rows[-1]["raw"] = mk
        yield source, rows


# ---------------------------------------------------------------------------
# Prasyarat: teks bebas -> usulan node requirement tree
# ---------------------------------------------------------------------------

CONCURRENT_RE = re.compile(
    r"\b(diambil bersamaan\s*/\s*sudah mengambil|telah\s*/\s*tengah mengambil|sudah\s*/\s*sedang"
    r"|sudah atau pernah mengambil)\s+",
    re.I,
)
PASSED_PREFIX_RE = re.compile(r"^lulus\s+(?!minimal|\d)", re.I)
SKS_RE = re.compile(r"(lulus|menempuh|mengambil)(?:\s+minim(?:al|um))?\s+(\d{2,3})\s*sks", re.I)
SEMESTER_RE = re.compile(r"minimal semester\s*(\d+)", re.I)
CHOICE_SKS_RE = re.compile(r"(?:mengambil\s+)?(\d+)\s*sks mata kuliah pilihan(?: bidang minat)?", re.I)


def expand_numbered(name):
    """'Fisika Dasar 1 & 2' -> ['Fisika Dasar 1', 'Fisika Dasar 2']."""
    m = re.match(r"^(.*?)\s+(\d|I{1,3})\s*&\s*(\d|I{1,3})$", name)
    if not m:
        return [name]
    return [f"{m.group(1)} {m.group(2)}", f"{m.group(1)} {m.group(3)}"]


SEPARATOR_RE = re.compile(r"(,|\s&\s|\sdan\s|\sserta\s)")


def split_course_names(text, is_known):
    """Pecah teks jadi nama matkul, tapi pertahankan nama yang memang mengandung 'dan'/','.

    Contoh: 'CAD, Dasar Pemrograman dan Rangkaian Listrik' -> 3 nama, sedangkan
    'Biologi Sel dan Molekuler' tetap 1 nama karena cocok dengan katalog.
    """
    names = []
    for chunk in expand_numbered(text.strip(" ,.")):
        pieces = SEPARATOR_RE.split(chunk)
        words, seps = pieces[0::2], pieces[1::2]
        i = 0
        while i < len(words):
            best = i
            for j in range(len(words) - 1, i, -1):
                joined = words[i] + "".join(seps[k] + words[k + 1] for k in range(i, j))
                if is_known(joined):
                    best = j
                    break
            name = words[i] + "".join(seps[k] + words[k + 1] for k in range(i, best))
            if name.strip(" ,."):
                names.append(name.strip(" ,."))
            i = best + 1
    return names


def merge_fragments(items, is_known):
    """Gabungkan prasyarat yang terpotong baris PDF.

    ['Probabilitas,', 'Statistika, dan Proses Stokastik'] -> satu nama, dan item yang
    berakhir dengan kata sambung ('serta', 'sudah/sedang') digabung ke item berikutnya.
    """
    items = list(items)
    out, i = [], 0
    while i < len(items):
        merged = False
        for j in range(len(items), i + 1, -1):
            joined = " ".join(items[i:j])
            if is_known(joined):
                out.append(joined)
                i, merged = j, True
                break
        if merged:
            continue
        cur = items[i]
        while i + 1 < len(items) and re.search(r"(,|\bdan|\bserta|/sedang)$", cur, re.I):
            i += 1
            cur = f"{cur} {items[i]}"
        out.append(cur)
        i += 1
    return out


# (prodi, kode lama di JSON 2021) -> kode canonical; diisi analyse().
legacy_codes = {}


def parse_prerequisites(row, by_code, names_in_program, names_anywhere):
    """Kembalikan daftar leaf usulan + daftar teks yang tidak bisa dipetakan."""
    leaves, unresolved = [], []
    program_names = names_in_program[row["program"]]

    def is_known(text):
        key = normalize_name(text)
        return key in program_names or key in names_anywhere

    def resolve_names(text, node_type, source):
        connector = r"^(sudah|minimal|dan|serta)\b|\b(dan|serta|sudah/sedang|sudah)$"
        while True:
            cleaned = re.sub(connector, "", text.strip(), flags=re.I).strip(" ,.")
            if cleaned == text:
                break
            text = cleaned
        if not text:
            return
        text = PASSED_PREFIX_RE.sub("", text)
        for name in split_course_names(text, is_known):
            key = normalize_name(name)
            code = program_names.get(key)
            if code:
                leaves.append({"node_type": node_type, "course_code": code, "source": source})
            elif key in names_anywhere:
                unresolved.append({"text": name, "reason": "nama ada di prodi lain, tidak di kurikulum ini",
                                   "candidates": sorted(names_anywhere[key])})
            else:
                close = difflib.get_close_matches(key, program_names.keys(), n=3, cutoff=0.6)
                if close and difflib.SequenceMatcher(None, key, close[0]).ratio() >= 0.93:
                    # beda satu-dua huruf (mis. 'Differensial' vs 'Diferensial', 'Rangkain' vs 'Rangkaian')
                    leaves.append({"node_type": node_type, "course_code": program_names[close[0]],
                                   "source": source, "typo_match": close[0]})
                    continue
                entry = {"text": name, "reason": "nama tidak cocok persis dengan matkul di prodi ini"}
                if close:
                    entry["candidates"] = [f"{program_names[c]} ({c})" for c in close]
                unresolved.append(entry)

    for item in merge_fragments(row["prerequisites"], is_known):
        if CODE_RE.match(item):
            item_code = legacy_codes.get((row["program"], item), item)
            if (row["program"], item_code) in by_code:
                leaves.append({"node_type": "course_passed", "course_code": item_code, "source": item})
            else:
                unresolved.append({"text": item, "reason": "kode tidak ada di kurikulum prodi ini"})
            continue

        rest = item
        for rx, kind in ((CHOICE_SKS_RE, "minimum_choice_sks"), (SKS_RE, None), (SEMESTER_RE, "minimum_semester")):
            sm = rx.search(rest)
            if not sm:
                continue
            if kind is None:
                verb = sm.group(1).lower()
                completed = verb in POLICIES["sks_verbs_completed"]
                node = "minimum_completed_sks" if completed else "minimum_attempted_sks"
                value = int(sm.group(2))
            else:
                node, value = kind, int(sm.group(1))
            leaves.append({"node_type": node, "threshold_value": value, "source": item})
            rest = (rest[:sm.start()] + rest[sm.end():]).strip()

        m = CONCURRENT_RE.search(rest)
        if m:
            resolve_names(rest[:m.start()], "course_passed", item)
            resolve_names(rest[m.end():], "course_taken_or_concurrent", item)
        else:
            resolve_names(rest, "course_passed", item)
    return leaves, unresolved


# ---------------------------------------------------------------------------
# Analisis
# ---------------------------------------------------------------------------

# Singkatan/terjemahan yang terbukti merujuk matkul sama di tabel resmi.
NAME_EQUIVALENTS = {
    "pkl": "praktek kerja lapangan",
    "kkn bbm": "kuliah kerja nyata",
    "green technology": "teknologi hijau",
    "kiritis": "kritis",
}


def core_name(name):
    """Buang keterangan '(Praktikum)', '/ KKN', angka, dst. untuk membandingkan inti nama."""
    name = re.sub(r"\(.*?\)|/.*$", "", name)
    name = normalize_name(name).replace("statistik ", "statistika ").replace("praktik", "praktek")
    for short, full in NAME_EQUIVALENTS.items():
        name = re.sub(r"\b" + re.escape(short) + r"\b", full, name)
    return re.sub(r"\s+", " ", re.sub(r"\b\d\b", "", name)).strip()


def suggest_identity(rs):
    """Usulan awal untuk konflik identitas; tetap harus dikonfirmasi reviewer."""
    cores = {core_name(r["name"]) for r in rs}
    credits = {r["credits"] for r in rs}
    token_sets = [set(c.split()) for c in cores]
    shortest = min(token_sets, key=len)
    if all(shortest <= t for t in token_sets):
        if len(credits) == 1:
            return "kemungkinan matkul sama (beda penulisan) — pilih nama canonical"
        return "nama mirip tapi SKS beda — cek PDF"
    return "kemungkinan matkul BERBEDA — salah satu kode kemungkinan salah, cek PDF"

def analyse():
    sources, rows = [], []
    for source, src_rows in load_rows():
        sources.append(source)
        rows.extend(src_rows)

    by_code = defaultdict(list)          # (program, code) -> rows
    by_global_code = defaultdict(list)   # code -> rows
    names_in_program = defaultdict(dict) # program -> normalized name -> code
    names_anywhere = defaultdict(set)    # normalized name -> {"PROG:CODE"}
    for r in rows:
        by_code[(r["program"], r["code"])].append(r)
        by_global_code[r["code"]].append(r)
        names_in_program[r["program"]][normalize_name(r["name"])] = r["code"]
        if r.get("legacy_code"):
            legacy_codes[(r["program"], r["legacy_code"])] = r["code"]
        for alias in r.get("aliases", []):
            names_in_program[r["program"]].setdefault(normalize_name(alias), r["code"])
        names_anywhere[normalize_name(r["name"])].add(f"{r['program']}:{r['code']}")

    invalid_codes = [r for r in rows if not CODE_RE.match(r["code"])]
    internal_duplicates = {k: v for k, v in by_code.items() if len(v) > 1}

    identity_conflicts, cosmetic_variants, credit_differences = {}, {}, {}
    for code, rs in sorted(by_global_code.items()):
        names = {r["name"] for r in rs}
        keys = {normalize_name(n) for n in names}
        if len(keys) > 1 and len({r["program"] for r in rs}) > 1:
            identity_conflicts[code] = {"rows": rs, "suggestion": suggest_identity(rs)}
        elif len(names) > 1 and len(keys) == 1:
            cosmetic_variants[code] = sorted(names)
        if len({r["credits"] for r in rs}) > 1 and len(keys) == 1:
            credit_differences[code] = rs

    same_name_diff_code = {
        k: sorted(v) for k, v in names_anywhere.items() if len({x.split(":")[1] for x in v}) > 1
    }

    prerequisites = {}
    for r in rows:
        if not r["prerequisites"]:
            continue
        leaves, unresolved = parse_prerequisites(r, by_code, names_in_program, names_anywhere)
        prerequisites[f"{r['program']}:{r['code']}:{r['record_key']}"] = {
            "raw_expression": " | ".join(r["prerequisites"]),
            "proposed_operator": "all",
            "proposed_leaves": leaves,
            "unresolved": unresolved,
            "status": "auto_parsed" if not unresolved else "needs_review",
        }

    return {
        "sources": sources,
        "rows": rows,
        "invalid_codes": invalid_codes,
        "internal_duplicates": internal_duplicates,
        "identity_conflicts": identity_conflicts,
        "cosmetic_variants": cosmetic_variants,
        "credit_differences": credit_differences,
        "same_name_diff_code": same_name_diff_code,
        "prerequisites": prerequisites,
        "global_codes": by_global_code,
    }


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def row_ref(r):
    return f"{r['program']} sem {r['semester']} · {r['name']} · {r['credits']} SKS · {r['raw_type']}"


def build_decisions(result, previous):
    prev_items = previous.get("items", {})

    def item(key, payload):
        old = prev_items.get(key, {})
        payload["decision"] = old.get("decision")
        payload["note"] = old.get("note", "")
        # 'data_only' = diputuskan dari isi JSON; 'pdf' = sudah dicocokkan ke PDF resmi.
        payload["evidence"] = old.get("evidence")
        if old.get("pdf_check"):
            payload["pdf_check"] = old["pdf_check"]
        return key, payload

    items = dict()
    for r in result["invalid_codes"]:
        items.update([item(f"invalid_code:{r['program']}:{r['record_key']}", {
            "type": "invalid_code",
            "row": row_ref(r),
            "raw_code": r["code"],
            "options": ["ganti kode yang benar (isi di note)", "tahan di staging"],
        })])
    for (prog, code), rs in sorted(result["internal_duplicates"].items()):
        items.update([item(f"internal_duplicate:{prog}:{code}", {
            "type": "internal_duplicate",
            "rows": [f"{r['record_key']} · {row_ref(r)}" for r in rs],
            "options": ["pakai salah satu record_key (isi di note)", "kode salah, perbaiki", "tahan di staging"],
        })])
    for code, c in sorted(result["identity_conflicts"].items()):
        items.update([item(f"identity_conflict:{code}", {
            "type": "identity_conflict",
            "rows": [row_ref(r) for r in c["rows"]],
            "suggestion": c["suggestion"],
            "options": ["matkul sama, pakai nama canonical (isi di note)",
                        "matkul berbeda, salah satu kode salah", "tahan di staging"],
        })])
    for key, p in sorted(result["prerequisites"].items()):
        if p["status"] == "needs_review":
            items.update([item(f"prerequisite:{key}", {
                "type": "prerequisite",
                "raw_expression": p["raw_expression"],
                "proposed_leaves": p["proposed_leaves"],
                "unresolved": p["unresolved"],
                "options": ["setujui usulan", "koreksi (isi di note)", "biarkan unresolved"],
            })])

    return {
        "_readme": (
            "Isi 'decision' per item. Item dengan decision null akan ditahan di staging "
            "(catalog_source_records status needs_review) dan prasyaratnya tetap 'unresolved'. "
            "File ini aman di-generate ulang: decision, note & policies lama dipertahankan."
        ),
        "_decision_formats": {
            "invalid_code": [{"action": "hold"}, {"action": "recode", "code": "<KODE>"}],
            "internal_duplicate": [{"keep": "<record_key>", "hold": ["<record_key>"]}],
            "identity_conflict": [{"action": "same", "canonical_name": "<nama>"},
                                  {"action": "hold", "programs": ["<PRODI>"]}],
            "prerequisite": [{"action": "accept"}, {"action": "override", "leaves": ["<leaf>"]},
                             {"action": "advisory", "leaves": ["<leaf>"]}, {"action": "unresolved"}],
        },
        "review_status": previous.get("review_status", {"status": "draft"}),
        "provisional_codes": previous.get("provisional_codes", {}),
        "policies": POLICIES,
        "cosmetic_aliases": result["cosmetic_variants"],
        "items": items,
    }


def write_report(result, decisions):
    rows = result["rows"]
    prereq = result["prerequisites"]
    auto = sum(1 for p in prereq.values() if p["status"] == "auto_parsed")
    lines = [
        "# Laporan Rekonsiliasi Katalog FTMM",
        "",
        "Dibuat otomatis oleh `backend/reconcile_catalog.py`. Jangan diedit manual;",
        "keputusan diisi di `reconciliation.json`.",
        "",
        "## Ringkasan",
        "",
        f"- Baris mata kuliah: **{len(rows)}**",
        f"- Kode unik lintas prodi: **{len(result['global_codes'])}**",
        f"- Kode dipakai ≥2 prodi: **{sum(len({r['program'] for r in v}) > 1 for v in result['global_codes'].values())}**",
        f"- Kode format tidak valid: **{len(result['invalid_codes'])}**",
        f"- Duplikat kode dalam satu prodi: **{len(result['internal_duplicates'])}**",
        f"- Konflik identitas (kode sama, nama beda): **{len(result['identity_conflicts'])}**",
        f"- Variasi kosmetik nama (otomatis jadi alias): **{len(result['cosmetic_variants'])}**",
        f"- Beda SKS antar prodi untuk matkul yang sama (wajar, disimpan per kurikulum): **{len(result['credit_differences'])}**",
        f"- Matkul berprasyarat: **{len(prereq)}** — terpetakan otomatis **{auto}**, perlu review **{len(prereq) - auto}**",
        f"- Total item keputusan untuk reviewer: **{len(decisions['items'])}**",
        "",
        "## Sumber",
        "",
        "| Prodi | File | Baris | Tahun | SHA-256 |",
        "|---|---|---|---|---|",
    ]
    for s in result["sources"]:
        n = sum(1 for r in rows if r["source_file"] == s["file_name"] and r["program"] == s["program_code"])
        checksum = s.get("checksum_sha256", "")[:12] or "-"
        lines.append(f"| {s['program_code']} | {s['file_name']} | {n} | {s.get('academic_year_label') or '-'} | `{checksum}` |")

    def section(title, desc):
        lines.extend(["", f"## {title}", "", desc, ""])

    section("1. Kode format tidak valid", "Ditolak oleh CHECK `courses_code_format_check`; wajib diperbaiki atau ditahan.")
    for r in result["invalid_codes"]:
        lines.append(f"- `{r['code']}` — {row_ref(r)}")

    section("2. Duplikat kode dalam satu prodi", "Satu kurikulum tidak boleh punya kode yang sama dua kali (UNIQUE curriculum_id, course_id).")
    for (prog, code), rs in sorted(result["internal_duplicates"].items()):
        lines.append(f"- **{prog} `{code}`**")
        lines.extend(f"  - {r['record_key']}: {row_ref(r)}" for r in rs)

    section("3. Konflik identitas lintas prodi", "Kode sama tapi nama berbeda secara substansi. `courses.course_code` UNIQUE global, jadi harus diputuskan.")
    for code, c in sorted(result["identity_conflicts"].items()):
        lines.append(f"- **`{code}`** — _{c['suggestion']}_")
        lines.extend(f"  - {row_ref(r)}" for r in c["rows"])

    section("4. Variasi kosmetik (alias otomatis)", "Dianggap matkul yang sama; nama pertama jadi canonical, sisanya masuk `course_aliases`.")
    for code, names in sorted(result["cosmetic_variants"].items()):
        lines.append(f"- `{code}`: " + " / ".join(names))

    section("5. Beda SKS untuk matkul yang sama", "Bukan error: SKS disimpan di `curriculum_courses`, per prodi. Dicatat untuk dicek ke PDF.")
    for code, rs in sorted(result["credit_differences"].items()):
        lines.append(f"- `{code}` {rs[0]['name']}: " + ", ".join(f"{r['program']}={r['credits']}" for r in rs))

    section("6. Nama sama, kode berbeda", "Info saja — bisa matkul berbeda per prodi, bisa juga salah ketik kode.")
    for name, refs in sorted(result["same_name_diff_code"].items()):
        lines.append(f"- {name}: " + ", ".join(refs))

    section("7. Prasyarat yang perlu review", "Leaf yang berhasil dipetakan ditulis sebagai usulan; teks yang gagal dipetakan ada di 'tidak terpetakan'.")
    for key, p in sorted(prereq.items()):
        if p["status"] != "needs_review":
            continue
        lines.append(f"- **{key.rsplit(':', 1)[0]}** — raw: _{p['raw_expression']}_")
        for leaf in p["proposed_leaves"]:
            target = leaf.get("course_code", leaf.get("threshold_value"))
            lines.append(f"  - ✅ {leaf['node_type']} → {target}")
        for u in p["unresolved"]:
            extra = f" (kandidat: {', '.join(u['candidates'])})" if u.get("candidates") else ""
            lines.append(f"  - ❓ \"{u['text']}\" — {u['reason']}{extra}")

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    if not glob.glob(os.path.join(EKSTRAK_DIR, "FIX *.json")):
        raise SystemExit(f"Tidak ada JSON di {EKSTRAK_DIR}. Salin 5 file FIX *.json dari Drive tim.")
    os.makedirs(OUT_DIR, exist_ok=True)

    previous = {}
    if os.path.exists(DECISIONS_PATH):
        with open(DECISIONS_PATH, encoding="utf-8") as f:
            previous = json.load(f)
    POLICIES.update(previous.get("policies", {}))
    result = analyse()
    decisions = build_decisions(result, previous)

    with open(DECISIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(decisions, f, ensure_ascii=False, indent=2)
        f.write("\n")
    write_report(result, decisions)

    pending = sum(1 for v in decisions["items"].values() if v["decision"] is None)
    print(f"[OK] {len(result['rows'])} baris dari {len(result['sources'])} prodi dianalisis")
    print(f"[OK] Laporan : {os.path.relpath(REPORT_PATH, REPO_ROOT)}")
    print(f"[OK] Keputusan: {os.path.relpath(DECISIONS_PATH, REPO_ROOT)} ({pending} item menunggu keputusan)")


if __name__ == "__main__":
    main()
