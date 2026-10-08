import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Crosshair, Shield, Heart, Trophy, RotateCcw, Volume2, VolumeX, Maximize2, User, Play, Sparkles, ShoppingBag, Award, Check } from 'lucide-react';
import { UserProfile, PubgCostume } from '../../types/game';
import { updateGameScore, getRegisteredOpponents, buyShopItem, equipShopItem } from '../../utils/playerRegistry';
import { ScoreboardWidget } from '../ScoreboardWidget';
import { PUBG_COSTUMES } from '../../data/cosmeticsData';

interface PubgGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface ToyWeapon {
  key: string;
  name: string;
  damage: number;
  ammoMax: number;
  fireRate: number; // ms
  bulletSpeed: number;
  color: string;
  icon: string;
  description: string;
}

// OYUNCAK SİLAHLAR (Balon Tabancası, Balon Sniper, Boncuk Tüfeği, Köpük Pompası)
const TOY_WEAPONS: Record<string, ToyWeapon> = {
  balon_tabancasi: {
    key: 'balon_tabancasi',
    name: 'Balon Tabancası',
    damage: 28,
    ammoMax: 20,
    fireRate: 150,
    bulletSpeed: 11,
    color: '#38bdf8',
    icon: '🎈',
    description: 'Seri su balonu fırlatır',
  },
  balon_sniper: {
    key: 'balon_sniper',
    name: 'Balon Sniper',
    damage: 90,
    ammoMax: 5,
    fireRate: 850,
    bulletSpeed: 18,
    color: '#ec4899',
    icon: '🎯',
    description: 'Uzun menzilli dev balon atar',
  },
  boncuk_tufegi: {
    key: 'boncuk_tufegi',
    name: 'Plastik Boncuk Tüfeği',
    damage: 38,
    ammoMax: 30,
    fireRate: 130,
    bulletSpeed: 12,
    color: '#facc15',
    icon: '🟡',
    description: 'Renkli yumuşak boncuk saçar',
  },
  kopuk_pompasi: {
    key: 'kopuk_pompasi',
    name: 'Köpük Pompası',
    damage: 22,
    ammoMax: 8,
    fireRate: 500,
    bulletSpeed: 9,
    color: '#a855f7',
    icon: '🧼',
    description: 'Geniş saçılan köpük baloncukları',
  },
};

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  shooter: 'player' | 'opponent';
  color: string;
  range: number;
}

interface Item {
  x: number;
  y: number;
  type: 'balon_tabancasi' | 'balon_sniper' | 'boncuk_tufegi' | 'kopuk_pompasi' | 'juice' | 'vest' | 'soda';
  label: string;
  color: string;
}

interface ArenaOpponent {
  id: string;
  name: string;
  tag: string;
  x: number;
  y: number;
  hp: number;
  weapon: ToyWeapon;
  targetX: number;
  targetY: number;
  angle: number;
  lastShoot: number;
  color: string;
}

