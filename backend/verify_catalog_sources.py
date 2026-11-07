"""Cocokkan 369 baris Ekstrak/*.json ke tabel struktur kurikulum di PDF resmi.

Sumber yang dibaca (semua di Ekstrak/pdf, tidak di-commit):
- Dokumen kurikulum 2021 per prodi (TRKB & TSD berupa teks; RN/TE/TI hasil scan)
- Panduan Pendidikan FTMM 2022-2023, 2023-2024, 2024-2025 (teks, memuat tabel
  struktur kurikulum kelima prodi)

Output: database/seed/source_verification.md dan source_verification.json

Jalankan dari root repo:
    uv run --with pypdf --directory backend python verify_catalog_sources.py
"""

import glob
import json
import os
import re
from collections import defaultdict

import pypdf

from reconcile_catalog import EKSTRAK_DIR, OUT_DIR, load_rows, normalize_name

PDF_DIR = os.path.join(EKSTRAK_DIR, "pdf")
REPORT_PATH = os.path.join(OUT_DIR, "source_verification.md")
JSON_PATH = os.path.join(OUT_DIR, "source_verification.json")

from catalog import PROGRAM_HEADINGS, PROGRAM_ORDER

CURRICULUM_DOCS = {
    "TRKB": "754 KR KURIKULUM S1 TEKNIK ROBOTIKA KECERDASAN BUATAN FTMM stempel.pdf",
    "TSD": "Dokumen Kurikulum TSD.pdf",
}

CODE = r"[A-Z]{2,3}\d{3}"
ENTRY_RE = re.compile(
    rf"(?:\b\d{{1,3}}\s+)?\b({CODE})\b\s+(.+?)\s+(?:\b([abcd])\b\s+)?((?:\d{{1,2}}\s+){{0,3}}?\d{{1,2}})"
    rf"(?=\s+(?:\d{{1,3}}\s+{CODE}|{CODE}|Jumlah|Sub|Semester|Pilihan|Wajib|\d{{1,3}}\s+[A-Z][a-z])|\s*$)"
)
SEMESTER_RE = re.compile(r"Semester\s+(\d)\b")


def pdf_pages(path):
    reader = pypdf.PdfReader(path)
    return [re.sub(r"\s+", " ", p.extract_text() or "") for p in reader.pages]


def parse_table(pages, start_page, end_page, source, start_marker=None, end_marker=None):
    """Ambil (kode, nama, sks, semester, halaman) dari rentang halaman tabel struktur."""
    entries = []
    semester = None
    for page_no in range(start_page, end_page + 1):
        text = pages[page_no - 1]
        if page_no == start_page and start_marker:
            text = text[text.find(start_marker):]
        if page_no == end_page and end_marker and end_marker in text:
            text = text[:text.find(end_marker)]
        marks = [(m.start(), int(m.group(1))) for m in SEMESTER_RE.finditer(text)]
        for m in ENTRY_RE.finditer(text):
            prior = [s for pos, s in marks if pos < m.start()]
            if prior:
                semester = prior[-1]
            numbers = [int(n) for n in m.group(4).split()]
            # Kolom: kuliah/tutorial/praktikum lalu jumlah. Kalau kolom jumlah kosong
            # (sering di MK pilihan, mis. "3 0 0"), pakai penjumlahan komponennya.
            last, parts = numbers[-1], numbers[:-1]
            credits = last if last >= sum(parts) else sum(numbers)
            entries.append({
                "code": m.group(1),
                "name": re.sub(r"\(\d+ sks\)", "", m.group(2)).strip(),
                "credits": credits,
                "semester": semester,
                "page": page_no,
                "source": source,
            })
    return entries


def table_marker(prog):
    return f"Struktur Kurikulum Program Studi {PROGRAM_HEADINGS[prog]}"


def find_page(pages, marker, after_page):
    return next(i + 1 for i, t in enumerate(pages) if i + 1 > after_page and marker in t)


def load_sources():
    sources = defaultdict(list)
    for path in sorted(glob.glob(os.path.join(PDF_DIR, "Panduan Pendidikan FTMM UNAIR *.pdf"))):
        label = "Panduan " + re.search(r"(\d{4}-\d{4})", path).group(1)
        pages = pdf_pages(path)
        for idx, prog in enumerate(PROGRAM_ORDER):
            start_marker = table_marker(prog)
            end_marker = table_marker(PROGRAM_ORDER[idx + 1]) if idx + 1 < len(PROGRAM_ORDER) else "BAB V"
            start = find_page(pages, start_marker, after_page=10)
            end = find_page(pages, end_marker, after_page=start - 1)
            sources[prog].extend(parse_table(pages, start, end, label, start_marker, end_marker))
    for prog, file_name in CURRICULUM_DOCS.items():
        path = os.path.join(PDF_DIR, file_name)
        pages = pdf_pages(path)
        marker = next(m for m in ("Tabel 4.1 Struktur Kurikulum", "Tabel 4.1. Struktur Kurikulum")
                      if any(m in t for t in pages[15:]))
        start = next(i + 1 for i, t in enumerate(pages) if marker in t and i > 15)
        end = next(i + 1 for i, t in enumerate(pages) if i + 1 > start and "Tabel 4.2" in t)
        sources[prog].extend(parse_table(pages, start, end, "Kurikulum 2021", marker, "Tabel 4.2"))
    return sources


