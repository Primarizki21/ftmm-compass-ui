"""Bangun katalog canonical 5 prodi FTMM dari tabel struktur di Panduan Pendidikan.

Sumber struktur (kode, nama, SKS, semester, jenis): Panduan Pendidikan FTMM UNAIR
2024-2025, Tabel 4.1-4.5 (isinya identik dengan edisi 2022-2023 dan 2023-2024).
Panduan tidak menyebut tahun kurikulum; dicatat sebagai Kurikulum 2021 versi Panduan.

Detail (deskripsi, CPL, dosen, teks prasyarat) diambil dari Ekstrak/*.json, yang
diekstrak dari dokumen kurikulum 2021, dicocokkan per kode lalu per nama.

Output:
- database/seed/catalog_canonical.json
- database/seed/catalog_build_report.md

Jalankan dari root repo:
    uv run --with pypdf --directory backend python build_catalog.py
"""

import difflib
import json
import os
import re
from collections import defaultdict

import pypdf

from reconcile_catalog import EKSTRAK_DIR, OUT_DIR, load_rows, normalize_name

PDF_DIR = os.path.join(EKSTRAK_DIR, "pdf")
PANDUAN_FILE = "Panduan Pendidikan FTMM UNAIR 2024-2025.pdf"
CATALOG_PATH = os.path.join(OUT_DIR, "catalog_canonical.json")
# Deskripsi, CPL, dan nama dosen tidak di-commit (mengikuti aturan tim untuk Ekstrak/).
# Subfolder, karena frontend (src/courseData.ts) dan data_loader.py membaca Ekstrak/*.json.
DETAILS_PATH = os.path.join(EKSTRAK_DIR, "derived", "catalog_details.json")
TI_OCR_PATH = os.path.join(EKSTRAK_DIR, "ocr", "TI_descriptions.json")
REPORT_PATH = os.path.join(OUT_DIR, "catalog_build_report.md")

PROGRAMS = [
    ("TSD", "S1 Teknologi Sains Data"),
    ("RN", "S1 Rekayasa Nanoteknologi"),
    ("TRKB", "S1 Teknik Robotika dan Kecerdasan Buatan"),
    ("TE", "S1 Teknik Elektro"),
    ("TI", "S1 Teknik Industri"),
]

# Salah ketik yang terbukti di Panduan sendiri (kode alternatif agama dobel).
KNOWN_TYPOS = {("TSD", "AGK401", "Agama Konghucu II"): "AGC401"}

# Kode tidak lengkap di tabel TE (KLJ/KNJ/PNJ). Di Panduan yang sama, TSD, RN, dan TI
# memakai kode lengkap berikut untuk matkul fakultas yang sama.
INFERRED_CODES = {
    ("KLJ", "praktek kerja lapangan"): "KLJ301",
    ("KNJ", "kuliah kerja nyata"): "KNJ401",
    ("PNJ", "proposal skripsi"): "PNJ495",
    ("PNJ", "skripsi"): "PNJ499",
}

# Baris praktikum RN tanpa kode yang namanya beda dari matkul tepat di atasnya. Polanya sama
# dengan baris 31/34/41/49 (praktikum tanpa kode di bawah matkul kuliahnya), jadi dianggap
# komponen praktikum matkul tersebut. 'Nanoteknologi terapan 2 (Praktikum)' tidak punya
# matkul induk sehingga tetap ditahan.
# Kode sementara (bukan kode resmi; huruf X menandai placeholder) untuk matkul yang ada di
# tabel resmi tapi kodenya dobel/kosong. Diputuskan Darryl 2026-11-03; status unverified.
PROVISIONAL_CODES = {
    # TRKB hal 36: RKK301 tertulis untuk Pembelajaran Mesin dan Sistem Temu Kembali Informasi.
    ("TRKB", "RKK301", "sistem temu kembali informasi"): "RKKX301",
    # RN hal 33: baris 57 tanpa kode, penerus RNS301 'Nanoteknologi terapan 1 (Praktikum)'.
    ("RN", None, "nanoteknologi terapan 2 praktikum"): "RNSX301",
}

