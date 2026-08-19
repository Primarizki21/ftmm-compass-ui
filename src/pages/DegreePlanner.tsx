import React, { useState, useEffect } from 'react';
import { GripVertical, CheckCircle2, Clock, AlertTriangle, BookOpen, Lock, X, Calendar } from 'lucide-react';
import { cn } from '../utils';
import { Course, SCHEDULE } from '../data';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const TIMETABLE_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const TIMETABLE_HOURS = Array.from({ length: 10 }, (_, i) => i + 7);

interface PlacedCourse extends Course {
  status: 'completed' | 'planned' | 'wishlist';
}

const INITIAL_PLAN: Record<number, PlacedCourse[]> = {
  1: [
    { id: 'MA1101', name: 'Matematika I', credits: 4, semester: 1, type: 'Wajib', desc: '', parity: 'odd', status: 'completed' },
    { id: 'FI1101', name: 'Fisika Dasar I', credits: 4, semester: 1, type: 'Wajib', desc: '', parity: 'odd', status: 'completed' },
  ],
  2: [
    { id: 'MA1201', name: 'Matematika II', credits: 4, semester: 2, type: 'Wajib', desc: '', parity: 'even', status: 'completed' },
    { id: 'IF1210', name: 'Dasar Pemrograman', credits: 3, semester: 2, type: 'Wajib', desc: '', parity: 'even', status: 'completed' },
  ],
  5: [
    { id: 'II4042', name: 'Machine Learning', credits: 3, semester: 5, type: 'Wajib', desc: '', parity: 'odd', status: 'planned' },
    { id: 'II4045', name: 'Data Visualization', credits: 3, semester: 5, type: 'Pilihan', desc: '', parity: 'odd', status: 'planned' },
  ],
  6: [
    { id: 'II4050', name: 'Deep Learning', credits: 3, semester: 6, type: 'Pilihan', desc: '', parity: 'even', status: 'wishlist' },
  ],
};

// A course is locked if it's Wajib or already completed
const isLocked = (c: PlacedCourse) => c.type === 'Wajib' || c.status === 'completed';

interface DegreePlannerProps {
  pendingCourses: Course[];
  setPendingCourses: React.Dispatch<React.SetStateAction<Course[]>>;
}

type SemesterState = 'idle' | 'valid-hover' | 'invalid' | 'invalid-hover';
type Tab = 'roadmap' | 'timetable';

