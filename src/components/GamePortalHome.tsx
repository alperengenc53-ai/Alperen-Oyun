import React, { useState } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { ScoreboardWidget } from './ScoreboardWidget';
import { Play, ExternalLink, Trophy, Flame, Sparkles, User, Users } from 'lucide-react';
import { getAllRegisteredPlayers } from '../utils/playerRegistry';
import { playSound } from '../utils/audio';

interface GamePortalHomeProps {
  onSelectGame: (gameId: GameId) => void;
  onOpenStandalone: (gameId: GameId) => void;
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
}

export const GamePortalHome: React.FC<GamePortalHomeProps> = ({
  onSelectGame,
  onOpenStandalone,
  currentUser,
  onOpenAccountModal,
}) => {
  const games = Object.values(GAMES_DATA);
  const registeredPlayers = getAllRegisteredPlayers();
  const [selectedScoreboardGame, setSelectedScoreboardGame] = useState<'pubg' | 'traffic' | 'snake'>('pubg');

  return (
    <div className="flex flex-col gap-6">
      {/* Schematic Indicator */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-center gap-1.5">
        <span>📐 CONTENT (Sayfa İçeriğinin Yer Aldığı Alan)</span>
        <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
          Gerçek Oyuncu Portalı
        </span>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" /> GERÇEK İNSANLARLA OYNA (BOT & NPC YOK)
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            İsmini Yaz, Maça Gir: <span className="text-amber-400">PUBG</span>, <span className="text-sky-400">Turbo Otoban</span> & <span className="text-emerald-400">Snake.io</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Siteye ismini yazıp giren herkes maçta birbirine rakip olur! Otobanda skor yükseldikçe tırlar yolu kapatır, Snake.io'da kafası gövdeye çarpan ölür, PUBG'de gerçek oyuncular karşına çıkar.
          </p>

          {/* User Quick Info */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenAccountModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>İSMİNİ YAZ VEYA SEÇ ({currentUser.username})</span>
            </button>
            <span className="text-xs font-mono text-slate-400">
              Kayıtlı {registeredPlayers.length} Oyuncu Bulunuyor
            </span>
          </div>
        </div>
      </div>

      {/* 3 Featured Game Cards (NO FAKE STARS OR FAKE REVIEWS) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              3 ÇEVRİMİÇİ OYUN
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Gerçek oyuncu skorları kaydedilir
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {games.map((g) => {
            const isPubg = g.id === 'pubg';
            const isMinecraft = g.id === 'minecraft';
            const isTraffic = g.id === 'traffic';

            const accentColor = isPubg
              ? 'border-amber-500/40 hover:border-amber-400 shadow-amber-500/10'
              : isMinecraft
              ? 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10'
              : isTraffic
              ? 'border-sky-500/40 hover:border-sky-400 shadow-sky-500/10'
              : 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10';

            const btnBg = isPubg
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              : isMinecraft
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              : isTraffic
              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950';

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
                className={`bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-xl flex flex-col justify-between ${accentColor}`}
              >
                {/* Visual Header */}
                <div className="relative h-36 bg-slate-950 overflow-hidden flex items-center justify-center p-4">
                  <img
                    src={g.bannerImage}
                    alt={g.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-35"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  <div className="relative z-10 text-center space-y-1">
                    <span className="text-4xl filter drop-shadow-md">{g.icon}</span>
                    <div className={`text-xs font-black uppercase px-2 py-0.5 rounded border ${g.badgeColor}`}>
                      {g.badge}
                    </div>
                  </div>

                  <span className="absolute top-2 right-2 text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                    {registeredPlayers.length} Oyuncu Kayıtlı
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">
                      {g.title}
                    </h3>
                    <p className="text-xs text-amber-400 font-medium">
                      {g.subtitle}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                      {g.description}
                    </p>
                  </div>

                  {/* Real Stats */}
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{currentUser.username} Rekoru:</span>
                    <span className="text-amber-400 font-bold">{myScore} Puan</span>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        onSelectGame(g.id);
                        playSound.click();
                      }}
                      className={`px-3 py-2.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${btnBg}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Burada Oyna</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenStandalone(g.id);
                        playSound.click();
                      }}
                      className="px-2.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yeni Sitede Aç</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Live Scoreboards Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              GERÇEK OYUNCU SKOR TABLOSU (KAYITLI İSİMLER)
            </h2>
          </div>

          {/* Game Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedScoreboardGame('pubg')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'pubg'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PUBG
            </button>
            <button
              onClick={() => setSelectedScoreboardGame('traffic')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'traffic'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Turbo Araba
            </button>
            <button
              onClick={() => setSelectedScoreboardGame('snake')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'snake'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Snake.io
            </button>
          </div>
        </div>

        {/* Selected Scoreboard */}
        <ScoreboardWidget
          game={selectedScoreboardGame}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};