PRACTICUM_OF = {
    "sintesis nanokomposit praktikum": "RNM201",    # di bawah RNM201 Nanokomposit dan Polimer (hal 33)
    "fabrikasi divais nano praktikum": "RNT302",    # di bawah RNT302 Nanoelektronik, Fotonik, dan Sensor (hal 33)
}

# Pasangan detail JSON yang tidak bisa dicocokkan otomatis (nama berubah antar dokumen).
MANUAL_JSON_LINKS = {
    ("TRKB", "PNJ302"): "PNT497",  # 'Metode Penelitian' (Panduan) = 'Metodologi Penelitian' (deskripsi hal 95)
    ("TI", "KLJ301"): "KLT301",    # 'PKL' = 'Praktik Kerja Lapangan / PKL'
}

CODE_RE = r"[A-Z]{2,3}\d{3}"
HEADER_LINES = re.compile(
    r"^(No|Mata|Kuliah|Mata Kuliah Kategori|Kuliah Kategori Unsur|Unsur|Kategori|\(a[.,]b[.,]c[.,]d\)|"
    r"Beban Studi.*|Kode Nama.*|1 2 3 4 5 6 7 8|\(1\).*|\d{1,3})$"
)
ROW_START = re.compile(rf"^(?:(\d{{1,2}})\s+)?(\d{{1,3}})\s+({CODE_RE}|[A-Z]{{3}}\d{{2}})(?=\s|$)(.*)$")
ALT_START = re.compile(rf"^({CODE_RE})(?:\s+(.*))?$")
NOCODE_START = re.compile(r"^(\d{1,3})\s*$|^(\d{1,3})\s+([A-Z][a-z].*)$")
SEMESTER = re.compile(r"^Semester\s+(\d)\b")
TOTAL = re.compile(r"^(Sub[- ]?Jumlah|Jumlah(?: [Bb]eban [Ss]tudi pada [Ss]emester \d)?)\b(.*)$")


def section_lines(pages, start_marker, end_marker):
    text = "\n".join(f"\n@@PAGE {i + 1}\n{t}" for i, t in enumerate(pages))
    start = text.find(start_marker, text.find("@@PAGE 20"))
    end = text.find(end_marker, start + len(start_marker)) if end_marker else -1
    chunk = text[start:end if end > 0 else None]
    # Beberapa baris tabel menempel dalam satu baris teks ('... 5 5 57 MK Pilihan 3 ...').
    chunk = re.sub(rf"[^\S\n]+(?=\d{{1,3}}[^\S\n]+(?:{CODE_RE}|MK Pilihan)\b)", "\n", chunk)
    chunk = chunk.replace(start_marker, "", 1)
    # Halaman tempat tabel dimulai = penanda @@PAGE terakhir sebelum start_marker.
    before = text.rfind("@@PAGE ", 0, start)
    page, first_on_page = int(text[before:].split()[1]), False
    for raw in chunk.split("\n"):
        line = raw.strip()
        if line.startswith("@@PAGE"):
            page, first_on_page = int(line.split()[1]), True
            continue
        if not line:
            continue
        if first_on_page and re.fullmatch(r"\d{1,3}", line):
            first_on_page = False  # nomor halaman cetak
            continue
        first_on_page = False
        yield page, line


def parse_numbers(tokens):
    nums = [int(t) for t in tokens if re.fullmatch(r"\d{1,2}", t)]
    if not nums:
        return None, []
    last, parts = nums[-1], nums[:-1]
    total = last if (parts and last >= sum(parts)) or len(nums) == 1 else sum(nums)
    return total, nums


def consistent(nums):
    """Kolom SKS valid: satu angka, atau angka terakhir = jumlah komponen."""
    return len(nums) == 1 or (len(nums) >= 2 and nums[-1] == sum(nums[:-1]))


