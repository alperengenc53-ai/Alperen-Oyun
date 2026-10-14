/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameId, UserProfile } from './types/game';
import { getActiveUser, onPlayersSync } from './utils/playerRegistry';
import { Header } from './components/Header';
import { MenuBar } from './components/MenuBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { Footer } from './components/Footer';
import { GamePortalHome } from './components/GamePortalHome';
import { ActiveGameContainer } from './components/ActiveGameContainer';
import { StandaloneGameView } from './components/StandaloneGameView';
import { AccountModal } from './components/AccountModal';
import { ScoreboardWidget } from './components/ScoreboardWidget';
import { Trophy, Server, HelpCircle, ArrowLeft } from 'lucide-react';
import {
  startPresenceService,
  setPresenceGame,
  subscribePresence,
  getCachedPresence,
  updatePresenceUser,
  PresenceData,
} from './utils/onlinePresence';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getActiveUser());
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(!getActiveUser());

  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [standaloneGame, setStandaloneGame] = useState<GameId | null>(null);
  const [presenceData, setPresenceData] = useState<PresenceData>(getCachedPresence());

  // Sync across browser tabs
  useEffect(() => {
    const unsub = onPlayersSync(() => {
      const active = getActiveUser();
      if (active) setCurrentUser(active);
    });
    return unsub;
  }, []);

  // Parse URL query parameter on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramGame = params.get('game') || params.get('standalone');
    if (paramGame === 'traffic' || paramGame === 'snake' || paramGame === 'pool') {
      if (params.get('standalone')) {
        setStandaloneGame(paramGame as GameId);
      } else {
        setActiveGame(paramGame as GameId);
        setActiveTab(paramGame);
      }
    }
  }, []);

  const handleProfileUpdated = (updated: UserProfile) => {
    setCurrentUser(updated);
    setIsAccountModalOpen(false);
  };

  const [autoFullscreen, setAutoFullscreen] = useState(false);

  const handleOpenFullscreen = (gameId: GameId) => {
    setActiveGame(gameId);
    setActiveTab(gameId);
    setAutoFullscreen(true);
  };

  const handleSelectGame = (gameId: GameId | null) => {
    setActiveGame(gameId);
    setAutoFullscreen(false);
    if (gameId) {
      setActiveTab(gameId);
    } else {
      setActiveTab('home');
    }
  };

  // If user hasn't registered yet, render initial prompt modal
  const effectiveUser: UserProfile = currentUser || {
    id: 'temp_guest',
    username: 'Misafir',
    avatar: '👑',
    tag: '[TR]',
    level: 1,
    totalScore: 0,
    coins: 150,
    trafficCoins: 150,
    snakeCoins: 150,
    poolCoins: 150,
    unlockedTrafficCars: ['red_lightning'],
    selectedTrafficCar: 'red_lightning',
    unlockedTrafficSkins: ['plain'],
    selectedTrafficSkin: 'plain',
    unlockedSnakeSkins: ['emerald'],
    selectedSnakeSkin: 'emerald',
    unlockedPoolCues: ['classic_wood'],
    selectedPoolCue: 'classic_wood',
    unlockedPoolTables: ['emerald_classic'],
    selectedPoolTable: 'emerald_classic',
    trafficHighscore: 0,
    trafficDistance: 0,
    snakeHighscore: 0,
    snakeKills: 0,
    poolWins: 0,
    poolHighscore: 0,
    joinedAt: 'Yeni',
  };

  // Start Presence service and subscribe to real-time updates
  useEffect(() => {
    startPresenceService(effectiveUser, activeGame || 'lobby');
    const unsub = subscribePresence((data) => {
      setPresenceData(data);
    });
    return unsub;
  }, [effectiveUser.id]);

  // Keep presence updated when switching games
  useEffect(() => {
    setPresenceGame(activeGame || 'lobby');
  }, [activeGame]);

  // Standalone game view
  if (standaloneGame) {
    return (
      <StandaloneGameView
        gameId={standaloneGame}
        currentUser={effectiveUser}
        presenceData={presenceData}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onProfileUpdated={handleProfileUpdated}
        onBackToPortal={() => setStandaloneGame(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Account / Registration Modal */}
      <AccountModal
        currentUser={currentUser}
        isOpen={isAccountModalOpen || !currentUser}
        isInitial={!currentUser}
        onClose={() => {
          if (currentUser) setIsAccountModalOpen(false);
        }}
        onProfileUpdated={(updated) => {
          handleProfileUpdated(updated);
          updatePresenceUser(updated);
        }}
      />

      {/* 1. HEADER Alanı */}
      <Header
        onSelectGame={handleSelectGame}
        activeGame={activeGame}
        currentUser={effectiveUser}
        presenceData={presenceData}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
      />

      {/* 2. Menü Alanı */}
      <MenuBar
        activeGame={activeGame}
        onSelectGame={handleSelectGame}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 3. Ana Gövde Düzeni (Aktif oyunda kenarlıklar kaldırılıp tam genişlik verilir) */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 py-4 flex flex-col ${activeGame ? 'max-w-none' : 'lg:flex-row max-w-[1440px]'} gap-6 items-start`}>
        {/* SOL SİDEBAR (Sadece Ana Sayfa ve Sekmelerde gösterilir, oyunda ekranı daraltmaz) */}
        {!activeGame && (
          <LeftSidebar
            activeGame={activeGame}
            onSelectGame={(gid) => {
              handleSelectGame(gid);
            }}
            onOpenFullscreen={handleOpenFullscreen}
            currentUser={effectiveUser}
            presenceData={presenceData}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
          />
        )}

        {/* CONTENT */}
        <section className="flex-1 min-w-0 w-full">
          {activeGame ? (
            <ActiveGameContainer
              gameId={activeGame}
              currentUser={effectiveUser}
              presenceData={presenceData}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onProfileUpdated={handleProfileUpdated}
              onBackToHome={() => handleSelectGame(null)}
              autoFullscreen={autoFullscreen}
            />
          ) : activeTab === 'leaderboard' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-black text-white">AKTİF OYUNCU SKOR TABLOSU</h2>
                </div>
                <button
                  onClick={() => handleSelectGame(null)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfaya Dön
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ScoreboardWidget
                  game="pool"
                  currentUser={effectiveUser}
                  title="8 BALL POOL 1v1 BİLARDO SIRALAMASI"
                />
                <ScoreboardWidget
                  game="traffic"
                  currentUser={effectiveUser}
                  title="TURBO OTOBAN SIRALAMASI"
                />
                <ScoreboardWidget
                  game="snake"
                  currentUser={effectiveUser}
                  title="SNAKE.IO ARENA SIRALAMASI"
                />
                <ScoreboardWidget
                  game="cyber3d"
                  currentUser={effectiveUser}
                  title="CYBER HORIZON 3D SIRALAMASI"
                />
              </div>
            </div>
          ) : activeTab === 'servers' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Server className="w-6 h-6 text-sky-400" />
                  <h2 className="text-xl font-black text-white">OYUN ODALARI & SUNUCULAR</h2>
                </div>
                <button
                  onClick={() => handleSelectGame(null)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfaya Dön
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {[
                  { name: 'Bilardo Odası: 8 Ball Pool 1v1 Masası #01', game: '8 Ball Pool (1v1 VS)', ping: '9ms', status: 'Aktif' },
                  { name: 'Otoyol: E-5 Turbo Akıcı Parkur #01', game: 'Turbo Otoban', ping: '10ms', status: 'Akıcı' },
                  { name: 'Arena: Gerçek Yılan Savaşı Odası #01', game: 'Snake.io', ping: '14ms', status: 'Aktif' },
                  { name: 'Siber Uzay: Cyber Horizon 3D Parkuru #01', game: 'Cyber Horizon 3D', ping: '8ms', status: '3D Aktif' },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        {s.name}
                      </div>
                      <div className="text-slate-400 text-[11px]">{s.game} • Gecikme: {s.ping}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-emerald-400 font-bold">{s.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'guide' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-black text-white">OYUN KILAVUZU & KURALLAR</h2>
                </div>
                <button
                  onClick={() => handleSelectGame(null)}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfaya Dön
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400">Cyber Horizon 3D (Three.js Motoru) 🚀</h3>
                  <p>
                    A ve D tuşları (veya Sol/Sağ oklar) ile 3 şerit arasında hızlı manevra yapın. Dönen lazer kapılarından ve pilonlardan kaçın, alçak plazma bariyerlerinin üstünden Boşluk (Space) tuşuna basarak 3D zıplayın!
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <h3 className="text-sm font-bold text-sky-400">Turbo Otoban: Hızlanma & Makas Sistemi 🚗</h3>
                  <p>
                    W tuşuna basmaya gerek yoktur! Araba otomatik olarak akıcı hızda sürüşe başlar ve km katettikçe yavaş yavaş hızlanır. Sadece A ve D tuşlarıyla önünüzdeki arabaların arasından şerit değiştirip çarpmadan makas atarak puan toplayın.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-400">Snake.io Yılan Savaşı Kuralları 🐍</h3>
                  <p>
                    Yılanınız fareyi veya klavye yönlerini dengeli bir hızda takip eder. Yemleri toplayarak dengeli ve doğal büyüyün. Rakiplerin kafasını kendi yılanınızın gövdesine çarptırarak patlatın ve yemlerini yutun.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <GamePortalHome
              onSelectGame={(gid) => {
                setActiveGame(gid);
                setActiveTab(gid);
              }}
              onOpenStandalone={() => {}}
              currentUser={effectiveUser}
              presenceData={presenceData}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          )}
        </section>

        {/* SAĞ SİDEBAR (Sadece Ana Sayfa ve Sekmelerde gösterilir) */}
        {!activeGame && (
          <RightSidebar />
        )}
      </main>

      {/* 4. FOOTER */}
      <Footer onSelectGame={handleSelectGame} />
    </div>
  );
}
