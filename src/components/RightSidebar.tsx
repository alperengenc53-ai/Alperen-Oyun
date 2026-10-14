import React from 'react';
import { GameHubLiteAdPoster } from './GameHubLiteAdPoster';
import { Trophy, ExternalLink } from 'lucide-react';
import { playSound } from '../utils/audio';

export const RightSidebar: React.FC = () => {
  const AD_TARGET_URL = 'https://oyun-self.vercel.app/';

  const handleOpenAdSite = () => {
    playSound.click();
    window.open(AD_TARGET_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
      {/* Schematic Indicator matching user drawing */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-center gap-1.5">
        <span>📐 SAĞ SİDEBAR</span>
        <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
          (Sponsorlu Reklam Afişi)
        </span>
      </div>

      {/* USER REQUESTED AD POSTER: GameHub Lite (https://oyun-self.vercel.app/) */}
      <GameHubLiteAdPoster variant="sidebar" />

      {/* Second Ad Banner: Tournament & Duel Box */}
      <div
        onClick={handleOpenAdSite}
        className="bg-slate-900/90 border-2 border-slate-800 hover:border-amber-400/80 rounded-2xl p-4 flex flex-col justify-between text-left transition cursor-pointer group relative overflow-hidden shadow-lg"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1 font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            2 KİŞİLİK DÜELLO
          </span>
          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            SPONSOR
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-black text-white group-hover:text-amber-400 transition">
            Geometri Düellosu & Siber Kanat
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            GameHub Lite platformunda bölünmüş ekranda arkadaşınla 2 kişilik sonsuz düello modunu ücretsiz dene!
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-amber-400 font-bold text-[11px] font-mono">oyun-self.vercel.app</span>
          <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition flex items-center gap-1">
            <span>Siteye Git</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </aside>
  );
};
