#!/usr/bin/env python3
"""Rebuild design/ftmm-compass-ui.figcraft from DOM snapshots.

Pipeline:
  1. Run design/extract-dom.js in the app (1440x900, logged in, page scrolled to top)
     and save each page's result as <dom>/<key>.json.
  2. Download every node.src referenced by kind == "img" into --assets (Windows path).
  3. python3 design/sync.py --dom /tmp/dom --assets 'C:\\Users\\<you>\\AppData\\Local\\Temp\\ftmm-assets'

Requires the FigCraft app running with --control 7979 on Windows.
"""
import argparse
import json
import os
import re
import subprocess
from collections import Counter

try:
    from PIL import Image
except ImportError:  # screenshots are optional: gradients fall back to a flat tint
    Image = None

PAGES = [
    ("01 · Login", "login", "src/pages/Login.tsx"),
    ("02 · Dashboard", "dashboard", "src/pages/Dashboard.tsx"),
    ("03 · Course Finder", "course-finder", "src/pages/CourseFinder.tsx"),
    ("04 · Degree Planner", "degree-planner", "src/pages/DegreePlanner.tsx"),
    ("05 · Compass AI", "compass-ai", "src/pages/Chatbot.tsx"),
    ("06 · Profil", "profile", "src/pages/Profile.tsx"),
    ("07 · State · Konfirmasi Keluar", "logout", "src/pages/Profile.tsx"),
]
FONTS = {"Inter": "Inter", "Poppins": "Poppins", "JetBrains Mono": "Consolas"}
NAVY, MUTED, FG, BG = "#0f3e32", "#6b7280", "#2d333a", "#faf9f7"
ARITY = {"m": 2, "l": 2, "h": 1, "v": 1, "c": 6, "s": 4, "q": 4, "t": 2, "a": 7, "z": 0}
SHOTS = {
    "login": "00-login.png", "dashboard": "01-dashboard.png", "course-finder": "02-course-finder.png",
    "degree-planner": "03-degree-planner.png", "compass-ai": "04-compass-ai.png", "profile": "05-profile.png",
    "logout": "06-logout-confirm.png",
}
BLUR_DECOR = re.compile(r"(?<!backdrop-)blur-(?:sm|md|lg|xl|2xl|3xl|\[)")