def split_name_category(rest):
    """'Pancasila a 2 0 2' -> ('Pancasila', 'a', ['2','0','2']).

    Tabel tanpa kolom kategori (RN) tidak punya pembatas nama/angka, jadi angka di
    akhir nama ('Kalkulus 2 3 3') dikembalikan ke nama selama sisa angkanya masih
    membentuk kolom SKS yang konsisten.
    """
    tokens = rest.split()
    cat = None
    while tokens and re.fullmatch(r"\d{1,2}", tokens[-1]):
        tokens.pop()
    nums = rest.split()[len(tokens):]
    if tokens and tokens[-1] in ("a", "b", "c", "d"):
        cat = tokens.pop()
    elif len(nums) >= 2:
        ints = [int(n) for n in nums]
        for k in range(len(ints)):
            if consistent(ints[k:]) and (k == 0 or not consistent(ints)):
                tokens += nums[:k]
                nums = nums[k:]
                break
    name = re.sub(r"\(\d+ sks\)", "", " ".join(tokens)).strip()
    return name, cat, nums


def parse_program(pages, prog, start_marker, end_marker):
    rows, totals, notes, slots = [], [], [], []
    semester, block, concentration = None, "wajib", None
    cur = None
    pending_no = None

    def flush():
        nonlocal cur
        if cur:
            if cur["alternative_of"]:
                # Baris alternatif agama tidak punya kolom SKS; angka di akhir adalah bagian nama.
                name, cat, nums = re.sub(r"\(\d+ sks\)|\s+\b[abcd]\b\s*$", "", cur["text"]).strip(), None, []
            else:
                name, cat, nums = split_name_category(cur["text"])
            total, parts = parse_numbers(nums + cur["extra_nums"])
            cur.update(name=name, category=cat, credits=total, credit_parts=parts)
            del cur["text"], cur["extra_nums"]
            rows.append(cur)
        cur = None

    last_no = 0
    for page, line in section_lines(pages, start_marker, end_marker):
        if cur and cur["code"] and re.fullmatch(r"[A-Z]{3}\d{2}", cur["code"]) and re.fullmatch(r"\d", line):
            cur["code"] += line  # kode terpotong: 'MNM10' + '7'
            continue
        if HEADER_LINES.match(line) and not ROW_START.match(line):
            if re.fullmatch(r"\d{1,3}", line):
                n = int(line)
                cur_has_numbers = cur is not None and (cur["extra_nums"] or re.search(r"\b\d{1,2}\s*$", cur["text"]))
                # '2' setelah '2' pada sel agama TSD adalah kolom Jumlah, bukan nomor baris berikutnya.
                is_total_column = cur is not None and cur["extra_nums"] and n == sum(int(x) for x in cur["extra_nums"])
                if n == last_no + 1 and (cur is None or cur_has_numbers) and not is_total_column:
                    flush()
                    pending_no = last_no = n
                elif cur is not None and n < 25:
                    cur["extra_nums"].append(line)
            continue
        if line.startswith("Tabel ") or line.startswith("4.1."):
            continue
        m = SEMESTER.match(line)
        if m:
            flush()
            semester, block, concentration = int(m.group(1)), "wajib", None
            continue
        m = TOTAL.match(line)
        if m:
            flush()
            nums = [int(x) for x in re.findall(r"\d+", m.group(2))]
            if nums:
                totals.append({"semester": semester, "block": block, "label": m.group(1), "value": nums[-1], "page": page})
            continue
        low = line.lower()
        if low.startswith("wajib konsentrasi"):
            flush(); block = "wajib_konsentrasi"; continue
        if low.startswith("pilihan konsentrasi") or low.startswith("mata kuliah pilihan"):
            flush(); block, semester = "pilihan", None; continue
        if low.startswith("wajib"):
            flush(); block = "wajib"; continue
        if low.startswith("pilihan") and not re.search(CODE_RE, line):
            flush(); block = "pilihan"
            extra = re.findall(r"\d+", line)
            if extra:
                notes.append(f"Semester {semester}: slot pilihan {extra[-1]} sks (hal {page})")
            continue
        if re.fullmatch(r"[A-Z][A-Z &/,()-]{3,}", line) or low in ("umum", "teknik sistem tenaga", "sistem pengaturan"):
            flush(); concentration = line.title(); continue
        m = re.match(r"^(?:\d{1,3}\s+)?(MK Pilihan \d)\s*(.*)$", line)
        if m:
            flush()
            _, _, nums = split_name_category(m.group(2))
            slot, _ = parse_numbers(nums)
            slots.append({"semester": semester, "label": m.group(1), "credits": slot, "page": page})
            continue
        m = re.match(r"^(?:(\d{1,3})\s+)?([A-Z]{3}\d{2}|[A-Z]{3})\s*$|^(?:(\d{1,3})\s+)?([A-Z]{3})\s+([A-Z][a-z].*)$", line)
        if m and (pending_no or m.group(1) or m.group(3) or cur is None):
            # kode terpotong ('MNM10') atau tidak lengkap di dokumen ('KLJ Praktek Kerja Lapangan')
            flush()
            no = int(m.group(1) or m.group(3) or pending_no or 0) or None
            last_no, pending_no = no or last_no, None
            cur = {"no": no, "code": m.group(2) or m.group(4), "text": m.group(5) or "", "extra_nums": [],
                   "semester": semester, "block": block, "concentration": concentration, "page": page,
                   "alternative_of": None}
            continue

        m = ROW_START.match(line)
        if m:
            carry, no, code, rest = m.groups()
            if carry and cur is not None:
                cur["extra_nums"].append(carry)
            flush()
            last_no, pending_no = int(no), None
            cur = {"no": int(no), "code": code, "text": rest, "extra_nums": [], "semester": semester,
                   "block": block, "concentration": concentration, "page": page, "alternative_of": None}
            continue
        m = ALT_START.match(line)
        if m and cur is not None and m.group(1)[:2] in ("AG",) and cur["code"][:2] == "AG":
            parent = cur
            flush()
            cur = {"no": parent["no"], "code": m.group(1), "text": m.group(2) or "", "extra_nums": [], "semester": semester,
                   "block": block, "concentration": concentration, "page": page,
                   "alternative_of": parent.get("alternative_of") or parent["code"]}
            continue
        if m and cur is None and pending_no is not None:
            cur = {"no": pending_no, "code": m.group(1), "text": m.group(2) or "", "extra_nums": [], "semester": semester,
                   "block": block, "concentration": concentration, "page": page, "alternative_of": None}
            pending_no = None
            continue
        if m and cur is not None and not cur["text"].strip() and cur["code"] is None:
            cur["code"], cur["text"] = m.group(1), m.group(2) or ""  # nomor baris di baris sendiri, lalu kode
            continue
        if m:
            # baris tanpa nomor (mis. RN 'RNK302 Pemodelan ...')
            flush()
            cur = {"no": None, "code": m.group(1), "text": m.group(2) or "", "extra_nums": [], "semester": semester,
                   "block": block, "concentration": concentration, "page": page, "alternative_of": None}
            continue
        m = NOCODE_START.match(line)
        if m and (m.group(1) or m.group(2)):
            flush()
            last_no = int(m.group(1) or m.group(2))
            cur = {"no": last_no, "code": None, "text": m.group(3) or "", "extra_nums": [],
                   "semester": semester, "block": block, "concentration": concentration, "page": page,
                   "alternative_of": None}
            continue
        if cur is not None:
            if cur["code"] and re.fullmatch(r"[A-Z]{3}\d{2}", cur["code"]) and re.match(r"^\d\b", line):
                cur["code"] += line[0]
                line = line[1:].strip()
            cur["text"] = f"{cur['text']} {line}".strip()
        elif re.match(r"^[A-Z][a-z]", line):
            cur = {"no": pending_no, "code": None, "text": line, "extra_nums": [], "semester": semester,
                   "block": block, "concentration": concentration, "page": page, "alternative_of": None}
            pending_no = None
    flush()

    for r in rows:
        key = (prog, r["code"], r["name"])
        if key in KNOWN_TYPOS:
            notes.append(f"{r['code']} '{r['name']}' dikoreksi ke {KNOWN_TYPOS[key]} (salah ketik Panduan, hal {r['page']})")
            r["code"] = KNOWN_TYPOS[key]
        provisional = PROVISIONAL_CODES.get((prog, r["code"], normalize_name(r["name"])))
        if provisional:
            notes.append(f"{r['code']} '{r['name']}' (hal {r['page']}) diberi kode sementara {provisional}; "
                         f"{r['code']} disimpan sebagai alias kode tertulis")
            r.update(code_as_printed=r["code"], code=provisional, code_provisional=True)
        if r["alternative_of"] and r["credits"] is None:
            parent = next(x for x in rows if x["code"] == r["alternative_of"])
            r["credits"] = parent["credits"]
        if r["code"] and not r.get("code_provisional") and not re.fullmatch(CODE_RE, r["code"]):
            inferred = INFERRED_CODES.get((r["code"], normalize_name(r["name"])))
            if inferred:
                notes.append(f"'{r['code']} {r['name']}' (hal {r['page']}) dilengkapi menjadi {inferred} "
                             "karena prodi lain di Panduan yang sama memakai kode itu untuk matkul ini")
                r["code_as_printed"], r["code"] = r["code"], inferred
                r["code_inferred"] = True
            else:
                r["hold_reason"] = f"kode tidak lengkap di Panduan ('{r['code']}')"
    return rows, totals, notes, slots


