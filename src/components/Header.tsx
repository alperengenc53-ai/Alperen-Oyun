import React from 'react';
import { Gamepad2, Search, Users, ShieldCheck, User } from 'lucide-react';
import { GameId, UserProfile } from '../types/game';
import { PresenceData } from '../utils/onlinePresence';
import { GAMES_DATA } from '../data/gamesData';

interface HeaderProps {
  onSelectGame: (gameId: GameId | null) => void;
  activeGame: GameId | null;
  currentUser: UserProfile;
  presenceData?: PresenceData;
  onOpenAccountModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectGame,
  activeGame,
  currentUser,
  presenceData,
  onOpenAccountModal,
}) => {
  const currentOnlineTotal = presenceData?.total || 1;
  const activeGameOnline = activeGame && presenceData?.counts ? (presenceData.counts[activeGame] ?? 0) : null;

  return (
    <header className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-b-2 border-amber-600 shadow-md">
      {/* Top Banner Diagram Indicator */}
      <div className="bg-amber-600/30 text-amber-950 text-[11px] font-mono font-bold tracking-wider uppercase text-center py-0.5 border-b border-amber-600/20">
        📐 HEADER (BAŞLIK) Alanı - Canlı Oyuncu & Hesap
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => onSelectGame(null)}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition transform border border-amber-400/40">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-950 drop-shadow-sm">
                OYUNDİYARI
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 font-extrabold uppercase tracking-wider">
                CANLI ÇOK OYUNCULU
              </span>
            </div>
            <p className="text-xs text-amber-950 font-medium hidden sm:block">
              8 Ball Pool 1v1 VS • Turbo Otoban • Snake.io Web Platformu
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs mx-2 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              type="text"
              placeholder="Oyun ara (8 Ball Pool, Snake, Otoban)..."
              className="w-full pl-10 pr-4 py-2 bg-amber-100/80 hover:bg-white focus:bg-white text-slate-900 placeholder:text-slate-600 text-sm rounded-lg border border-amber-600/30 focus:border-slate-900 focus:outline-none transition shadow-inner font-medium"
            />
          </div>
        </div>

        {/* Real Dynamic Online Count & Active Account (NO FAKE OR STATIC REGISTERED COUNTS) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Active Game Specific Online Count (if playing a game) */}
          {activeGame && (
            <div className="flex items-center gap-1.5 bg-slate-950 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs shadow font-mono">
              <span className="text-sm">{GAMES_DATA[activeGame]?.icon || '🎮'}</span>
              <span className="text-slate-300 font-bold hidden sm:inline">{GAMES_DATA[activeGame]?.title.split(':')[0]}:</span>
              <span className="font-black text-emerald-400">{activeGameOnline}</span>
              <span className="text-[10px] text-emerald-300 font-bold">Online</span>
            </div>
          )}

          {/* Real-time Total Online Badge */}
          <div className="flex items-center gap-2 bg-slate-950 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs shadow">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="font-mono flex items-center gap-1">
              <span className="font-black text-white">{currentOnlineTotal}</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Online</span>
            </div>
          </div>

          {/* Independent Game Wallets Display */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs shadow font-mono font-bold">
            <span className="text-xs font-sans text-slate-400">Cüzdanlar:</span>
            <span className="bg-slate-950 px-2 py-0.5 rounded text-[11px] text-sky-300 border border-slate-800" title="Turbo Otoban Cüzdanı">
              🏎️ {(currentUser.trafficCoins ?? 0).toLocaleString()} 🪙
            </span>
            <span className="bg-slate-950 px-2 py-0.5 rounded text-[11px] text-emerald-300 border border-slate-800" title="Snake.io Cüzdanı">
              🐍 {(currentUser.snakeCoins ?? 0).toLocaleString()} 🪙
            </span>
            <span className="bg-slate-950 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-slate-800" title="8 Ball Pool Cüzdanı">
              🎱 {(currentUser.poolCoins ?? 0).toLocaleString()} 🪙
            </span>
            <span className="bg-slate-950 px-2 py-0.5 rounded text-[11px] text-cyan-300 border border-slate-800" title="Cyber 3D Cüzdanı">
              🚀 {(currentUser.cyberCoins ?? 0).toLocaleString()} 🪙
            </span>
          </div>

          {/* User Profile Pill & Quick Account Open/Switch */}
          <button
            onClick={onOpenAccountModal}
            className="flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 border border-amber-400/40 text-white px-3 py-1.5 rounded-xl transition shadow hover:scale-[1.02] cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 text-base font-black flex items-center justify-center">
              {currentUser.avatar}
            </div>
            <div className="text-left">
              <div className="text-xs font-black text-amber-300 leading-tight flex items-center gap-1">
                <span>{currentUser.tag}</span>
                <span>{currentUser.username}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <span className="text-amber-400 font-bold">{currentUser.totalScore.toLocaleString()} Puan</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">Hesap / Giriş</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
