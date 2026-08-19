import React from 'react';
import { BookOpen, Clock, CheckCircle2, TrendingUp, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '../utils';
import { SCHEDULE } from '../data';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 7);

interface DashboardProps {
  onNavigate: (page: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const hasConflict = SCHEDULE.some(s => s.conflict);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Four Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SKS Ditempuh */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-light/10 rounded-full blur-2xl group-hover:bg-teal-light/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-teal" /> SKS Ditempuh
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-serif font-bold text-navy">84</span>
            <span className="text-muted text-xs mb-1">/ 144 SKS</span>
          </div>
          <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal h-full rounded-full transition-all" style={{ width: '58%' }} />
          </div>
          <p className="text-[10px] text-muted mt-1.5 font-mono">58% selesai</p>
        </div>

        {/* Semester Aktif */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gold" /> Semester Aktif
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-serif font-bold text-navy">5</span>
            <span className="text-muted text-xs mb-1">Ganjil 24/25</span>
          </div>
          <p className="text-[10px] text-muted mt-3 font-mono">Status: Aktif</p>
        </div>

        {/* Matkul Direncanakan */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-navy-light/5 rounded-full blur-2xl group-hover:bg-navy-light/10 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-navy-light" /> Direncanakan
          </h3>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-serif font-bold text-navy">7</span>
            <span className="text-muted text-xs mb-1">Matakuliah</span>
          </div>
          <p className="text-[10px] text-muted mt-3 font-mono">Total: 21 SKS</p>
        </div>

        {/* IPK Kumulatif */}
        <div className="bg-surface rounded-xl p-5 border border-border shadow-sm flex flex-col relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal/10 rounded-full blur-2xl group-hover:bg-teal/20 transition-colors" />
          <h3 className="text-muted text-xs font-medium mb-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-dark" /> IPK Kumulatif
          </h3>
          <div className="flex items-end gap-1.5 mt-2">
            <span className="text-3xl font-serif font-bold text-navy">3.75</span>
            <span className="text-muted text-xs mb-1">/ 4.00</span>
          </div>
          <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-teal h-full rounded-full" style={{ width: '93.75%' }} />
          </div>
          <p className="text-[10px] text-muted mt-1.5 font-mono">Predikat: Cumlaude</p>
        </div>
      </div>

      {/* Schedule Widget */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-navy" />
            <h3 className="font-serif font-bold text-lg text-navy">Jadwal Minggu Ini</h3>
            <span className="text-xs font-mono text-muted bg-background border border-border px-2 py-0.5 rounded">
              Ganjil 24/25 · Week 4
            </span>
            {hasConflict && (
              <span className="flex items-center gap-1 text-xs font-medium text-danger bg-danger/8 px-2 py-0.5 rounded-full border border-danger/20">
                <AlertTriangle className="w-3 h-3" /> Bentrok
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('degree-planner')}
            className="text-sm font-medium text-navy hover:text-gold transition-colors flex items-center gap-1"
          >
            Buka di Degree Planner <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timetable grid — same structure as TimetableBuilder */}
        <div className="overflow-auto" style={{ maxHeight: '420px' }}>
          <div className="min-w-[640px] flex flex-col">
            {/* Header Row */}
            <div className="flex border-b border-border bg-background/50 sticky top-0 z-20">
              <div className="w-14 border-r border-border flex-shrink-0" />
              {DAYS.map(day => (
                <div key={day} className="flex-1 p-2.5 text-center border-r border-border font-serif font-bold text-navy text-xs last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="flex relative">
              {/* Time Column */}
              <div className="w-14 border-r border-border flex flex-col flex-shrink-0 bg-background/50 sticky left-0 z-10">
                {HOURS.map(hour => (
                  <div key={hour} className="h-16 relative">
                    <span className="absolute -top-2 right-1.5 text-[10px] font-mono text-muted">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              <div className="flex-1 flex relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSI2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCA2NEgxMDAwMCIgc3Ryb2tlPSIjZTllY2VmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiLz48L3N2Zz4=')]">
                {DAYS.map(day => (
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
                          <span className="font-medium text-xs leading-tight mt-0.5 line-clamp-2">{item.course}</span>
                          <span className="text-[10px] mt-auto opacity-70">{item.room}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {hasConflict && (
          <div className="px-5 pb-5">
            <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-danger font-medium">Bentrok jadwal terdeteksi</p>
                <p className="text-xs text-danger/70 mt-0.5">
                  <span className="font-mono font-bold">II4042</span> Machine Learning dan{' '}
                  <span className="font-mono font-bold">II4045</span> Data Visualization bentrok Selasa 10:00–12:00
                </p>
              </div>
              <button
                onClick={() => onNavigate('degree-planner')}
                className="text-xs font-medium text-danger hover:underline flex-shrink-0 whitespace-nowrap"
              >
                Perbaiki &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