def merge_codeless(prog, rows, notes):
    """Baris praktikum tanpa kode yang namanya = matkul di atasnya -> komponen praktikum."""
    kept = []
    for r in rows:
        if r["code"] is None:
            prev = kept[-1] if kept else None
            base = re.sub(r"\s*\((?:p|P)raktikum\)\s*$", "", r["name"]).strip()
            explicit = PRACTICUM_OF.get(normalize_name(r["name"]))
            if prev and (normalize_name(base) == normalize_name(prev["name"]) or explicit == prev["code"]):
                prev["practicum_credits"] = (prev.get("practicum_credits") or 0) + (r["credits"] or 0)
                prev["lecture_credits"] = prev.get("lecture_credits", prev["credits"])
                prev["credits"] = (prev["credits"] or 0) + (r["credits"] or 0)
                notes.append(f"'{r['name']}' (tanpa kode, hal {r['page']}) digabung sebagai praktikum {prev['code']}")
                continue
            provisional = PROVISIONAL_CODES.get((prog, None, normalize_name(r["name"])))
            if provisional:
                r.update(code=provisional, code_provisional=True, code_as_printed=None)
                notes.append(f"'{r['name']}' (tanpa kode, hal {r['page']}) diberi kode sementara {provisional}")
            else:
                r["hold_reason"] = "baris tanpa kode di Panduan"
        kept.append(r)
    return kept


