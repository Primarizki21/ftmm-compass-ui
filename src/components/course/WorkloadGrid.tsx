import type { WorkloadInfo } from "../../data"

export default function WorkloadGrid({
  workload,
  title = "Beban Kuliah",
}: {
  workload: WorkloadInfo
  title?: string
}) {
  const cells = [
    { label: "Jam/Semester", value: workload.hours },
    { label: "SKS Kuliah", value: workload.lectureCredits },
    { label: "SKS Praktikum", value: workload.labCredits },
  ]

  return (
    <div>
      <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="bg-background rounded-lg p-4 grid grid-cols-3 gap-4 text-center divide-x divide-border">
        {cells.map((cell) => (
          <div key={cell.label}>
            <div className="text-2xl font-heading font-bold text-navy">
              {cell.value}
            </div>
            <div className="text-xs text-muted mt-1">{cell.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
