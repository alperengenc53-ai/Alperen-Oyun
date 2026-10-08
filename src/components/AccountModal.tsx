import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import {
  getAllRegisteredPlayers,
  registerNewPlayer,
  setActiveUser,
} from '../utils/playerRegistry';
import { User, X, Check, UserPlus, Users } from 'lucide-react';
import { playSound } from '../utils/audio';

interface AccountModalProps {
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  isInitial?: boolean;
}

const AVATAR_OPTIONS = ['👑', '⚡', '🎯', '🏎️', '🐍', '🔥', '🦁', '⭐', '🐺', '🦊'];

export const AccountModal: React.FC<AccountModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
  isInitial = false,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('[TR]');
  const [avatar, setAvatar] = useState('👑');

  const registeredPlayers = getAllRegisteredPlayers();

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const newPlayer = registerNewPlayer(username.trim(), tag, avatar);
    onProfileUpdated(newPlayer);
    playSound.victory();
    setUsername('');
    onClose();
  };

  const handleSelectPlayer = (player: UserProfile) => {
    setActiveUser(player.id);
    onProfileUpdated(player);
    playSound.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 font-black" />
            <h3 className="text-base font-black tracking-wide uppercase">
              {isInitial ? '👋 HOŞ GELDİNİZ! İSMİNİZİ YAZIP BAŞLAYIN' : 'GERÇEK OYUNCU HESABI'}
            </h3>
          </div>
          {!isInitial && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-950/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab switcher if not initial or if players exist */}
        {registeredPlayers.length > 0 && !isInitial && (
          <div className="flex border-b border-slate-800 bg-slate-950 text-xs font-bold">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'create'
                  ? 'border-amber-400 text-amber-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Yeni İsim Yaz</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'list'
                  ? 'border-amber-400 text-amber-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Kayıtlı Oyuncular ({registeredPlayers.length})</span>
            </button>
          </div>
        )}

        {activeTab === 'create' || registeredPlayers.length === 0 ? (
          <form onSubmit={handleRegister} className="p-6 space-y-4">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              🎮 <strong>Gerçek Oyuncu Kaydı:</strong> İsminizi yazıp başladığınızda, maçlarda diğer sekmelerdeki ve bu sitedeki oyuncular karşınıza çıkar. Bot ve NPC yoktur!
            </div>

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Avatar Seç
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    type="button"
                    key={av}
                    onClick={() => {
                      setAvatar(av);
                      playSound.click();
                    }}
                    className={`h-10 rounded-xl text-xl flex items-center justify-center transition cursor-pointer border ${
                      avatar === av
                        ? 'border-amber-400 bg-amber-500/20 scale-105 shadow-md shadow-amber-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  İsminiz (Nickname)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={16}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Örn: Ali"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Etiket
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="[TR]"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-amber-400 font-mono text-center focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {!isInitial && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Kapat
                </button>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>KAYIT OL & OYUNA BAŞLA</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto">
            <p className="text-xs text-slate-400">
              Kayıtlı oyuncular:
            </p>

            <div className="space-y-2">
              {registeredPlayers.map((player) => {
                const isCurrent = currentUser && player.id === currentUser.id;
                return (
                  <div
                    key={player.id}
                    onClick={() => handleSelectPlayer(player)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="text-sm font-black text-white flex items-center gap-1.5">
                          <span className="text-amber-400">{player.tag}</span>
                          <span>{player.username}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black uppercase">
                              Seçili
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          🪙 {(player.coins ?? 150).toLocaleString()} Altın • PUBG: {player.pubgHighscore}P • Araba: {player.trafficHighscore}P • Snake: {player.snakeHighscore}P
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg font-bold text-white transition">
                      Seç
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