def validate(rows, totals, slots):
    """Bandingkan SKS terbaca per semester dengan Sub-Jumlah/Jumlah yang tercetak.

    Sub-Jumlah dibandingkan dengan blok tempat ia dicetak (wajib atau pilihan);
    Jumlah semester dibandingkan dengan wajib + satu konsentrasi + slot 'MK Pilihan'.
    Konsentrasi TE ada dua jalur dengan beban sama, jadi dihitung setengahnya.
    """
    sums = defaultdict(int)
    for r in rows:
        if r["alternative_of"] or r["credits"] is None:
            continue
        sums[(r["semester"], r["block"])] += r["credits"]
    slot_sum = defaultdict(int)
    for s in slots:
        slot_sum[s["semester"]] += s["credits"] or 0
    checks = []
    for sem in sorted({t["semester"] for t in totals if t["semester"]}):
        ts = [t for t in totals if t["semester"] == sem]
        wajib = sums[(sem, "wajib")] + sums[(sem, "wajib_konsentrasi")] // 2
        sub = next((t for t in ts if t["label"].lower().startswith("sub")), None)
        if sub:
            parsed = wajib if sub["block"] != "pilihan" else sums[(sem, "pilihan")]
            target = sub
        else:
            target = ts[-1]
            parsed = wajib + slot_sum[sem]
        checks.append({"semester": sem, "parsed": parsed, "printed": target["value"],
                       "label": target["label"], "page": target["page"], "ok": parsed == target["value"]})
    return checks


