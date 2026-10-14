import { Search, X, Clock, Bookmark, BookOpen, Check, Plus } from "lucide-react"
import { cn } from "../../utils"
import { Course } from "../../data"
import { isOdd, getCourseReligion, PlacedCourse } from "./types"

interface CoursePickerModalProps {
  pickerSem: number | null
  pickerSearch: string
  setPickerSearch: (q: string) => void
  pickerProgram: string
  setPickerProgram: (p: string) => void
  pickerType: "all" | "Pilihan" | "Wajib"
  setPickerType: (t: "all" | "Pilihan" | "Wajib") => void
  pickerStatus: "planned" | "wishlist"
  setPickerStatus: (s: "planned" | "wishlist") => void
  availablePrograms: string[]
  catalog: Course[]
  placedMap: Map<string, number>
  onClose: () => void
  onAddCourse: (course: Course) => void
  currentSemesterCourses?: PlacedCourse[]
  activeReligion?: string | null
}

export default function CoursePickerModal({
  pickerSem,
  pickerSearch,
  setPickerSearch,
  pickerProgram,
  setPickerProgram,
  pickerType,
  setPickerType,
  pickerStatus,
  setPickerStatus,
  availablePrograms,
  catalog,
  placedMap,
  onClose,
  onAddCourse,
  currentSemesterCourses,
  activeReligion,
}: CoursePickerModalProps) {
  if (pickerSem === null) return null

  const targetParity = isOdd(pickerSem) ? "odd" : "even"
  const q = pickerSearch.toLowerCase().trim()
  const plannedSKS = (currentSemesterCourses || [])
    .filter((c) => c.status === "planned" || c.status === "completed")
    .reduce((sum, c) => sum + c.credits, 0)
  const wishlistSKS = (currentSemesterCourses || [])
    .filter((c) => c.status === "wishlist")
    .reduce((sum, c) => sum + c.credits, 0)

  // Base pool filtered by semester parity / exact semester, program, and search query
  const basePool = catalog.filter((c) => {
    if (c.type === "Wajib") {
      if (c.semester !== pickerSem) return false
    } else {
      if (c.parity !== targetParity) return false
    }
    if (pickerProgram !== "all" && c.program !== pickerProgram) return false
    if (q) {
      const matchName = c.name.toLowerCase().includes(q)
      const matchId = c.id.toLowerCase().includes(q)
      const matchCode = c.code ? c.code.toLowerCase().includes(q) : false
      if (!matchName && !matchId && !matchCode) return false
    }
    return true
  })

  const pilihanCount = basePool.filter((c) => c.type === "Pilihan").length
  const wajibCount = basePool.filter((c) => c.type === "Wajib").length

  const filtered = basePool
    .filter((c) => (pickerType === "all" ? true : c.type === pickerType))
    .sort((a, b) => {
      const aExact = a.semester === pickerSem ? 0 : 1
      const bExact = b.semester === pickerSem ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return a.name.localeCompare(b.name)
    })

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-start justify-between bg-background/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-lg text-navy">
                Tambah Matkul ke Semester {pickerSem}
              </h3>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                  isOdd(pickerSem)
                    ? "bg-teal/15 text-navy border border-teal/30"
                    : "bg-gold/15 text-navy border border-gold/40",
                )}
              >
                {isOdd(pickerSem) ? "Semester Ganjil" : "Semester Genap"}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Menampilkan katalog matkul dengan periode{" "}
              <strong>{isOdd(pickerSem) ? "ganjil" : "genap"}</strong> sesuai
              aturan kurikulum FTMM.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 border-t border-border/40">
              <span className="text-xs text-muted font-medium">
                Beban SKS Sem {pickerSem}:
              </span>
              <span
                className={cn(
                  "font-mono font-bold text-xs px-2 py-0.5 rounded-md",
                  plannedSKS > 24
                    ? "bg-danger/15 text-danger border border-danger/30"
                    : plannedSKS >= 20
                      ? "bg-gold/15 text-navy border border-gold/30"
                      : "bg-teal/15 text-navy border border-teal/30",
                )}
              >
                {plannedSKS} / 24 SKS Direncanakan
              </span>
              {wishlistSKS > 0 && (
                <span className="text-xs font-mono text-muted bg-surface px-2 py-0.5 rounded-md border border-border">
                  +{wishlistSKS} SKS Wishlist
                </span>
              )}
              {activeReligion && (
                <span className="text-[10px] font-medium text-navy/80 bg-navy/8 border border-navy/15 px-2 py-0.5 rounded-md">
                  Agama Terpilih: <strong>{activeReligion}</strong>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-navy/5 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-border bg-surface space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Cari nama matkul atau kode (misal: Data, II40, Fisika)..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-teal/30 focus:border-teal text-foreground"
                autoFocus
              />
              {pickerSearch && (
                <button
                  type="button"
                  onClick={() => setPickerSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-navy cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Program Studi Selector */}
            <select
              aria-label="Filter Program Studi"
              value={pickerProgram}
              onChange={(e) => setPickerProgram(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-border bg-background text-navy font-medium focus:outline-hidden focus:ring-2 focus:ring-teal/30 focus:border-teal sm:w-[240px]"
            >
              <option value="all">Semua Program Studi</option>
              {availablePrograms.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter & Add Status Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Type Filter */}
            <div
              role="group"
              aria-label="Filter tipe mata kuliah"
              className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border"
            >
              {([
                {
                  key: "all",
                  label: "Semua Tipe",
                  count: basePool.length,
                },
                {
                  key: "Pilihan",
                  label: "Pilihan",
                  count: pilihanCount,
                },
                {
                  key: "Wajib",
                  label: `Wajib Sem ${pickerSem}`,
                  count: wajibCount,
                },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPickerType(t.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    pickerType === t.key
                      ? "bg-navy text-white shadow-2xs font-semibold"
                      : "text-muted hover:text-navy",
                  )}
                >
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.2 rounded-full",
                      pickerType === t.key
                        ? "bg-white/20 text-white"
                        : "bg-surface text-muted border border-border",
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Add Status Toggle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted text-[11px] font-medium">
                Tambahkan sebagai:
              </span>
              <div
                role="group"
                aria-label="Status penambahan mata kuliah"
                className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() => setPickerStatus("planned")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    pickerStatus === "planned"
                      ? "bg-gold text-navy shadow-2xs font-semibold"
                      : "text-muted hover:text-navy",
                  )}
                >
                  <Clock
                    className={cn(
                      "w-3.5 h-3.5",
                      pickerStatus === "planned" ? "text-navy" : "text-gold",
                    )}
                  />
                  Direncanakan
                </button>
                <button
                  type="button"
                  onClick={() => setPickerStatus("wishlist")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    pickerStatus === "wishlist"
                      ? "bg-navy text-white shadow-2xs font-semibold"
                      : "text-muted hover:text-navy",
                  )}
                >
                  <Bookmark
                    className={cn(
                      "w-3.5 h-3.5",
                      pickerStatus === "wishlist" ? "text-gold" : "text-muted",
                    )}
                  />
                  Wishlist
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Course List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {filtered.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-xl">
              <BookOpen className="w-8 h-8 text-muted/40 mb-2" />
              <p className="text-sm font-medium text-navy">
                Tidak ada mata kuliah yang cocok
              </p>
              <p className="text-xs text-muted mt-1">
                Coba ubah kata kunci pencarian, tipe matkul, atau ganti filter
                program studi.
              </p>
            </div>
          ) : (
            filtered.map((course) => {
              const placedInSem = placedMap.get(course.id)
              const isAlreadyPlaced = placedInSem !== undefined
              const courseReligion = getCourseReligion(course)
              const isReligionBlocked = Boolean(
                activeReligion &&
                  courseReligion &&
                  courseReligion !== "Umum" &&
                  courseReligion !== activeReligion,
              )
              return (
                <div
                  key={course.id}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                    isAlreadyPlaced
                      ? "bg-background/40 border-border/60 opacity-60"
                      : isReligionBlocked
                        ? "bg-background/40 border-border/60 opacity-55"
                        : "bg-surface border-border hover:border-gold/60 hover:shadow-2xs",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      {course.prodiAbbr && (
                        <span
                          className="font-mono text-[9px] font-bold text-white bg-navy px-1.5 py-0.5 rounded tracking-wide"
                          title={`Program: ${course.program}`}
                        >
                          {course.prodiAbbr}
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-bold text-navy bg-navy/8 px-1.5 py-0.5 rounded">
                        {course.code || course.id}
                      </span>
                      {course.category === "pdb_univ" && (
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                          PDB Univ
                        </span>
                      )}
                      {course.category === "pdb_saintek" && (
                        <span className="text-[9px] font-bold bg-teal/20 text-navy border border-teal/40 px-1.5 py-0.5 rounded">
                          PDB Saintek
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                          course.type === "Wajib"
                            ? "bg-navy/10 text-navy"
                            : "bg-gold/15 text-navy",
                        )}
                      >
                        {course.type}
                      </span>
                      <span className="text-[10px] text-muted font-mono">
                        {course.credits} SKS • Sem {course.semester}
                      </span>
                      {isReligionBlocked && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                          Terkunci: Agama {activeReligion}
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-foreground leading-tight truncate">
                      {course.name}
                    </h4>
                  </div>

                  <div className="flex-shrink-0">
                    {isAlreadyPlaced ? (
                      <span className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-muted bg-background border border-border flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-teal" />
                        Di Sem {placedInSem}
                      </span>
                    ) : isReligionBlocked ? (
                      <span
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted bg-background border border-border flex items-center gap-1"
                        title={`Sudah mengambil mata kuliah Agama ${activeReligion}. Maksimal 1 jenis agama per mahasiswa.`}
                      >
                        Agama Lain
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddCourse(course)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer",
                          pickerStatus === "wishlist"
                            ? "bg-surface text-navy border border-dashed border-navy/40 hover:bg-navy/5"
                            : "bg-navy text-white hover:bg-navy-light",
                        )}
                      >
                        {pickerStatus === "wishlist" ? (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-navy" />
                            Wishlist
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Tambah
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-5 border-t border-border bg-background flex justify-between items-center text-xs text-muted">
          <span>
            Tekan <strong>Esc</strong> atau klik di luar untuk menutup
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface font-medium text-navy transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
