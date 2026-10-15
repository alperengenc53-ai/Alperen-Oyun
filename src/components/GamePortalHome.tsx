import React, { useState } from 'react';
import { GameId, UserProfile } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import { ScoreboardWidget } from './ScoreboardWidget';
import { GameHubLiteAdPoster } from './GameHubLiteAdPoster';
import { PresenceData } from '../utils/onlinePresence';
import { Play, ExternalLink, Trophy, Flame, Sparkles, User, Users } from 'lucide-react';
import { playSound } from '../utils/audio';

interface GamePortalHomeProps {
  onSelectGame: (gameId: GameId) => void;
  onOpenStandalone: (gameId: GameId) => void;
  currentUser: UserProfile;
  presenceData?: PresenceData;
  onOpenAccountModal: () => void;
}

export const GamePortalHome: React.FC<GamePortalHomeProps> = ({
  onSelectGame,
  onOpenStandalone,
  currentUser,
  presenceData,
  onOpenAccountModal,
}) => {
  const games = Object.values(GAMES_DATA);
  const [selectedScoreboardGame, setSelectedScoreboardGame] = useState<'traffic' | 'snake' | 'pool'>('pool');
  const counts = presenceData?.counts || { snake: 0, pool: 0, traffic: 0, lobby: 1 };
  const totalOnline = presenceData?.total ?? 1;

  const handleOpenAdSite = () => {
    playSound.click();
    window.open('https://oyun-self.vercel.app/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Schematic Indicator */}
      <div className="bg-amber-400/90 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase text-center py-1.5 px-3 rounded-lg border border-amber-500 shadow-sm flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span>📐 CONTENT</span>
          <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-sans">
            Canlı Çok Oyunculu Portal
          </span>
        </div>
        <button
          onClick={handleOpenAdSite}
          className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-0.5 rounded cursor-pointer transition shadow"
        >
          Sponsor: GameHub Lite (oyun-self.vercel.app) →
        </button>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            CANLI ÇEVRİMİÇİ OYUNCULAR ({totalOnline} KİŞİ AKTİF)
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            İsmini Yaz, Canlı Maça Gir: <span className="text-emerald-400">8 Ball Pool</span>, <span className="text-emerald-400">Snake.io</span> & <span className="text-sky-400">Turbo Otoban</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Sitedeki çevrimiçi oyuncularla 1v1 Bilardo maçı atabilir, Snake.io'da dengeli hızda skor kasıp kostüm açabilir, Otobanda hızlanıp yeni arabalar satın alabilirsiniz!
          </p>

          {/* User Quick Info & Live Server Counters */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenAccountModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>İSMİNİ YAZ VEYA SEÇ ({currentUser.username})</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 flex-wrap">
              <span className="text-emerald-400 font-bold">🟢 Toplam: {totalOnline}</span>
              <span>•</span>
              <span className="text-emerald-300">🎱 Bilardo: {counts.pool}</span>
              <span>•</span>
              <span className="text-emerald-300">🐍 Snake: {counts.snake}</span>
              <span>•</span>
              <span className="text-sky-300">🏎️ Otoban: {counts.traffic}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Game Cards with Real-time Online Counter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              ÇEVRİMİÇİ OYUNLAR ({games.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Anlık canlı oyuncu sayıları
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {games.map((g) => {
            const isPool = g.id === 'pool';
            const isTraffic = g.id === 'traffic';
            const onlineInThisGame = counts[g.id] ?? 0;

            const accentColor = isPool
              ? 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10'
              : isTraffic
              ? 'border-sky-500/40 hover:border-sky-400 shadow-sky-500/10'
              : 'border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10';

            const btnBg = isPool
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
              : isTraffic
              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black';

            const myScore =
              g.id === 'traffic'
                ? currentUser.trafficHighscore
                : g.id === 'snake'
                ? currentUser.snakeHighscore
                : (currentUser as any).poolHighscore || currentUser.totalScore || 0;

            return (
              <div
                key={g.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-xl flex flex-col justify-between ${accentColor}`}
              >
                {/* Visual Header */}
                <div className="relative h-36 bg-slate-950 overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={g.bannerImage}
                    alt={g.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                  <div className="relative z-10 text-center space-y-1">
                    <span className="text-4xl filter drop-shadow-md">{g.icon}</span>
                    <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${g.badgeColor}`}>
                      {g.badge}
                    </div>
                  </div>

                  {/* Real Dynamic Online Count Badge */}
                  <span className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-slate-950/85 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        onlineInThisGame > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span className={onlineInThisGame > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                      Online: {onlineInThisGame}
                    </span>
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

                  {/* Single Clean Play Button */}
                  <button
                    onClick={() => {
                      onSelectGame(g.id);
                      playSound.click();
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${btnBg}`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>OYNA & CANLI MAÇA GİR</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* USER REQUESTED AD POSTER: GameHub Lite (https://oyun-self.vercel.app/) */}
      <GameHubLiteAdPoster variant="banner" />

      {/* Real Live Scoreboards Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              ÇEVRİMİÇİ VE AKTİF OYUNCU SKORLARI
            </h2>
          </div>

          {/* Game Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedScoreboardGame('pool')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'pool'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎱 8 Ball Pool
            </button>
            <button
              onClick={() => setSelectedScoreboardGame('snake')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'snake'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🐍 Snake.io
            </button>
            <button
              onClick={() => setSelectedScoreboardGame('traffic')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedScoreboardGame === 'traffic'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏎️ Turbo Araba
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