def attach_details(prog, rows, json_rows):
    by_code = defaultdict(list)
    by_name = defaultdict(list)
    for j in json_rows:
        by_code[j["code"]].append(j)
        by_name[normalize_name(j["name"])].append(j)
    used = set()

    def similar(a, b):
        return difflib.SequenceMatcher(None, normalize_name(a), normalize_name(b)).ratio()

    # Urutan pencocokan: kode + nama mirip, nama persis, nama mirip (>= 0.85), kode saja.
    # JSON TE banyak salah kode, jadi kode saja dipakai paling akhir.
    passes = [
        lambda r, j: MANUAL_JSON_LINKS.get((prog, r["code"])) == j["code"],
        # Kode + nama persis dulu: JSON RN memakai MAA103 untuk Kalkulus 1 dan Kalkulus 2.
        lambda r, j: j["code"] == r["code"] and normalize_name(j["name"]) == normalize_name(r["name"]),
        lambda r, j: normalize_name(j["name"]) == normalize_name(r["name"]),
        lambda r, j: j["code"] == r["code"] and similar(j["name"], r["name"]) >= 0.6,
        lambda r, j: similar(j["name"], r["name"]) >= 0.85,
        lambda r, j: j["code"] == r["code"],
    ]
    for r in rows:
        r["json_record_key"] = None
    for rule_no, rule in enumerate(passes, 1):
        for r in rows:
            if r["json_record_key"] or r["alternative_of"] and rule_no > 4:
                continue
            j = next((j for j in json_rows if j["record_key"] not in used and rule(r, j)), None)
            if not j:
                continue
            used.add(j["record_key"])
            r["json_record_key"] = j["record_key"]
            r["json_code"] = j["code"]
            r["json_name"] = j["name"]
            r["json_semester"] = j["semester"]
            r["json_match"] = ["manual", "kode+nama", "nama", "kode+nama_mirip", "nama_mirip", "kode_saja"][rule_no - 1]
            r["prerequisites_raw"] = j["prerequisites"]
            r["details"] = {k: j["raw"].get(k) for k in ("deskripsi", "capaian_pembelajaran", "dosen_pengampu")}
    unused = [j for j in json_rows if j["record_key"] not in used]
    return unused


CURRICULUM_TEXT_DOCS = {
    "TRKB": "754 KR KURIKULUM S1 TEKNIK ROBOTIKA KECERDASAN BUATAN FTMM stempel.pdf",
    "TSD": "Dokumen Kurikulum TSD.pdf",
}
DESC_RE = re.compile(
    r"Kode Mata (?:Kuliah|Ajar/Mata Kuliah)\s*:?\s*([A-Z]{2,3}\s?\d{3})(.{0,400}?)Prasyarat\s*:?\s*(.*?)"
    r"\s*(?:\b6\s*\.|Capaian)"
)


