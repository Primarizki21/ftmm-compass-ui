// Runs in the page (tab.run(async ({page}) => await page.evaluate(extractDom))).
// Returns { height, nodes[] } where every visible box is a rect, a text run,
// a vector icon, or an image, in DOM paint order. Page must be scrolled to top.
function extractDom() {
  const cv = document.createElement("canvas")
  cv.width = cv.height = 1
  const ctx = cv.getContext("2d", { willReadFrequently: true })
  const cache = new Map()
  const toHex = (css) => {
    if (!css || css === "transparent" || css === "none") return null
    if (cache.has(css)) return cache.get(css)
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = "#000"
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    const out =
      a === 0
        ? null
        : a === 255
          ? "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
          : "#" +
            [r, g, b, a].map((v) => v.toString(16).padStart(2, "0")).join("")
    cache.set(css, out)
    return out
  }
  const rotOf = (s) => {
    if (!s.transform || s.transform === "none") return 0
    const m = s.transform.match(/matrix\(([^)]+)\)/)
    if (!m) return 0
    const [a, b] = m[1].split(",").map(Number)
    return +((Math.atan2(b, a) * 180) / Math.PI).toFixed(1)
  }
  const num = (el, a, d = 0) => {
    const v = el.getAttribute(a)
    return v == null ? d : parseFloat(v)
  }
  const shapeToPath = (el) => {
    const t = el.tagName.toLowerCase()
    if (t === "path") return el.getAttribute("d")
    if (t === "circle") {
      const cx = num(el, "cx"),
        cy = num(el, "cy"),
        r = num(el, "r")
      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`
    }
    if (t === "ellipse") {
      const cx = num(el, "cx"),
        cy = num(el, "cy"),
        rx = num(el, "rx"),
        ry = num(el, "ry")
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`
    }
    if (t === "rect") {
      const x = num(el, "x"),
        y = num(el, "y"),
        w = num(el, "width"),
        h = num(el, "height")
      const rx = num(el, "rx"),
        ry = num(el, "ry", rx)
      if (!rx) return `M${x} ${y}h${w}v${h}h${-w}z`
      return `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}z`
    }
    if (t === "line")
      return `M${num(el, "x1")} ${num(el, "y1")}L${num(el, "x2")} ${num(el, "y2")}`
    if (t === "polyline" || t === "polygon") {
      const pts = (el.getAttribute("points") || "").trim().replace(/\s+/g, " ")
      return `M${pts.replace(/ /g, " L")}${t === "polygon" ? "z" : ""}`
    }
    return null
  }
  const H = Math.max(900, Math.round(document.documentElement.scrollHeight))
  const out = []
  const weights = {
    100: "Thin",
    200: "Extra Light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi Bold",
    700: "Bold",
    800: "Extra Bold",
    900: "Black",
  }
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.top > H || r.bottom < 0) continue
    const s = getComputedStyle(el)
    if (
      s.visibility === "hidden" ||
      s.display === "none" ||
      parseFloat(s.opacity) === 0
    )
      continue
    const nm = (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.textContent || "").trim().slice(0, 36) ||
      el.tagName.toLowerCase()
    ).replace(/\s+/g, " ")
    const cls = (el.getAttribute("class") || "").slice(0, 160)
    const base = {
      tag: el.tagName.toLowerCase(),
      name: nm,
      cls,
      x: +r.x.toFixed(1),
      y: +r.y.toFixed(1),
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
      rot: rotOf(s),
    }
    if (el.tagName === "IMG") {
      out.push({ ...base, kind: "img", src: el.currentSrc || el.src })
      continue
    }
    if (el.tagName.toLowerCase() === "svg") {
      const shapes = []
      for (const sh of el.querySelectorAll(
        "path,circle,ellipse,rect,line,polyline,polygon",
      )) {
        const ps = getComputedStyle(sh)
        const d = shapeToPath(sh)
        if (d)
          shapes.push({
            d,
            fill: toHex(ps.fill),
            stroke: toHex(ps.stroke),
            sw: parseFloat(ps.strokeWidth) || 0,
          })
      }
      out.push({ ...base, kind: "svg", paths: shapes })
      continue
    }
    const tag = el.tagName.toLowerCase()
    if (tag === "input" || tag === "select" || tag === "textarea") {
      let t =
        tag === "select"
          ? (el.selectedOptions && el.selectedOptions[0]
              ? el.selectedOptions[0].textContent
              : "") || ""
          : el.getAttribute("placeholder") || el.value || ""
      t = t.replace(/\s+/g, " ").trim()
      if (t) {
        const grey = tag !== "select" && !el.value
        const lh =
          s.lineHeight === "normal"
            ? parseFloat(s.fontSize) * 1.3
            : parseFloat(s.lineHeight)
        out.push({
          kind: "text",
          tag,
          cls,
          name: t.slice(0, 50),
          text: t,
          x: +(r.x + (parseFloat(s.paddingLeft) || 0)).toFixed(1),
          y: +(r.y + (r.height - lh) / 2).toFixed(1),
          w: +(r.width - (parseFloat(s.paddingLeft) || 0) - 4).toFixed(1),
          h: +lh.toFixed(1),
          rot: 0,
          color: (grey ? "#9ca3af" : toHex(s.color)) || toHex(s.color),
          size: parseFloat(s.fontSize),
          family: s.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
          style: weights[parseInt(s.fontWeight) || 400] || "Regular",
          lh: +lh.toFixed(1),
          ls: 0,
          align: "left",
          transform: "none",
        })
      }
    }
    const fill = toHex(s.backgroundColor)
    const bw = parseFloat(s.borderTopWidth) || 0
    const border =
      bw > 0 && s.borderTopStyle !== "none" ? toHex(s.borderTopColor) : null
    const grad = s.backgroundImage && s.backgroundImage !== "none"
    if (fill || border || grad) {
      let radius = 0
      const rr = (s.borderRadius || "0px").split(" ")[0]
      if (rr.endsWith("px")) radius = parseFloat(rr)
      else if (rr.endsWith("%"))
        radius = (Math.min(r.width, r.height) * parseFloat(rr)) / 100
      out.push({
        ...base,
        kind: "rect",
        fill,
        border,
        bw: border ? bw : 0,
        radius: +Math.min(radius, Math.min(r.width, r.height) / 2).toFixed(1),
      })
    }
    const fam = s.fontFamily.split(",")[0].replace(/["']/g, "").trim()
    const lh = s.lineHeight === "normal" ? "auto" : parseFloat(s.lineHeight)
    for (const node of el.childNodes) {
      if (node.nodeType !== 3 || !node.textContent.trim()) continue
      const rg = document.createRange()
      rg.selectNodeContents(node)
      const tr = rg.getBoundingClientRect()
      if (tr.width < 1 || tr.height < 1) continue
      const t = node.textContent.replace(/\s+/g, " ").trim()
      out.push({
        kind: "text",
        tag: el.tagName.toLowerCase(),
        cls,
        name: t.slice(0, 50),
        text: t,
        x: +tr.x.toFixed(1),
        y: +tr.y.toFixed(1),
        w: +tr.width.toFixed(1),
        h: +tr.height.toFixed(1),
        rot: rotOf(s),
        color: toHex(s.color),
        size: parseFloat(s.fontSize),
        family: fam,
        style: weights[parseInt(s.fontWeight) || 400] || "Regular",
        lh,
        ls: s.letterSpacing === "normal" ? 0 : parseFloat(s.letterSpacing),
        align: s.textAlign,
        transform: s.textTransform,
      })
    }
  }
  return { height: H, nodes: out }
}