export default function DegreePlanner({ pendingCourses, setPendingCourses }: DegreePlannerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('roadmap');
  const [plan, setPlan] = useState<Record<number, PlacedCourse[]>>(INITIAL_PLAN);
  const [dragging, setDragging] = useState<{ course: PlacedCourse; fromSem: number | 'bank' } | null>(null);
  const [hoverSem, setHoverSem] = useState<number | null>(null);

  // Auto-place Wajib courses into their designated semester; Pilihan stays in bank
  useEffect(() => {
    const wajibCourses = pendingCourses.filter(c => c.type === 'Wajib');
    if (wajibCourses.length === 0) return;

    setPlan(prev => {
      const next = { ...prev };
      wajibCourses.forEach(course => {
        const sem = course.semester;
        if (!next[sem]) next[sem] = [];
        if (!next[sem].find(c => c.id === course.id)) {
          next[sem] = [...next[sem], { ...course, status: 'planned' }];
        }
      });
      return next;
    });
    setPendingCourses(prev => prev.filter(c => c.type !== 'Wajib'));
  }, [pendingCourses]);

  const isOdd = (sem: number) => sem % 2 === 1;

  const canDrop = (course: Course, sem: number): boolean => {
    if (course.parity === 'odd' && !isOdd(sem)) return false;
    if (course.parity === 'even' && isOdd(sem)) return false;
    return true;
  };

  const semState = (sem: number): SemesterState => {
    if (!dragging) return 'idle';
    const valid = canDrop(dragging.course, sem);
    const hovering = hoverSem === sem;
    if (!valid) return hovering ? 'invalid-hover' : 'invalid';
    return hovering ? 'valid-hover' : 'idle';
  };

  const handleDragStart = (e: React.DragEvent, course: PlacedCourse, from: number | 'bank') => {
    setDragging({ course, fromSem: from });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sem: number) => {
    if (!dragging) return;
    if (canDrop(dragging.course, sem)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
    setHoverSem(sem);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setHoverSem(null);
    }
  };

  const handleDrop = (e: React.DragEvent, sem: number) => {
    e.preventDefault();
    if (!dragging || !canDrop(dragging.course, sem)) return;

    const { course, fromSem } = dragging;

    if (fromSem === 'bank') {
      setPendingCourses(prev => prev.filter(c => c.id !== course.id));
    } else {
      setPlan(prev => ({
        ...prev,
        [fromSem]: (prev[fromSem] || []).filter(c => c.id !== course.id),
      }));
    }

    setPlan(prev => ({
      ...prev,
      [sem]: [...(prev[sem] || []), { ...course, status: 'planned' }],
    }));

    setDragging(null);
    setHoverSem(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setHoverSem(null);
  };

  const deleteCourse = (courseId: string, sem: number) => {
    setPlan(prev => ({
      ...prev,
      [sem]: (prev[sem] || []).filter(c => c.id !== courseId),
    }));
  };

  const pilihanPending = pendingCourses.filter(c => c.type === 'Pilihan');

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4 bg-background p-1 rounded-xl border border-border w-fit flex-shrink-0">
        {([
          { key: 'roadmap', label: 'Roadmap Studi', icon: BookOpen },
          { key: 'timetable', label: 'Jadwal Aktif', icon: Calendar },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-navy text-white shadow-sm"
                  : "text-muted hover:text-navy"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB: Roadmap Studi ─── */}
      {activeTab === 'roadmap' && (
        <>
          <div className="mb-4 flex justify-between items-end flex-shrink-0">
            <div>
              <h3 className="font-serif font-bold text-lg text-navy mb-1">Rencana Studi (Roadmap)</h3>
              <p className="text-sm text-muted">
                Matkul <span className="font-medium text-navy">Wajib</span> otomatis terkunci di semesternya.
                Matkul <span className="font-medium text-navy">Pilihan</span> dapat dipindah-pindah.
              </p>
            </div>
            <div className="flex gap-4">
              {[
                { el: <div className="w-3 h-3 rounded-full bg-teal" />, label: 'Selesai' },
                { el: <div className="w-3 h-3 rounded-full bg-gold" />, label: 'Direncanakan' },
                { el: <div className="w-3 h-3 rounded-full border-2 border-dashed border-muted" />, label: 'Wishlist' },
                { el: <Lock className="w-3 h-3 text-muted" />, label: 'Terkunci' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs">
                  {l.el}
                  <span className="text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drag hint */}
          {dragging && (
            <div className="mb-3 p-3 bg-navy/5 border border-navy/15 rounded-lg flex items-center gap-3 text-sm flex-shrink-0 animate-in fade-in duration-150">
              <GripVertical className="w-4 h-4 text-navy/40" />
              <span className="text-navy">
                <strong>{dragging.course.name}</strong> — hanya bisa di semester{' '}
                <strong className={dragging.course.parity === 'odd' ? 'text-teal-dark' : 'text-gold-hover'}>
                  {dragging.course.parity === 'odd' ? 'ganjil (1, 3, 5, 7)' : 'genap (2, 4, 6, 8)'}
                </strong>
              </span>
            </div>
          )}

          {/* Semester Columns */}
          <div className="flex-1 overflow-x-auto pb-1 min-h-0">
            <div className="flex gap-4 min-w-max h-full">
              {SEMESTERS.map(sem => {
                const courses = plan[sem] || [];
                const totalSKS = courses.reduce((acc, c) => acc + c.credits, 0);
                const state = semState(sem);
                const odd = isOdd(sem);

                return (
                  <div
                    key={sem}
                    className={cn(
                      "w-[256px] rounded-xl flex flex-col flex-shrink-0 border transition-all duration-150",
                      state === 'idle' && "bg-background border-border",
                      state === 'valid-hover' && "bg-teal/5 border-teal ring-2 ring-teal/25 shadow-lg",
                      state === 'invalid' && "bg-foreground/3 border-border/70 opacity-55",
                      state === 'invalid-hover' && "bg-danger/5 border-danger/40"
                    )}
                    onDragOver={(e) => handleDragOver(e, sem)}
                    onDrop={(e) => handleDrop(e, sem)}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Header */}
                    <div className={cn(
                      "p-3 border-b rounded-t-xl flex justify-between items-center transition-colors",
                      state === 'valid-hover' ? "bg-teal/10 border-teal/30" : "bg-surface border-border",
                    )}>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-navy text-sm">Semester {sem}</h4>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                          odd ? "bg-teal/10 text-teal-dark" : "bg-gold/10 text-gold-hover"
                        )}>
                          {odd ? 'Ganjil' : 'Genap'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted bg-background px-2 py-0.5 rounded">
                        {totalSKS} SKS
                      </span>
                    </div>

                    {/* Invalid warning */}
                    {(state === 'invalid' || state === 'invalid-hover') && dragging && (
                      <div className={cn(
                        "mx-2 mt-2 p-2 rounded-lg flex items-center gap-1.5 text-[11px] font-medium",
                        state === 'invalid-hover'
                          ? "bg-danger/10 text-danger border border-danger/25"
                          : "bg-muted/8 text-muted"
                      )}>
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Hanya semester {dragging.course.parity === 'odd' ? 'ganjil' : 'genap'}
                      </div>
                    )}

                    {/* Course cards */}
                    <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]">
                      {courses.map(course => {
                        const locked = isLocked(course);
                        return (
                          <div
                            key={course.id}
                            draggable={!locked}
                            onDragStart={!locked ? (e) => handleDragStart(e, course, sem) : undefined}
                            onDragEnd={!locked ? handleDragEnd : undefined}
                            className={cn(
                              "p-3 rounded-lg border bg-surface flex gap-2 group transition-shadow hover:shadow-md select-none relative",
                              locked ? "cursor-default" : "cursor-move hover:cursor-move",
                              course.status === 'completed' && "border-teal-light/50",
                              course.status === 'planned' && !locked && "border-gold/50",
                              course.status === 'planned' && locked && "border-navy/20",
                              course.status === 'wishlist' && "border-dashed border-border"
                            )}
                          >
                            {/* Left icon: grip for draggable, lock for locked */}
                            <div className="flex-shrink-0 mt-0.5 w-4">
                              {locked ? (
                                <Lock className="w-3.5 h-3.5 text-muted/50" />
                              ) : (
                                <GripVertical className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-[10px] font-bold text-navy leading-none">{course.id}</span>
                                {course.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-teal flex-shrink-0" />}
                                {course.status === 'planned' && locked && <Lock className="w-3 h-3 text-muted/60 flex-shrink-0" />}
                                {course.status === 'planned' && !locked && <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
                              </div>
                              <h5 className="font-medium text-xs leading-tight text-foreground">{course.name}</h5>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-muted">{course.credits} SKS</span>
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded",
                                  course.type === 'Wajib' ? "bg-navy/8 text-navy/70" : "bg-gold/10 text-gold-hover"
                                )}>
                                  {course.type}
                                </span>
                              </div>
                            </div>

                            {/* Delete button — only for non-locked courses */}
                            {!locked && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteCourse(course.id, sem); }}
                                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-background border border-border text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/30 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {courses.length === 0 && (
                        <div className={cn(
                          "h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-3 text-center transition-colors",
                          state === 'valid-hover'
                            ? "border-teal/50 bg-teal/5 text-teal-dark"
                            : "border-border text-muted"
                        )}>
                          <p className="text-xs">
                            {state === 'valid-hover' ? "Lepaskan di sini" : "Tarik matkul ke sini"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-border bg-surface rounded-b-xl flex-shrink-0">
                      <button className="w-full py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded border border-dashed border-navy/20 transition-colors">
                        + Tambah Manual
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Course Bank — only Pilihan */}
          {pilihanPending.length > 0 && (
            <div className="border-t border-border pt-4 mt-3 flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-4 h-4 text-navy" />
                <h4 className="font-serif font-bold text-sm text-navy">Bank Matkul Pilihan</h4>
                <span className="text-xs font-mono text-muted bg-background border border-border px-2 py-0.5 rounded">
                  {pilihanPending.length} matkul
                </span>
                <p className="text-xs text-muted">— Tarik ke semester yang sesuai</p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {pilihanPending.map(course => (
                  <div
                    key={course.id}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, { ...course, status: 'planned' } as PlacedCourse, 'bank')
                    }
                    onDragEnd={handleDragEnd}
                    className="bg-surface rounded-xl border border-gold/40 p-3 cursor-move flex-shrink-0 w-[196px] group hover:shadow-md hover:border-gold transition-all select-none"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-teal">{course.id}</span>
                      <GripVertical className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h5 className="font-medium text-xs text-navy leading-tight">{course.name}</h5>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted">{course.credits} SKS</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ml-auto",
                        course.parity === 'odd' ? "bg-teal/10 text-teal-dark" : "bg-gold/10 text-gold-hover"
                      )}>
                        {course.parity === 'odd' ? 'Ganjil' : 'Genap'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Jadwal Aktif ─── */}
      {activeTab === 'timetable' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Conflict banner */}
          {SCHEDULE.some(s => s.conflict) && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex items-start gap-3 mb-5 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-danger">Terdeteksi Bentrok Jadwal</h4>
                <p className="text-sm text-danger/80 mt-1">
                  <strong>II4042 Machine Learning</strong> dan <strong>II4045 Data Visualization</strong> bentrok pada hari Selasa jam 10:00 – 12:00.
                </p>
              </div>
              <button className="text-sm font-medium text-danger hover:underline flex-shrink-0">Lihat Alternatif</button>
            </div>
          )}

          <div className="mb-4 flex justify-between items-end flex-shrink-0">
            <div>
              <h3 className="font-serif font-bold text-lg text-navy">Jadwal Mingguan</h3>
              <p className="text-sm text-muted">Semester Ganjil 2024/2025</p>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="flex-1 bg-surface border border-border rounded-xl shadow-sm overflow-auto relative">
            <div className="min-w-[800px] h-full flex flex-col">
              {/* Header Row */}
              <div className="flex border-b border-border bg-background/50 sticky top-0 z-20">
                <div className="w-16 border-r border-border flex-shrink-0" />
                {TIMETABLE_DAYS.map(day => (
                  <div key={day} className="flex-1 p-3 text-center border-r border-border font-serif font-bold text-navy text-sm last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="flex-1 flex relative">
                {/* Time Column */}
                <div className="w-16 border-r border-border flex flex-col flex-shrink-0 bg-background/50 sticky left-0 z-10">
                  {TIMETABLE_HOURS.map(hour => (
                    <div key={hour} className="h-16 relative">
                      <span className="absolute -top-2.5 right-2 text-xs font-mono text-muted">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                <div className="flex-1 flex relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2NEgxMDAwMCIgc3Ryb2tlPSIjZTllY2VmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
                  {TIMETABLE_DAYS.map(day => (
                    <div key={day} className="flex-1 border-r border-border/50 last:border-r-0 relative">
                      {SCHEDULE.filter(s => s.day === day).map(item => {
                        const top = (item.start - 7) * 64;
                        const height = item.duration * 64;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "absolute left-1 right-1 rounded-md p-2 border shadow-sm flex flex-col overflow-hidden",
                              item.color,
                              item.conflict && "border-danger border-dashed bg-danger/10 z-10 animate-pulse"
                            )}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            {item.conflict && (
                              <div className="absolute top-1 right-1 text-danger">
                                <AlertTriangle className="w-3 h-3" />
                              </div>
                            )}
                            <span className="font-mono text-xs font-bold opacity-80">{item.code}</span>
                            <span className="font-medium text-sm leading-tight mt-0.5 line-clamp-2">{item.course}</span>
                            <span className="text-xs mt-auto opacity-70">{item.room}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
