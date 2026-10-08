import React from 'react';
import { Megaphone, Info, Sparkles, Mail, CheckCircle2 } from 'lucide-react';

export const RightSidebar: React.FC = () => {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
      {/* Schematic Indicator matching user drawing */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-center gap-1.5">
        <span>📐 SAĞ SİDEBAR</span>
        <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
          (Reklam Alanı)
        </span>
      </div>

      {/* Main Empty Ad Container 1: 300x250 Medium Rectangle */}
      <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center transition min-h-[260px] relative overflow-hidden group">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>

        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700 group-hover:scale-105 transition">
            <Megaphone className="w-5 h-5 text-amber-400/80" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest uppercase bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
              REKLAM ALANI
            </span>
            <h3 className="text-sm font-bold text-slate-200">
              300 x 250 Piksel
            </h3>
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
              Bu alan reklam ve sponsorluk içerikleri için şimdilik boş bırakılmıştır.
            </p>
          </div>

          <div className="mt-2 text-[11px] font-mono text-slate-500 border-t border-slate-800 pt-2 w-full">
            [ Boş Reklam Yuvası #1 ]
          </div>
        </div>
      </div>

      {/* Main Empty Ad Container 2: 300x600 Half-page Vertical Tower Banner */}
      <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-between text-center transition min-h-[380px] relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>

        <div className="relative z-10 w-full flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500" /> SPONSOR ALANI
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              MÜSAİT
            </span>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-slate-800/90 text-amber-400 flex items-center justify-center border border-slate-700 my-4 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-extrabold text-white">
              Dikey Kule Banner
            </h4>
            <div className="text-[11px] font-mono text-amber-400">
              300 x 600 Half-Page
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[210px]">
              Oyun markaları, espor ekipmanları ve turnuva sponsorlukları için ayrılmış reklam kutusu.
            </p>
          </div>
        </div>

        {/* Sponsor Contact Pill */}
        <div className="relative z-10 w-full mt-6 bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1">
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>Reklam & Sponsorluk</span>
          </div>
          <p className="text-[11px] text-slate-400">
            İletişim: <strong className="text-amber-400">reklam@oyundiyari.com</strong>
          </p>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Günlük 45.000+ Tekil Gösterim</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
