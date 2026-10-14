interface CourseDescriptionViewProps {
  text?: string
  className?: string
}

interface DescriptionItem {
  marker: string
  content: string
}

interface ParsedDescription {
  intro: string
  items: DescriptionItem[]
}

/**
 * Pure dynamic formatter that transforms bulleted / listed course descriptions
 * into a structured, readable view without hardcoding individual course texts.
 *
 * Handles common syllabus patterns:
 * - "a). ... b). ... c). ..."
 * - "1. ... 2. ... 3. ..."
 * - "1) ... 2) ... 3) ..."
 * - Multiline numbered or dashed lists
 */
export function parseDescription(raw?: string): ParsedDescription {
  if (!raw || !raw.trim()) {
    return { intro: "", items: [] }
  }

  const clean = raw.trim()

  // Match list markers preceded by punctuation or newline:
  // e.g. ": a).", ", b).", "; c).", "\n1.", "1) "
  const inlineMarkerPattern =
    /(?:^|(?<=[:;,\n]\s*)|(?<=\.\s+))(?:(?:serta|dan)\s+)?(\([a-z0-9]+\)|[a-z0-9]{1,2}(?:\)|\.|\)\.))\s+/gi

  const matches = Array.from(clean.matchAll(inlineMarkerPattern))

  // Require at least 2 distinct markers to treat as a structured list
  if (matches.length >= 2) {
    const firstMatchIndex = matches[0].index ?? 0
    const intro = clean
      .slice(0, firstMatchIndex)
      .replace(/[:;,]\s*$/, "")
      .trim()

    const items: DescriptionItem[] = []
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const marker = match[1].trim()
      const start = (match.index ?? 0) + match[0].length
      const end =
        i + 1 < matches.length
          ? (matches[i + 1].index ?? clean.length)
          : clean.length

      const content = clean
        .slice(start, end)
        .replace(/[,;]\s*(?:serta|dan)?\s*$/i, "")
        .trim()

      if (content) {
        items.push({ marker, content })
      }
    }

    if (items.length >= 2) {
      return { intro, items }
    }
  }

  // Check for multiline lists (separated by \n)
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length >= 2) {
    const lineItemPattern = /^(\([a-z0-9]+\)|[a-z0-9]{1,2}[\.\)]|[-•])\s+(.*)$/i
    const parsedLines: DescriptionItem[] = []
    let detectedIntro = ""

    for (const line of lines) {
      const m = line.match(lineItemPattern)
      if (m) {
        parsedLines.push({ marker: m[1], content: m[2] })
      } else if (parsedLines.length === 0) {
        detectedIntro += (detectedIntro ? " " : "") + line
      } else {
        // Line continuation of previous item
        const last = parsedLines[parsedLines.length - 1]
        last.content += " " + line
      }
    }

    if (parsedLines.length >= 2) {
      return { intro: detectedIntro, items: parsedLines }
    }
  }

  return { intro: clean, items: [] }
}

export default function CourseDescriptionView({
  text,
  className = "",
}: CourseDescriptionViewProps) {
  const { intro, items } = parseDescription(text)

  if (!intro && items.length === 0) {
    return (
      <p className="text-sm text-muted italic">Tidak ada deskripsi tersedia.</p>
    )
  }

  if (items.length === 0) {
    return (
      <p
        className={`text-sm text-foreground leading-relaxed whitespace-pre-line ${className}`}
      >
        {intro}
      </p>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {intro && (
        <p className="text-sm text-foreground leading-relaxed font-normal">
          {intro}:
        </p>
      )}
      <ul className="space-y-2 pl-0.5">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed group"
          >
            <span className="font-mono text-xs font-bold text-navy bg-navy/8 border border-navy/15 px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 select-none">
              {item.marker}
            </span>
            <span className="flex-1">{item.content}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
