import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import { Trophy, RotateCcw, Volume2, VolumeX, Maximize2, Zap, Skull, Flame, Sparkles, ShoppingBag, Check, Play, Palette, Info } from 'lucide-react';
import { UserProfile, SnakeSkin } from '../../types/game';
import { updateGameScore, buyShopItem, equipShopItem } from '../../utils/playerRegistry';
import { ScoreboardWidget } from '../ScoreboardWidget';
import { SNAKE_SKINS } from '../../data/cosmeticsData';
import { subscribePresence, setPresenceGame } from '../../utils/onlinePresence';

interface SnakeIoGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Snake {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  skinId?: string;
  body: Point[];
  angle: number;
  targetAngle: number;
  length: number;
  speed: number;
  isBoosting: boolean;
  isDead: boolean;
  score: number;
  kills: number;
  tag?: string;
}

interface FoodPellet {
  x: number;
  y: number;
  radius: number;
  color: string;
  value: number;
}

export const SnakeIoGame: React.FC<SnakeIoGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inMenu, setInMenu] = useState<boolean>(true);
  const [menuTab, setMenuTab] = useState<'start' | 'skins' | 'rules'>('start');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(100);
  const [kills, setKills] = useState<number>(0);
  const [coinsAwarded, setCoinsAwarded] = useState<number>(0);
  const [rankInArena, setRankInArena] = useState<number>(1);
  const [deathReason, setDeathReason] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  const ARENA_WIDTH = 2400;
  const ARENA_HEIGHT = 2400;
  const VIEW_WIDTH = 1280;
  const VIEW_HEIGHT = 720;

  const currentSkin = SNAKE_SKINS.find(
    (s) => s.id === currentUser.selectedSnakeSkin
  ) || SNAKE_SKINS[0];

  const playerRef = useRef<Snake>({
    id: 'player',
    name: currentUser.username,
    color: currentSkin.color,
    secondaryColor: currentSkin.secondaryColor,
    skinId: currentSkin.id,
    body: [],
    angle: 0,
    targetAngle: 0,
    length: 22,
    speed: 1.28,
    isBoosting: false,
    isDead: false,
    score: 30,
    kills: 0,
    tag: currentUser.tag,
  });

  const mousePosRef = useRef<{ x: number; y: number }>({ x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 });
  const isMouseDownRef = useRef<boolean>(false);
  const keysRef = useRef<{ [code: string]: boolean }>({});
  const opponentsRef = useRef<Snake[]>([]);
  const foodRef = useRef<FoodPellet[]>([]);
  const cameraRef = useRef<{ x: number; y: number }>({ x: 1100, y: 1100 });

  const foodColors = ['#f43f5e', '#38bdf8', '#fbbf24', '#a855f7', '#34d399', '#f97316'];

  const spawnFood = (count: number) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (ARENA_WIDTH - 100) + 50;
      const y = Math.random() * (ARENA_HEIGHT - 100) + 50;
      const val = 1;
      const r = 4.5 + Math.random() * 2.5;

      foodRef.current.push({
        x,
        y,
        radius: r,
        color: foodColors[Math.floor(Math.random() * foodColors.length)],
        value: val,
      });
    }
  };

  const spawnDeathOrbs = (body: Point[], color: string) => {
    body.forEach((pt, idx) => {
      if (idx % 2 === 0) {
        foodRef.current.push({
          x: pt.x + (Math.random() - 0.5) * 16,
          y: pt.y + (Math.random() - 0.5) * 16,
          radius: 5 + Math.random() * 3,
          color,
          value: 2,
        });
      }
    });
  };

  const [onlineOpponents, setOnlineOpponents] = useState<any[]>([]);

  useEffect(() => {
    setPresenceGame('snake');
    const unsub = subscribePresence((data) => {
      const others = data.users.filter((u) => u.id !== currentUser.id);
      setOnlineOpponents(others);
    });
    return unsub;
  }, [currentUser.id]);

  const startMatch = useCallback(() => {
    setInMenu(false);
    mousePosRef.current = { x: VIEW_WIDTH / 2 + 120, y: VIEW_HEIGHT / 2 };
    const startX = Math.random() * 900 + 600;
    const startY = Math.random() * 900 + 600;

    const pBody: Point[] = [];
    for (let i = 0; i < 20; i++) {
      pBody.push({ x: startX - i * 5, y: startY });
    }

    playerRef.current = {
      id: 'player',
      name: currentUser.username,
      color: currentSkin.color,
      secondaryColor: currentSkin.secondaryColor,
      skinId: currentSkin.id,
      body: pBody,
      angle: 0,
      targetAngle: 0,
      length: 20,
      speed: 1.28, // Calibrated calm slither speed
      isBoosting: false,
      isDead: false,
      score: 30,
      kills: 0,
      tag: currentUser.tag,
    };

    // Online real opponents
    const opponentColors = ['#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#3b82f6'];

    opponentsRef.current = onlineOpponents.map((p, idx) => {
      const bx = Math.random() * (ARENA_WIDTH - 400) + 200;
      const by = Math.random() * (ARENA_HEIGHT - 400) + 200;
      const bBody: Point[] = [];
      const initLen = 20 + Math.floor(Math.random() * 10);
      for (let i = 0; i < initLen; i++) {
        bBody.push({ x: bx - i * 5, y: by });
      }
      return {
        id: p.id,
        name: p.username,
        color: opponentColors[idx % opponentColors.length],
        body: bBody,
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        length: initLen,
        speed: 1.22,
        isBoosting: false,
        isDead: false,
        score: initLen * 2,
        kills: 0,
        tag: p.tag || '[TR]',
      };
    });

    foodRef.current = [];
    spawnFood(350);

    setScore(30);
    setKills(0);
    setCoinsAwarded(0);
    setGameOver(false);
    setIsPlaying(true);
  }, [currentUser.id, currentUser.username, currentUser.tag, currentSkin, onlineOpponents]);

  // Handle skin buy / equip
  const handleSelectSkin = (skin: SnakeSkin) => {
    const isUnlocked = currentUser.unlockedSnakeSkins?.includes(skin.id) || skin.price === 0;

    if (isUnlocked) {
      const updated = equipShopItem('snake_skin', skin.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${skin.name}" yılan kostümü kuşandı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('snake_skin', skin.id, skin.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${skin.name}" yılan kostümü satın alındı ve kuşandı!`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
      }
    }

    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Main animation & game loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerRef.current;

      // Player rotation towards mouse or keyboard
      if (!p.isDead && p.body.length > 0) {
        const head = p.body[0];
        if (!head) return;

        // Keyboard arrow/wasd steering support (supports 8 directions and diagonals)
        let keyX = 0;
        let keyY = 0;
        if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) keyX -= 1;
        if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) keyX += 1;
        if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) keyY -= 1;
        if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) keyY += 1;

        if (keyX !== 0 || keyY !== 0) {
          p.targetAngle = Math.atan2(keyY, keyX);
        } else {
          // Direct mouse angle from screen center
          const dx = mousePosRef.current.x - VIEW_WIDTH / 2;
          const dy = mousePosRef.current.y - VIEW_HEIGHT / 2;
          if (Math.hypot(dx, dy) > 8) {
            p.targetAngle = Math.atan2(dy, dx);
          }
        }

        let diff = p.targetAngle - p.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p.angle += diff * 0.075; // Smooth, graceful, authentic snake steering

        p.isBoosting = (isMouseDownRef.current || keysRef.current['Space']) && p.score > 20;
        const speed = p.isBoosting ? 2.05 : 1.28; // Calibrated, calm, controllable slither speed

        if (p.isBoosting && Math.random() < 0.25) {
          p.score = Math.max(15, p.score - 1);
          setScore(p.score);
          const tail = p.body[p.body.length - 1];
          if (tail) {
            foodRef.current.push({
              x: tail.x + (Math.random() - 0.5) * 12,
              y: tail.y + (Math.random() - 0.5) * 12,
              radius: 4,
              color: p.color,
              value: 1,
            });
          }
        }

        const newHead: Point = {
          x: head.x + Math.cos(p.angle) * speed,
          y: head.y + Math.sin(p.angle) * speed,
        };

        // USER REQUIREMENT: "snike io da duvara çarpıncada ölelim"
        if (
          newHead.x <= 24 ||
          newHead.x >= ARENA_WIDTH - 24 ||
          newHead.y <= 24 ||
          newHead.y >= ARENA_HEIGHT - 24
        ) {
          p.isDead = true;
          if (soundEnabled) playSound.snakeDie();
          spawnDeathOrbs(p.body, p.color);
          setGameOver(true);
          setIsPlaying(false);
          setDeathReason('Kırmızı arena duvarına çarparak patladınız!');

          const earned = Math.max(5, Math.floor(p.score / 5) + p.kills * 15);
          setCoinsAwarded(earned);

          const updated = updateGameScore('snake', p.score, {
            kills: p.kills,
            coinsEarned: earned,
          });
          if (updated) onProfileUpdated(updated);
          return;
        }

        p.body.unshift(newHead);

        // Balanced, authentic growth: snake grows steadily without exploding too quickly!
        const targetLength = Math.floor(18 + p.score / 5.5);
        while (p.body.length > targetLength) {
          p.body.pop();
        }

        cameraRef.current = { x: newHead.x, y: newHead.y };
      }

      // Update AI Opponent Snakes
      opponentsRef.current.forEach((opp) => {
        if (opp.isDead || opp.body.length === 0) return;

        const head = opp.body[0];

        if (Math.random() < 0.04) {
          opp.targetAngle = Math.random() * Math.PI * 2;
        }

        let diff = opp.targetAngle - opp.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        opp.angle += diff * 0.08;

        const newHead: Point = {
          x: head.x + Math.cos(opp.angle) * opp.speed,
          y: head.y + Math.sin(opp.angle) * opp.speed,
        };

        // Opponents also die if they crash into the border wall!
        if (
          newHead.x <= 22 ||
          newHead.x >= ARENA_WIDTH - 22 ||
          newHead.y <= 22 ||
          newHead.y >= ARENA_HEIGHT - 22
        ) {
          opp.isDead = true;
          spawnDeathOrbs(opp.body, opp.color);
          return;
        }

        opp.body.unshift(newHead);

        const targetLen = Math.floor(18 + opp.score / 5.5);
        while (opp.body.length > targetLen) {
          opp.body.pop();
        }
      });

      // Eat Food pellets & magnetic vacuum attraction (instant rewarding growth!)
      const allSnakes = [p, ...opponentsRef.current].filter((s) => !s.isDead);

      foodRef.current = foodRef.current.filter((food) => {
        for (const snake of allSnakes) {
          const head = snake.body[0];
          if (!head) continue;
          const dist = Math.hypot(head.x - food.x, head.y - food.y);

          // Magnetic vacuum when close (Food flies smoothly into snake's mouth):
          if (dist < 70) {
            food.x += (head.x - food.x) * 0.3;
            food.y += (head.y - food.y) * 0.3;
          }

          if (dist < 30) {
            snake.score += food.value; // Balanced, natural 1-2 points per pellet
            if (snake.id === 'player') {
              setScore(p.score);
              if (soundEnabled && Math.random() < 0.35) playSound.snakeEat();
            }
            return false;
          }
        }
        return true;
      });

      if (foodRef.current.length < 350) {
        spawnFood(60);
      }

      // HEAD-TO-BODY COLLISION CHECK
      // 1. Did player hit another snake's body?
      if (!p.isDead && p.body.length > 0) {
        const pHead = p.body[0];
        for (const opp of opponentsRef.current) {
          if (opp.isDead) continue;
          for (let i = 3; i < opp.body.length; i++) {
            const seg = opp.body[i];
            if (Math.hypot(pHead.x - seg.x, pHead.y - seg.y) < 14) {
              p.isDead = true;
              if (soundEnabled) playSound.snakeDie();
              spawnDeathOrbs(p.body, p.color);
              setGameOver(true);
              setIsPlaying(false);
              setDeathReason('Başka bir yılanın gövdesine çarparak patladınız!');

              // USER REQUIREMENT:
              // "ölenene kadar topladığımız skora göre bir para versin"
              const earned = Math.max(5, Math.floor(p.score / 5) + (p.kills * 15));
              setCoinsAwarded(earned);

              const updated = updateGameScore('snake', p.score, {
                kills: p.kills,
                coinsEarned: earned,
              });
              if (updated) onProfileUpdated(updated);
              break;
            }
          }
          if (p.isDead) break;
        }
      }

      // 2. Did an opponent snake hit player's body?
      opponentsRef.current.forEach((opp) => {
        if (opp.isDead || opp.body.length === 0) return;
        const bHead = opp.body[0];

        if (!p.isDead) {
          for (let i = 3; i < p.body.length; i++) {
            const pSeg = p.body[i];
            if (Math.hypot(bHead.x - pSeg.x, bHead.y - pSeg.y) < 14) {
              opp.isDead = true;
              spawnDeathOrbs(opp.body, opp.color);
              p.kills += 1;
              p.score += 40;
              setKills(p.kills);
              setScore(p.score);
              if (soundEnabled) playSound.victory();
              break;
            }
          }
        }
      });

      // Calculate arena rank
      const aliveSnakes = [p, ...opponentsRef.current].filter((s) => !s.isDead);
      aliveSnakes.sort((a, b) => b.score - a.score);
      const myRank = aliveSnakes.findIndex((s) => s.id === 'player') + 1;
      setRankInArena(myRank > 0 ? myRank : 1);

      // --- RENDER ARENA CANVAS ---
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      const cam = cameraRef.current;
      ctx.save();
      ctx.translate(-cam.x + VIEW_WIDTH / 2, -cam.y + VIEW_HEIGHT / 2);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x <= ARENA_WIDTH; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= ARENA_HEIGHT; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }

      // Arena Border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Glowing Center Feast Zone ("yemleri ortaya al")
      ctx.save();
      const centerGrad = ctx.createRadialGradient(
        ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 50,
        ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 440
      );
      centerGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
      centerGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
      centerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 440, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 430, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Neon center label
      ctx.fillStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ MERKEZ ŞÖLEN ALANI • MEGA YEM BÖLGESİ ⚡', ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      ctx.restore();

      // Food Pellets
      foodRef.current.forEach((f) => {
        if (
          f.x < cam.x - VIEW_WIDTH / 2 - 20 ||
          f.x > cam.x + VIEW_WIDTH / 2 + 20 ||
          f.y < cam.y - VIEW_HEIGHT / 2 - 20 ||
          f.y > cam.y + VIEW_HEIGHT / 2 + 20
        ) {
          return;
        }

        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Snakes with Costumes
      const renderSnake = (snake: Snake, isMainPlayer: boolean) => {
        if (snake.isDead || snake.body.length === 0) return;

        // Dynamic thickness scaling: snake expands gracefully as it eats
        const bodyRadius = Math.min(23, 10.5 + Math.sqrt(snake.score) * 0.28);

        // Body segments
        for (let i = snake.body.length - 1; i >= 0; i--) {
          const pt = snake.body[i];
          if (
            pt.x < cam.x - VIEW_WIDTH / 2 - 40 ||
            pt.x > cam.x + VIEW_WIDTH / 2 + 40 ||
            pt.y < cam.y - VIEW_HEIGHT / 2 - 40 ||
            pt.y > cam.y + VIEW_HEIGHT / 2 + 40
          ) {
            continue;
          }

          if (isMainPlayer) {
            const pat = currentSkin.pattern;
            if (pat === 'rainbow') {
              const hue = (i * 12 + Date.now() / 20) % 360;
              ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
            } else if (pat === 'fire') {
              ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#f97316';
            } else if (pat === 'cyber') {
              ctx.fillStyle = i % 3 === 0 ? '#8b5cf6' : '#06b6d4';
            } else if (pat === 'tiger') {
              ctx.fillStyle = i % 2 === 0 ? '#1c1917' : '#f59e0b';
            } else if (pat === 'gold_king') {
              ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#fef08a';
            } else if (pat === 'candy') {
              ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#ffffff';
            } else if (pat === 'galaxy') {
              ctx.fillStyle = i % 2 === 0 ? '#7c3aed' : '#06b6d4';
            } else {
              ctx.fillStyle = snake.color;
            }
          } else {
            ctx.fillStyle = snake.color;
          }

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, bodyRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Head & Eyes
        const head = snake.body[0];
        if (head) {
          ctx.save();
          ctx.translate(head.x, head.y);
          ctx.rotate(snake.angle);

          // Animated Cute Pink Flicking Tongue (Authentic Snake.io)
          const tonguePhase = (Date.now() / 250) % 10;
          if (tonguePhase < 3) {
            const tongueLen = bodyRadius * (0.9 + tonguePhase * 0.25);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(bodyRadius * 0.8, 0);
            ctx.lineTo(bodyRadius * 0.8 + tongueLen, 0);
            ctx.lineTo(bodyRadius * 0.8 + tongueLen + 4, -3);
            ctx.moveTo(bodyRadius * 0.8 + tongueLen, 0);
            ctx.lineTo(bodyRadius * 0.8 + tongueLen + 4, 3);
            ctx.stroke();
          }

          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bodyRadius * 0.4, -bodyRadius * 0.45, bodyRadius * 0.35, 0, Math.PI * 2);
          ctx.arc(bodyRadius * 0.4, bodyRadius * 0.45, bodyRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(bodyRadius * 0.55, -bodyRadius * 0.45, bodyRadius * 0.20, 0, Math.PI * 2);
          ctx.arc(bodyRadius * 0.55, bodyRadius * 0.45, bodyRadius * 0.20, 0, Math.PI * 2);
          ctx.fill();

          // Specular eye shine
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bodyRadius * 0.60, -bodyRadius * 0.50, bodyRadius * 0.08, 0, Math.PI * 2);
          ctx.arc(bodyRadius * 0.60, bodyRadius * 0.40, bodyRadius * 0.08, 0, Math.PI * 2);
          ctx.fill();

          // Head Accessories for Player
          if (isMainPlayer && currentSkin.accessory) {
            const acc = currentSkin.accessory;
            if (acc === 'crown') {
              // Royal Crown
              ctx.fillStyle = '#facc15';
              ctx.beginPath();
              ctx.moveTo(-bodyRadius * 0.2, -bodyRadius * 0.6);
              ctx.lineTo(bodyRadius * 0.4, -bodyRadius * 0.6);
              ctx.lineTo(bodyRadius * 0.3, -bodyRadius * 1.3);
              ctx.lineTo(bodyRadius * 0.1, -bodyRadius * 0.8);
              ctx.lineTo(-bodyRadius * 0.1, -bodyRadius * 1.3);
              ctx.closePath();
              ctx.fill();
            } else if (acc === 'sunglasses') {
              // Cool sunglasses
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(bodyRadius * 0.2, -bodyRadius * 0.7, bodyRadius * 0.5, bodyRadius * 1.4);
            } else if (acc === 'horns') {
              // Devil Fire horns
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.moveTo(0, -bodyRadius * 0.6);
              ctx.lineTo(-bodyRadius * 0.4, -bodyRadius * 1.4);
              ctx.lineTo(bodyRadius * 0.2, -bodyRadius * 0.6);
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(0, bodyRadius * 0.6);
              ctx.lineTo(-bodyRadius * 0.4, bodyRadius * 1.4);
              ctx.lineTo(bodyRadius * 0.2, bodyRadius * 0.6);
              ctx.fill();
            } else if (acc === 'party_hat') {
              // Party hat
              ctx.fillStyle = '#ec4899';
              ctx.beginPath();
              ctx.moveTo(-bodyRadius * 0.3, -bodyRadius * 0.4);
              ctx.lineTo(-bodyRadius * 1.2, 0);
              ctx.lineTo(-bodyRadius * 0.3, bodyRadius * 0.4);
              ctx.closePath();
              ctx.fill();
            }
          }

          ctx.restore();

          // Player Name above head
          ctx.fillStyle = isMainPlayer ? '#10b981' : '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${isMainPlayer ? currentSkin.icon : ''} ${snake.tag || ''} ${snake.name}`,
            head.x,
            head.y - bodyRadius - 10
          );
        }
      };

      // Draw all snakes
      opponentsRef.current.forEach((opp) => renderSnake(opp, false));
      renderSnake(p, true);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, soundEnabled, onProfileUpdated, currentSkin]);

  // Active Mouse, Touch and Keyboard steering listeners
  useEffect(() => {
    if (!isPlaying) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEW_WIDTH / rect.width;
      const scaleY = VIEW_HEIGHT / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = VIEW_WIDTH / rect.width;
        const scaleY = VIEW_HEIGHT / rect.height;
        mousePosRef.current = {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDownRef.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) isMouseDownRef.current = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'Space') isMouseDownRef.current = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (e.code === 'Space') isMouseDownRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', () => { isMouseDownRef.current = true; }, { passive: true });
    window.addEventListener('touchend', () => { isMouseDownRef.current = false; });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
            {currentSkin.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">SNAKE.IO: YILAN SAVAŞI</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                FAN OYUNU
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kuşanılan Kostüm: <strong className="text-emerald-400">{currentSkin.name}</strong> • Kafa Çarpınca Patlar!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
            <span>🐍</span>
            <span className="text-sm font-black text-amber-200">{(currentUser.snakeCoins ?? 0).toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 uppercase">Snake Altını</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
            title="Ses Aç/Kapat"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Skorboard</span>
          </button>

          {onFullscreenRequest && (
            <button
              onClick={onFullscreenRequest}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
              title="Ekranı Büyüt (Tam Ekran)"
            >
              <span>🗖 Büyüt</span>
            </button>
          )}

          {!inMenu && (
            <button
              onClick={() => {
                setIsPlaying(false);
                setGameOver(false);
                setInMenu(true);
              }}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-lg border border-emerald-500/40 transition cursor-pointer"
            >
              Dolaba Dön
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Menu or Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[540px]">
        {inMenu ? (
          /* INTERACTIVE WARDROBE & LOBBY MENU */
          <div className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
            {/* Menu Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuTab('start')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'start'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>ARENAYA GİR</span>
                </button>

                <button
                  onClick={() => setMenuTab('skins')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'skins'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>KOSTÜM & KOZMETİK DOLABI ({SNAKE_SKINS.length})</span>
                </button>

                <button
                  onClick={() => setMenuTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'rules'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>SKORLA PARA KAZANMA REHBERİ</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span>Snake.io Cüzdanı:</span>
                <strong className="text-amber-200">{(currentUser.snakeCoins ?? 0).toLocaleString()} 🪙</strong>
              </div>
            </div>

            {/* Notification message */}
            {shopFeedback && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 text-center animate-fade-in">
                {shopFeedback}
              </div>
            )}

            {/* TAB 1: START & PREVIEW */}
            {menuTab === 'start' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Snake Card Preview */}
                <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    Seçili Yılan
                  </div>

                  <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-5xl my-3 shadow-inner border border-slate-700">
                    {currentSkin.icon}
                  </div>

                  <h3 className="text-lg font-black text-white">{currentSkin.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{currentSkin.description}</p>

                  <div className="w-full mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-300">
                    <span>Oyuncu:</span>
                    <strong className="text-emerald-400">{currentUser.tag} {currentUser.username}</strong>
                  </div>

                  <button
                    onClick={() => setMenuTab('skins')}
                    className="mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Kostüm Dolabına Git</span> →
                  </button>
                </div>

                {/* Matchmaking & Start Panel */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <span>🐍 SLITHER IO YILAN ARENASI</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Arenada beslenip büyüyün, rakipleri kendi gövdenize çarptırıp yok edin! Ölene kadar topladığınız her skora göre doğrudan altın kazanırsınız.
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400">En Yüksek Skor:</span>
                        <div className="text-base font-black text-emerald-400 mt-0.5">
                          {(currentUser.snakeHighscore || 0).toLocaleString()} Puan
                        </div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Toplam Avlanan Yılan:</span>
                        <div className="text-base font-black text-amber-400 mt-0.5">
                          {(currentUser.snakeKills || 0)} Av
                        </div>
                      </div>
                    </div>

                    {/* Launch Button */}
                    <button
                      onClick={startMatch}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base rounded-xl shadow-lg shadow-emerald-500/30 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>ARENAYA GİR (YILANI BAŞLAT)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SKINS & COSMETICS */}
            {menuTab === 'skins' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Yılan Kostümleri & Kozmetikler</h3>
                    <p className="text-xs text-slate-400">
                      Ölene kadar kazandığınız altınlarla Kral Tacı, Cehennem Boynuzu, Galaksi ve Gökkuşağı desenleri açın!
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    Snake Bakiyeniz: <strong>{(currentUser.snakeCoins ?? 0).toLocaleString()} 🪙</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {SNAKE_SKINS.map((s) => {
                    const isUnlocked = currentUser.unlockedSnakeSkins?.includes(s.id) || s.price === 0;
                    const isEquipped = currentUser.selectedSnakeSkin === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                          isEquipped
                            ? 'border-emerald-400 bg-slate-850 shadow-lg shadow-emerald-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {s.imageUrl && (
                          <div className="relative h-24 w-full rounded-xl overflow-hidden my-2 border border-slate-800 shadow">
                            <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-xl flex items-center justify-center border border-slate-700 shadow-inner shrink-0">
                            {s.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-white">{s.name}</h4>
                            </div>
                            {isEquipped && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                Kuşanıldı
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2 leading-snug">{s.description}</p>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {s.price === 0 ? 'ÜCRETSİZ' : `${s.price} 🪙`}
                          </span>

                          <button
                            onClick={() => handleSelectSkin(s)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500 cursor-default'
                                : isUnlocked
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                : (currentUser.snakeCoins ?? 0) >= s.price
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Seçili
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

            {/* TAB 3: RULES */}
            {menuTab === 'rules' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-400" />
                  <span>Skorla Para Kazanma & Oyun Mekaniği</span>
                </h3>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">1. Skora Göre Otomatik Altın Ödülü:</strong>
                    <p className="text-slate-400 mt-1">
                      Her maçta ölene kadar topladığınız puan altın paraya dönüştürülür: Her 25 skor başına 1 altın, ayrıca avladığınız her yılan için +15 altın nakit bonus verilir!
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-rose-400">2. Kafa Çarpışması Kuralı:</strong>
                    <p className="text-slate-400 mt-1">
                      Kafanız başka bir yılanın gövdesine değerse anında ölürsünüz ve enerjiniz etrafa saçılır. Ancak rakipler sizin gövdenize kafasını çarparsa onlar ölür ve av puanı sizindir!
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-amber-400">3. Kozmetik & Kostümler:</strong>
                    <p className="text-slate-400 mt-1">
                      Kazandığınız altınlarla Kostüm Dolabından Kraliyet Tacı, Gökkuşağı ve Alev kostümlerini açıp rakiplerinize hava atabilirsiniz!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CANVAS GAMEPLAY VIEW */
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              className="w-full h-auto max-h-[84vh] aspect-[16/9] object-cover rounded-2xl shadow-2xl cursor-crosshair border border-slate-800 block"
            />

            {/* In-Game HUD Overlays */}
            <div className="absolute top-4 left-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-3 flex items-center gap-4 text-xs font-mono shadow-xl">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>Skor: {score}</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <Skull className="w-4 h-4" />
                <span>Av: {kills}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span>🪙 Tahmini Altın:</span>
                <span>+{Math.max(5, Math.floor(score / 25) + kills * 15)}</span>
              </div>
            </div>

            <div className="absolute top-4 right-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-1 text-xs font-mono shadow-xl">
              <div className="text-slate-400 text-[10px]">ARENA SIRASI:</div>
              <div className="text-base font-black text-emerald-400">#{rankInArena}</div>
            </div>

            {/* SPRINT HINT */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/75 border border-slate-800/80 px-3 py-1 rounded-full text-[11px] text-slate-400 font-mono pointer-events-none">
              Sol Tık Basılı Tut = Hızlı Koş (Sprint) ⚡
            </div>

            {/* GAME OVER MODAL */}
            {gameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="text-5xl">☠️</div>
                  <h2 className="text-2xl font-black text-white">YILANINIZ PATLADI!</h2>
                  <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5">
                    <span>⚠️</span>
                    <span>{deathReason || 'Arena engeline çarptınız!'}</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Toplanan Skor:</span>
                      <strong className="text-emerald-400 text-sm">{score} Puan</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Avlanan Rakipler:</span>
                      <strong className="text-rose-400 text-sm">{kills} Av</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                      <span className="text-amber-300 font-bold">💰 KAZANILAN ALTIN:</span>
                      <strong className="text-amber-200 font-black text-base">+{coinsAwarded} 🪙</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={startMatch}
                      className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Tekrar Başla</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setGameOver(false);
                        setInMenu(true);
                      }}
                      className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Kostüm Dolabına Dön
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
              <span>Canlı Skorboard - Snake.io Rekortmenleri</span>
            </h3>
            <button
              onClick={() => setShowScoreboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
          <ScoreboardWidget game="snake" currentUserId={currentUser.id} />
        </div>
      )}
    </div>
  );
};