def cell_color(img, x, y, w, h):
    """Median colour of one grid cell (text covers well under half of a cell)."""
    box = img.crop((max(0, int(x)), max(0, int(y)), min(img.width, int(x + w)), min(img.height, int(y + h + 0.5)))).convert("RGB")
    px = list(box.getdata())
    if not px:
        return "#ffffff"
    px.sort(key=lambda c: c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114)
    r, g, b = px[len(px) // 2]
    return "#%02x%02x%02x" % (r, g, b)


def scale_path(d, s):
    """Uniformly scale SVG path data (arc flags and implicit lineto handled)."""
    out, i, n, cmd = [], 0, len(d), None

    def skip():
        nonlocal i
        while i < n and d[i] in " ,\t\n\r":
            i += 1

    def num():
        nonlocal i
        skip()
        m = re.match(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?", d[i:])
        if not m:
            raise ValueError(f"bad number at {i}: {d[i:i + 12]}")
        i += m.end()
        return float(m.group())

    def flag():
        nonlocal i
        skip()
        ch = d[i]
        if ch not in "01":
            raise ValueError(f"bad flag at {i}: {d[i:i + 8]}")
        i += 1
        return ch

    while True:
        skip()
        if i >= n:
            break
        explicit = d[i].isalpha()
        if explicit:
            cmd = d[i]
            i += 1
        eff = cmd
        if not explicit and cmd in "mM":
            eff = "l" if cmd == "m" else "L"
        ar = ARITY[eff.lower()]
        if ar == 0:
            out.append(eff)
            continue
        if eff.lower() == "a":
            rx, ry, rot = num(), num(), num()
            laf, sf = flag(), flag()
            x, y = num(), num()
            out.append(f"{eff} {rx * s:.3f} {ry * s:.3f} {rot:.3f} {laf} {sf} {x * s:.3f} {y * s:.3f}")
        else:
            vals = [num() for _ in range(ar)]
            out.append(eff + " " + " ".join(f"{v * s:.3f}" for v in vals))
        skip()
    return " ".join(out)


def fix_widths(nodes):
    """A text run inside a paragraph can report a union rect; re-anchor it after its siblings."""
    for n in nodes:
        if n["kind"] != "text" or n.get("tag") in {"input", "select", "textarea"}:
            continue
        est = len(n["text"]) * n["size"] * 0.62
        if n["w"] <= max(est * 1.8, 40):
            continue
        peers = [m for m in nodes if m is not n and m["kind"] == "text" and abs(m["y"] - n["y"]) < 1]
        if peers:
            n["x"] = round(max(m["x"] + m["w"] for m in peers) + n["size"] * 0.25, 1)
            n["w"] = round(est, 1)
    return nodes


def fix_order(nodes):
    """Native control placeholder text must paint above its own background rect."""
    nodes = fix_widths(list(nodes))
    for n in list(nodes):
        if n["kind"] != "text" or n.get("tag") not in {"input", "select", "textarea"}:
            continue
        host = None
        for m in nodes:
            if m is n or m["kind"] != "rect" or m.get("tag") != n.get("tag"):
                continue
            if m["x"] <= n["x"] <= m["x"] + m["w"] and m["y"] <= n["y"] <= m["y"] + m["h"]:
                host = m
        if host is not None:
            nodes.remove(n)
            nodes.insert(nodes.index(host) + 1, n)
    return nodes


def child_cmds(doc, parent, assets, shot=None):
    cmds = []
    for n in fix_order(doc["nodes"]):
        meta = {"tag": n.get("tag", ""), "class": "" if n["kind"] == "svg" else (n.get("cls") or "")[:150]}
        if n["kind"] == "rect":
            if n.get("cls") and BLUR_DECOR.search(n["cls"]):
                continue
            if not n.get("fill") and n.get("gradColor") and shot is not None:
                cell = 64
                cols = max(1, round(n["w"] / cell))
                rows = max(1, round(n["h"] / cell))
                cw, chh = n["w"] / cols, n["h"] / rows
                for r in range(rows):
                    for c in range(cols):
                        cmds.append({"command": "node.create", "params": {
                            "type": "rectangle", "x": round(n["x"] + c * cw, 1), "y": round(n["y"] + r * chh, 1),
                            "width": round(cw + 0.5, 1), "height": round(chh + 0.5, 1), "parent": parent,
                            "name": f"{n['name'][:24]} tile{r + 1}-{c + 1}",
                            "props": {"fill": cell_color(shot, n["x"] + c * cw, n["y"] + r * chh, cw, chh)},
                        }})
                continue
            props = {}
            if n.get("fill"):
                props["fill"] = n["fill"]
            else:
                props["fills"] = []
            if n.get("border"):
                props["stroke"] = n["border"]
                props["strokeWeight"] = n["bw"]
            if n.get("radius"):
                props["cornerRadius"] = n["radius"]
            if n.get("rot"):
                props["rotation"] = n["rot"]
            if not n.get("fill") and not n.get("border"):
                continue
            props["pluginData"] = meta
            cmds.append({"command": "node.create", "params": {"type": "rectangle", "x": n["x"], "y": n["y"], "width": n["w"], "height": n["h"], "parent": parent, "name": n["name"][:40], "props": props}})
        elif n["kind"] == "text":
            props = {
                "fontSize": n["size"], "fontFamily": FONTS.get(n["family"], n["family"]), "fontStyle": n["style"],
                "fill": n.get("color") or FG, "textAlign": "left", "pluginData": meta,
            }
            if n["lh"] != "auto":
                props["lineHeight"] = n["lh"]
            if n["ls"]:
                props["letterSpacing"] = n["ls"]
            if n.get("transform") == "uppercase":
                props["textCase"] = "upper"
            if n.get("rot"):
                props["rotation"] = n["rot"]
            lh = n["lh"] if isinstance(n["lh"], (int, float)) else n["size"] * 1.2
            params = {"text": n["text"], "x": n["x"], "y": n["y"], "parent": parent, "name": n["text"][:50], "props": props}
            if "\n" in n["text"] or n["h"] > lh * 1.6:
                props["textAlign"] = {"start": "left", "end": "right", "justify": "justified"}.get(n["align"], n["align"])
                params["width"] = max(n["w"] + 2, 4)
            cmds.append({"command": "text.create", "params": params})
        elif n["kind"] == "img" and os.path.basename(n.get("src", "")) in assets:
            cmds.append({"command": "image.place", "params": {"path": assets[os.path.basename(n["src"])], "x": n["x"], "y": n["y"], "width": n["w"], "height": n["h"], "parent": parent, "mode": "fill"}})
        elif n["kind"] == "svg":
            s = n["w"] / 24.0
            for i, p in enumerate(n["paths"]):
                if not p.get("d"):
                    continue
                verts = {"pluginData": {"tag": "svg path", "class": ""}}
                if p.get("fill"):
                    verts["fill"] = p["fill"]
                else:
                    verts["fills"] = []
                if p.get("stroke") and p.get("sw"):
                    verts["stroke"] = p["stroke"]
                    verts["strokeWeight"] = round(p["sw"] * s, 2)
                    verts["strokeCap"] = "round"
                    verts["strokeJoin"] = "round"
                cmds.append({"command": "node.create", "params": {"type": "vector", "x": n["x"], "y": n["y"], "width": n["w"], "height": n["h"], "parent": parent, "name": f"{n['name'][:28]} path{i + 1}", "path": scale_path(p["d"], s), "props": verts}})
    return cmds


def pass1():
    cmds = [
        {"command": "file.new", "params": {"name": "FTMM Compass UI"}},
        {"command": "page.rename", "params": {"id": 1, "name": "00 · Cover"}},
        {"command": "page.setBackground", "params": {"color": BG}},
        {"command": "text.create", "params": {"text": "FTMM Compass — Editable UI", "x": 80, "y": 64, "props": {"fontSize": 40, "fontFamily": "Poppins", "fontStyle": "Bold", "fill": NAVY}}},
        {"command": "text.create", "params": {"text": "Setiap halaman adalah rekonstruksi elemen dari DOM live (localhost:8443, 1440×900): rectangle, teks, ikon vektor, dan gambar logo. Bukan screenshot — bisa diedit langsung.", "x": 80, "y": 124, "width": 1460, "props": {"fontSize": 14, "fontFamily": "Inter", "fill": MUTED, "lineHeight": 22}}},
        {"command": "text.create", "params": {"text": "Map ke kode: tiap layer menyimpan pluginData {tag, class} (Tailwind). Sebut nama layer atau teksnya saat meminta perubahan, agen bisa melacak ke file sumber yang tertera di atas tiap frame.", "x": 80, "y": 166, "width": 1460, "props": {"fontSize": 13, "fontFamily": "Inter", "fill": FG, "lineHeight": 21}}},
    ]
    y = 230
    for name, key, src in PAGES:
        cmds.append({"command": "text.create", "params": {"text": f"{name}   —   {src}", "x": 80, "y": y, "width": 1200, "props": {"fontSize": 15, "fontFamily": "Inter", "fill": NAVY, "lineHeight": 22}}})
        y += 30
    for name, key, src in PAGES:
        cmds += [
            {"command": "page.add", "params": {"name": name}},
            {"command": "page.setBackground", "params": {"color": BG}},
            {"command": "text.create", "params": {"text": name, "x": 80, "y": 48, "props": {"fontSize": 30, "fontFamily": "Poppins", "fontStyle": "Bold", "fill": NAVY}}},
            {"command": "text.create", "params": {"text": f"{src}  ·  viewport 1440×900  ·  elemen DOM live", "x": 80, "y": 94, "props": {"fontSize": 13, "fontFamily": "Consolas", "fill": MUTED}}},
        ]
    return cmds


def tokens_page():
    cmds = [
        {"command": "page.add", "params": {"name": "08 · Design Tokens"}},
        {"command": "page.setBackground", "params": {"color": BG}},
        {"command": "text.create", "params": {"text": "Design Tokens", "x": 80, "y": 48, "props": {"fontSize": 30, "fontFamily": "Poppins", "fontStyle": "Bold", "fill": NAVY}}},
        {"command": "text.create", "params": {"text": "Sumber: src/index.css (@theme Tailwind v4). Dilarang hardcode hex di JSX; pakai bg-navy/text-gold/dll.", "x": 80, "y": 94, "props": {"fontSize": 13, "fontFamily": "Inter", "fill": MUTED}}},
    ]
    tokens = [("navy", "#0f3e32"), ("navy-light", "#165a49"), ("navy-dark", "#08221b"), ("gold", "#d7b03d"), ("gold-hover", "#c09d35"),
              ("teal", "#93f08e"), ("teal-dark", "#6bd465"), ("orange", "#ad5712"), ("background", "#faf9f7"), ("foreground", "#2d333a"),
              ("muted", "#6b7280"), ("border", "#e5e7eb")]
    for i, (nm, v) in enumerate(tokens):
        x, y = 80 + (i % 4) * 300, 160 + (i // 4) * 190
        cmds.append({"command": "frame.create", "params": {"x": x, "y": y, "width": 260, "height": 120, "name": nm, "props": {"fill": v, "stroke": "#e5e7eb", "strokeWeight": 1, "cornerRadius": 12}}})
        cmds.append({"command": "text.create", "params": {"text": f"{nm}\n{v}", "x": x, "y": y + 132, "width": 260, "props": {"fontSize": 13, "fontFamily": "Consolas", "fill": FG, "lineHeight": 19}}})
    cmds += [
        {"command": "text.create", "params": {"text": "Tipografi", "x": 80, "y": 840, "props": {"fontSize": 18, "fontFamily": "Poppins", "fontStyle": "Semi Bold", "fill": NAVY}}},
        {"command": "text.create", "params": {"text": "Heading — Poppins 600/700\nBody — Inter 400/500\nMono — JetBrains Mono 400/500\nRadius — 8px (--radius: 0.5rem), sm -4px, lg +0px, xl +4px", "x": 80, "y": 878, "width": 800, "props": {"fontSize": 14, "fontFamily": "Inter", "fill": FG, "lineHeight": 24}}},
    ]
    return cmds


def run(cli, script, extra):
    out = subprocess.run([cli, "run", script, *extra], capture_output=True, text=True)
    rows = [json.loads(l) for l in out.stdout.splitlines() if l.startswith("{")]
    failed = [r for r in rows if not r.get("ok")]
    if failed:
        raise SystemExit(f"{len(failed)} command(s) failed: {json.dumps(failed[:3])}")
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dom", default="/tmp/dom")
    ap.add_argument("--assets", required=True, help="Windows directory holding downloaded img assets")
    ap.add_argument("--cli", default=r"C:\Program Files\FigCraft\figcraft-cli.exe")
    ap.add_argument("--out", default=None)
    ap.add_argument("--work", default="/tmp")
    ap.add_argument("--shots", default="/tmp/ftmm-shots", help="browser screenshots, same viewport as the DOM snapshots")
    args = ap.parse_args()
    out_file = args.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "ftmm-compass-ui.figcraft")

    cli = args.cli
    if not os.path.exists(cli):
        alt = "/mnt/c/" + re.sub(r"^[A-Za-z]:[\\/]", "", cli).replace("\\", "/")
        if os.path.exists(alt):
            cli = alt
    docs = {}
    for name, key, src in PAGES:
        docs[key] = json.load(open(os.path.join(args.dom, key + ".json")))

    assets = {}
    for d in docs.values():
        for n in d["nodes"]:
            if n["kind"] == "img":
                base = os.path.basename(n["src"])
                assets[base] = args.assets + "\\" + base

    p1 = pass1()
    for i, (name, key, src) in enumerate(PAGES):
        p1.append({"command": "page.select", "params": {"index": i + 1}})
        p1.append({"command": "frame.create", "params": {"x": 80, "y": 140, "width": 1440, "height": docs[key]["height"], "name": name, "props": {"fill": "#ffffff", "clip": True}}})
    p1 += tokens_page()
    p1.append({"command": "page.list", "params": {}})
    s1 = os.path.join(args.work, "figcraft-build1.json")
    json.dump(p1, open(s1, "w"))

    rows = run(cli, s1, ["--out", out_file])
    frames = [r["result"]["id"] for r in rows if r["command"] == "frame.create" and r["ok"]][: len(PAGES)]
    pages = [p["id"] for p in [r for r in rows if r["command"] == "page.list"][0]["result"]][1 : 1 + len(PAGES)]
    if len(frames) != len(PAGES) or len(pages) != len(PAGES):
        raise SystemExit(f"unexpected ids: frames={frames} pages={pages}")

    shots = {}
    if Image is not None:
        for key, fn in SHOTS.items():
            path = os.path.join(args.shots, fn)
            if os.path.exists(path):
                shots[key] = Image.open(path)

    p2 = []
    for (name, key, src), fid, pid in zip(PAGES, frames, pages):
        p2.append({"command": "page.select", "params": {"id": pid}})
        p2 += child_cmds(docs[key], fid, assets, shots.get(key))
    s2 = os.path.join(args.work, "figcraft-build2.json")
    json.dump(p2, open(s2, "w"))
    run(cli, s2, ["--in", out_file, "--out", out_file])
    print(f"{len(p2)} layers -> {out_file}")


if __name__ == "__main__":
    main()
