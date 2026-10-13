import React from "react"
import { CheckCircle2 } from "lucide-react"
import { Course } from "../../data"

export default function PrerequisiteDiagram({ course }: { course: Course }) {
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return (
      <div className="bg-background rounded-lg p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-teal" />
        </div>
        <p className="text-sm font-medium text-navy">Tidak Ada Prasyarat</p>
        <p className="text-xs text-muted mt-1">
          Mata kuliah ini dapat langsung diambil.
        </p>
      </div>
    )
  }

  const NODE_W = 162
  const NODE_H = 54
  const H_GAP = 22
  const V_GAP = 64
  const CTRL = 28

  // Collect level-0 nodes (prereqs of prereqs), deduped
  const level0Map = new Map<string, { id: string name: string }>()
  course.prerequisites.forEach((p) => {
    ;(p.prereqs || []).forEach((pp) => {
      if (!level0Map.has(pp.id)) level0Map.set(pp.id, pp)
    })
  })
  const level0Nodes = Array.from(level0Map.values())
  const level1Nodes = course.prerequisites

  const hasLevel0 = level0Nodes.length > 0
  const numLevels = hasLevel0 ? 3 : 2

  const maxNodesPerRow = Math.max(level0Nodes.length, level1Nodes.length, 1)
  const svgWidth = maxNodesPerRow * NODE_W + (maxNodesPerRow - 1) * H_GAP + 80
  const svgHeight = numLevels * NODE_H + (numLevels - 1) * V_GAP + 40

  const getX = (index: number, total: number): number => {
    const contentW = total * NODE_W + (total - 1) * H_GAP
    const startX = (svgWidth - contentW) / 2
    return startX + index * (NODE_W + H_GAP)
  }

  // Y positions top-to-bottom: level0 at top, root at bottom
  const levelY: Record<number, number> = hasLevel0
    ? { 0: 20, 1: 20 + NODE_H + V_GAP, 2: 20 + 2 * (NODE_H + V_GAP) }
    : { 1: 20, 2: 20 + NODE_H + V_GAP }

  return (
    <div className="overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="block mx-auto"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <defs>
          <marker
            id={`arrow-${course.id}`}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
          </marker>
        </defs>

        {/* Edges: level1 → root */}
        {level1Nodes.map((p, pi) => {
          const x1 = getX(pi, level1Nodes.length) + NODE_W / 2
          const y1 = levelY[1] + NODE_H
          const x2 = getX(0, 1) + NODE_W / 2
          const y2 = levelY[2]
          return (
            <path
              key={`edge-l1-root-${p.id}`}
              d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
              stroke="#d1d5db"
              strokeWidth="1.5"
              fill="none"
              markerEnd={`url(#arrow-${course.id})`}
            />
          )
        })}

        {/* Edges: level0 → level1 */}
        {hasLevel0 &&
          level1Nodes.map((p, pi) =>
            (p.prereqs || []).map((pp) => {
              const ppIdx = level0Nodes.findIndex((n) => n.id === pp.id)
              if (ppIdx === -1) return null
              const x1 = getX(ppIdx, level0Nodes.length) + NODE_W / 2
              const y1 = levelY[0] + NODE_H
              const x2 = getX(pi, level1Nodes.length) + NODE_W / 2
              const y2 = levelY[1]
              return (
                <path
                  key={`edge-l0-l1-${pp.id}-${p.id}`}
                  d={`M${x1},${y1} C${x1},${y1 + CTRL} ${x2},${y2 - CTRL} ${x2},${y2}`}
                  stroke="#d1d5db"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd={`url(#arrow-${course.id})`}
                />
              )
            }),
          )}

        {/* Level 0 nodes (base prerequisites) */}
        {hasLevel0 &&
          level0Nodes.map((node, i) => {
            const x = getX(i, level0Nodes.length)
            const y = levelY[0]
            return (
              <g key={node.id}>
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  fill="#f9fafb"
                  stroke="#e5e7eb"
                  strokeWidth="1.5"
                />
                {node.id !== node.name && (
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
                    {node.id}
                  </text>
                )}
                <text
                  x={x + NODE_W / 2}
                  y={y + 32}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="#374151"
                  fontWeight="500"
                >
                  {node.name.length > 20
                    ? node.name.slice(0, 20) + "…"
                    : node.name}
                </text>
                <text
                  x={x + NODE_W / 2}
                  y={y + 46}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#9ca3af"
                >
                  Prasyarat Dasar
                </text>
              </g>
            )
          })}

        {/* Level 1 nodes (direct prerequisites) */}
        {level1Nodes.map((node, i) => {
          const x = getX(i, level1Nodes.length)
          const y = levelY[1]
          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill="#f0fdf4"
                stroke="#86efac"
                strokeWidth="1.5"
              />
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
                {node.id}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 32}
                textAnchor="middle"
                fontSize="10.5"
                fill="#165a49"
                fontWeight="500"
              >
                {node.name.length > 20
                  ? node.name.slice(0, 20) + "…"
                  : node.name}
              </text>
              <text
                x={x + NODE_W / 2}
                y={y + 46}
                textAnchor="middle"
                fontSize="8.5"
                fill="#6b7280"
              >
                Prasyarat Langsung
              </text>
            </g>
          )
        })}

        {/* Root node (current course) */}
        {(() => {
          const x = getX(0, 1)
          const y = levelY[2]
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill="#0f3e32"
                stroke="#d7b03d"
                strokeWidth="2"
              />
              <text
                x={x + NODE_W / 2}
                y={y + 17}
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
                x={x + NODE_W / 2}
                y={y + 33}
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
                x={x + NODE_W / 2}
                y={y + 47}
                textAnchor="middle"
                fontSize="8.5"
                fill="#d7b03d"
              >
                Matkul Ini
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded bg-navy border-2 border-gold" />
          <span className="text-xs text-muted">Matkul ini</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded bg-teal/10 border border-teal/60" />
          <span className="text-xs text-muted">Prasyarat langsung</span>
        </div>
        {hasLevel0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 rounded bg-background border border-border" />
            <span className="text-xs text-muted">Prasyarat dasar</span>
          </div>
        )}
      </div>
    </div>
  )
}
