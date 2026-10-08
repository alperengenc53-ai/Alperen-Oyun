import React, { useState, useEffect } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { ExternalLink, Play, Sparkles, MessageSquare, Send } from 'lucide-react';
import {
  getAllRegisteredPlayers,
  getRealChatMessages,
  addRealChatMessage,
  onPlayersSync,
  RealChatMsg,
} from '../utils/playerRegistry';
import { playSound } from '../utils/audio';

interface LeftSidebarProps {
  activeGame: GameId | null;
  onSelectGame: (gameId: GameId) => void;
  onOpenStandalone: (gameId: GameId) => void;
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeGame,
  onSelectGame,
  onOpenStandalone,
  currentUser,
  onOpenAccountModal,
}) => {
  const [chatMessages, setChatMessages] = useState<RealChatMsg[]>(getRealChatMessages());
  const [newMsg, setNewMsg] = useState('');

  const registeredPlayers = getAllRegisteredPlayers();

  const reloadChat = () => {
    setChatMessages(getRealChatMessages());
  };

  useEffect(() => {
    reloadChat();
    const unsub = onPlayersSync(reloadChat);
    return unsub;
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const updated = addRealChatMessage(currentUser.username, currentUser.tag, newMsg.trim());
    setChatMessages(updated);
    setNewMsg('');
    playSound.click();
  };

  const games = Object.values(GAMES_DATA);

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

      {/* Main 3 Games Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white tracking-wide">
              ÇEVRİMİÇİ OYUNLAR ({games.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            GERÇEK OYUNCULAR
          </span>
        </div>

        {/* Game Cards List */}
        <div className="flex flex-col gap-3">
          {games.map((g) => {
            const isSelected = activeGame === g.id;

            const myScore =
              g.id === 'pubg'
                ? currentUser.pubgHighscore
                : g.id === 'traffic'
                ? currentUser.trafficHighscore
                : g.id === 'snake'
                ? currentUser.snakeHighscore
                : (currentUser as any).minecraftScore || currentUser.totalScore || 0;

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

                {/* Score info */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="text-emerald-400 font-bold">
                    {registeredPlayers.length} Kayıtlı Oyuncu
                  </span>
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
                    <span>{isSelected ? 'Oynanıyor' : 'Sitede Oyna'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenStandalone(g.id);
                      playSound.click();
                    }}
                    title="Yeni bağımsız sayfada başlat"
                    className="px-2.5 py-2 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Yeni Sitede Aç</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Registered Players List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
            👥 Kayıtlı Oyuncular ({registeredPlayers.length})
          </span>
          <button
            onClick={onOpenAccountModal}
            className="text-[10px] text-amber-400 hover:underline font-bold"
          >
            + İsim Yaz
          </button>
        </div>

        <div className="space-y-1 text-xs font-mono">
          {registeredPlayers.length === 0 ? (
            <div className="text-[11px] text-slate-500 py-1">
              Henüz kimse kayıt olmadı.
            </div>
          ) : (
            registeredPlayers.map((p) => (
              <div
                key={p.id}
                className={`p-1.5 rounded flex items-center justify-between ${
                  p.id === currentUser.id ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{p.avatar}</span>
                  <span>{p.tag} {p.username}</span>
                  {p.id === currentUser.id && <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded">SEN</span>}
                </div>
                <span className="text-[10px] text-slate-400">{p.totalScore}P</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REAL CHAT (NO BOTS, REAL MESSAGES) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-white tracking-wide uppercase">
              Gerçek Oyuncu Sohbeti
            </h3>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
