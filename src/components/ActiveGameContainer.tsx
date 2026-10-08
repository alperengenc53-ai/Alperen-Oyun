import React, { useState } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { PubgGame } from './games/PubgGame';
import { PaperMinecraftGame } from './games/PaperMinecraftGame';
import { TrafficGame } from './games/TrafficGame';
import { SnakeIoGame } from './games/SnakeIoGame';
import { ScoreboardWidget } from './ScoreboardWidget';
import { ExternalLink, ArrowLeft, Keyboard, Sparkles, Trophy, User } from 'lucide-react';
import { playSound } from '../utils/audio';

interface ActiveGameContainerProps {
  gameId: GameId;
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onBackToHome: () => void;
  onOpenStandalone: (gameId: GameId) => void;
}

export const ActiveGameContainer: React.FC<ActiveGameContainerProps> = ({
  gameId,
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onBackToHome,
  onOpenStandalone,
}) => {
  const game = GAMES_DATA[gameId];
  const [activeTab, setActiveTab] = useState<'game' | 'scoreboard'>('game');

  return (
    <div className="flex flex-col gap-5">
      {/* Schematic Indicator */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <span>📐 CONTENT (Sayfa İçeriğinin Yer Aldığı Alan)</span>
          <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
            Aktif Oyun: {game.title}
          </span>
        </div>
        <button
          onClick={onBackToHome}
          className="text-[11px] font-sans font-bold text-slate-900 hover:text-white bg-amber-500 hover:bg-slate-950 px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" /> Portala Dön
        </button>
      </div>

      {/* Game Mode Tabs: Oyunu Oyna vs Canlı Skorboard */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('game')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'game'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>🎮 OYUNU OYNA</span>
        </button>

        <button
          onClick={() => setActiveTab('scoreboard')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'scoreboard'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>CANLI SKORBOARD (EN YÜKSEK PUANLAR)</span>
        </button>
      </div>

      {/* Main Playable Game Viewport or Dedicated Scoreboard */}
      {activeTab === 'game' ? (
        <div>
          {gameId === 'pubg' && (
            <PubgGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={() => onOpenStandalone('pubg')}
            />
          )}
          {gameId === 'minecraft' && (
            <PaperMinecraftGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={() => onOpenStandalone('minecraft')}
            />
          )}
          {gameId === 'traffic' && (
            <TrafficGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={() => onOpenStandalone('traffic')}
            />
          )}
          {gameId === 'snake' && (
            <SnakeIoGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={() => onOpenStandalone('snake')}
            />
          )}
        </div>
      ) : (
        <ScoreboardWidget
          game={gameId}
          currentUser={currentUser}
          title={`${game.title.toUpperCase()} CANLI LİDER TABLOSU`}
        />
      )}

      {/* Game Meta & External Launch Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{game.icon}</span>
            <h2 className="text-xl font-black text-white">{game.title}</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${game.badgeColor}`}>
              {game.badge}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {game.description}
          </p>
        </div>

        {/* User request: "basınca yeni bir siteye atsın" buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onOpenStandalone(gameId);
              playSound.click();
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>YENİ SİTEDE / SEKMEDE AÇ</span>
          </button>
        </div>
      </div>

      {/* Controls & Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyboard Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Klavye & Fare Kontrolleri
            </h3>
          </div>

          <div className="space-y-2">
            {game.controls.map((ctrl, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs font-mono"
              >
                <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold border border-slate-700">
                  {ctrl.key}
                </span>
                <span className="text-slate-300 font-sans">{ctrl.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Features */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Oyunun Öne Çıkan Özellikleri
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {game.features.map((feat, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-slate-300"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
