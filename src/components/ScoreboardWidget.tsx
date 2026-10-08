import React, { useState, useEffect } from 'react';
import { UserProfile, ScoreboardPlayer } from '../types/game';
import { getRealScoreboard, onPlayersSync } from '../utils/playerRegistry';
import { Trophy, RefreshCw, Users } from 'lucide-react';
import { playSound } from '../utils/audio';

interface ScoreboardWidgetProps {
  game: 'pubg' | 'traffic' | 'snake' | 'minecraft';
  currentUser?: UserProfile;
  currentUserId?: string;
  title?: string;
}

export const ScoreboardWidget: React.FC<ScoreboardWidgetProps> = ({
  game,
  currentUser,
  currentUserId,
  title,
}) => {
  const [leaderboard, setLeaderboard] = useState<ScoreboardPlayer[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeUserId = currentUserId || currentUser?.id || '';

  const reloadBoard = () => {
    setIsRefreshing(true);
    setLeaderboard(getRealScoreboard(game));
    setTimeout(() => setIsRefreshing(false), 200);
  };

  useEffect(() => {
    reloadBoard();
    const unsub = onPlayersSync(reloadBoard);
    const interval = setInterval(reloadBoard, 4000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [game, currentUser]);

  const gameTitles: Record<string, { label: string; icon: string; color: string }> = {
    pubg: { label: 'PUBG REKABETÇİ CANLI SKORBOARD', icon: '🎯', color: 'text-amber-400' },
    minecraft: { label: 'PAPER MINECRAFT CANLI SKORBOARD', icon: '⛏️', color: 'text-emerald-400' },
    traffic: { label: 'TURBO OTOBAN CANLI SKORBOARD', icon: '🏎️', color: 'text-sky-400' },
    snake: { label: 'SNAKE.IO ARENA CANLI SKORBOARD', icon: '🐍', color: 'text-emerald-400' },
  };

  const meta = gameTitles[game] || gameTitles.pubg;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <h3 className={`text-xs font-black tracking-wider uppercase ${meta.color}`}>
              {title || meta.label}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Siteye Kayıtlı Gerçek Oyuncuların Skorları
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {leaderboard.length} Oyuncu
          </span>
          <button
            onClick={() => {
              reloadBoard();
              playSound.click();
            }}
            title="Yenile"
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real Players Leaderboard List */}
      <div className="p-3 space-y-1.5 max-h-[380px] overflow-y-auto font-mono text-xs">
        {leaderboard.map((item) => {
          const isMe = item.id === activeUserId;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                isMe
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-500/10 text-white font-bold'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                    item.rank === 1
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : item.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.rank}
                </span>

                <span className="text-base">{item.avatar}</span>

                <div>
                  <div className="flex items-center gap-1.5">
                    {item.tag && (
                      <span className="text-[10px] text-amber-400 font-bold">
                        {item.tag}
                      </span>
                    )}
                    <span className={`font-sans font-black ${isMe ? 'text-amber-300' : 'text-slate-100'}`}>
                      {item.username}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-black uppercase">
                        SEN
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {item.metric} {item.coins !== undefined && <span className="text-amber-400 ml-1.5">• 🪙 {item.coins} Altın</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-black font-mono ${isMe ? 'text-amber-400' : 'text-white'}`}>
                  {item.score.toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">P</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Gerçek Skor
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