FIELD_RE = {
    "cpl": r"6\.\s*Capaian Pembelajaran(?: Mata Kuliah)?\s*:?\s*(.*?)\s*7\.\s*Deskripsi",
    "deskripsi": r"7\.\s*Deskripsi(?: Mata Kuliah)?(?:/Silabus)?\s*:?\s*(.*?)\s*8\.\s*Atribut",
    "dosen": r"12\.\s*Dosen\s*:?\s*(.*?)\s*13\.",
}


def description_blocks(prog):
    """Field per matkul dari tabel deskripsi dokumen kurikulum 2021 (hanya PDF teks)."""
    if prog not in CURRICULUM_TEXT_DOCS:
        return {}
    reader = pypdf.PdfReader(os.path.join(PDF_DIR, CURRICULUM_TEXT_DOCS[prog]))
    text, starts = "", []
    for page_no, page in enumerate(reader.pages, 1):
        starts.append((len(text), page_no))
        text += " " + re.sub(r"\s+", " ", page.extract_text() or "")
    found = {}
    matches = list(DESC_RE.finditer(text))
    for i, m in enumerate(matches):
        code = m.group(1).replace(" ", "")
        block = text[m.start():matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        raw = m.group(3).strip(" -")
        entry = {"text": "" if raw.lower() in ("", "tidak ada") else raw,
                 "page": max(p for pos, p in starts if pos <= m.start())}
        for field, rx in FIELD_RE.items():
            fm = re.search(rx, block)
            entry[field] = fm.group(1).strip() if fm else None
        found.setdefault(code, entry)
    return found


def fill_missing_semesters(prog, rows, notes):
    """Tabel struktur tidak memberi semester untuk MK pilihan konsentrasi TE/TI.

    Sumber, berurutan: (1) field 'Semester' di tabel deskripsi dokumen kurikulum 2021
    (TE lewat JSON Ekstrak, TI lewat OCR halaman scan), (2) tetap kosong -> ditahan.
    """
    ocr = {}
    if prog == "TI" and os.path.exists(TI_OCR_PATH):
        with open(TI_OCR_PATH, encoding="utf-8") as f:
            ocr = json.load(f)
    for r in rows:
        if r["semester"] is not None or r.get("hold_reason"):
            continue
        if r.get("json_semester"):
            r["semester"], src = r["json_semester"], "deskripsi dokumen 2021 (Ekstrak JSON)"
        elif r["code"] in ocr and ocr[r["code"]].get("semester"):
            r["semester"], src = ocr[r["code"]]["semester"], f"deskripsi dokumen 2021 hal {ocr[r['code']]['page']} (OCR)"
        elif r["code"] in ocr and ocr[r["code"]].get("semester_text") == "Mata Kuliah Pilihan":
            # Dokumen resmi menulis 'Semester: Mata Kuliah Pilihan' -> memang tanpa semester tetap.
            r["semester_free"] = True
            r["semester_source"] = f"deskripsi dokumen 2021 hal {ocr[r['code']]['page']}: 'Semester: Mata Kuliah Pilihan'"
            if not r.get("details"):
                d = ocr[r["code"]]
                r["details"] = {"deskripsi": d.get("deskripsi"), "capaian_pembelajaran": d.get("capaian_pembelajaran"),
                                "raw_ocr": d.get("raw_ocr"), "source_page": d["page"], "quality": d["quality"]}
            continue
        else:
            r["hold_reason"] = "semester rekomendasi tidak ada di tabel maupun deskripsi"
            continue
        r["semester_source"] = src
    filled = [r for r in rows if r.get("semester_source")]
    if filled:
        notes.append(f"{len(filled)} MK pilihan diberi semester dari {filled[0]['semester_source']}")


def fill_missing_prerequisites(prog, rows, notes):
    descs = description_blocks(prog)
    for r in rows:
        if r.get("json_record_key") or r["code"] not in descs:
            continue
        d = descs[r["code"]]
        r["prerequisites_raw"] = [d["text"]] if d["text"] else []
        r["prerequisites_source"] = f"{CURRICULUM_TEXT_DOCS[prog]} hal {d['page']}"
        r["details"] = {"deskripsi": d["deskripsi"], "capaian_pembelajaran": d["cpl"],
                        "dosen_pengampu": d["dosen"], "source_page": d["page"]}
        notes.append(f"Prasyarat {r['code']} diambil dari deskripsi dokumen 2021 hal {d['page']}: '{d['text'] or '-'}'")


def main():
    pages = [p.extract_text() or "" for p in pypdf.PdfReader(os.path.join(PDF_DIR, PANDUAN_FILE)).pages]
    json_by_prog = defaultdict(list)
    for _, rs in load_rows(include_raw=True):
        for r in rs:
            json_by_prog[r["program"]].append(r)

    catalog, report = {"source": PANDUAN_FILE, "curriculum_label": "Kurikulum 2021 (versi tabel Panduan 2022-2025)",
                       "programs": {}}, ["# Laporan Build Katalog Canonical", ""]
    for idx, (prog, heading) in enumerate(PROGRAMS):
        start = f"Struktur Kurikulum Program Studi {heading}"
        end = f"Struktur Kurikulum Program Studi {PROGRAMS[idx + 1][1]}" if idx + 1 < len(PROGRAMS) else "BAB V"
        rows, totals, notes, slots = parse_program(pages, prog, start, end)
        rows = merge_codeless(prog, rows, notes)
        checks = validate(rows, totals, slots)
        unused = attach_details(prog, rows, json_by_prog[prog])
        fill_missing_prerequisites(prog, rows, notes)
        fill_missing_semesters(prog, rows, notes)
        catalog["programs"][prog] = {"courses": rows, "elective_slots": slots, "notes": notes,
                                     "total_checks": checks, "json_unmatched": [
                                         {k: j[k] for k in ("code", "name", "credits", "semester", "record_key")}
                                         for j in unused]}

        held = [r for r in rows if r.get("hold_reason")]
        lines = [f"## {prog}", "",
                 f"- Baris tabel: **{len(rows)}** (tertahan: {len(held)})",
                 f"- Punya detail dari JSON: **{sum(1 for r in rows if r['json_record_key'])}**",
                 f"- Baris JSON tanpa pasangan di Panduan: **{len(unused)}**",
                 "", "| Semester | SKS terbaca | Tercetak | Cek |", "|---|---|---|---|"]
        lines += [f"| {c['semester']} | {c["parsed"]} | {c['printed']} ({c['label']}, hal {c['page']}) | {'✅' if c['ok'] else '❌'} |" for c in checks]
        if held:
            lines += ["", "**Tertahan:**"] + [f"- hal {r['page']} no {r['no']}: {r['name']} ({r['credits']} sks)" for r in held]
        if unused:
            lines += ["", "**Ada di JSON, tidak ada di Panduan:**"] + [f"- `{j['code']}` {j['name']} ({j['credits']} sks, sem {j['semester']})" for j in unused]
        if notes:
            lines += ["", "**Catatan:**"] + [f"- {n}" for n in notes]
        report += lines + [""]
        print(f"[{prog}] {len(rows)} baris, cek total {sum(c['ok'] for c in checks)}/{len(checks)}, tertahan {len(held)}, JSON tak terpakai {len(unused)}")

    details = {}
    for prog, data in catalog["programs"].items():
        for r in data["courses"]:
            d = r.pop("details", None)
            if d and r["code"]:
                details[f"{prog}:{r['code']}:{r['name']}"] = d
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    os.makedirs(os.path.dirname(DETAILS_PATH), exist_ok=True)
    with open(DETAILS_PATH, "w", encoding="utf-8") as f:
        json.dump(details, f, ensure_ascii=False, indent=2)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(report) + "\n")
    print(f"[OK] {os.path.relpath(CATALOG_PATH)}")


if __name__ == "__main__":
    main()
