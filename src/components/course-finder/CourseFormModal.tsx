import { useState, useEffect } from "react"
import { X, BookPlus, Edit3, AlertCircle, Loader2 } from "lucide-react"
import { Course } from "../../data"
import { authService } from "../../services/authService"

interface CourseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (course: Course) => void
  initialCourse?: Course | null
  availablePrograms: string[]
}

export default function CourseFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialCourse,
  availablePrograms,
}: CourseFormModalProps) {
  const isEdit = Boolean(initialCourse)

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [program, setProgram] = useState("Teknologi Sains Data")
  const [credits, setCredits] = useState(3)
  const [semester, setSemester] = useState(1)
  const [term, setTerm] = useState<"ganjil" | "genap">("ganjil")
  const [type, setType] = useState<"Wajib" | "Pilihan">("Pilihan")
  const [desc, setDesc] = useState("")
  const [prereqInput, setPrereqInput] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (initialCourse) {
      setCode(initialCourse.code || initialCourse.id || "")
      setName(initialCourse.name || "")
      setProgram(initialCourse.program || "Teknologi Sains Data")
      setCredits(initialCourse.credits || 3)
      setSemester(initialCourse.semester || 1)
      setTerm(initialCourse.parity === "even" ? "genap" : "ganjil")
      setType(initialCourse.type === "Wajib" ? "Wajib" : "Pilihan")
      setDesc(initialCourse.desc || "")
      setPrereqInput(initialCourse.prerequisites?.join(", ") || "")
    } else {
      setCode("")
      setName("")
      setProgram("Teknologi Sains Data")
      setCredits(3)
      setSemester(1)
      setTerm("ganjil")
      setType("Pilihan")
      setDesc("")
      setPrereqInput("")
    }
    setErrorMessage(null)
  }, [initialCourse, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    const token = authService.getStoredToken()
    if (!token) {
      setErrorMessage("Sesi autentikasi telah berakhir. Silakan login kembali.")
      setIsLoading(false)
      return
    }

    const prereqs = prereqInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      if (isEdit && initialCourse) {
        const payload = {
          course_name: name,
          credits,
          recommended_semester: semester,
          term,
          course_type: type,
          description: desc,
          prerequisites: prereqs,
        }

        const courseId = initialCourse.code || initialCourse.id
        const res = await fetch(
          `/api/v1/admin/courses/${encodeURIComponent(courseId)}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        )

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(
            errData.detail ||
              errData.error?.message ||
              "Gagal memperbarui mata kuliah",
          )
        }

        const saved: Course = await res.json()
        onSuccess(saved)
        onClose()
      } else {
        const payload = {
          course_code: code.trim().toUpperCase(),
          course_name: name.trim(),
          program_name: program,
          credits,
          recommended_semester: semester,
          term,
          course_type: type,
          description: desc,
          prerequisites: prereqs,
        }

        const res = await fetch("/api/v1/admin/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(
            errData.detail ||
              errData.error?.message ||
              "Gagal menambahkan mata kuliah",
          )
        }

        const created: Course = await res.json()
        onSuccess(created)
        onClose()
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan pada server",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-border shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold/15 text-navy">
              {isEdit ? (
                <Edit3 className="w-5 h-5 text-navy" />
              ) : (
                <BookPlus className="w-5 h-5 text-navy" />
              )}
            </div>
            <div>
              <h3
                id="course-modal-title"
                className="font-heading font-bold text-lg text-navy"
              >
                {isEdit ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}
              </h3>
              <p className="text-xs text-muted">
                {isEdit
                  ? `Perbarui metadata mata kuliah ${initialCourse?.code}`
                  : "Daftarkan mata kuliah baru ke dalam master kurikulum prodi"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-navy hover:bg-background transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-orange/10 border border-orange/30 text-orange text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="course-code"
                className="block text-xs font-semibold text-navy"
              >
                Kode MK *
              </label>
              <input
                id="course-code"
                type="text"
                required
                disabled={isEdit}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TSD401"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono uppercase text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors disabled:opacity-60"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label
                htmlFor="course-name"
                className="block text-xs font-semibold text-navy"
              >
                Nama Mata Kuliah *
              </label>
              <input
                id="course-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pengenalan Pemrosesan Teks"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="course-program"
                className="block text-xs font-semibold text-navy"
              >
                Program Studi
              </label>
              <select
                id="course-program"
                disabled={isEdit}
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors disabled:opacity-60"
              >
                {availablePrograms
                  .filter((p) => p !== "all")
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="course-credits"
                  className="block text-xs font-semibold text-navy"
                >
                  Bobot SKS
                </label>
                <select
                  id="course-credits"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
                >
                  {[1, 2, 3, 4, 6].map((cr) => (
                    <option key={cr} value={cr}>
                      {cr} SKS
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="course-sem"
                  className="block text-xs font-semibold text-navy"
                >
                  Semester
                </label>
                <select
                  id="course-sem"
                  value={semester}
                  onChange={(e) => {
                    const s = Number(e.target.value)
                    setSemester(s)
                    setTerm(s % 2 === 1 ? "ganjil" : "genap")
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="course-term"
                className="block text-xs font-semibold text-navy"
              >
                Term / Paritas
              </label>
              <select
                id="course-term"
                value={term}
                onChange={(e) => setTerm(e.target.value as "ganjil" | "genap")}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
              >
                <option value="ganjil">Ganjil (Odd)</option>
                <option value="genap">Genap (Even)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="course-type"
                className="block text-xs font-semibold text-navy"
              >
                Sifat Mata Kuliah
              </label>
              <select
                id="course-type"
                value={type}
                onChange={(e) => setType(e.target.value as "Wajib" | "Pilihan")}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
              >
                <option value="Wajib">Wajib (Compulsory)</option>
                <option value="Pilihan">Pilihan (Elective)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="course-prereqs"
              className="block text-xs font-semibold text-navy"
            >
              Prasyarat (Pisahkan dengan koma)
            </label>
            <input
              id="course-prereqs"
              type="text"
              value={prereqInput}
              onChange={(e) => setPrereqInput(e.target.value)}
              placeholder="Contoh: Matematika I, Dasar Pemrograman"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="course-desc"
              className="block text-xs font-semibold text-navy"
            >
              Deskripsi Silabus / CPMK
            </label>
            <textarea
              id="course-desc"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan ringkasan materi, capaian pembelajaran lulusan, atau topik utama..."
              className="w-full p-3 rounded-xl border border-border bg-background text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold outline-hidden transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-navy hover:bg-background transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim() || !name.trim()}
              className="px-5 py-2 rounded-xl bg-navy text-gold text-xs font-semibold hover:bg-navy-light transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isEdit ? "Simpan Perubahan" : "Tambahkan Mata Kuliah"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
