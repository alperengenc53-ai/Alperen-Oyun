import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  User,
  ShoppingBag,
  Sparkles,
  Play,
  Copy,
  Check,
  Palette,
  Info,
  ArrowRight,
  Flame,
  Award,
  Globe
} from 'lucide-react';
import { UserProfile, PoolCue, PoolTableSkin } from '../../types/game';
import {
  updateGameScore,
  getRegisteredOpponents,
  buyShopItem,
  equipShopItem,
  getAllRegisteredPlayers,
} from '../../utils/playerRegistry';
import { ScoreboardWidget } from '../ScoreboardWidget';
import { POOL_CUES, POOL_TABLES } from '../../data/cosmeticsData';

interface PoolGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface Ball {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isStripe: boolean;
  isCueBall: boolean;
  isEightBall: boolean;
  inPocket: boolean;
}

interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export const PoolGame: React.FC<PoolGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Menu and Tab state
  const [inMenu, setInMenu] = useState<boolean>(true);
  const [menuTab, setMenuTab] = useState<'lobby' | 'shop' | 'rules'>('lobby');
  const [gameMode, setGameMode] = useState<'local_friend' | 'online_lobby' | 'ai_rival' | 'practice'>('local_friend');
  const [friendName, setFriendName] = useState<string>('Arkadaş (P2)');
  const [roomCode, setRoomCode] = useState<string>('POOL-77');
  const [joinRoomInput, setJoinRoomInput] = useState<string>('');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);

  // Active match state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [turn, setTurn] = useState<1 | 2>(1); // 1: Player 1 (User), 2: Player 2 / Friend / Rival
  const [p1BallType, setP1BallType] = useState<'solid' | 'stripe' | null>(null);
  const [p2BallType, setP2BallType] = useState<'solid' | 'stripe' | null>(null);
  const [ballsMoving, setBallsMoving] = useState<boolean>(false);
  const [foulMessage, setFoulMessage] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<{ player: number; name: string } | null>(null);
  const [pocketedThisTurn, setPocketedThisTurn] = useState<number[]>([]);
  const [firstHitThisTurn, setFirstHitThisTurn] = useState<number | null>(null);
  const [matchCoinsEarned, setMatchCoinsEarned] = useState<number>(0);
  const [matchScoreEarned, setMatchScoreEarned] = useState<number>(0);

  // Ball in Hand (after foul)
  const [ballInHand, setBallInHand] = useState<boolean>(false);

  // Shooting controls
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [shotPower, setShotPower] = useState<number>(50); // 1 - 100
  const isDraggingCueRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cosmetics
  const currentCue = POOL_CUES.find((c) => c.id === currentUser.selectedPoolCue) || POOL_CUES[0];
  const currentTable = POOL_TABLES.find((t) => t.id === currentUser.selectedPoolTable) || POOL_TABLES[0];

  // Table dimensions
  const TABLE_WIDTH = 840;
  const TABLE_HEIGHT = 460;
  const BORDER_SIZE = 40;
  const PLAY_X = BORDER_SIZE;
  const PLAY_Y = BORDER_SIZE;
  const PLAY_WIDTH = TABLE_WIDTH - BORDER_SIZE * 2;
  const PLAY_HEIGHT = TABLE_HEIGHT - BORDER_SIZE * 2;
  const BALL_RADIUS = 12;

  // Pocket coordinates
  const pockets: Pocket[] = [
    { x: PLAY_X + 4, y: PLAY_Y + 4, radius: 24 }, // Top-Left
    { x: PLAY_X + PLAY_WIDTH / 2, y: PLAY_Y - 2, radius: 22 }, // Top-Center
    { x: PLAY_X + PLAY_WIDTH - 4, y: PLAY_Y + 4, radius: 24 }, // Top-Right
    { x: PLAY_X + 4, y: PLAY_Y + PLAY_HEIGHT - 4, radius: 24 }, // Bottom-Left
    { x: PLAY_X + PLAY_WIDTH / 2, y: PLAY_Y + PLAY_HEIGHT + 2, radius: 22 }, // Bottom-Center
    { x: PLAY_X + PLAY_WIDTH - 4, y: PLAY_Y + PLAY_HEIGHT - 4, radius: 24 }, // Bottom-Right
  ];

  const ballsRef = useRef<Ball[]>([]);

  // Ball color map
  const ballColors: Record<number, string> = {
    0: '#ffffff', // Cue ball
    1: '#eab308', // Yellow
    2: '#2563eb', // Blue
    3: '#dc2626', // Red
    4: '#9333ea', // Purple
    5: '#ea580c', // Orange
    6: '#16a34a', // Green
    7: '#831843', // Maroon
    8: '#0f172a', // 8-Ball Black
    9: '#eab308', // Stripe Yellow
    10: '#2563eb', // Stripe Blue
    11: '#dc2626', // Stripe Red
    12: '#9333ea', // Stripe Purple
    13: '#ea580c', // Stripe Orange
    14: '#16a34a', // Stripe Green
    15: '#831843', // Stripe Maroon
  };

  // Reset & Rack balls
  const rackBalls = useCallback(() => {
    const list: Ball[] = [];

    // Cue ball on left spot
    list.push({
      id: 0,
      number: 0,
      x: PLAY_X + PLAY_WIDTH * 0.25,
      y: PLAY_Y + PLAY_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: '#ffffff',
      isStripe: false,
      isCueBall: true,
      isEightBall: false,
      inPocket: false,
    });

    // 15 Object balls in standard triangle rack on right
    const rackStartX = PLAY_X + PLAY_WIDTH * 0.72;
    const rackCenterY = PLAY_Y + PLAY_HEIGHT * 0.5;
    const r = BALL_RADIUS;
    const dx = r * 1.76;
    const dy = r * 2.05;

    // Pattern of ball numbers: 8 in center
    const rackPattern: number[][] = [
      [1],
      [2, 9],
      [10, 8, 3],
      [11, 4, 12, 5],
      [6, 13, 7, 14, 15],
    ];

    rackPattern.forEach((row, rowIdx) => {
      const rx = rackStartX + rowIdx * dx;
      const startY = rackCenterY - ((row.length - 1) * dy) / 2;
      row.forEach((num, colIdx) => {
        const ry = startY + colIdx * dy;
        const isEight = num === 8;
        const isStripe = num >= 9 && num <= 15;
        list.push({
          id: num,
          number: num,
          x: rx,
          y: ry,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: ballColors[num] || '#ffffff',
          isStripe,
          isCueBall: false,
          isEightBall: isEight,
          inPocket: false,
        });
      });
    });

    ballsRef.current = list;
    setTurn(1);
    setP1BallType(null);
    setP2BallType(null);
    setFoulMessage(null);
    setGameOver(false);
    setWinner(null);
    setBallInHand(false);
    setMatchCoinsEarned(0);
    setMatchScoreEarned(0);
    setPocketedThisTurn([]);
    setFirstHitThisTurn(null);
  }, [PLAY_X, PLAY_Y, PLAY_WIDTH, PLAY_HEIGHT]);

  // Start match
  const startMatch = () => {
    rackBalls();
    setInMenu(false);
    setIsPlaying(true);
    playSound.poolCue();
  };

  // BroadcastChannel for cross-window / tab multiplayer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('oyundiyari_8ball_pool_sync');
      ch.onmessage = (e) => {
        if (!e.data) return;
        const data = e.data;
        if (data.type === 'POOL_SHOT' && data.room === roomCode && isPlaying) {
          // Sync shot
          executeShot(data.vx, data.vy);
        }
      };
    } catch {}

    return () => {
      try {
        ch?.close();
      } catch {}
    };
  }, [roomCode, isPlaying]);

  // Execute a shot with velocity
  const executeShot = (vx: number, vy: number) => {
    const cueBall = ballsRef.current.find((b) => b.isCueBall && !b.inPocket);
    if (!cueBall) return;

    cueBall.vx = vx;
    cueBall.vy = vy;
    setBallsMoving(true);
    setPocketedThisTurn([]);
    setFirstHitThisTurn(null);
    if (soundEnabled) playSound.poolCue();
  };

  // Shoot button or click handler
  const handleShoot = () => {
    if (ballsMoving || gameOver) return;
    const powerMult = (shotPower / 100) * (currentCue.power / 70) * 18;
    const vx = Math.cos(aimAngle) * powerMult;
    const vy = Math.sin(aimAngle) * powerMult;

    // Send broadcast if online mode
    if (gameMode === 'online_lobby') {
      try {
        const ch = new BroadcastChannel('oyundiyari_8ball_pool_sync');
        ch.postMessage({ type: 'POOL_SHOT', room: roomCode, vx, vy });
        ch.close();
      } catch {}
    }

    executeShot(vx, vy);
  };

  // Buy or equip cosmetic item
  const handleSelectCue = (cue: PoolCue) => {
    const isUnlocked = currentUser.unlockedPoolCues?.includes(cue.id) || cue.price === 0;
    if (isUnlocked) {
      const updated = equipShopItem('pool_cue', cue.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${cue.name}" kuşanıldı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('pool_cue', cue.id, cue.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${cue.name}" satın alındı ve kuşanıldı!`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
      }
    }
    setTimeout(() => setShopFeedback(null), 3000);
  };

  const handleSelectTable = (tbl: PoolTableSkin) => {
    const isUnlocked = currentUser.unlockedPoolTables?.includes(tbl.id) || tbl.price === 0;
    if (isUnlocked) {
      const updated = equipShopItem('pool_table', tbl.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${tbl.name}" masa çuhası seçildi!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('pool_table', tbl.id, tbl.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${tbl.name}" masa satın alındı ve seçildi!`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
      }
    }
    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Turn Resolution Logic once all balls stop
  const resolveTurn = useCallback(
    (pocketed: number[]) => {
      const cueBallPocketed = pocketed.includes(0);
      const eightBallPocketed = pocketed.includes(8);
      const activePlayer = turn;
      const activePlayerName =
        activePlayer === 1
          ? currentUser.username
          : gameMode === 'local_friend'
          ? friendName
          : 'Rakip';

      let nextTurn: 1 | 2 = activePlayer === 1 ? 2 : 1;
      let keepsTurn = false;

      // 1. 8-Ball Check
      if (eightBallPocketed) {
        // Did the active player clear all their balls?
        const myType = activePlayer === 1 ? p1BallType : p2BallType;
        const myRemaining = ballsRef.current.filter((b) => {
          if (b.inPocket || b.isCueBall || b.isEightBall) return false;
          if (myType === 'solid') return !b.isStripe;
          if (myType === 'stripe') return b.isStripe;
          return true;
        });

        if (myType && myRemaining.length === 0 && !cueBallPocketed) {
          // VICTORY!
          setGameOver(true);
          setWinner({ player: activePlayer, name: activePlayerName });
          if (soundEnabled) playSound.victory();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

          // Coins and score reward
          const earnedCoins = 100 + pocketed.length * 15;
          const earnedScore = 250;
          setMatchCoinsEarned(earnedCoins);
          setMatchScoreEarned(earnedScore);
          const updated = updateGameScore('pool', earnedScore, {
            win: activePlayer === 1,
            coinsEarned: earnedCoins,
          });
          if (updated) onProfileUpdated(updated);
        } else {
          // FOUL LOSS: 8-ball potted prematurely or with cue ball!
          const otherPlayer: 1 | 2 = activePlayer === 1 ? 2 : 1;
          const otherName =
            otherPlayer === 1
              ? currentUser.username
              : gameMode === 'local_friend'
              ? friendName
              : 'Rakip';
          setGameOver(true);
          setWinner({ player: otherPlayer, name: otherName });
          setFoulMessage(`❌ 8 Numaralı Siyah Top vaktinden önce cebe girdiği için ${otherName} KAZANDI!`);
        }
        return;
      }

      // 2. Cue Ball Pocketed (Scratch / Foul)
      if (cueBallPocketed) {
        setFoulMessage(`⚠️ Beyaz top cebe girdi! FAUL: Sıra rakibe geçti ve Beyaz Top Serbest (İstediğin yere koyabilirsin).`);
        if (soundEnabled) playSound.hit();

        // Respawn cue ball at center-left
        const cueBall = ballsRef.current.find((b) => b.isCueBall);
        if (cueBall) {
          cueBall.inPocket = false;
          cueBall.x = PLAY_X + PLAY_WIDTH * 0.25;
          cueBall.y = PLAY_Y + PLAY_HEIGHT * 0.5;
          cueBall.vx = 0;
          cueBall.vy = 0;
        }
        setBallInHand(true);
        setTurn(nextTurn);
        return;
      }

      // 3. Assign Ball Types if open table
      const objectBallsPocketed = pocketed.filter((id) => id >= 1 && id <= 15 && id !== 8);
      if (!p1BallType && objectBallsPocketed.length > 0) {
        const first = ballsRef.current.find((b) => b.id === objectBallsPocketed[0]);
        if (first) {
          if (first.isStripe) {
            setP1BallType(activePlayer === 1 ? 'stripe' : 'solid');
            setP2BallType(activePlayer === 1 ? 'solid' : 'stripe');
          } else {
            setP1BallType(activePlayer === 1 ? 'solid' : 'stripe');
            setP2BallType(activePlayer === 1 ? 'stripe' : 'solid');
          }
        }
      }

      // 4. Did active player pocket one of their own balls?
      const myBallType = activePlayer === 1 ? p1BallType : p2BallType;
      if (myBallType && objectBallsPocketed.length > 0) {
        const myPotted = objectBallsPocketed.some((id) => {
          const b = ballsRef.current.find((x) => x.id === id);
          if (!b) return false;
          return myBallType === 'stripe' ? b.isStripe : !b.isStripe;
        });
        if (myPotted) {
          keepsTurn = true;
        }
      } else if (!myBallType && objectBallsPocketed.length > 0) {
        // On open table, any legal ball keeps turn
        keepsTurn = true;
      }

      if (keepsTurn) {
        setFoulMessage(null);
        // Reward small score for potting ball
        setMatchScoreEarned((prev) => prev + objectBallsPocketed.length * 30);
      } else {
        setTurn(nextTurn);
        setFoulMessage(null);
      }
    },
    [
      turn,
      currentUser.username,
      friendName,
      gameMode,
      p1BallType,
      p2BallType,
      soundEnabled,
      onProfileUpdated,
      PLAY_X,
      PLAY_Y,
      PLAY_WIDTH,
      PLAY_HEIGHT,
    ]
  );

  // AI Turn simulation for 'ai_rival' mode
  useEffect(() => {
    if (!isPlaying || ballsMoving || gameOver || inMenu) return;
    if (gameMode === 'ai_rival' && turn === 2) {
      const timer = setTimeout(() => {
        const cueBall = ballsRef.current.find((b) => b.isCueBall && !b.inPocket);
        if (!cueBall) return;

        // Find available target ball
        const validBalls = ballsRef.current.filter((b) => {
          if (b.inPocket || b.isCueBall) return false;
          if (p2BallType === 'solid') return !b.isStripe && b.id !== 8;
          if (p2BallType === 'stripe') return b.isStripe && b.id !== 8;
          return true;
        });

        const target = validBalls[Math.floor(Math.random() * validBalls.length)] || ballsRef.current.find((b) => b.id === 8);
        if (!target) return;

        // Aim towards target with slight inaccuracy
        const dx = target.x - cueBall.x;
        const dy = target.y - cueBall.y;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.08;
        const power = 35 + Math.random() * 30;

        const powerMult = (power / 100) * 16;
        executeShot(Math.cos(angle) * powerMult, Math.sin(angle) * powerMult);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [turn, isPlaying, ballsMoving, gameOver, inMenu, gameMode, p2BallType]);

  // Main 2D Physics Loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const FRICTION = 0.988;
    const CUSHION_RESTITUTION = 0.88;

    const loop = () => {
      let isAnyBallMoving = false;
      const balls = ballsRef.current;

      // 1. Move balls and handle cushion bounces & pockets
      balls.forEach((ball) => {
        if (ball.inPocket) return;

        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        if (Math.hypot(ball.vx, ball.vy) < 0.05) {
          ball.vx = 0;
          ball.vy = 0;
        } else {
          isAnyBallMoving = true;
        }

        // Check pockets
        pockets.forEach((pkt) => {
          if (Math.hypot(ball.x - pkt.x, ball.y - pkt.y) < pkt.radius * 0.85) {
            ball.inPocket = true;
            ball.vx = 0;
            ball.vy = 0;
            setPocketedThisTurn((prev) => [...prev, ball.id]);
            if (soundEnabled) playSound.poolPocket();
          }
        });

        // Cushion Bounces (Left, Right, Top, Bottom)
        const minX = PLAY_X + ball.radius;
        const maxX = PLAY_X + PLAY_WIDTH - ball.radius;
        const minY = PLAY_Y + ball.radius;
        const maxY = PLAY_Y + PLAY_HEIGHT - ball.radius;

        if (ball.x <= minX) {
          ball.x = minX;
          ball.vx = -ball.vx * CUSHION_RESTITUTION;
          if (Math.abs(ball.vx) > 0.4 && soundEnabled) playSound.poolCushion();
        } else if (ball.x >= maxX) {
          ball.x = maxX;
          ball.vx = -ball.vx * CUSHION_RESTITUTION;
          if (Math.abs(ball.vx) > 0.4 && soundEnabled) playSound.poolCushion();
        }

        if (ball.y <= minY) {
          ball.y = minY;
          ball.vy = -ball.vy * CUSHION_RESTITUTION;
          if (Math.abs(ball.vy) > 0.4 && soundEnabled) playSound.poolCushion();
        } else if (ball.y >= maxY) {
          ball.y = maxY;
          ball.vy = -ball.vy * CUSHION_RESTITUTION;
          if (Math.abs(ball.vy) > 0.4 && soundEnabled) playSound.poolCushion();
        }
      });

      // 2. Ball-to-Ball Elastic Collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.inPocket || b2.inPocket) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0) {
            // Overlap resolution
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // Elastic collision velocity exchange
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx * 0.95;
            b1.vy -= p * ny * 0.95;
            b2.vx += p * nx * 0.95;
            b2.vy += p * ny * 0.95;

            if (Math.abs(p) > 0.5 && soundEnabled) {
              playSound.poolHit();
            }
          }
        }
      }

      // Check if all balls have stopped after a shot
      setBallsMoving((prevMoving) => {
        if (prevMoving && !isAnyBallMoving) {
          // All balls came to a complete halt!
          setPocketedThisTurn((potted) => {
            resolveTurn(potted);
            return [];
          });
        }
        return isAnyBallMoving;
      });

      // --- RENDER POOL TABLE ---
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // 1. Table Outer Frame & Wood Rails
      ctx.fillStyle = currentTable.woodColor;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // Gold Brass Inlay Strips on Rails
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(BORDER_SIZE * 0.4, BORDER_SIZE * 0.4, TABLE_WIDTH - BORDER_SIZE * 0.8, 3);
      ctx.fillRect(BORDER_SIZE * 0.4, TABLE_HEIGHT - BORDER_SIZE * 0.4 - 3, TABLE_WIDTH - BORDER_SIZE * 0.8, 3);

      // Rail Sights / Diamond Markers
      ctx.fillStyle = '#ffffff';
      for (let dx = PLAY_X + 90; dx < PLAY_X + PLAY_WIDTH; dx += 120) {
        ctx.beginPath();
        ctx.arc(dx, BORDER_SIZE / 2, 2.5, 0, Math.PI * 2);
        ctx.arc(dx, TABLE_HEIGHT - BORDER_SIZE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Play Area Felt (Çuha)
      ctx.fillStyle = currentTable.feltColor;
      ctx.fillRect(PLAY_X, PLAY_Y, PLAY_WIDTH, PLAY_HEIGHT);

      // Cushion Inner Bevels
      ctx.fillStyle = currentTable.cushionColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(PLAY_X, PLAY_Y, PLAY_WIDTH, PLAY_HEIGHT);

      // Headstring line & Center Spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PLAY_X + PLAY_WIDTH * 0.25, PLAY_Y);
      ctx.lineTo(PLAY_X + PLAY_WIDTH * 0.25, PLAY_Y + PLAY_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(PLAY_X + PLAY_WIDTH * 0.72, PLAY_Y + PLAY_HEIGHT / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();

      // 3. Pockets (Cepler)
      pockets.forEach((pkt) => {
        // Pocket leather rim
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, pkt.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pocket hole depth
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, pkt.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Balls (Toplar)
      balls.forEach((ball) => {
        if (ball.inPocket) return;

        // Shadow under ball
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 3, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Base Ball
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // If Stripe: draw white ends with colored central stripe
        if (ball.isStripe) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, -Math.PI * 0.35, Math.PI * 0.35);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius, Math.PI * 0.65, Math.PI * 1.35);
          ctx.fill();

          ctx.fillStyle = ball.color;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center white circle for number
        if (!ball.isCueBall) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.48, 0, Math.PI * 2);
          ctx.fill();

          // Ball number
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.number.toString(), ball.x, ball.y);
        } else {
          // Red dot on Cue ball
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3D Glass Specular Highlight
        const grad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          1,
          ball.x,
          ball.y,
          ball.radius
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Cue Stick & Aim Line (when balls are at rest)
      const cueBall = balls.find((b) => b.isCueBall && !b.inPocket);
      if (cueBall && !isAnyBallMoving && !gameOver) {
        // Aiming Guideline
        const aimDist = currentCue.aimLength;
        const targetX = cueBall.x + Math.cos(aimAngle) * aimDist;
        const targetY = cueBall.y + Math.sin(aimAngle) * aimDist;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost ball at target
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(targetX, targetY, BALL_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Cue Stick Drawing
        const cueLength = 160;
        const cueDist = 20 + (shotPower / 100) * 25; // Pullback distance
        const cueStartX = cueBall.x - Math.cos(aimAngle) * cueDist;
        const cueStartY = cueBall.y - Math.sin(aimAngle) * cueDist;
        const cueEndX = cueStartX - Math.cos(aimAngle) * cueLength;
        const cueEndY = cueStartY - Math.sin(aimAngle) * cueLength;

        // Cue Shaft
        ctx.strokeStyle = currentCue.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(cueEndX, cueEndY);
        ctx.stroke();

        // Cue Tip Accent
        ctx.strokeStyle = currentCue.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cueStartX, cueStartY);
        ctx.lineTo(
          cueStartX - Math.cos(aimAngle) * 20,
          cueStartY - Math.sin(aimAngle) * 20
        );
        ctx.stroke();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentCue, currentTable, soundEnabled, resolveTurn, aimAngle, shotPower, gameOver]);

  // Mouse aim tracking on Canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (ballsMoving || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    mousePosRef.current = { x: mx, y: my };

    const cueBall = ballsRef.current.find((b) => b.isCueBall && !b.inPocket);
    if (cueBall) {
      if (ballInHand && isDraggingCueRef.current) {
        // Drag cue ball to legal spot
        cueBall.x = Math.max(PLAY_X + BALL_RADIUS, Math.min(PLAY_X + PLAY_WIDTH - BALL_RADIUS, mx));
        cueBall.y = Math.max(PLAY_Y + BALL_RADIUS, Math.min(PLAY_Y + PLAY_HEIGHT - BALL_RADIUS, my));
      } else {
        const dx = mx - cueBall.x;
        const dy = my - cueBall.y;
        setAimAngle(Math.atan2(dy, dx));
      }
    }
  };

  const handleCanvasMouseDown = () => {
    if (ballInHand) {
      isDraggingCueRef.current = true;
    }
  };

  const handleCanvasMouseUp = () => {
    if (ballInHand) {
      isDraggingCueRef.current = false;
      setBallInHand(false);
      setFoulMessage(null);
    }
  };

  // Helper remaining balls calculation
  const remainingSolids = ballsRef.current.filter((b) => !b.inPocket && b.id >= 1 && b.id <= 7);
  const remainingStripes = ballsRef.current.filter((b) => !b.inPocket && b.id >= 9 && b.id <= 15);
  const isEightBallAlive = ballsRef.current.some((b) => !b.inPocket && b.id === 8);

  const realOpponents = getRegisteredOpponents(currentUser.id);

  return (
    <div className="flex flex-col gap-4">
      {/* TOP HUD BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xl shadow">
            🎱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">8 BALL POOL: GERÇEK BİLARDO</h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                1v1 CANLI VS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              İstaka: <strong className="text-amber-400">{currentCue.name}</strong> • Masa: <strong className="text-emerald-400">{currentTable.name}</strong>
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2">
          {/* Wallet */}
          <div className="bg-amber-950/80 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
            <span>🪙</span>
            <span className="text-sm font-black text-amber-200">{(currentUser.coins ?? 150).toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 uppercase">Altın</span>
          </div>

          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Lider Tablosu"
          >
            <Trophy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {onFullscreenRequest && (
            <button
              onClick={onFullscreenRequest}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT: LOBBY MENU VS ACTIVE MATCH */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[560px] flex flex-col justify-center items-center p-3">
        {inMenu ? (
          /* ==================== 8 BALL POOL LOBBY MENU ==================== */
          <div className="w-full max-w-4xl p-4 sm:p-6 space-y-6">
            {/* Header Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuTab('lobby')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'lobby'
                      ? 'bg-indigo-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>1v1 VS MAÇ BAŞLAT</span>
                </button>

                <button
                  onClick={() => setMenuTab('shop')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'shop'
                      ? 'bg-indigo-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>ISTAKA & MASA MAĞAZASI</span>
                </button>

                <button
                  onClick={() => setMenuTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'rules'
                      ? 'bg-indigo-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>BİLARDO KURALLARI</span>
                </button>
              </div>

              <div className="text-xs font-mono text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                Kayıtlı Oyuncu: <strong className="text-white">{currentUser.username}</strong>
              </div>
            </div>

            {/* Notification alert */}
            {shopFeedback && (
              <div className="p-3 bg-indigo-500/20 border border-indigo-500/50 rounded-xl text-xs font-bold text-indigo-300 text-center">
                {shopFeedback}
              </div>
            )}

            {/* TAB 1: 1v1 MATCH SELECTION */}
            {menuTab === 'lobby' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>🎱 OYUN MODUNU SEÇ & 1v1 VS BAŞLA</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Arkadaşınla aynı ekranda sırayla oynayabilir, oda koduyla canlı bağlanabilir veya kayıtlı oyunculara meydan okuyabilirsiniz!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mode Card 1: Local Friend */}
                  <div
                    onClick={() => setGameMode('local_friend')}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 ${
                      gameMode === 'local_friend'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl">👥</span>
                        {gameMode === 'local_friend' && (
                          <span className="text-[10px] bg-indigo-500 text-slate-950 px-2 py-0.5 rounded font-black">
                            SEÇİLİ MOD
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">Arkadaşla 1v1 (Sırayla)</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Aynı cihazda arkadaşınla sırayla atış yapın! Düz ve çizgili toplar ceplere girerken heyecanı paylaşın.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <label className="text-[10px] text-slate-400 font-mono">Arkadaşının Adı:</label>
                      <input
                        type="text"
                        value={friendName}
                        onChange={(e) => setFriendName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white font-bold"
                        placeholder="Arkadaşının Adı"
                      />
                    </div>
                  </div>

                  {/* Mode Card 2: Online Lobby Code */}
                  <div
                    onClick={() => setGameMode('online_lobby')}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 ${
                      gameMode === 'online_lobby'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl">🔑</span>
                        {gameMode === 'online_lobby' && (
                          <span className="text-[10px] bg-indigo-500 text-slate-950 px-2 py-0.5 rounded font-black">
                            SEÇİLİ MOD
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">Şifreli Oda / Lobi</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Arkadaşına oda kodunu ver veya arkadaşının kodunu girip canlı odaya katıl!
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-300 font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800 flex-1">
                          {roomCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(roomCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs rounded transition"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode Card 3: Real Opponents Challenge */}
                  <div
                    onClick={() => setGameMode('ai_rival')}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 ${
                      gameMode === 'ai_rival'
                        ? 'bg-indigo-950/50 border-indigo-500 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-3xl">🏆</span>
                        {gameMode === 'ai_rival' && (
                          <span className="text-[10px] bg-indigo-500 text-slate-950 px-2 py-0.5 rounded font-black">
                            SEÇİLİ MOD
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">Kayıtlı Oyuncuyla VS</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Sitedeki gerçek kayıtlı oyunculardan birine meydan oku ve simüle edilmiş 1v1 bilardo maçına gir!
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <label className="text-[10px] text-slate-400 font-mono">Rakip Oyuncu:</label>
                      <select
                        value={selectedOpponentId}
                        onChange={(e) => setSelectedOpponentId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs text-white font-bold"
                      >
                        {realOpponents.length > 0 ? (
                          realOpponents.map((opp) => (
                            <option key={opp.id} value={opp.id}>
                              {opp.tag} {opp.username} (Skor: {opp.totalScore})
                            </option>
                          ))
                        ) : (
                          <option value="">Ali [TR] (Kayıtlı Oyuncu)</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Big Match Launch Action */}
                <div className="pt-2">
                  <button
                    onClick={startMatch}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500 hover:from-indigo-400 hover:to-sky-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-indigo-500/30 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>BİLARDO MASASINA GEÇ & MAÇI BAŞLAT 🎱</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CUE & TABLE SKINS SHOP */}
            {menuTab === 'shop' && (
              <div className="space-y-6">
                {/* 1. Cues */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>🪵 PROFESYONEL ISTAKALAR ({POOL_CUES.length})</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      Geniş nişan çizgisi & güçlü vuruşlar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {POOL_CUES.map((cue) => {
                      const isUnlocked = currentUser.unlockedPoolCues?.includes(cue.id) || cue.price === 0;
                      const isSelected = currentUser.selectedPoolCue === cue.id;

                      return (
                        <div
                          key={cue.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-950/60 border-amber-400 shadow'
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2 bg-slate-950 rounded-xl border border-slate-800">
                              {cue.icon}
                            </span>
                            <div>
                              <h5 className="text-xs font-black text-white">{cue.name}</h5>
                              <p className="text-[11px] text-slate-400 line-clamp-1">{cue.description}</p>
                              <div className="text-[10px] font-mono text-indigo-400 mt-1">
                                Güç: %{cue.power} • Nişan: {cue.aimLength}px
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <span className="text-xs font-mono font-bold text-amber-300">
                              {cue.price === 0 ? 'ÜCRETSİZ' : `${cue.price} 🪙`}
                            </span>
                            <button
                              onClick={() => handleSelectCue(cue)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isUnlocked
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {isSelected ? 'KUŞANILDI' : isUnlocked ? 'KUŞAN' : 'SATIN AL'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Tables */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>🟢 MASA ÇUHA KAPLAMALARI ({POOL_TABLES.length})</span>
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      Turnuva ve VIP salon renkleri
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {POOL_TABLES.map((tbl) => {
                      const isUnlocked = currentUser.unlockedPoolTables?.includes(tbl.id) || tbl.price === 0;
                      const isSelected = currentUser.selectedPoolTable === tbl.id;

                      return (
                        <div
                          key={tbl.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-950/60 border-amber-400 shadow'
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-7 h-7 rounded-lg border border-white/20 shadow-inner flex items-center justify-center text-xs"
                              style={{ backgroundColor: tbl.feltColor }}
                            >
                              {tbl.icon}
                            </span>
                            <div>
                              <h5 className="text-xs font-black text-white">{tbl.name}</h5>
                              <p className="text-[10px] text-slate-400">{tbl.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <span className="text-xs font-mono font-bold text-amber-300">
                              {tbl.price === 0 ? 'ÜCRETSİZ' : `${tbl.price} 🪙`}
                            </span>
                            <button
                              onClick={() => handleSelectTable(tbl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isUnlocked
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {isSelected ? 'SEÇİLDİ' : isUnlocked ? 'SEÇ' : 'SATIN AL'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: RULES & GUIDE */}
            {menuTab === 'rules' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <span>📖 8 BALL POOL OYUN KURALLARI</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed font-sans">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <strong className="text-amber-400 block text-sm">🟡 1. Düz vs Çizgili Toplar</strong>
                    <p>
                      Masa açılışında ilk yasal olarak cebe giren top grubuna göre oyuncular belirlenir (1-7 Düz veya 9-15 Çizgili).
                    </p>
                    <p>
                      Kendi toplarınızı ceplere soktuğunuz sürece sıra sizde kalır!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <strong className="text-rose-400 block text-sm">🎱 2. Siyah 8 Numaralı Top</strong>
                    <p>
                      Kendi tüm toplarınızı cebe soktuktan sonra son olarak 8 numaralı siyah topu atmanız gerekir.
                    </p>
                    <p>
                      Tüm toplarınız bitmeden siyah topu cebe atarsanız maçı <strong>kaybedersiniz</strong>!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <strong className="text-sky-400 block text-sm">⚪ 3. Beyaz Top & Faul</strong>
                    <p>
                      Beyaz ıstaka topu cebe girerse faul olur. Sıra rakibe geçer ve beyaz top masada serbest konabilir (Ball in hand).
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <strong className="text-emerald-400 block text-sm">🪙 4. Altın ve Skor Kazancı</strong>
                    <p>
                      Cebe attığınız her top için 15 Altın, maçı kazandığınızda ekstra 100 Altın ve lig sıralaması için puan kazanırsınız.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ==================== ACTIVE 8 BALL POOL MATCH VIEWPORT ==================== */
          <div className="w-full flex flex-col items-center gap-3">
            {/* MATCH HEADER HUD */}
            <div className="w-full max-w-[840px] bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
              {/* Player 1 */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  turn === 1
                    ? 'bg-indigo-950 border-indigo-500 text-white font-bold shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  {currentUser.avatar}
                </div>
                <div>
                  <div className="text-[11px] font-black">
                    {currentUser.username} {turn === 1 && '⭐ (SIRA SENDE)'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Grup: {p1BallType ? (p1BallType === 'solid' ? '🟡 Düzler (1-7)' : '🔵 Çizgililer (9-15)') : 'Açık Masa'}
                  </div>
                </div>
              </div>

              {/* Center Match Status */}
              <div className="text-center font-mono">
                {foulMessage ? (
                  <span className="text-[11px] text-rose-400 font-bold animate-pulse">{foulMessage}</span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-bold">
                    {ballsMoving ? 'Toplar Yuvarlanıyor...' : turn === 1 ? '👉 Atış Yapın' : `👉 ${friendName} Atış Yapıyor...`}
                  </span>
                )}
              </div>

              {/* Player 2 */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  turn === 2
                    ? 'bg-indigo-950 border-indigo-500 text-white font-bold shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-sky-500 text-slate-950 font-black flex items-center justify-center text-xs">
                  {gameMode === 'local_friend' ? '🤝' : '🤖'}
                </div>
                <div>
                  <div className="text-[11px] font-black">
                    {gameMode === 'local_friend' ? friendName : 'Rakip Oyuncu'} {turn === 2 && '⭐'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Grup: {p2BallType ? (p2BallType === 'solid' ? '🟡 Düzler (1-7)' : '🔵 Çizgililer (9-15)') : 'Açık Masa'}
                  </div>
                </div>
              </div>
            </div>

            {/* BALLS RACK STATUS */}
            <div className="w-full max-w-[840px] flex items-center justify-between text-[11px] font-mono px-2 text-slate-400">
              <div>
                Kalan Düzler: <strong className="text-amber-300">{remainingSolids.length}</strong> / 7 • Çizgililer:{' '}
                <strong className="text-sky-300">{remainingStripes.length}</strong> / 7
              </div>
              <div>
                Siyah 8 Numaralı Top:{' '}
                <strong className={isEightBallAlive ? 'text-emerald-400' : 'text-rose-400'}>
                  {isEightBallAlive ? 'Mevcut' : 'Cebe Girdi'}
                </strong>
              </div>
            </div>

            {/* CANVAS INTERACTIVE POOL TABLE */}
            <div className="relative border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <canvas
                ref={canvasRef}
                width={TABLE_WIDTH}
                height={TABLE_HEIGHT}
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                className="cursor-crosshair max-w-full h-auto"
              />

              {/* Ball In Hand Floating Notice */}
              {ballInHand && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-lg border border-amber-300 animate-bounce pointer-events-none">
                  ⚪ Beyaz Top Serbest! Masada istediğiniz yere sürükleyin ve bırakın.
                </div>
              )}
            </div>

            {/* CUE POWER & SHOOTING CONTROLS */}
            <div className="w-full max-w-[840px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <span className="text-xs font-black text-white whitespace-nowrap">VURUŞ GÜCÜ:</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={shotPower}
                  onChange={(e) => setShotPower(Number(e.target.value))}
                  disabled={ballsMoving || gameOver}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-amber-400 min-w-[40px]">
                  %{shotPower}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleShoot}
                  disabled={ballsMoving || gameOver}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer ${
                    ballsMoving || gameOver
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-500 hover:bg-indigo-400 text-slate-950 shadow-indigo-500/30'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>VURUŞ YAP (ATEŞLE)</span>
                </button>

                <button
                  onClick={rackBalls}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  title="Yeniden Diz"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Diz</span>
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setInMenu(true);
                  }}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Menüye Dön
                </button>
              </div>
            </div>

            {/* GAME OVER VICTORY MODAL */}
            {gameOver && winner && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                <div className="max-w-md w-full bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="text-6xl animate-bounce">🏆</div>
                  <h2 className="text-2xl font-black text-white">{winner.name.toUpperCase()} KAZANDI!</h2>
                  <p className="text-xs text-slate-400">
                    8 numaralı siyah top kuralına göre muhteşem bir zafer elde edildi!
                  </p>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Şampiyon Oyuncu:</span>
                      <strong className="text-amber-400 text-sm">{winner.name}</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                      <span className="text-amber-300 font-bold">💰 KAZANILAN ALTIN:</span>
                      <strong className="text-amber-200 font-black text-base">+{matchCoinsEarned} 🪙</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={rackBalls}
                      className="py-3 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rövanş Maçı</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setGameOver(false);
                        setInMenu(true);
                      }}
                      className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Lobiye Dön
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SCOREBOARD MODAL IF OPENED */}
      {showScoreboard && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Canlı Skorboard - 8 Ball Pool Şampiyonları</span>
            </h3>
            <button
              onClick={() => setShowScoreboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
          <ScoreboardWidget game="pool" currentUserId={currentUser.id} />
        </div>
      )}
    </div>
  );
};
