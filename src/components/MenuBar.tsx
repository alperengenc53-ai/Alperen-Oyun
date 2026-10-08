import React from 'react';
import { Home, Crosshair, Pickaxe, Gauge, Trophy, Server, Flame, HelpCircle } from 'lucide-react';
import { GameId } from '../types/game';

interface MenuBarProps {
  activeGame: GameId | null;
  onSelectGame: (gameId: GameId | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  activeGame,
  onSelectGame,
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav className="w-full bg-slate-200 border-b border-slate-300 text-slate-800 shadow-sm sticky top-0 z-30">
      {/* Schematic Indicator */}
      <div className="bg-slate-300/80 text-slate-600 text-[10px] font-mono font-bold tracking-wider uppercase text-center py-0.5 border-b border-slate-300">
        📌 Menü Alanı
      </div>

      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 py-1.5 min-w-max">
          {/* Ana Sayfa */}
          <button
            onClick={() => {
              onSelectGame(null);
              setActiveTab('home');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGame === null && activeTab === 'home'
                ? 'bg-slate-900 text-amber-400 shadow'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </button>

          {/* PUBG */}
          <button
            onClick={() => {
              onSelectGame('pubg');
              setActiveTab('pubg');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGame === 'pubg'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-600" />
            <span>Oyuncak Savaşı</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          </button>

          {/* Paper Minecraft */}
          <button
            onClick={() => {
              onSelectGame('minecraft');
              setActiveTab('minecraft');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGame === 'minecraft'
                ? 'bg-emerald-600 text-white shadow font-black'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Pickaxe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paper Minecraft (Co-op)</span>
          </button>

          {/* Araba Oyunu */}
          <button
            onClick={() => {
              onSelectGame('traffic');
              setActiveTab('traffic');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGame === 'traffic'
                ? 'bg-sky-600 text-white shadow font-black'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-sky-600" />
            <span>Turbo Otoban (Araba)</span>
          </button>

          {/* Snake.io */}
          <button
            onClick={() => {
              onSelectGame('snake');
              setActiveTab('snake');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeGame === 'snake'
                ? 'bg-emerald-600 text-white shadow font-black'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-600" />
            <span>Snake.io (Yılan)</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Leaderboard */}
          <button
            onClick={() => {
              onSelectGame(null);
              setActiveTab('leaderboard');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-slate-900 text-amber-400 font-bold'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Canlı Skorboard</span>
          </button>

          {/* Servers */}
          <button
            onClick={() => {
              onSelectGame(null);
              setActiveTab('servers');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'servers'
                ? 'bg-slate-900 text-amber-400 font-bold'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-sky-500" />
            <span>Sunucular</span>
          </button>

          {/* Guide */}
          <button
            onClick={() => {
              onSelectGame(null);
              setActiveTab('guide');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-slate-900 text-amber-400 font-bold'
                : 'hover:bg-slate-300/80 text-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nasıl Oynanır?</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
