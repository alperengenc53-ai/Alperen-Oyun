import React from 'react';
import { ExternalLink, Sparkles, Play, Shield, Zap, Users, Trophy } from 'lucide-react';
import { playSound } from '../utils/audio';

interface GameHubLiteAdPosterProps {
  className?: string;
  variant?: 'sidebar' | 'banner' | 'card';
}

export const GameHubLiteAdPoster: React.FC<GameHubLiteAdPosterProps> = ({
  className = '',
  variant = 'sidebar',
}) => {
  const AD_URL = 'https://erenpehlivanoyun.vercel.app/';

  const handleOpenSite = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound.click();
    window.open(AD_URL, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'banner') {
    return (
      <div
        onClick={handleOpenSite}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleOpenSite(e as any)}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-indigo-500/50 hover:border-amber-400 p-5 shadow-2xl transition duration-200 cursor-pointer group flex flex-col lg:flex-row items-center justify-between gap-5 ${className}`}
        title="GameHub Lite web oyun platformunu yeni sekmede aç (https://erenpehlivanoyun.vercel.app/)"
      >
        {/* Glowing Ambient Light */}
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition duration-500" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-sky-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition duration-500" />

        {/* Poster Left Info */}
        <div className="relative z-10 flex items-start gap-4 max-w-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 p-0.5 shadow-xl shrink-0 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-center">
              <span className="text-xl">🕹️</span>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">LITE</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow">
                <Sparkles className="w-3 h-3 fill-current" />
                ÖZEL SPONSOR AFİŞİ
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Çevrimiçi & 2 Kişilik
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-400 transition tracking-tight">
              GameHub Lite — Geometri Düellosu & Siber Kanat
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bölünmüş ekranda 2 kişilik sonsuz düello, Cube, Ship ve Wave modları, canlı Hexa Fetih stratejisi! Kayıt olmadan anında oyna.
            </p>

            {/* Badges matching screenshot */}
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 text-sky-300">
                <Shield className="w-3 h-3 text-emerald-400" /> 1.5s Koruma Kalkanı
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-300">
                <Zap className="w-3 h-3 text-amber-400" /> 1X / 2X / 3X Hız
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-indigo-300">
                <Users className="w-3 h-3 text-indigo-400" /> Solo & 2 Kişilik Denge
              </span>
            </div>
          </div>
        </div>

        {/* Poster Action CTA */}
        <div className="relative z-10 flex flex-col items-center sm:items-end gap-1.5 shrink-0">
          <button
            onClick={handleOpenSite}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 via-indigo-600 to-amber-500 hover:from-indigo-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer group-hover:scale-105"
          >
            <ExternalLink className="w-4 h-4 text-slate-950" />
            <span>Siteye Git</span>
          </button>
          <span className="text-[10px] font-mono text-indigo-300">
            https://erenpehlivanoyun.vercel.app/
          </span>
        </div>
      </div>
    );
  }

  // Vertical Sidebar Poster Mode (matches screenshot perfectly)
  return (
    <div
      onClick={handleOpenSite}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleOpenSite(e as any)}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-2 border-indigo-500/50 hover:border-amber-400 p-4 shadow-2xl transition duration-200 cursor-pointer group flex flex-col justify-between ${className}`}
      title="GameHub Lite web oyun platformunu yeni sekmede aç (https://erenpehlivanoyun.vercel.app/)"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition duration-500" />

      {/* Top Banner Tag */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-indigo-900/40">
        <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow">
          <Sparkles className="w-3 h-3 fill-current" />
          REKLAM AFİŞİ
        </span>
        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          160x600 / 300x600
        </span>
      </div>

      {/* Brand Header */}
      <div className="my-3 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/40 border border-indigo-400/50 flex items-center justify-center text-lg">
            🕹️
          </div>
          <div>
            <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition flex items-center gap-1">
              <span>GameHub Lite</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </h4>
            <span className="text-[10px] font-mono text-indigo-300">erenpehlivanoyun.vercel.app</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
          Hızlı, modern ve bağımlılık yapıcı web oyunları. Tek tıkla oyna!
        </p>
      </div>

      {/* Mini Visual Cards Representing the 3 Games from the User Screenshot */}
      <div className="space-y-1.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs shadow-inner">
        <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 hover:border-indigo-500 transition">
          <div className="flex items-center justify-between font-bold text-slate-200 text-[11px]">
            <span>🔷 01. Geometri Düellosu</span>
            <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1 rounded font-mono">1X/2X/3X</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
            Bölünmüş Ekran • 5 Can • Ship & Wave
          </p>
        </div>

        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500 transition">
          <div className="flex items-center justify-between font-bold text-slate-200 text-[11px]">
            <span>⚔️ 02. Hexa Fetih</span>
            <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded font-mono">Online</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
            Canlı Strateji • Bölge Fethet & Çoğal
          </p>
        </div>

        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500 transition">
          <div className="flex items-center justify-between font-bold text-slate-200 text-[11px]">
            <span>🦅 03. Siber Kanat</span>
            <span className="text-[9px] bg-rose-500/30 text-rose-300 px-1 rounded font-mono">Sonsuz</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
            Refleks & Uçuş • Lazer Sütunları
          </p>
        </div>
      </div>

      {/* Screenshot Perks */}
      <div className="my-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1 text-emerald-400">
          <Shield className="w-3 h-3" /> Koruma Kalkanı
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <Zap className="w-3 h-3" /> 1X-3X Hız
        </span>
      </div>

      {/* Big Action Button */}
      <button
        onClick={handleOpenSite}
        className="w-full py-2.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-amber-500 hover:from-indigo-400 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer group-hover:scale-[1.02]"
      >
        <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
        <span>Siteye Git</span>
      </button>

      <div className="text-[9px] text-slate-400 text-center mt-2 font-mono">
        🔗 https://oyun-self.vercel.app/
      </div>
    </div>
  );
};
