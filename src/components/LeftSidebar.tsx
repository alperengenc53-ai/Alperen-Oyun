import React, { useState, useEffect } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { ExternalLink, Play, Sparkles, MessageSquare, Send, Swords } from 'lucide-react';
import {
  getRealChatMessages,
  addRealChatMessage,
  onPlayersSync,
  RealChatMsg,
} from '../utils/playerRegistry';
import { PresenceData, sendPoolChallenge } from '../utils/onlinePresence';
import { playSound } from '../utils/audio';

interface LeftSidebarProps {
  activeGame: GameId | null;
  onSelectGame: (gameId: GameId) => void;
  onOpenStandalone?: (gameId: GameId) => void;
  onOpenFullscreen?: (gameId: GameId) => void;
  currentUser: UserProfile;
  presenceData?: PresenceData;
  onOpenAccountModal: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeGame,
  onSelectGame,
  onOpenStandalone,
  onOpenFullscreen,
  currentUser,
  presenceData,
  onOpenAccountModal,
}) => {
  const [chatMessages, setChatMessages] = useState<RealChatMsg[]>(getRealChatMessages());
  const [newMsg, setNewMsg] = useState('');
  const [challengeSentId, setChallengeSentId] = useState<string | null>(null);

  const reloadChat = () => {
    setChatMessages(getRealChatMessages());
  };

  useEffect(() => {
    reloadChat();
    const unsub = onPlayersSync(reloadChat);
    const interval = setInterval(reloadChat, 15000); // Check for hourly reset turnover
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const updated = addRealChatMessage(currentUser.username, currentUser.tag, newMsg.trim());
    setChatMessages(updated);
    setNewMsg('');
    playSound.click();
  };

  const handleChallenge = async (targetUserId: string, targetName: string) => {
    setChallengeSentId(targetUserId);
    playSound.click();
    await sendPoolChallenge(targetUserId);
    onSelectGame('pool');
    setTimeout(() => setChallengeSentId(null), 3000);
  };

  const games = Object.values(GAMES_DATA);
  const onlineUsers = presenceData?.users || [];
  const counts = presenceData?.counts || { snake: 0, pool: 0, traffic: 0, lobby: 1 };

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
      {/* Schematic Indicator */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-center gap-1.5">
        <span>📐 SOL SİDEBAR</span>
        <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
          (Oyun Menüsü)
        </span>
      </div>

      {/* User Career Quick Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 text-xl font-black flex items-center justify-center shadow">
            {currentUser.avatar}
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-1">
              <span className="text-amber-400">{currentUser.tag}</span>
              <span>{currentUser.username}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Toplam Puan: <strong className="text-amber-400">{currentUser.totalScore.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAccountModal}
          title="İsmini değiştir veya yeni oyuncu aç"
          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition cursor-pointer"
        >
          İsmini Yaz
        </button>
      </div>

      {/* Main Games Section with Real Dynamic Online Count */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white tracking-wide">
              OYUNLAR ({games.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {presenceData?.total ?? 1} ÇEVRİMİÇİ
          </span>
        </div>

        {/* Game Cards List */}
        <div className="flex flex-col gap-3">
          {games.map((g) => {
            const isSelected = activeGame === g.id;
            const onlineInThisGame = counts[g.id] ?? 0;

            const myScore =
              g.id === 'traffic'
                ? currentUser.trafficHighscore
                : g.id === 'snake'
                ? currentUser.snakeHighscore
                : (currentUser as any).poolHighscore || currentUser.totalScore || 0;

            return (
              <div
                key={g.id}
                className={`group relative rounded-xl border p-3 transition-all flex flex-col gap-2.5 ${
                  isSelected
                    ? 'bg-slate-850 border-amber-500/70 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 shadow-inner">
                      {g.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition leading-tight">
                        {g.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {g.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${g.badgeColor}`}>
                    {g.badge}
                  </span>
                </div>

                {/* Real-time Online Counter for THIS game & Player Highscore */}
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        onlineInThisGame > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span
                      className={
                        onlineInThisGame > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500 font-medium'
                      }
                    >
                      Online: {onlineInThisGame}
                    </span>
                  </div>
                  <span className="text-amber-400">
                    Skorun: <strong>{myScore} P</strong>
                  </span>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      onSelectGame(g.id);
                      playSound.click();
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSelected ? 'Oynanıyor' : 'Oyna'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenFullscreen) {
                        onOpenFullscreen(g.id);
                      } else {
                        onSelectGame(g.id);
                      }
                      playSound.click();
                    }}
                    title="Oyunu tam ekran olarak büyüt ve başlat"
                    className="px-2.5 py-2 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🗖 Tam Ekran</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Real-time Online Players List with Instant 1v1 VS Challenge */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ÇEVRİMİÇİ OYUNCULAR ({onlineUsers.length || 1})
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            Anlık Canlı
          </span>
        </div>

        <div className="space-y-1.5 text-xs font-mono max-h-52 overflow-y-auto pr-1">
          {onlineUsers.length === 0 ? (
            <div className="p-1.5 rounded flex items-center justify-between bg-emerald-500/10 text-emerald-300">
              <div className="flex items-center gap-1.5">
                <span>{currentUser.avatar}</span>
                <span className="font-bold">{currentUser.tag} {currentUser.username}</span>
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1 rounded">SEN</span>
              </div>
              <span className="text-[10px] text-slate-400">Aktif</span>
            </div>
          ) : (
            onlineUsers.map((u) => {
              const isMe = u.id === currentUser.id;
              const gameLabel =
                u.game === 'snake'
                  ? '🐍 Snake'
                  : u.game === 'pool'
                  ? '🎱 Bilardo'
                  : u.game === 'traffic'
                  ? '🏎️ Otoban'
                  : '🏠 Lobi';

              return (
                <div
                  key={`${u.id}-${u.username}`}
                  className={`p-2 rounded-lg flex items-center justify-between transition ${
                    isMe
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-slate-950 border border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{u.avatar || '👑'}</span>
                    <div className="truncate">
                      <span className="text-slate-400 text-[10px] mr-1">{u.tag}</span>
                      <span className="text-white font-bold">{u.username}</span>
                      {isMe && (
                        <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1 rounded ml-1">
                          SEN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-sans">
                      {gameLabel}
                    </span>
                    {!isMe && (
                      <button
                        onClick={() => handleChallenge(u.id, u.username)}
                        title={`${u.username} ile 8 Ball Pool VS maçı başlat`}
                        className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black rounded transition flex items-center gap-1 cursor-pointer"
                      >
                        <Swords className="w-3 h-3" />
                        <span>{challengeSentId === u.id ? 'Davet...' : 'VS At'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REAL CHAT (NO BOTS, REAL MESSAGES) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white tracking-wide uppercase">
              Canlı Sohbet
            </h3>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
            ⏱️ Saat Başı Sıfırlanır
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1 text-xs font-sans">
          {chatMessages.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic p-3 text-center">
              Henüz sohbet mesajı yok. İlk mesajı siz yazın!
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="p-2 rounded bg-slate-950/70 border border-slate-800/70">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-black text-[11px] text-amber-400">
                    {msg.tag} {msg.user}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {msg.time}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-tight">
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendChat} className="flex gap-1.5 pt-1">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Mesaj yaz..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </aside>
  );
};
