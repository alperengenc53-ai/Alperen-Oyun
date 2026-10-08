import React from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { PubgGame } from './games/PubgGame';
import { PaperMinecraftGame } from './games/PaperMinecraftGame';
import { TrafficGame } from './games/TrafficGame';
import { SnakeIoGame } from './games/SnakeIoGame';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { playSound } from '../utils/audio';

interface StandaloneGameViewProps {
  gameId: GameId;
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onBackToPortal: () => void;
}

export const StandaloneGameView: React.FC<StandaloneGameViewProps> = ({
  gameId,
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onBackToPortal,
}) => {
  const game = GAMES_DATA[gameId];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Standalone Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playSound.click();
              onBackToPortal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ana Portala Geri Dön</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="font-black text-white text-sm sm:text-base tracking-wide">
              {game.title} - Bağımsız Oyun Sayfası
            </span>
          </div>
        </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
              Fan Web Oyunu
            </span>
          </div>
      </header>

      {/* Main Game Screen */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {gameId === 'pubg' && (
          <PubgGame
            currentUser={currentUser}
            onOpenAccountModal={onOpenAccountModal}
            onProfileUpdated={onProfileUpdated}
          />
        )}
        {gameId === 'minecraft' && (
          <PaperMinecraftGame
            currentUser={currentUser}
            onOpenAccountModal={onOpenAccountModal}
            onProfileUpdated={onProfileUpdated}
          />
        )}
        {gameId === 'traffic' && (
          <TrafficGame
            currentUser={currentUser}
            onOpenAccountModal={onOpenAccountModal}
            onProfileUpdated={onProfileUpdated}
          />
        )}
        {gameId === 'snake' && (
          <SnakeIoGame
            currentUser={currentUser}
            onOpenAccountModal={onOpenAccountModal}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </main>
    </div>
  );
};
