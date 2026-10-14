import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Course } from "../../data"
import {
  ALL_COURSES,
  findCourseByNameOrCode,
  findUnlockedCourses,
} from "../../courseData"

export interface PrerequisiteDiagramProps {
  course: Course
  catalog?: Course[]
  onSelectCourse?: (targetCourse: Course) => void
}

interface DiagramNodeItem {
  id: string
  code?: string
  name: string
  courseObj?: Course
}

export default function PrerequisiteDiagram({
  course,
  catalog = ALL_COURSES,
  onSelectCourse,
}: PrerequisiteDiagramProps) {
  const allPrereqs = course.prerequisites || []
  const coursePrereqs = allPrereqs.filter((p) => !p.isAdministrative)
  const adminPrereqs = allPrereqs.filter((p) => p.isAdministrative)

  // 1. Resolve Inbound Prerequisites (Courses required before this course)
  const inboundNodes: DiagramNodeItem[] = coursePrereqs.map((p) => {
    const matched = findCourseByNameOrCode(p.name, catalog, course.program)
    return {
      id: matched?.id || p.id,
      code: matched?.code,
      name: matched?.name || p.name,
      courseObj: matched,
    }
  })

  // 2. Resolve Outbound Courses (Courses that require this course)
  const unlockedCourses = findUnlockedCourses(course, catalog)
  const outboundNodes: DiagramNodeItem[] = unlockedCourses.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    courseObj: c,
  }))

  const hasInbound = inboundNodes.length > 0
  const hasOutbound = outboundNodes.length > 0

  // Empty state: Neither inbound nor outbound courses exist
  if (!hasInbound && !hasOutbound) {
    if (adminPrereqs.length > 0) {
      return (
        <div className="bg-background rounded-xl p-6 text-center border border-border">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-gold" />
          </div>
          <p className="text-sm font-bold text-navy">
            Syarat Akademik Administratif
          </p>
          <p className="text-xs text-foreground/80 mt-1.5 max-w-md mx-auto">
            Mata kuliah ini tidak memiliki prasyarat mata kuliah langsung,
            melainkan syarat kelayakan akademik:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {adminPrereqs.map((a) => (
              <span
                key={a.id}
                className="px-3 py-1 bg-gold/15 text-navy font-semibold text-xs rounded-lg border border-gold/30"
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="bg-background rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-teal" />
        </div>
        <p className="text-sm font-medium text-navy">Mata Kuliah Mandiri</p>
        <p className="text-xs text-muted mt-1">
          Mata kuliah ini dapat langsung diambil dan tidak menjadi prasyarat
          bagi mata kuliah lain.
        </p>
      </div>
    )
  }

  const NODE_W = 168
  const NODE_H = 56
  const H_GAP = 20
  const V_GAP = 60
  const CTRL = 26

  // Tier configuration
  let numTiers = 1
  let inboundTier = -1
  let currentTier = 0
  let outboundTier = -1

  if (hasInbound && hasOutbound) {
    numTiers = 3
    inboundTier = 0
    currentTier = 1
    outboundTier = 2
  } else if (hasInbound) {
    numTiers = 2
    inboundTier = 0
    currentTier = 1
  } else if (hasOutbound) {
    numTiers = 2
    currentTier = 0
    outboundTier = 1
  }

  const maxNodesPerRow = Math.max(inboundNodes.length, outboundNodes.length, 1)

  const svgWidth = Math.max(
    maxNodesPerRow * NODE_W + (maxNodesPerRow - 1) * H_GAP + 80,
    320,
  )
  const svgHeight = numTiers * NODE_H + (numTiers - 1) * V_GAP + 50

  const getX = (index: number, total: number): number => {
    const contentW = total * NODE_W + (total - 1) * H_GAP
    const startX = (svgWidth - contentW) / 2
    return startX + index * (NODE_W + H_GAP)
  }

  const getY = (tierIndex: number): number => {
    return 25 + tierIndex * (NODE_H + V_GAP)
  }

  const currentX = getX(0, 1)
  const currentY = getY(currentTier)

  return (
    <div className="space-y-4">
      {/* Legend & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted pb-1 border-b border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          {hasInbound && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded bg-[#f0fdf4] border border-[#86efac]" />
              Prasyarat Diperlukan
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded bg-navy border border-gold" />
            Matkul Aktif
          </span>
          {hasOutbound && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded bg-[#fefce8] border border-[#fde047]" />
              Membuka Matkul Lanjutan
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted italic">
          Tip: Klik kotak mata kuliah untuk melihat detailnya
        </span>
      </div>

      <div className="overflow-x-auto py-2">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block mx-auto"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <defs>
            <marker
              id={`arrow-down-${course.id}`}
              markerWidth="7"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 7 3, 0 6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Edges: Inbound → Current */}
          {hasInbound &&
            inboundNodes.map((p, pi) => {
              const x1 = getX(pi, inboundNodes.length) + NODE_W / 2
              const y1 = getY(inboundTier) + NODE_H
              const x2 = currentX + NODE_W / 2
              const y2 = currentY
              return (
                <path
                  key={`edge-inbound-${p.id}`}
                  d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd={`url(#arrow-down-${course.id})`}
                />
              )
            })}

          {/* Edges: Current → Outbound */}
          {hasOutbound &&
            outboundNodes.map((p, pi) => {
              const x1 = currentX + NODE_W / 2
              const y1 = currentY + NODE_H
              const x2 = getX(pi, outboundNodes.length) + NODE_W / 2
              const y2 = getY(outboundTier)
              return (
                <path
                  key={`edge-outbound-${p.id}`}
                  d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd={`url(#arrow-down-${course.id})`}
                />
              )
            })}

          {/* Inbound Nodes */}
          {hasInbound &&
            inboundNodes.map((node, i) => {
              const x = getX(i, inboundNodes.length)
              const y = getY(inboundTier)
              const isClickable = Boolean(node.courseObj && onSelectCourse)

              return (
                <g
                  key={`inbound-${node.id}`}
                  onClick={() => {
                    if (node.courseObj && onSelectCourse) {
                      onSelectCourse(node.courseObj)
                    }
                  }}
                  className={isClickable ? "cursor-pointer group" : ""}
                >
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx="8"
                    fill="#f0fdf4"
                    stroke="#86efac"
                    strokeWidth="1.5"
                    className="transition-colors group-hover:stroke-gold group-hover:stroke-2"
                  />
                  {node.code && (
                    <text
                      x={x + NODE_W / 2}
                      y={y + 17}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      letterSpacing="0.5"
                      fill="#165a49"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {node.code}
                    </text>
                  )}
                  <text
                    x={x + NODE_W / 2}
                    y={node.code ? y + 32 : y + 26}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#165a49"
                    fontWeight="600"
                  >
                    {node.name.length > 22
                      ? node.name.slice(0, 22) + "…"
                      : node.name}
                  </text>
                  <text
                    x={x + NODE_W / 2}
                    y={node.code ? y + 46 : y + 42}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#6b7280"
                  >
                    {isClickable ? "Prasyarat • Klik detail" : "Prasyarat"}
                  </text>
                </g>
              )
            })}

          {/* Current / Active Course Node */}
          <g>
            <rect
              x={currentX}
              y={currentY}
              width={NODE_W}
              height={NODE_H}
              rx="8"
              fill="#0f3e32"
              stroke="#d7b03d"
              strokeWidth="2"
            />
            <text
              x={currentX + NODE_W / 2}
              y={currentY + 17}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              letterSpacing="0.5"
              fill="#93f08e"
              fontFamily="JetBrains Mono, monospace"
            >
              {course.code ?? course.id}
            </text>
            <text
              x={currentX + NODE_W / 2}
              y={currentY + 33}
              textAnchor="middle"
              fontSize="10.5"
              fill="#ffffff"
              fontWeight="600"
            >
              {course.name.length > 20
                ? course.name.slice(0, 20) + "…"
                : course.name}
            </text>
            <text
              x={currentX + NODE_W / 2}
              y={currentY + 47}
              textAnchor="middle"
              fontSize="8.5"
              fill="#d7b03d"
              fontWeight="500"
            >
              Mata Kuliah Ini
            </text>
          </g>

          {/* Outbound Unlocked Nodes */}
          {hasOutbound &&
            outboundNodes.map((node, i) => {
              const x = getX(i, outboundNodes.length)
              const y = getY(outboundTier)
              const isClickable = Boolean(node.courseObj && onSelectCourse)

              return (
                <g
                  key={`outbound-${node.id}`}
                  onClick={() => {
                    if (node.courseObj && onSelectCourse) {
                      onSelectCourse(node.courseObj)
                    }
                  }}
                  className={isClickable ? "cursor-pointer group" : ""}
                >
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx="8"
                    fill="#fefce8"
                    stroke="#fde047"
                    strokeWidth="1.5"
                    className="transition-colors group-hover:stroke-gold group-hover:stroke-2"
                  />
                  {node.code && (
                    <text
                      x={x + NODE_W / 2}
                      y={y + 17}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      letterSpacing="0.5"
                      fill="#854d0e"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {node.code}
                    </text>
                  )}
                  <text
                    x={x + NODE_W / 2}
                    y={node.code ? y + 32 : y + 26}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#854d0e"
                    fontWeight="600"
                  >
                    {node.name.length > 22
                      ? node.name.slice(0, 22) + "…"
                      : node.name}
                  </text>
                  <text
                    x={x + NODE_W / 2}
                    y={node.code ? y + 46 : y + 42}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#713f12"
                  >
                    {isClickable ? "Membuka Matkul • Klik" : "Membuka Matkul"}
                  </text>
                </g>
              )
            })}
        </svg>
      </div>

      {/* Administrative Requirements Callout */}
      {adminPrereqs.length > 0 && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 max-w-xl mx-auto">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <div>
            <strong>Persyaratan Akademik Tambahan:</strong>{" "}
            {adminPrereqs.map((a) => a.name).join("; ")}
          </div>
        </div>
      )}
    </div>
  )
}