def compare(rows, sources):
    results = []
    for r in rows:
        found = [e for e in sources[r["program"]] if e["code"] == r["code"]]
        by_name = [e for e in sources[r["program"]]
                   if normalize_name(e["name"]) == normalize_name(r["name"]) and e["code"] != r["code"]]
        issues = []
        if not found:
            issues.append("kode tidak ditemukan di tabel PDF")
        else:
            if not any(normalize_name(e["name"]).startswith(normalize_name(r["name"])[:12]) for e in found):
                issues.append("nama beda")
            if not any(e["credits"] == r["credits"] for e in found):
                issues.append("SKS beda")
            if not any(e["semester"] == r["semester"] for e in found):
                issues.append("semester beda")
        results.append({
            "program": r["program"], "record_key": r["record_key"], "code": r["code"],
            "json": {"name": r["name"], "credits": r["credits"], "semester": r["semester"]},
            "pdf": [{k: e[k] for k in ("source", "page", "name", "credits", "semester")} for e in found],
            "pdf_same_name_other_code": [{k: e[k] for k in ("source", "page", "code", "credits", "semester")}
                                         for e in by_name],
            "issues": issues,
        })
    json_codes = defaultdict(set)
    for r in rows:
        json_codes[r["program"]].add(r["code"])
    missing = defaultdict(dict)
    for prog, entries in sources.items():
        for e in entries:
            if e["code"] not in json_codes[prog]:
                missing[prog].setdefault(e["code"], []).append(e)
    return results, missing


def write_outputs(results, missing):
    ok = [x for x in results if not x["issues"]]
    lines = [
        "# Verifikasi Ekstrak JSON terhadap PDF Resmi",
        "",
        "Dibuat otomatis oleh `backend/verify_catalog_sources.py`. Parser tabel PDF tidak sempurna:",
        "setiap temuan di bawah harus dikonfirmasi manual ke halaman yang disebut.",
        "",
        f"- Baris JSON: **{len(results)}** — cocok di semua aspek: **{len(ok)}**, ada temuan: **{len(results) - len(ok)}**",
        f"- Kode ada di PDF tapi tidak ada di JSON: **{sum(len(v) for v in missing.values())}**",
        "",
    ]
    for prog in PROGRAM_ORDER:
        bad = [x for x in results if x["program"] == prog and x["issues"]]
        lines += [f"## {prog}", "", f"Temuan: {len(bad)} baris", ""]
        for x in bad:
            j = x["json"]
            lines.append(f"- `{x['code']}` {j['name']} · JSON {j['credits']} SKS sem {j['semester']} → **{', '.join(x['issues'])}**")
            for e in x["pdf"]:
                lines.append(f"  - {e['source']} hal {e['page']}: {e['name']} · {e['credits']} SKS sem {e['semester']}")
            for e in x["pdf_same_name_other_code"]:
                lines.append(f"  - nama sama dengan kode lain: `{e['code']}` ({e['source']} hal {e['page']}, {e['credits']} SKS sem {e['semester']})")
        if missing.get(prog):
            lines += ["", f"**Ada di PDF, tidak ada di JSON ({len(missing[prog])}):**", ""]
            for code, es in sorted(missing[prog].items()):
                e = es[0]
                srcs = ", ".join(sorted({f"{x['source']} hal {x['page']}" for x in es}))
                lines.append(f"- `{code}` {e['name']} · {e['credits']} SKS sem {e['semester']} ({srcs})")
        lines.append("")
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({"results": results, "missing_in_json": missing}, f, ensure_ascii=False, indent=2)
    return len(ok)


def main():
    rows = [r for _, rs in load_rows(include_raw=True) for r in rs]
    sources = load_sources()
    for prog in PROGRAM_ORDER:
        print(f"[PDF] {prog}: {len(sources[prog])} entri tabel, {len({e['code'] for e in sources[prog]})} kode")
    results, missing = compare(rows, sources)
    ok = write_outputs(results, missing)
    print(f"[OK] {ok}/{len(results)} baris cocok penuh. Laporan: {os.path.relpath(REPORT_PATH)}")


if __name__ == "__main__":
    main()