export const PubgGame: React.FC<PubgGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inLobby, setInLobby] = useState<boolean>(true);
  const [lobbyTab, setLobbyTab] = useState<'lobby' | 'costumes' | 'weapons' | 'rules'>('lobby');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('balon_tabancasi');
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [kills, setKills] = useState<number>(0);
  const [aliveCount, setAliveCount] = useState<number>(1);
  const [playerRank, setPlayerRank] = useState<number>(1);
  const [totalPlayersInMatch, setTotalPlayersInMatch] = useState<number>(1);
  const [placementPointsAwarded, setPlacementPointsAwarded] = useState<number>(0);
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);
  const [currentMatchScore, setCurrentMatchScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [killFeed, setKillFeed] = useState<string[]>([]);

  // Player state
  const playerRef = useRef({
    x: 400,
    y: 300,
    hp: 100,
    armor: 100,
    speed: 3.6,
    weaponKey: 'balon_tabancasi',
    ammo: 20,
    isReloading: false,
    angle: 0,
    lastShoot: 0,
  });

  const totalInMatchRef = useRef<number>(1);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number; y: number }>({ x: 400, y: 300 });
  const opponentsRef = useRef<ArenaOpponent[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const zoneRef = useRef({
    x: 400,
    y: 300,
    radius: 380,
    targetRadius: 110,
    shrinkSpeed: 0.09,
  });
  const mapSize = { width: 850, height: 550 };

  const currentCostume = PUBG_COSTUMES.find(
    (c) => c.id === currentUser.selectedPubgCostume
  ) || PUBG_COSTUMES[0];

  const addKillFeed = (msg: string) => {
    setKillFeed((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const calculatePlacementRewards = (rank: number, matchKills: number) => {
    let placeScore = 50;
    let placeCoins = 15;

    if (rank === 1) {
      placeScore = 800;
      placeCoins = 150;
    } else if (rank === 2) {
      placeScore = 500;
      placeCoins = 100;
    } else if (rank === 3) {
      placeScore = 350;
      placeCoins = 75;
    } else if (rank <= 5) {
      placeScore = 220;
      placeCoins = 50;
    } else if (rank <= 10) {
      placeScore = 120;
      placeCoins = 30;
    }

    const killScore = matchKills * 100;
    const killCoins = matchKills * 25;

    return {
      placementScore: placeScore,
      placementCoins: placeCoins,
      killScore,
      killCoins,
      totalScore: placeScore + killScore,
      totalCoins: placeCoins + killCoins,
    };
  };

  const startMatch = useCallback(() => {
    setInLobby(false);
    playerRef.current = {
      x: 400,
      y: 300,
      hp: 100,
      armor: 100,
      speed: 3.6,
      weaponKey: selectedWeapon,
      ammo: TOY_WEAPONS[selectedWeapon]?.ammoMax || 20,
      isReloading: false,
      angle: 0,
      lastShoot: 0,
    };

    zoneRef.current = {
      x: 425,
      y: 275,
      radius: 370,
      targetRadius: 100,
      shrinkSpeed: 0.08,
    };

    // Spawn toy items on map
    const newItems: Item[] = [];
    const itemKeys: Item['type'][] = [
      'balon_tabancasi',
      'balon_sniper',
      'boncuk_tufegi',
      'kopuk_pompasi',
      'juice',
      'vest',
      'soda',
    ];
    for (let i = 0; i < 22; i++) {
      const type = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const labels: Record<string, string> = {
        balon_tabancasi: 'Balon Tabancası 🎈',
        balon_sniper: 'Balon Sniper 🎯',
        boncuk_tufegi: 'Boncuk Tüfeği 🟡',
        kopuk_pompasi: 'Köpük Pompası 🧼',
        juice: 'Meyve Suyu & Kurabiye 🧃',
        vest: 'Şişme Can Yeleği 🦺',
        soda: 'Buzlu Gazoz 🥤',
      };
      const colors: Record<string, string> = {
        balon_tabancasi: '#38bdf8',
        balon_sniper: '#ec4899',
        boncuk_tufegi: '#facc15',
        kopuk_pompasi: '#c084fc',
        juice: '#22c55e',
        vest: '#eab308',
        soda: '#06b6d4',
      };
      newItems.push({
        x: Math.random() * (mapSize.width - 100) + 50,
        y: Math.random() * (mapSize.height - 100) + 50,
        type,
        label: labels[type],
        color: colors[type],
      });
    }
    itemsRef.current = newItems;

    // REAL REGISTERED OPPONENTS ONLY
    const realOpponents = getRegisteredOpponents(currentUser.id);
    const opponentColors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#2dd4bf', '#818cf8'];

    const newOpponents: ArenaOpponent[] = realOpponents.map((p, idx) => ({
      id: p.id,
      name: p.username,
      tag: p.tag,
      x: Math.random() * (mapSize.width - 140) + 70,
      y: Math.random() * (mapSize.height - 140) + 70,
      hp: 100,
      weapon: TOY_WEAPONS[Math.random() > 0.5 ? 'balon_tabancasi' : 'boncuk_tufegi'],
      targetX: Math.random() * mapSize.width,
      targetY: Math.random() * mapSize.height,
      angle: Math.random() * Math.PI * 2,
      lastShoot: 0,
      color: opponentColors[idx % opponentColors.length],
    }));

    opponentsRef.current = newOpponents;
    bulletsRef.current = [];

    const totalCount = newOpponents.length + 1;
    totalInMatchRef.current = totalCount;
    setTotalPlayersInMatch(totalCount);
    setAliveCount(totalCount);
    setKills(0);
    setCurrentMatchScore(0);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);

    if (newOpponents.length === 0) {
      setKillFeed([`🎈 [${currentUser.username}] arenaya indi! (${currentCostume.name} kostümü kuşanıldı)`]);
    } else {
      setKillFeed([`🎈 [${currentUser.username}] arenaya indi! Rakipler: ${newOpponents.map(o => o.name).join(', ')}`]);
    }
  }, [selectedWeapon, currentUser.id, currentUser.username, currentCostume.name]);

  const handleShoot = useCallback(() => {
    const player = playerRef.current;
    if (player.isReloading || player.hp <= 0) return;
    const now = Date.now();
    const weapon = TOY_WEAPONS[player.weaponKey] || TOY_WEAPONS.balon_tabancasi;

    if (now - player.lastShoot < weapon.fireRate) return;
    if (player.ammo <= 0) {
      player.isReloading = true;
      setTimeout(() => {
        player.ammo = weapon.ammoMax;
        player.isReloading = false;
      }, 1000);
      return;
    }

    player.lastShoot = now;
    player.ammo -= 1;

    if (soundEnabled) {
      if (player.weaponKey === 'balon_sniper') {
        playSound.sniperShot();
      } else {
        playSound.coin();
      }
    }

    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);

    if (player.weaponKey === 'kopuk_pompasi') {
      for (let s = -2; s <= 2; s++) {
        const spreadAngle = player.angle + s * 0.09;
        bulletsRef.current.push({
          x: player.x + Math.cos(spreadAngle) * 16,
          y: player.y + Math.sin(spreadAngle) * 16,
          vx: Math.cos(spreadAngle) * weapon.bulletSpeed,
          vy: Math.sin(spreadAngle) * weapon.bulletSpeed,
          damage: weapon.damage,
          shooter: 'player',
          color: '#e0e7ff',
          range: 340,
        });
      }
    } else {
      bulletsRef.current.push({
        x: player.x + cos * 18,
        y: player.y + sin * 18,
        vx: cos * weapon.bulletSpeed,
        vy: sin * weapon.bulletSpeed,
        damage: weapon.damage,
        shooter: 'player',
        color: weapon.color,
        range: 620,
      });
    }
  }, [soundEnabled]);

  // Handle costume buy / equip
  const handleSelectCostume = (costume: PubgCostume) => {
    const isUnlocked = currentUser.unlockedPubgCostumes?.includes(costume.id) || costume.price === 0;

    if (isUnlocked) {
      const updated = equipShopItem('pubg_costume', costume.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${costume.name}" kostümü başarıyla kuşandı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('pubg_costume', costume.id, costume.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${costume.name}" kostümü satın alındı ve kuşandı!`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
      }
    }

    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Main loop
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let opponentKillTimer = Date.now();

    const loop = () => {
      const player = playerRef.current;

      // Handle keyboard controls
      let dx = 0;
      let dy = 0;
      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dy -= 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dy += 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      player.x = Math.max(15, Math.min(mapSize.width - 15, player.x + dx * player.speed));
      player.y = Math.max(15, Math.min(mapSize.height - 15, player.y + dy * player.speed));

      // Player rotation towards mouse
      player.angle = Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x);

      // Shrink blue zone
      const zone = zoneRef.current;
      if (zone.radius > zone.targetRadius) {
        zone.radius -= zone.shrinkSpeed;
      }

      // Zone damage on player
      const distFromZoneCenter = Math.hypot(player.x - zone.x, player.y - zone.y);
      if (distFromZoneCenter > zone.radius) {
        player.hp = Math.max(0, player.hp - 0.25);
        if (Math.random() < 0.05 && soundEnabled) {
          playSound.hit();
        }
      }

      // Check toy item pickup
      itemsRef.current = itemsRef.current.filter((item) => {
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < 26) {
          if (item.type === 'juice') {
            player.hp = Math.min(100, player.hp + 45);
            addKillFeed('🧃 Meyve suyu & kurabiye yendi (+Can)');
          } else if (item.type === 'vest') {
            player.armor = 100;
            addKillFeed('🦺 Şişme can yeleği takıldı (+Kalkan)');
          } else if (item.type === 'soda') {
            player.speed = 4.4;
            setTimeout(() => { player.speed = 3.6; }, 6000);
            addKillFeed('🥤 Gazoz içildi! Hız artışı!');
          } else if (TOY_WEAPONS[item.type]) {
            player.weaponKey = item.type;
            player.ammo = TOY_WEAPONS[item.type].ammoMax;
            setSelectedWeapon(item.type);
            addKillFeed(`🔫 Yerden ${item.label} alındı!`);
          }
          if (soundEnabled) playSound.coin();
          return false;
        }
        return true;
      });

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.range -= Math.hypot(b.vx, b.vy);
      });

      // Bullet collision with player
      bulletsRef.current.forEach((b) => {
        if (b.shooter === 'opponent' && player.hp > 0) {
          const dist = Math.hypot(player.x - b.x, player.y - b.y);
          if (dist < 16) {
            b.range = -1; // remove
            if (player.armor > 0) {
              player.armor = Math.max(0, player.armor - b.damage);
            } else {
              player.hp = Math.max(0, player.hp - b.damage);
            }
            if (soundEnabled) playSound.hit();
          }
        }
      });

      // Bullet collision with opponents
      bulletsRef.current.forEach((b) => {
        if (b.shooter === 'player') {
          opponentsRef.current.forEach((opp) => {
            if (opp.hp <= 0) return;
            const dist = Math.hypot(opp.x - b.x, opp.y - b.y);
            if (dist < 18) {
              b.range = -1;
              opp.hp -= b.damage;
              if (soundEnabled) playSound.hit();

              if (opp.hp <= 0) {
                setKills((prev) => {
                  const newKills = prev + 1;
                  addKillFeed(`🎯 [${currentUser.username}] su balonuyla [${opp.name}] oyuncusunu ıslatıp eledi!`);
                  return newKills;
                });
              }
            }
          });
        }
      });

      // Filter dead opponents
      opponentsRef.current = opponentsRef.current.filter((o) => o.hp > 0);
      bulletsRef.current = bulletsRef.current.filter((b) => b.range > 0);

      // AI opponents movement
      const now = Date.now();
      opponentsRef.current.forEach((opp) => {
        const dTarget = Math.hypot(opp.targetX - opp.x, opp.targetY - opp.y);
        if (dTarget < 30) {
          opp.targetX = Math.random() * (mapSize.width - 100) + 50;
          opp.targetY = Math.random() * (mapSize.height - 100) + 50;
        }

        const angleToTarget = Math.atan2(opp.targetY - opp.y, opp.targetX - opp.x);
        opp.x += Math.cos(angleToTarget) * 1.5;
        opp.y += Math.sin(angleToTarget) * 1.5;

        const dToPlayer = Math.hypot(player.x - opp.x, player.y - opp.y);
        if (dToPlayer < 240 && player.hp > 0) {
          opp.angle = Math.atan2(player.y - opp.y, player.x - opp.x);
          if (now - opp.lastShoot > 850 && Math.random() < 0.6) {
            opp.lastShoot = now;
            bulletsRef.current.push({
              x: opp.x + Math.cos(opp.angle) * 15,
              y: opp.y + Math.sin(opp.angle) * 15,
              vx: Math.cos(opp.angle) * 7.5,
              vy: Math.sin(opp.angle) * 7.5,
              damage: 14,
              shooter: 'opponent',
              color: '#f43f5e',
              range: 300,
            });
          }
        }
      });

      // Background eliminations
      if (now - opponentKillTimer > 4000 && opponentsRef.current.length > 2) {
        opponentKillTimer = now;
        if (Math.random() < 0.4) {
          const removed = opponentsRef.current.pop();
          if (removed) {
            const killer = opponentsRef.current[Math.floor(Math.random() * opponentsRef.current.length)];
            if (killer) {
              addKillFeed(`🎈 [${killer.name}] su balonuyla [${removed.name}] oyuncusunu ıslattı.`);
            }
          }
        }
      }

      const currentRemaining = opponentsRef.current.length + (player.hp > 0 ? 1 : 0);
      setAliveCount(currentRemaining);

      // Win condition
      if (opponentsRef.current.length === 0 && player.hp > 0 && !gameOver) {
        setWon(true);
        setGameOver(true);
        setIsPlaying(false);
        setPlayerRank(1);

        const rewards = calculatePlacementRewards(1, kills);
        setPlacementPointsAwarded(rewards.placementScore);
        setCoinsAwarded(rewards.totalCoins);
        setCurrentMatchScore(rewards.totalScore);

        const updated = updateGameScore('pubg', rewards.totalScore, {
          kills,
          win: true,
          coinsEarned: rewards.totalCoins,
        });
        if (updated) onProfileUpdated(updated);

        if (soundEnabled) playSound.victory();
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
        return;
      }

      // Lose condition (Placement determined by who was alive when you died!)
      if (player.hp <= 0 && !gameOver) {
        setGameOver(true);
        setIsPlaying(false);

        // Your exact placement is remaining opponents + 1!
        const rank = opponentsRef.current.length + 1;
        setPlayerRank(rank);

        const rewards = calculatePlacementRewards(rank, kills);
        setPlacementPointsAwarded(rewards.placementScore);
        setCoinsAwarded(rewards.totalCoins);
        setCurrentMatchScore(rewards.totalScore);

        const updated = updateGameScore('pubg', rewards.totalScore, {
          kills,
          win: false,
          coinsEarned: rewards.totalCoins,
        });
        if (updated) onProfileUpdated(updated);

        addKillFeed(`☠️ #${rank}. sırada elendiniz! Sıralama ve av puanınız kaydedildi.`);
        return;
      }

      // --- RENDER ARENA ---
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, mapSize.width, mapSize.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < mapSize.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mapSize.height);
        ctx.stroke();
      }
      for (let y = 0; y < mapSize.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(mapSize.width, y);
        ctx.stroke();
      }

      // Safe zone & Blue zone
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.targetRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
      ctx.beginPath();
      ctx.rect(0, 0, mapSize.width, mapSize.height);
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.restore();

      // Items
      itemsRef.current.forEach((item) => {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x, item.y - 12);
      });

      // Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Real Opponents
      opponentsRef.current.forEach((opp) => {
        ctx.save();
        ctx.translate(opp.x, opp.y);
        ctx.rotate(opp.angle);

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8, -2, 10, 4);

        ctx.fillStyle = opp.color;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${opp.tag} ${opp.name}`, opp.x, opp.y - 18);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(opp.x - 14, opp.y - 14, 28, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(opp.x - 14, opp.y - 14, (opp.hp / 100) * 28, 4);
      });

      // Player with SELECTED COSTUME
      if (player.hp > 0) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        // Weapon barrel
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(10, -3, 14, 6);

        // Hands
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(8, -8, 4, 0, Math.PI * 2);
        ctx.arc(8, 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // DRAW COSTUME SPECIFICS
        const acc = currentCostume.accessory;

        if (acc === 'hero_cape') {
          // Flowing superhero cape
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(-6, -10);
          ctx.lineTo(-24, -14);
          ctx.lineTo(-20, 0);
          ctx.lineTo(-24, 14);
          ctx.lineTo(-6, 10);
          ctx.closePath();
          ctx.fill();
        }

        // Base Body Circle
        ctx.fillStyle = currentCostume.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Inner Outfit / Armor
        ctx.fillStyle = currentCostume.headgearColor;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // Costume Accessories
        if (acc === 'bear_ears') {
          // Cute Bear Ears
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.arc(-8, -12, 5, 0, Math.PI * 2);
          ctx.arc(-8, 12, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (acc === 'robot_antenna') {
          // Robot Antenna
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-2, 0);
          ctx.lineTo(-14, 0);
          ctx.stroke();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(-15, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (acc === 'ninja_band') {
          // Ninja band ribbons
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(-18, -4, 8, 3);
          ctx.fillRect(-18, 1, 8, 3);
        } else if (acc === 'duck_beak') {
          // Rubber duck beak in front
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(10, -5);
          ctx.lineTo(18, 0);
          ctx.lineTo(10, 5);
          ctx.closePath();
          ctx.fill();
        } else if (acc === 'beret') {
          // Beret hat badge
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(-2, -5, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Player Name & Costume Icon
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${currentCostume.icon} ${currentUser.tag || '[TR]'} ${currentUser.username} (Sen)`,
          player.x,
          player.y - 20
        );

        // Crosshair
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 8, 0, Math.PI * 2);
        ctx.moveTo(mouseRef.current.x - 12, mouseRef.current.y);
        ctx.lineTo(mouseRef.current.x + 12, mouseRef.current.y);
        ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 12);
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 12);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, gameOver, kills, soundEnabled, currentUser, currentCostume]);

  // Mouse and keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyR') {
        const player = playerRef.current;
        const weapon = TOY_WEAPONS[player.weaponKey];
        if (player.ammo < weapon.ammoMax && !player.isReloading) {
          player.isReloading = true;
          addKillFeed('🎈 Balon dolduruluyor...');
          setTimeout(() => {
            player.ammo = weapon.ammoMax;
            player.isReloading = false;
          }, 800);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = mapSize.width / rect.width;
      const scaleY = mapSize.height / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && isPlaying) {
        handleShoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
      }
    };
  }, [isPlaying, handleShoot]);

  return (
    <div className="flex flex-col gap-4">
      {/* HUD Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xl">
            {currentCostume.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">OYUNCAK SAVAŞI: BATTLE ROYALE</h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                FAN OYUNU
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kuşanılan Kostüm: <strong className="text-amber-400">{currentCostume.name}</strong> • Silah: <strong className="text-sky-400">{TOY_WEAPONS[selectedWeapon]?.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet */}
          <div className="bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
            <span>🪙</span>
            <span className="text-sm font-black text-amber-200">{(currentUser.coins ?? 150).toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 uppercase">Altın</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
            title="Ses Aç/Kapat"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Leaderboard modal toggle */}
          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Skorboard</span>
          </button>

          {/* Main Menu Button */}
          {!inLobby && (
            <button
              onClick={() => {
                setIsPlaying(false);
                setGameOver(false);
                setInLobby(true);
              }}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/40 transition cursor-pointer"
            >
              Menüye Dön
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area or In-Game Interactive Lobby Menu */}
      <div className="relative bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[550px]">
        {/* INTERACTIVE LOBBY & SHOP MENU */}
        {inLobby ? (
          <div className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
            {/* Top Menu Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLobbyTab('lobby')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'lobby'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>LOBİ & BAŞLAT</span>
                </button>

                <button
                  onClick={() => setLobbyTab('costumes')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'costumes'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>KARAKTERLER & KOSTÜMLER ({PUBG_COSTUMES.length})</span>
                </button>

                <button
                  onClick={() => setLobbyTab('weapons')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'weapons'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>OYUNCAK SİLAHLAR</span>
                </button>

                <button
                  onClick={() => setLobbyTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'rules'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>SIRALAMA & PUAN SİSTEMİ</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span>Cüzdan:</span>
                <strong className="text-amber-200">{(currentUser.coins ?? 150).toLocaleString()} 🪙</strong>
              </div>
            </div>

            {/* Notification message */}
            {shopFeedback && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 text-center animate-fade-in">
                {shopFeedback}
              </div>
            )}

            {/* TAB 1: LOBBY & QUICK START */}
            {lobbyTab === 'lobby' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Character Showcase Preview Card */}
                <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                    Seçili Karakter
                  </div>

                  <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-5xl my-3 shadow-inner border border-slate-700">
                    {currentCostume.icon}
                  </div>

                  <h3 className="text-lg font-black text-white">{currentCostume.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{currentCostume.description}</p>

                  <div className="w-full mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-300">
                    <span>Oyuncu:</span>
                    <strong className="text-amber-400">{currentUser.tag} {currentUser.username}</strong>
                  </div>

                  <button
                    onClick={() => setLobbyTab('costumes')}
                    className="mt-3 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Kostümü Değiştir</span> →
                  </button>
                </div>

                {/* Center Matchmaking & Start Panel */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <span>🎈 OYUNCAK SAVAŞI ARENASI</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Balon tabancaları ve su balonlarıyla Erangel arenasına atılın! Kaçıncı sırada elenirseniz ona göre sıralama puanı ve altın kazanın.
                      </p>
                    </div>

                    {/* Opponent list */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400 font-bold border-b border-slate-800/80 pb-1">
                        <span>Aktif Lobi Katılımcıları:</span>
                        <span className="text-emerald-400">{getRegisteredOpponents(currentUser.id).length + 1} Gerçek Oyuncu</span>
                      </div>
                      <div className="text-slate-300 flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">
                          ★ {currentUser.username} (Sen)
                        </span>
                        {getRegisteredOpponents(currentUser.id).map((opp) => (
                          <span key={opp.id} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                            {opp.tag} {opp.username}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Selected Weapon Quick Select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-300">Başlangıç Silahı:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.values(TOY_WEAPONS).map((w) => (
                          <button
                            key={w.key}
                            onClick={() => {
                              setSelectedWeapon(w.key);
                              playSound.click();
                            }}
                            className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                              selectedWeapon === w.key
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            <div className="text-lg">{w.icon}</div>
                            <div className="text-[11px] font-black leading-tight mt-0.5">{w.name}</div>
                            <div className="text-[10px] opacity-80">{w.damage} Hasar</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Big Launch Button */}
                    <button
                      onClick={startMatch}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base rounded-xl shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>ARENAYA ATIL (OYUNU BAŞLAT)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHARACTER & COSTUMES SHOP */}
            {lobbyTab === 'costumes' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Karakter & Kostüm Gardırobu</h3>
                    <p className="text-xs text-slate-400">
                      Farklı kostümler seçin! Oyuncak savaşında arenada seçtiğiniz karakter kostümüyle görüneceksiniz.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    Bakiyeniz: <strong>{(currentUser.coins ?? 150).toLocaleString()} 🪙</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {PUBG_COSTUMES.map((c) => {
                    const isUnlocked = currentUser.unlockedPubgCostumes?.includes(c.id) || c.price === 0;
                    const isEquipped = currentUser.selectedPubgCostume === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                          isEquipped
                            ? 'border-amber-400 bg-slate-850 shadow-lg shadow-amber-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-800 text-3xl flex items-center justify-center border border-slate-700 shadow-inner">
                            {c.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-white">{c.name}</h4>
                              {isEquipped && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                  Kuşanıldı
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-snug">{c.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {c.price === 0 ? 'ÜCRETSİZ' : `${c.price} 🪙 Altın`}
                          </span>

                          <button
                            onClick={() => handleSelectCostume(c)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500 cursor-default'
                                : isUnlocked
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                : (currentUser.coins ?? 150) >= c.price
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Kuşanıldı
                              </>
                            ) : isUnlocked ? (
                              'Kuşan'
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" /> Satın Al
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: WEAPONS CATALOG */}
            {lobbyTab === 'weapons' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Oyuncak Silah Cephaneliği</h3>
                    <p className="text-xs text-slate-400">
                      Gerçek silahlar yerine çocuksu ve eğlenceli oyuncak fırlatıcılar!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.values(TOY_WEAPONS).map((w) => {
                    const isSelected = selectedWeapon === w.key;
                    return (
                      <div
                        key={w.key}
                        className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between ${
                          isSelected ? 'border-amber-400 shadow-lg' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 text-2xl flex items-center justify-center border border-slate-700">
                            {w.icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{w.name}</h4>
                            <p className="text-xs text-slate-400">{w.description}</p>
                            <div className="flex gap-3 text-xs font-mono text-slate-300 mt-2">
                              <span>Hasar: <strong className="text-rose-400">{w.damage}</strong></span>
                              <span>Şarjör: <strong className="text-sky-400">{w.ammoMax}</strong></span>
                              <span>Hız: <strong className="text-amber-400">{w.bulletSpeed}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedWeapon(w.key);
                            playSound.click();
                          }}
                          className={`mt-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ Seçili Başlangıç Silahı' : 'Bu Silahı Seç'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: PLACEMENT RULES */}
            {lobbyTab === 'rules' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Sıralamaya Göre Puan ve Altın Ödülleri</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Kaçıncı sırada elendiyseniz o sıraya göre garanti sıralama puanı ve maç altını kazanırsınız. Ayrıca her avladığınız oyuncu için ekstra puan ve altın verilir!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/40">
                    <div className="text-xs font-bold text-amber-400">🥇 1. Sıra (ŞAMPİYON)</div>
                    <div className="text-lg font-black text-white mt-1">+800 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+150 🪙 Altın</div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-700">
                    <div className="text-xs font-bold text-slate-300">🥈 2. Sıra</div>
                    <div className="text-lg font-black text-white mt-1">+500 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+100 🪙 Altın</div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-700">
                    <div className="text-xs font-bold text-amber-600">🥉 3. Sıra</div>
                    <div className="text-lg font-black text-white mt-1">+350 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+75 🪙 Altın</div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-xs font-bold text-slate-400">🎖️ 4. - 5. Sıra</div>
                    <div className="text-base font-black text-white mt-1">+220 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+50 🪙 Altın</div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-xs font-bold text-slate-400">🎖️ 6. - 10. Sıra</div>
                    <div className="text-base font-black text-white mt-1">+120 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+30 🪙 Altın</div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                    <div className="text-xs font-bold text-emerald-400">🎯 Her Bir Av (Kill)</div>
                    <div className="text-base font-black text-white mt-1">+100 Puan</div>
                    <div className="text-xs text-amber-300 font-mono">+25 🪙 Altın</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CANVAS GAMEPLAY VIEW */
          <div className="relative w-full h-full flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={mapSize.width}
              height={mapSize.height}
              className="max-w-full h-auto rounded-lg shadow-inner cursor-crosshair"
            />

            {/* In-Game HUD Overlays */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-4 text-xs font-mono shadow-lg">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Heart className="w-4 h-4 fill-current" />
                <span>{Math.round(playerRef.current.hp)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                <Shield className="w-4 h-4 fill-current" />
                <span>{Math.round(playerRef.current.armor)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Crosshair className="w-4 h-4" />
                <span>{playerRef.current.ammo}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <span>Av:</span>
                <strong className="text-rose-400">{kills}</strong>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <span>Kalan:</span>
                <strong className="text-amber-400">{aliveCount} / {totalPlayersInMatch}</strong>
              </div>
            </div>

            {/* Kill feed */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 max-w-xs pointer-events-none">
              {killFeed.map((msg, i) => (
                <div
                  key={i}
                  className="bg-slate-950/85 text-[11px] text-slate-200 px-2.5 py-1 rounded-lg border border-slate-800/80 shadow"
                >
                  {msg}
                </div>
              ))}
            </div>

            {/* GAME OVER & PLACEMENT RESULT MODAL */}
            {gameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="text-5xl">{won ? '🏆' : '💀'}</div>

                  <h2 className="text-2xl font-black text-white">
                    {won ? 'TEBRİKLER! ARENA ŞAMPİYONU!' : 'ISLANIP ELENDİNİZ!'}
                  </h2>

                  {/* Placement Box */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 font-mono">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-slate-400 text-xs">MAÇ SIRALAMANIZ:</span>
                      <span className="text-xl font-black text-amber-400">
                        #{playerRank} / {totalPlayersInMatch}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">🎖️ Sıralama Puanı:</span>
                      <strong className="text-amber-300">+{placementPointsAwarded} P</strong>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">🎯 Av Puanı ({kills} Av):</span>
                      <strong className="text-emerald-400">+{kills * 100} P</strong>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                      <span className="text-amber-300 font-bold">💰 Kazanılan Altın:</span>
                      <strong className="text-amber-200 font-black text-sm">+{coinsAwarded} 🪙</strong>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800/80">
                      <span className="text-white font-black">TOPLAM MAÇ SKORU:</span>
                      <strong className="text-amber-400 font-black text-lg">+{currentMatchScore} Puan</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={startMatch}
                      className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Tekrar Oyna</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setGameOver(false);
                        setInLobby(true);
                      }}
                      className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Lobi & Menüye Dön
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scoreboard Modal if toggled */}
      {showScoreboard && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Canlı Skorboard - Oyuncak Savaşı Rekortmenleri</span>
            </h3>
            <button
              onClick={() => setShowScoreboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
          <ScoreboardWidget game="pubg" currentUserId={currentUser.id} />
        </div>
      )}
    </div>
  );
};
