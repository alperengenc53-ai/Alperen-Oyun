import React, { useState, useEffect } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { EightBallPoolGame } from './games/EightBallPoolGame';
import { TrafficGame } from './games/TrafficGame';
import { SnakeIoGame } from './games/SnakeIoGame';

import { ScoreboardWidget } from './ScoreboardWidget';
import { PresenceData } from '../utils/onlinePresence';
import { ExternalLink, ArrowLeft, Keyboard, Sparkles, Trophy, User, Minimize2, Maximize2 } from 'lucide-react';
import { playSound } from '../utils/audio';

interface ActiveGameContainerProps {
  gameId: GameId;
  currentUser: UserProfile;
  presenceData?: PresenceData;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onBackToHome: () => void;
  autoFullscreen?: boolean;
}

export const ActiveGameContainer: React.FC<ActiveGameContainerProps> = ({
  gameId,
  currentUser,
  presenceData,
  onOpenAccountModal,
  onProfileUpdated,
  onBackToHome,
  autoFullscreen = false,
}) => {
  const game = GAMES_DATA[gameId] || GAMES_DATA['pool'] || GAMES_DATA['snake'];
  const [activeTab, setActiveTab] = useState<'game' | 'scoreboard'>('game');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(autoFullscreen);
  const liveCount = presenceData?.counts?.[gameId] ?? 0;

  useEffect(() => {
    if (autoFullscreen) {
      setIsFullscreen(true);
    }
  }, [autoFullscreen]);

  // Seamless Fullscreen toggle (never navigates away!)
  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    if (next && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!next && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    playSound.click();
  };

  // Exit fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-slate-950 p-1 sm:p-3 flex flex-col items-center justify-between w-screen h-screen overflow-hidden'
          : 'flex flex-col gap-5 w-full'
      }
    >
      {/* Floating Exit Fullscreen Button when in Fullscreen */}
      {isFullscreen && (
        <div className="fixed top-3 right-4 z-[10000] flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-2xl transition cursor-pointer border-2 border-amber-300 animate-pulse"
            title="Normal görünüme dön (ESC)"
          >
            <Minimize2 className="w-4 h-4" />
            <span>🗗 EKRANDAN ÇIK (KÜÇÜLT) [ESC]</span>
          </button>
        </div>
      )}

      {/* Schematic Indicator */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-2">
          <span>📐 CONTENT (Oyun Alanı)</span>
          <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
            Aktif Oyun: {game.title}
          </span>
          <span className="text-[10px] bg-slate-950 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${liveCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            Canlı: {liveCount} Online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="text-[11px] font-sans font-bold text-slate-950 hover:bg-slate-900 hover:text-amber-300 bg-amber-300 px-2.5 py-0.5 rounded transition flex items-center gap-1 cursor-pointer border border-amber-600 shadow-sm"
          >
            {isFullscreen ? '🗗 Ekranı Küçült' : '🗖 Ekranı Büyüt (Tam Ekran)'}
          </button>
          {!isFullscreen && (
            <button
              onClick={onBackToHome}
              className="text-[11px] font-sans font-bold text-slate-900 hover:text-white bg-amber-500 hover:bg-slate-950 px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Portala Dön
            </button>
          )}
        </div>
      </div>

      {/* Game Mode Tabs: Oyunu Oyna vs Canlı Skorboard & Tam Ekran Butonu */}
      <div className="flex items-center justify-between gap-2 flex-wrap w-full">
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

        <button
          onClick={toggleFullscreen}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border shadow-sm ${
            isFullscreen
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-slate-800 hover:text-white'
          }`}
          title="Tüm ekranı kapla veya orijinal boyuta dön"
        >
          <span>{isFullscreen ? '🗗 EKRANI KÜÇÜLT' : '🗖 EKRANI BÜYÜT (TAM EKRAN)'}</span>
        </button>
      </div>

      {/* Main Playable Game Viewport or Dedicated Scoreboard */}
      {activeTab === 'game' ? (
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {gameId === 'pool' && (
            <EightBallPoolGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={toggleFullscreen}
            />
          )}
          {gameId === 'traffic' && (
            <TrafficGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={toggleFullscreen}
            />
          )}
          {gameId === 'snake' && (
            <SnakeIoGame
              currentUser={currentUser}
              onOpenAccountModal={onOpenAccountModal}
              onProfileUpdated={onProfileUpdated}
              onFullscreenRequest={toggleFullscreen}
            />
          )}

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl w-full">
          <ScoreboardWidget
            game={gameId}
            currentUser={currentUser}
            title={`${game.title.toUpperCase()} CANLI LİDER TABLOSU`}
          />
        </div>
      )}

      {/* Game Meta Info Bar (Only when not in fullscreen) */}
      {!isFullscreen && (
        <>
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>OYUNU TAM EKRAN BÜYÜT</span>
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
      </>
      )}
    </div>
  );
};
