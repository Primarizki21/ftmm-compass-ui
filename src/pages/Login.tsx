import React, { useState } from 'react';
import { ArrowRight, Compass, Lock, Mail } from 'lucide-react';
import { cn } from '../utils';

// We'll use one of the new images as a background or side illustration
import bgImage from '../imports/image-4.png';
import newLogo from '../imports/image-6.png';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex bg-background font-sans">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-navy relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 z-0">
          <img 
            src={bgImage} 
            alt="University Campus" 
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-transparent" />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/30">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-gold tracking-wide">FTMM COMPASS</h1>
            <p className="text-xs text-teal-light uppercase tracking-wider font-mono">Academic Advisor</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-serif font-bold text-white leading-tight mb-6">
            Navigasi Perjalanan Akademikmu Bersama FTMM
          </h2>
          <p className="text-navy-light text-lg text-slate-300 mb-8">
            Platform penasihat akademik terpadu untuk mahasiswa Fakultas Teknologi Maju dan Multidisiplin Universitas Airlangga. Susun rencana studi, atur jadwal, dan capai target kelulusanmu.
          </p>
          <div className="flex gap-4 items-center">
            <img src={newLogo} alt="FTMM Logo" className="h-16 object-contain rounded-lg shadow-lg" />
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <img src={newLogo} alt="Logo" className="h-24 mx-auto mb-6 rounded-2xl shadow-sm lg:hidden" />
            <h2 className="text-3xl font-serif font-bold text-navy mb-2">Selamat Datang</h2>
            <p className="text-muted">Gunakan akun Cybercampus UNAIR untuk masuk</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">NIM / Email SSO</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input 
                  type="text"
                  required
                  placeholder="Masukkan NIM atau Email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Kata Sandi</label>
                <a href="#" className="text-xs text-navy font-medium hover:text-gold transition-colors">Lupa sandi?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input 
                  type="password"
                  required
                  placeholder="Masukkan Kata Sandi"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-navy hover:bg-navy-light text-white rounded-xl font-medium transition-all focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Masuk ke Dashboard <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} Fakultas Teknologi Maju dan Multidisiplin<br/>
              Universitas Airlangga
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}