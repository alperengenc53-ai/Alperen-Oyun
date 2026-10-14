import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import {
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Users,
  Lock,
  Play,
  ShoppingBag,
  Check,
  Send,
  MessageSquare,
  Swords,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Sliders,
  Zap,
  Target,
} from 'lucide-react';
import { UserProfile } from '../../types/game';
import { updateGameScore, buyShopItem, equipShopItem, getRegisteredOpponents } from '../../utils/playerRegistry';
import {
  setPresenceGame,
  getCachedPresence,
  subscribePresence,
  sendPoolChallenge,
  subscribeChallenges,
  respondPoolChallenge,
} from '../../utils/onlinePresence';
import { ScoreboardWidget } from '../ScoreboardWidget';

interface EightBallPoolGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isStriped: boolean;
  isSunk: boolean;
  rollX: number; // 3D Rolling around X (radians)
  rollY: number; // 3D Rolling around Y (radians)
  spinZ: number; // Side-spin / English (falso rad/s)
  spinBack: number; // Draw backspin (>0) or Follow topspin (<0)
  shotAngle?: number; // Shot trajectory angle for authentic backward draw
}

export interface PoolTableTheme {
  id: string;
  name: string;
  price: number;
  feltColor: string;
  feltCenterColor: string;
  woodColorStart: string;
  woodColorMid: string;
  woodColorEnd: string;
  cornerColor: string;
  cornerHighlight: string;
  rimBorder: string;
  icon: string;
  description: string;
  imageUrl: string;
}

export const POOL_TABLES: PoolTableTheme[] = [
  {
    id: 'emerald',
    name: 'Klasik Zümrüt Yeşili (Turnuva)',
    price: 0,
    feltColor: '#047857',
    feltCenterColor: '#059669',
    woodColorStart: '#2d1506',
    woodColorMid: '#451a03',
    woodColorEnd: '#241004',
    cornerColor: '#d97706',
    cornerHighlight: '#fef08a',
    rimBorder: '#92400e',
    icon: '🟩',
    description: 'Dünya standartlarında geleneksel bilardo salonu yeşil turnuva çuhası.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'royal_navy',
    name: 'Kraliyet Gece Mavisi (Royal Navy)',
    price: 150,
    feltColor: '#1e3a8a',
    feltCenterColor: '#2563eb',
    woodColorStart: '#0f172a',
    woodColorMid: '#1e293b',
    woodColorEnd: '#0f172a',
    cornerColor: '#94a3b8',
    cornerHighlight: '#f8fafc',
    rimBorder: '#38bdf8',
    icon: '🟦',
    description: 'Turnuva sınıfı pürüzsüz mavi kumaş ve koyu venge ahşap çerçeve.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'crimson',
    name: 'Ateş Kırmızısı Şampiyona Masası',
    price: 250,
    feltColor: '#991b1b',
    feltCenterColor: '#dc2626',
    woodColorStart: '#450a0a',
    woodColorMid: '#7f1d1d',
    woodColorEnd: '#450a0a',
    cornerColor: '#f59e0b',
    cornerHighlight: '#fef08a',
    rimBorder: '#ef4444',
    icon: '🟥',
    description: 'Lüks kulüplerin bordo-kırmızı çuhası ve parlak maun çerçevesi.',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'carbon_stealth',
    name: 'Karbon Fiber Mat Siyah Masa',
    price: 400,
    feltColor: '#18181b',
    feltCenterColor: '#27272a',
    woodColorStart: '#09090b',
    woodColorMid: '#18181b',
    woodColorEnd: '#09090b',
    cornerColor: '#06b6d4',
    cornerHighlight: '#67e8f9',
    rimBorder: '#22d3ee',
    icon: '⬛',
    description: 'Mat kömür siyahı zemin ve neon parlayan bant rayları.',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'cyber_neon',
    name: 'Cyberpunk Neon Mor Masa',
    price: 550,
    feltColor: '#581c87',
    feltCenterColor: '#7e22ce',
    woodColorStart: '#1e1b4b',
    woodColorMid: '#312e81',
    woodColorEnd: '#1e1b4b',
    cornerColor: '#d946ef',
    cornerHighlight: '#f472b6',
    rimBorder: '#a855f7',
    icon: '🟪',
    description: 'Geleceğin neon mor ışıklı sentetik kumaşı ve siber kenarlıklar.',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'luxury_gold',
    name: '24K Saf Altın Lüks Malikane Masası',
    price: 750,
    feltColor: '#78350f',
    feltCenterColor: '#92400e',
    woodColorStart: '#451a03',
    woodColorMid: '#b45309',
    woodColorEnd: '#451a03',
    cornerColor: '#fbbf24',
    cornerHighlight: '#fef9c3',
    rimBorder: '#f59e0b',
    icon: '🟨',
    description: 'Saf altın kaplama köşe dökümleri ve kadife sarı çuha.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
  },
];

interface CueStick {
  id: string;
  name: string;
  price: number;
  color: string;
  accent: string;
  powerMultiplier: number;
  icon: string;
  description: string;
  imageUrl: string;
}

const CUE_STICKS: CueStick[] = [
  {
    id: 'standard',
    name: 'Standart Meşe Istaka',
    price: 0,
    color: '#b45309',
    accent: '#78350f',
    powerMultiplier: 1.0,
    icon: '🪵',
    description: 'Klasik cilalı ahşap gövde ve dengeli vuruş hissi.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'carbon',
    name: 'Karbon Fiber Mat Istaka',
    price: 150,
    color: '#1e293b',
    accent: '#38bdf8',
    powerMultiplier: 1.1,
    icon: '⚡',
    description: 'Ultra hafif örgü karbon kompozit gövde ve hassas uç.',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'dragon',
    name: 'Ejderha Lav Istakası',
    price: 300,
    color: '#b91c1c',
    accent: '#f59e0b',
    powerMultiplier: 1.2,
    icon: '🔥',
    description: 'Ateş kırmızısı kaplama, ejderha pulları ve patlayıcı güç.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon Istaka',
    price: 450,
    color: '#06b6d4',
    accent: '#d946ef',
    powerMultiplier: 1.25,
    icon: '🔮',
    description: 'Neon elektrik mavi ve mor lazer çizgi aydınlatması.',
    imageUrl: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'glacier',
    name: 'Buz Kristali Istakası',
    price: 500,
    color: '#0284c7',
    accent: '#bae6fd',
    powerMultiplier: 1.28,
    icon: '❄️',
    description: 'Kutup buzulu saydam gövde ve milimetrik nişan hattı.',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'samurai',
    name: 'Samuray Katana Istakası',
    price: 650,
    color: '#0f172a',
    accent: '#dc2626',
    powerMultiplier: 1.32,
    icon: '⚔️',
    description: 'Dövme çelik katana tutacağı ve jilet gibi keskin atışlar.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'gold',
    name: '24K Saf Altın Istaka',
    price: 750,
    color: '#fbbf24',
    accent: '#fef08a',
    powerMultiplier: 1.35,
    icon: '👑',
    description: '24 ayar saf altın kaplama ve uzatılmış kristal nişan rehberi.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
  },
];

const BALL_COLORS = [
  '#ffffff', // 0: White Cue Ball
  '#f59e0b', // 1: Solid Yellow
  '#2563eb', // 2: Solid Blue
  '#dc2626', // 3: Solid Red
  '#7c3aed', // 4: Solid Purple
  '#ea580c', // 5: Solid Orange
  '#16a34a', // 6: Solid Green
  '#831843', // 7: Solid Maroon
  '#09090b', // 8: 8-Ball Solid Black
  '#f59e0b', // 9: Striped Yellow
  '#2563eb', // 10: Striped Blue
  '#dc2626', // 11: Striped Red
  '#7c3aed', // 12: Striped Purple
  '#ea580c', // 13: Striped Orange
  '#16a34a', // 14: Striped Green
  '#831843', // 15: Striped Maroon
];

export const EightBallPoolGame: React.FC<EightBallPoolGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inLobby, setInLobby] = useState<boolean>(true);
  const [lobbyTab, setLobbyTab] = useState<'modes' | 'online_vs' | 'rooms' | 'cosmetics' | 'rules'>('modes');
  const [gameMode, setGameMode] = useState<'practice' | 'friend_room' | 'online_match'>('online_match');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  // Selected Table & Cue
  const [selectedTableId, setSelectedTableId] = useState<string>('emerald');
  const [selectedCueId, setSelectedCueId] = useState<string>('standard');
  const currentTable = POOL_TABLES.find((t) => t.id === selectedTableId) || POOL_TABLES[0];
  const currentCue = CUE_STICKS.find((c) => c.id === selectedCueId) || CUE_STICKS[0];

  // Match State
  const [player1Name, setPlayer1Name] = useState<string>(currentUser.username);
  const [player2Name, setPlayer2Name] = useState<string>('Çevrimiçi Rakip');
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [player1Type, setPlayer1Type] = useState<'solid' | 'stripe' | null>(null);
  const [player2Type, setPlayer2Type] = useState<'solid' | 'stripe' | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [foulMessage, setFoulMessage] = useState<string | null>(null);

  // 8 Ball Pool Hold-to-Charge Speed & Power
  const [shotPowerPercent, setShotPowerPercent] = useState<number>(60);
  const shotPowerRef = useRef<number>(60);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const isChargingRef = useRef<boolean>(false);
  const chargeIntervalRef = useRef<any>(null);
  const pottedThisShotRef = useRef<{ id: number; isStriped: boolean }[]>([]);

  // 8 Ball Pool Interactive Falso (English / Cue Ball Spin) Selector (-1 to 1 for both x and y)
  const [cueSpin, setCueSpin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSpinModal, setShowSpinModal] = useState<boolean>(false);
  const cueSpinRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    cueSpinRef.current = cueSpin;
  }, [cueSpin]);

  // Online & Room State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomNameInput, setRoomNameInput] = useState<string>(`${currentUser.username}'in Masası`);
  const [roomPassInput, setRoomPassInput] = useState<string>('1234');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedRoomToJoin, setSelectedRoomToJoin] = useState<any | null>(null);
  const [joinPassInput, setJoinPassInput] = useState<string>('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // 1v1 Challenge notifications
  const [incomingChallenge, setIncomingChallenge] = useState<any | null>(null);
  const [onlineUsersList, setOnlineUsersList] = useState<any[]>([]);

  // Room Turn state
  const [roomCurrentTurnUserId, setRoomCurrentTurnUserId] = useState<string>(currentUser.id);

  const isMyTurn = useCallback(() => {
    if (gameOver || isBallsMovingRef.current) return false;
    if (gameMode === 'practice') return true;
    if (activeRoomId) {
      return roomCurrentTurnUserId === currentUser.id;
    }
    return currentTurn === 1;
  }, [gameOver, gameMode, activeRoomId, roomCurrentTurnUserId, currentUser.id, currentTurn]);

  const isMyTurnRef = useRef<boolean>(true);
  useEffect(() => {
    isMyTurnRef.current = isMyTurn();
  }, [isMyTurn]);

  // Table Dimensions & Realistic Ratios
  const TABLE_WIDTH = 760;
  const TABLE_HEIGHT = 430;
  const BORDER_SIZE = 36;
  const FELT_LEFT = BORDER_SIZE;
  const FELT_TOP = BORDER_SIZE;
  const FELT_RIGHT = TABLE_WIDTH - BORDER_SIZE;
  const FELT_BOTTOM = TABLE_HEIGHT - BORDER_SIZE;
  const FELT_WIDTH = FELT_RIGHT - FELT_LEFT;
  const FELT_HEIGHT = FELT_BOTTOM - FELT_TOP;
  const BALL_RADIUS = 9.8;

  // 6 Tournament drop pockets with deep brass rims
  const POCKETS = [
    { x: FELT_LEFT + 6, y: FELT_TOP + 6, radius: 21 }, // Top-Left
    { x: FELT_LEFT + FELT_WIDTH / 2, y: FELT_TOP + 4, radius: 19 }, // Top-Middle
    { x: FELT_RIGHT - 6, y: FELT_TOP + 6, radius: 21 }, // Top-Right
    { x: FELT_LEFT + 6, y: FELT_BOTTOM - 6, radius: 21 }, // Bottom-Left
    { x: FELT_LEFT + FELT_WIDTH / 2, y: FELT_BOTTOM - 4, radius: 19 }, // Bottom-Middle
    { x: FELT_RIGHT - 6, y: FELT_BOTTOM - 6, radius: 21 }, // Bottom-Right
  ];

  // Diamond sights along rails (aiming markers)
  const DIAMONDS: { x: number; y: number }[] = [];
  // Top & Bottom rails (6 segments each)
  for (let i = 1; i < 6; i++) {
    if (i !== 3) { // middle pocket is at 3
      DIAMONDS.push({ x: FELT_LEFT + (FELT_WIDTH * i) / 6, y: BORDER_SIZE / 2 });
      DIAMONDS.push({ x: FELT_LEFT + (FELT_WIDTH * i) / 6, y: TABLE_HEIGHT - BORDER_SIZE / 2 });
    }
  }
  // Left & Right rails (3 segments each)
  for (let i = 1; i < 3; i++) {
    DIAMONDS.push({ x: BORDER_SIZE / 2, y: FELT_TOP + (FELT_HEIGHT * i) / 3 });
    DIAMONDS.push({ x: TABLE_WIDTH - BORDER_SIZE / 2, y: FELT_TOP + (FELT_HEIGHT * i) / 3 });
  }

  // Balls ref
  const ballsRef = useRef<Ball[]>([]);
  const cueAimAngleRef = useRef<number>(0);
  const isBallsMovingRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastActionTimestampRef = useRef<number>(0);

  // Sync ref with state
  useEffect(() => {
    shotPowerRef.current = shotPowerPercent;
  }, [shotPowerPercent]);

  // Init Balls in Triangle Rack with Professional 8-Ball Layout
  const initBalls = useCallback(() => {
    const balls: Ball[] = [];

    // 0: Cue ball at head spot
    balls.push({
      id: 0,
      x: FELT_LEFT + FELT_WIDTH * 0.28,
      y: FELT_TOP + FELT_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: BALL_COLORS[0],
      isStriped: false,
      isSunk: false,
      rollX: 0,
      rollY: 0,
      spinZ: 0,
      spinBack: 0,
    });

    // 15 Object balls in Triangle rack on foot spot
    const rackStartX = FELT_LEFT + FELT_WIDTH * 0.72;
    const rackCenterY = FELT_TOP + FELT_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2 + 0.6;
    const triangleOrder = [
      1,
      9, 2,
      3, 8, 10,
      11, 4, 12, 5,
      13, 6, 14, 7, 15,
    ];

    let ballIdx = 0;
    for (let col = 0; col < 5; col++) {
      const colX = rackStartX + col * spacing * 0.866;
      const startY = rackCenterY - (col * spacing) / 2;
      for (let row = 0; row <= col; row++) {
        const id = triangleOrder[ballIdx] || ballIdx + 1;
        balls.push({
          id,
          x: colX,
          y: startY + row * spacing,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: BALL_COLORS[id] || '#fbbf24',
          isStriped: id >= 9,
          isSunk: false,
          rollX: Math.random() * Math.PI * 2,
          rollY: Math.random() * Math.PI * 2,
          spinZ: 0,
          spinBack: 0,
        });
        ballIdx++;
      }
    }

    ballsRef.current = balls;
    setPlayer1Type(null);
    setPlayer2Type(null);
    setCurrentTurn(1);
    setGameOver(false);
    setWinner(null);
    setFoulMessage(null);
  }, [FELT_LEFT, FELT_TOP, FELT_WIDTH, FELT_HEIGHT]);

  // Set presence when active
  useEffect(() => {
    setPresenceGame('pool');
    const unsubPresence = subscribePresence((data) => {
      setOnlineUsersList(data.users.filter((u) => u.id !== currentUser.id));
    });
    const unsubChallenge = subscribeChallenges((ch) => {
      setIncomingChallenge(ch);
    });

    return () => {
      unsubPresence();
      unsubChallenge();
    };
  }, [currentUser.id]);

  // Start game handler
  const handleStartMatch = (mode: 'practice' | 'friend_room' | 'online_match') => {
    setGameMode(mode);
    setPlayer1Name(currentUser.username);
    if (mode === 'practice') {
      setPlayer2Name('Solo Pratik');
      initBalls();
      setInLobby(false);
      playSound.victory();
    } else {
      // User request: "gerçek oyuncu diye bişey yok onlarıda kaldır siteye aktif giren kişiler karsımıza çıksın"
      if (onlineUsersList.length > 0) {
        const picked = onlineUsersList[Math.floor(Math.random() * onlineUsersList.length)];
        setPlayer2Name(`${picked.username} ${picked.tag || '[TR]'}`);
        initBalls();
        setInLobby(false);
        playSound.victory();
      } else {
        setShopFeedback('⚠️ Şu anda sitede başka aktif kullanıcı bulunmuyor! Arkadaşını siteye davet ederek özel oda açabilir veya Solo Pratik modunda oynayabilirsin.');
        setTimeout(() => setShopFeedback(null), 5000);
        return;
      }
    }
  };

  // Online Rooms handlers
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/pool/rooms');
      const data = await res.json();
      if (data.rooms) {
        setAvailableRooms(data.rooms);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleCreateRoom = async () => {
    if (!roomNameInput.trim()) return;
    try {
      const res = await fetch('/api/pool/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomNameInput.trim(),
          hostId: currentUser.id,
          hostName: currentUser.username,
          hostAvatar: currentUser.avatar,
          password: roomPassInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setActiveRoomId(data.room.id);
        setPlayer1Name(currentUser.username);
        setPlayer2Name('Rakip Bekleniyor...');
        setGameMode('friend_room');
        initBalls();
        setInLobby(false);
        playSound.victory();
      }
    } catch (e) {
      // ignore
    }
  };

  const handleJoinRoom = async (room: any) => {
    try {
      setJoinError(null);
      const res = await fetch('/api/pool/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          guestId: currentUser.id,
          guestName: currentUser.username,
          guestAvatar: currentUser.avatar,
          password: joinPassInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setActiveRoomId(data.room.id);
        setPlayer1Name(data.room.hostName);
        setPlayer2Name(currentUser.username);
        setGameMode('friend_room');
        initBalls();
        setInLobby(false);
        playSound.victory();
      } else {
        setJoinError(data.error || 'Odaya girilemedi');
      }
    } catch (e) {
      setJoinError('Bağlantı hatası');
    }
  };

  // Direct 1v1 Challenge
  const handleSendChallenge = async (user: any) => {
    const res = await sendPoolChallenge(user.id);
    if (res && res.success) {
      setActiveRoomId(res.roomId);
      setPlayer1Name(currentUser.username);
      setPlayer2Name(user.username);
      setGameMode('online_match');
      initBalls();
      setInLobby(false);
      playSound.victory();
    }
  };

  // Buy or Equip Table with independent poolCoins
  const handleSelectTable = (tbl: PoolTableTheme) => {
    const isUnlocked = currentUser.unlockedPoolTables?.includes(tbl.id) || tbl.price === 0;

    if (isUnlocked) {
      setSelectedTableId(tbl.id);
      const updated = equipShopItem('pool_table', tbl.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${tbl.name}" masası donatıldı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('pool_table', tbl.id, tbl.price);
      if (res.success && res.profile) {
        setSelectedTableId(tbl.id);
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${tbl.name}" satın alındı! -${tbl.price} 🪙 düşüldü. Yeni Bilardo Bakiyeniz: ${res.profile.poolCoins ?? 0} 🪙`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
        playSound.hit();
      }
    }
    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Buy or Equip Cue with independent poolCoins
  const handleSelectCue = (cue: CueStick) => {
    const isUnlocked = currentUser.unlockedPoolCues?.includes(cue.id) || cue.price === 0;

    if (isUnlocked) {
      setSelectedCueId(cue.id);
      const updated = equipShopItem('pool_cue', cue.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${cue.name}" ıstakası donatıldı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('pool_cue', cue.id, cue.price);
      if (res.success && res.profile) {
        setSelectedCueId(cue.id);
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${cue.name}" ıstakası satın alındı! -${cue.price} 🪙 düşüldü. Yeni Bilardo Bakiyeniz: ${res.profile.poolCoins ?? 0} 🪙`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
        playSound.hit();
      }
    }
    setTimeout(() => setShopFeedback(null), 3000);
  };

  const handleAcceptChallenge = async (ch: any) => {
    const res = await respondPoolChallenge(ch.id, true);
    if (res && res.success && res.roomId) {
      setActiveRoomId(res.roomId);
      setPlayer1Name(ch.fromName);
      setPlayer2Name(currentUser.username);
      setGameMode('online_match');
      setIncomingChallenge(null);
      initBalls();
      setInLobby(false);
      playSound.victory();
    }
  };

  // Poll room updates if in online match
  useEffect(() => {
    if (!activeRoomId || inLobby) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pool/rooms/${activeRoomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            if (data.room.guestName && player2Name === 'Rakip Bekleniyor...') {
              setPlayer2Name(data.room.guestName);
            }

            if (data.room.currentTurn) {
              setRoomCurrentTurnUserId(data.room.currentTurn);
            }

            const action = data.room.lastAction;
            if (action && action.senderId !== currentUser.id) {
              if (action.timestamp && action.timestamp > lastActionTimestampRef.current) {
                lastActionTimestampRef.current = action.timestamp;
                if (action.type === 'SHOT' && !isBallsMovingRef.current) {
                  const cueBall = ballsRef.current[0];
                  if (cueBall) {
                    cueBall.vx = action.vx;
                    cueBall.vy = action.vy;
                    isBallsMovingRef.current = true;
                    if (soundEnabled) playSound.hit();
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }, 400);

    return () => clearInterval(interval);
  }, [activeRoomId, inLobby, currentUser.id, player2Name, soundEnabled]);

  // Automated shot for opponent when it is turn 2 in online match
  useEffect(() => {
    if (inLobby || gameOver || gameMode === 'practice' || activeRoomId) return;
    if (currentTurn === 2 && !isBallsMovingRef.current) {
      const oppTimer = setTimeout(() => {
        if (currentTurn !== 2 || isBallsMovingRef.current || gameOver) return;
        const cueBall = ballsRef.current[0];
        if (!cueBall || cueBall.isSunk) return;

        const candidateBalls = ballsRef.current.filter((b) => {
          if (b.id === 0 || b.isSunk) return false;
          if (b.id === 8) {
            const suit = player2Type;
            if (!suit) return false;
            const remaining = ballsRef.current.filter(
              (o) => !o.isSunk && o.id !== 0 && o.id !== 8 && (suit === 'solid' ? !o.isStriped : o.isStriped)
            );
            return remaining.length === 0;
          }
          if (player2Type === 'solid') return !b.isStriped;
          if (player2Type === 'stripe') return b.isStriped;
          return true;
        });

        const target = candidateBalls.length > 0
          ? candidateBalls[Math.floor(Math.random() * candidateBalls.length)]
          : ballsRef.current.find((b) => b.id !== 0 && !b.isSunk);
        if (!target) return;

        const aimAng = Math.atan2(target.y - cueBall.y, target.x - cueBall.x) + (Math.random() - 0.5) * 0.08;
        cueAimAngleRef.current = aimAng;
        const pwr = 8 + Math.random() * 8;
        cueBall.vx = Math.cos(aimAng) * pwr;
        cueBall.vy = Math.sin(aimAng) * pwr;
        isBallsMovingRef.current = true;
        if (soundEnabled) playSound.hit();
      }, 2000);

      return () => clearTimeout(oppTimer);
    }
  }, [currentTurn, inLobby, gameOver, gameMode, activeRoomId, player2Type, soundEnabled]);

  // Main 8 Ball Pool Physics & Ultra Realistic Render Loop
  useEffect(() => {
    if (inLobby) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const balls = ballsRef.current;
      let moving = false;
      const FRICTION = 0.988;

      // 1. Move balls & Felt Wall Bounces with 3D Rolling and Falso/Spin
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isSunk) continue;

        b.x += b.vx;
        b.y += b.vy;

        // 3D Rolling physics: linear velocity causes angular rolling
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 0.01) {
          b.rollX += (b.vx / b.radius);
          b.rollY += (b.vy / b.radius);
        }
        if (Math.abs(b.spinZ) > 0.01) {
          b.rollX += b.spinZ * 0.04;
          b.spinZ *= 0.985; // English decay
        }

        // Cue ball spin persistence and felt curvature (Falso masada aktif kalır!)
        if (b.id === 0) {
          // Slow spin decay on cloth so falso DOES NOT DIE before impact!
          b.spinBack *= 0.995;
          b.spinZ *= 0.992;

          // Curving trajectory (swerve / masse curve on felt!)
          if (Math.abs(b.spinZ) > 0.2 && spd > 0.5) {
            const perpX = -b.vy / spd;
            const perpY = b.vx / spd;
            b.vx += perpX * b.spinZ * 0.015;
            b.vy += perpY * b.spinZ * 0.015;
          }
        }

        b.vx *= FRICTION;
        b.vy *= FRICTION;

        if (Math.hypot(b.vx, b.vy) < 0.08) {
          b.vx = 0;
          b.vy = 0;
        } else {
          moving = true;
        }

        // Check pockets with gravitational suction
        let isNearPocket = false;
        for (const pocket of POCKETS) {
          const distToPocket = Math.hypot(b.x - pocket.x, b.y - pocket.y);
          if (distToPocket < pocket.radius + 8) {
            isNearPocket = true;
          }

          if (distToPocket < pocket.radius - 1) {
            b.isSunk = true;
            b.vx = 0;
            b.vy = 0;
            b.spinZ = 0;
            b.spinBack = 0;
            if (soundEnabled) playSound.coin();

            // Sunk event
            if (b.id === 0) {
              // White cue ball scratch!
              setFoulMessage('⚠️ Faul! Beyaz top cebe girdi. Top başlama noktasına yerleştirildi.');
              setTimeout(() => {
                b.isSunk = false;
                b.x = FELT_LEFT + FELT_WIDTH * 0.28;
                b.y = FELT_TOP + FELT_HEIGHT / 2;
                b.vx = 0;
                b.vy = 0;
                b.rollX = 0;
                b.rollY = 0;
                b.spinZ = 0;
                b.spinBack = 0;
                setFoulMessage(null);
              }, 750);
            } else if (b.id === 8) {
              // 8-ball sunk! Check win/loss
              const activeType = currentTurn === 1 ? player1Type : player2Type;
              const remainingMyBalls = balls.filter(
                (bl) => bl.id !== 0 && bl.id !== 8 && !bl.isSunk && (activeType === 'solid' ? !bl.isStriped : bl.isStriped)
              ).length;

              if (remainingMyBalls === 0) {
                // Victory!
                setGameOver(true);
                const winName = currentTurn === 1 ? player1Name : player2Name;
                setWinner(winName);
                if (soundEnabled) playSound.victory();
                const updated = updateGameScore('pool', 500, { win: true, coinsEarned: 100 });
                if (updated) onProfileUpdated(updated);
              } else {
                // Loss! 8 ball sunk prematurely
                setGameOver(true);
                const winName = currentTurn === 1 ? player2Name : player1Name;
                setWinner(winName);
                if (soundEnabled) playSound.hit();
              }
            } else {
              // Object ball sunk - record for turn evaluation
              pottedThisShotRef.current.push({ id: b.id, isStriped: b.isStriped });

              // Object ball sunk - assign type if not assigned yet
              if (!player1Type) {
                const isSolid = b.id <= 7;
                if (currentTurn === 1) {
                  setPlayer1Type(isSolid ? 'solid' : 'stripe');
                  setPlayer2Type(isSolid ? 'stripe' : 'solid');
                } else {
                  setPlayer2Type(isSolid ? 'solid' : 'stripe');
                  setPlayer1Type(isSolid ? 'stripe' : 'solid');
                }
              }
            }
            break;
          }
        }

        // Bounce cushions with realistic elasticity & side-spin English kick
        if (!b.isSunk && !isNearPocket) {
          if (b.x - b.radius < FELT_LEFT) {
            b.x = FELT_LEFT + b.radius;
            b.vx = -b.vx * 0.93;
            b.vy += b.spinZ * 0.70; // Strong English deflection along cushion
            b.spinZ *= 0.68;
            if (soundEnabled) playSound.hit();
          } else if (b.x + b.radius > FELT_RIGHT) {
            b.x = FELT_RIGHT - b.radius;
            b.vx = -b.vx * 0.93;
            b.vy -= b.spinZ * 0.70;
            b.spinZ *= 0.68;
            if (soundEnabled) playSound.hit();
          }

          if (b.y - b.radius < FELT_TOP) {
            b.y = FELT_TOP + b.radius;
            b.vy = -b.vy * 0.93;
            b.vx -= b.spinZ * 0.70;
            b.spinZ *= 0.68;
            if (soundEnabled) playSound.hit();
          } else if (b.y + b.radius > FELT_BOTTOM) {
            b.y = FELT_BOTTOM - b.radius;
            b.vy = -b.vy * 0.93;
            b.vx += b.spinZ * 0.70;
            b.spinZ *= 0.68;
            if (soundEnabled) playSound.hit();
          }
        }
      }

      // 2. Ball-to-Ball Elastic Collisions with Spin Transfer & Draw/Follow Response
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.isSunk || b2.isSunk) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < b1.radius + b2.radius) {
            // Overlap separation
            const overlap = (b1.radius + b2.radius - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            // Elastic collision velocity response
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = (2 * (nx * kx + ny * ky)) / 2; // equal billiard masses

            b1.vx -= p * nx * 0.97;
            b1.vy -= p * ny * 0.97;
            b2.vx += p * nx * 0.97;
            b2.vy += p * ny * 0.97;

            // Cue ball spin reaction upon contact (draw / backspin & follow / topspin)
            if (b1.id === 0 || b2.id === 0) {
              const cueB = b1.id === 0 ? b1 : b2;
              const objB = b1.id === 0 ? b2 : b1;
              const contactNx = b1.id === 0 ? nx : -nx;
              const contactNy = b1.id === 0 ? ny : -ny;
              const sAngle = cueB.shotAngle !== undefined ? cueB.shotAngle : Math.atan2(cueB.vy, cueB.vx);

              if (cueB.spinBack > 0.05) {
                // REAL BACKSPIN (Çekme / Çektirme): Cue ball pulls BACKWARDS towards the shooter!
                const drawImpulse = cueB.spinBack * 1.85;
                cueB.vx -= Math.cos(sAngle) * drawImpulse * 0.75 + contactNx * drawImpulse * 0.45;
                cueB.vy -= Math.sin(sAngle) * drawImpulse * 0.75 + contactNy * drawImpulse * 0.45;
                cueB.spinBack = 0; // Expended into reverse traction
              } else if (cueB.spinBack < -0.05) {
                // REAL TOPSPIN (Takip): Cue ball powers FORWARD through the object ball!
                const followImpulse = Math.abs(cueB.spinBack) * 1.65;
                cueB.vx += Math.cos(sAngle) * followImpulse * 0.75 + contactNx * followImpulse * 0.45;
                cueB.vy += Math.sin(sAngle) * followImpulse * 0.75 + contactNy * followImpulse * 0.45;
                cueB.spinBack = 0; // Expended into forward roll
              }

              // Side spin transfer & deflection
              if (Math.abs(cueB.spinZ) > 0.08) {
                const perpX = -contactNy;
                const perpY = contactNx;
                cueB.vx += perpX * cueB.spinZ * 0.65;
                cueB.vy += perpY * cueB.spinZ * 0.65;
                objB.spinZ = -cueB.spinZ * 0.35;
                cueB.spinZ *= 0.55;
              }
            }

            if (soundEnabled && (Math.abs(b1.vx) > 0.4 || Math.abs(b2.vx) > 0.4)) {
              playSound.hit();
            }
          }
        }
      }

      // Check turn end & enforce strict real turn rules (USER: 'top sırası bana geçince sadece ben atabileyim')
      if (isBallsMovingRef.current && !moving) {
        isBallsMovingRef.current = false;

        if (!gameOver) {
          const cueB = ballsRef.current[0];
          const hadScratch = cueB && cueB.isSunk;
          const potted = pottedThisShotRef.current;
          pottedThisShotRef.current = [];

          if (hadScratch) {
            setFoulMessage('⚠️ Faul! Beyaz top cebe girdi. Sıra rakibe geçti!');
            setCurrentTurn((prev) => (prev === 1 ? 2 : 1));
          } else if (potted.length > 0) {
            const mySuit = currentTurn === 1 ? player1Type : player2Type;
            let keepTurn = true;
            if (mySuit) {
              const pottedMySuit = potted.some((p) =>
                mySuit === 'solid' ? !p.isStriped : p.isStriped
              );
              keepTurn = pottedMySuit;
            }
            if (keepTurn) {
              setFoulMessage('✨ Top soktun! Sıra sende kalmaya devam ediyor.');
            } else {
              setFoulMessage('⚠️ Kendi topunu sokamadın. Sıra rakibe geçti.');
              setCurrentTurn((prev) => (prev === 1 ? 2 : 1));
            }
          } else {
            setFoulMessage(currentTurn === 1 ? 'Top sokulamadı. Sıra rakibe geçti.' : 'Sıra sana geçti!');
            setCurrentTurn((prev) => (prev === 1 ? 2 : 1));
          }
        }
      }

      // --- ULTRA REALISTIC TABLE RENDERING (COSMETIC THEMES) ---
      // 1. Polished Outer Border with drop shadow
      const woodGrad = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      woodGrad.addColorStop(0, currentTable.woodColorStart);
      woodGrad.addColorStop(0.5, currentTable.woodColorMid);
      woodGrad.addColorStop(1, currentTable.woodColorEnd);
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT, 18);
      ctx.fill();

      // Outer rim inlay
      ctx.strokeStyle = currentTable.rimBorder;
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, TABLE_WIDTH - 12, TABLE_HEIGHT - 12);

      // 2. Brass/Chrome Pocket Corner Castings
      const corners = [
        { x: 0, y: 0 },
        { x: TABLE_WIDTH - 32, y: 0 },
        { x: 0, y: TABLE_HEIGHT - 32 },
        { x: TABLE_WIDTH - 32, y: TABLE_HEIGHT - 32 },
      ];
      corners.forEach((c) => {
        ctx.fillStyle = currentTable.cornerColor;
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, 32, 32, 10);
        ctx.fill();
        ctx.strokeStyle = currentTable.cornerHighlight;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // 3. Aiming Diamonds (Diamond Sights)
      DIAMONDS.forEach((d) => {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.strokeStyle = currentTable.cornerColor;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-3, -3, 6, 6);
        ctx.restore();
      });

      // 4. Inner Cushion Bevel
      ctx.fillStyle = currentTable.feltColor;
      ctx.fillRect(BORDER_SIZE - 4, BORDER_SIZE - 4, FELT_WIDTH + 8, FELT_HEIGHT + 8);

      // 5. Tournament Worsted Wool Felt (Dynamic Custom Theme)
      const feltGrad = ctx.createRadialGradient(
        FELT_LEFT + FELT_WIDTH * 0.5,
        FELT_TOP + FELT_HEIGHT * 0.5,
        50,
        FELT_LEFT + FELT_WIDTH * 0.5,
        FELT_TOP + FELT_HEIGHT * 0.5,
        FELT_WIDTH * 0.6
      );
      feltGrad.addColorStop(0, currentTable.feltCenterColor); // vibrant center
      feltGrad.addColorStop(0.85, currentTable.feltColor);
      feltGrad.addColorStop(1, '#000000'); // cushion shadow
      ctx.fillStyle = feltGrad;
      ctx.fillRect(FELT_LEFT, FELT_TOP, FELT_WIDTH, FELT_HEIGHT);

      // Headstring line & Foot Spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(FELT_LEFT + FELT_WIDTH * 0.28, FELT_TOP);
      ctx.lineTo(FELT_LEFT + FELT_WIDTH * 0.28, FELT_BOTTOM);
      ctx.stroke();
      ctx.setLineDash([]);

      // Foot spot marker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(FELT_LEFT + FELT_WIDTH * 0.72, FELT_TOP + FELT_HEIGHT / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Realistic Drop Pockets with Leather & Brass Liners
      POCKETS.forEach((p) => {
        // Deep shadow cup
        ctx.fillStyle = '#022c22';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner drop depth
        const pocketGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius);
        pocketGrad.addColorStop(0, '#000000');
        pocketGrad.addColorStop(0.7, '#021e17');
        pocketGrad.addColorStop(1, '#064e3b');
        ctx.fillStyle = pocketGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius - 2, 0, Math.PI * 2);
        ctx.fill();

        // Rim highlight
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // 7. Realistic 3D Balls Rendering
      balls.forEach((b) => {
        if (b.isSunk) return;

        // 3D Drop Shadow on felt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(b.x + 2, b.y + 2.5, b.radius * 1.05, b.radius * 0.75, Math.PI / 12, 0, Math.PI * 2);
        ctx.fill();

        // Base 3D Sphere with Realistic Radial Gradient
        const ballGrad = ctx.createRadialGradient(
          b.x - b.radius * 0.35,
          b.y - b.radius * 0.38,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius
        );

        if (b.id === 0) {
          // White Cue Ball
          ballGrad.addColorStop(0, '#ffffff');
          ballGrad.addColorStop(0.65, '#f1f5f9');
          ballGrad.addColorStop(1, '#cbd5e1');
        } else if (b.id === 8) {
          // 8-Ball Solid Black
          ballGrad.addColorStop(0, '#3f3f46');
          ballGrad.addColorStop(0.4, '#18181b');
          ballGrad.addColorStop(1, '#09090b');
        } else {
          // Object Ball Color Volume
          ballGrad.addColorStop(0, '#ffffff');
          ballGrad.addColorStop(0.2, b.color);
          ballGrad.addColorStop(0.85, b.color);
          ballGrad.addColorStop(1, '#0f172a'); // ambient rim occlusion
        }

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Striped Pattern with 3D Spherical Wrap & Rolling Rotation
        if (b.isStriped) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.clip();

          const stripeShiftY = Math.sin(b.rollY) * (b.radius * 0.35);
          // White upper and lower caps
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(b.x - b.radius, b.y - b.radius + stripeShiftY, b.radius * 2, b.radius * 0.55);
          ctx.fillRect(b.x - b.radius, b.y + b.radius * 0.45 + stripeShiftY, b.radius * 2, b.radius * 0.55);

          ctx.restore();
        }

        // 3D Spherical Rolling Number Badge (rotates realistically with rollX/rollY)
        if (b.id !== 0) {
          const rollOffsetX = Math.sin(b.rollX) * (b.radius * 0.52);
          const rollOffsetY = Math.sin(b.rollY) * (b.radius * 0.52);
          const cosX = Math.cos(b.rollX);
          const cosY = Math.cos(b.rollY);

          // Only draw badge when on the visible hemisphere facing camera
          if (cosX * cosY > -0.22) {
            const discScale = Math.max(0.25, (cosX * cosY + 0.5) / 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(
              b.x + rollOffsetX,
              b.y + rollOffsetY,
              b.radius * 0.44 * discScale,
              b.radius * 0.44 * discScale,
              0,
              0,
              Math.PI * 2
            );
            ctx.fill();

            if (discScale > 0.42) {
              ctx.fillStyle = '#0f172a';
              ctx.font = `bold ${Math.max(5, 7.5 * discScale)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(b.id), b.x + rollOffsetX, b.y + rollOffsetY + 0.5);
            }
          }
        } else {
          // Authentic Aramith Measles Cue Ball: 6 Red Dots rolling in 3D
          ctx.fillStyle = '#dc2626';
          const r = b.radius * 0.65;
          const dots3D = [
            { x: Math.sin(b.rollX), y: Math.sin(b.rollY) },
            { x: Math.sin(b.rollX + Math.PI * 0.5), y: Math.cos(b.rollY) },
            { x: Math.cos(b.rollX + Math.PI * 0.25), y: -Math.sin(b.rollY) },
            { x: -Math.sin(b.rollX + Math.PI * 0.75), y: -Math.cos(b.rollY) },
            { x: Math.cos(b.rollX + Math.PI * 0.65), y: Math.sin(b.rollY + Math.PI * 0.5) },
          ];
          dots3D.forEach((dot) => {
            ctx.beginPath();
            ctx.arc(b.x + dot.x * r, b.y + dot.y * r, 1.15, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Glossy Specular Light Reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(b.x - b.radius * 0.35, b.y - b.radius * 0.38, 2.2, 1.4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 8. CUE STICK, EXTENDED TRAJECTORY GUIDELINE & GHOST BALL PREVIEW (ONLY ON PLAYER'S TURN!)
      const cueBall = balls[0];
      if (cueBall && !cueBall.isSunk && !moving && !gameOver) {
        if (!isMyTurnRef.current) {
          // Prominent turn lock indicator directly on the felt table
          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1.5;
          const boxW = 340;
          const boxH = 40;
          const boxX = TABLE_WIDTH / 2 - boxW / 2;
          const boxY = TABLE_HEIGHT / 2 - boxH / 2;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`⏳ Sıra Rakipte (${player2Name}) • Kontroller Kilitli`, TABLE_WIDTH / 2, TABLE_HEIGHT / 2);
          ctx.restore();
        } else {
          const mouse = mousePosRef.current;
          const aimAngle = Math.atan2(mouse.y - cueBall.y, mouse.x - cueBall.x);
          cueAimAngleRef.current = aimAngle;

          // Trace to find first object ball intersection or cushion
          let hitDist = 340;
          let ghostBallPos: { x: number; y: number } | null = null;
          let hitBall: Ball | null = null;

          for (let i = 1; i < balls.length; i++) {
            const ob = balls[i];
            if (ob.isSunk) continue;

            // Ray to circle intersection
            const toX = ob.x - cueBall.x;
            const toY = ob.y - cueBall.y;
            const proj = toX * Math.cos(aimAngle) + toY * Math.sin(aimAngle);

            if (proj > 0) {
              const perpDistSq = toX * toX + toY * toY - proj * proj;
              const doubleRadius = BALL_RADIUS * 2;
              if (perpDistSq < doubleRadius * doubleRadius) {
                const d = proj - Math.sqrt(doubleRadius * doubleRadius - perpDistSq);
                if (d > 0 && d < hitDist) {
                  hitDist = d;
                  hitBall = ob;
                  ghostBallPos = {
                    x: cueBall.x + Math.cos(aimAngle) * d,
                    y: cueBall.y + Math.sin(aimAngle) * d,
                  };
                }
              }
            }
          }

          // Primary Aiming Line (Laser-sharp dashed trajectory)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(cueBall.x, cueBall.y);
          const targetX = cueBall.x + Math.cos(aimAngle) * hitDist;
          const targetY = cueBall.y + Math.sin(aimAngle) * hitDist;
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Ghost Ball Impact Preview
          if (ghostBallPos) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(ghostBallPos.x, ghostBallPos.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

            // Deflection line of hit object ball
            if (hitBall) {
              const deflAngle = Math.atan2(hitBall.y - ghostBallPos.y, hitBall.x - ghostBallPos.x);
              ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
              ctx.lineWidth = 1.4;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(hitBall.x, hitBall.y);
              ctx.lineTo(hitBall.x + Math.cos(deflAngle) * 55, hitBall.y + Math.sin(deflAngle) * 55);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // CUE STICK RENDERING WITH DYNAMIC PULL-BACK ACCORDING TO SPEED/POWER
          ctx.save();
          ctx.translate(cueBall.x, cueBall.y);
          ctx.rotate(aimAngle + Math.PI); // points towards ball

          // Dynamic Pull-back proportional to shotPowerRef.current ("nekadar huzlu vuracağını ayarlıya bilelim")
          const pullBack = 18 + (shotPowerRef.current / 100) * 48;

          // Cue Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(pullBack + 3, 2, 230, 4);

          // Tapered Wooden Cue Stick Body
          const cueGrad = ctx.createLinearGradient(pullBack, 0, pullBack + 230, 0);
          cueGrad.addColorStop(0, currentCue.color);
          cueGrad.addColorStop(0.7, currentCue.accent);
          cueGrad.addColorStop(1, '#1e1b4b');
          ctx.fillStyle = cueGrad;
          ctx.beginPath();
          ctx.moveTo(pullBack, -2.2);
          ctx.lineTo(pullBack + 230, -4.5);
          ctx.lineTo(pullBack + 230, 4.5);
          ctx.lineTo(pullBack, 2.2);
          ctx.closePath();
          ctx.fill();

          // White Ferrule
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(pullBack - 5, -2.2, 5, 4.4);

          // Chalked Blue Leather Tip
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(pullBack - 8, -2, 3, 4);

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inLobby, gameMode, soundEnabled, currentTurn, player1Type, player2Type, player1Name, player2Name, currentCue, gameOver, DIAMONDS, FELT_BOTTOM, FELT_HEIGHT, FELT_LEFT, FELT_RIGHT, FELT_TOP, FELT_WIDTH, POCKETS, activeRoomId, onProfileUpdated]);

  // Handle striking the cue ball with selected power (ONLY on player's turn!)
  const strikeCueBall = useCallback(() => {
    const cueBall = ballsRef.current[0];
    if (!cueBall || isBallsMovingRef.current || gameOver) return;
    if (!isMyTurnRef.current) {
      setFoulMessage(`⏳ Sıra rakipte (${player2Name})! Sıra sana geçince sadece sen atabilirsin.`);
      return;
    }

    // Convert shotPowerPercent (0 - 100) to precise physical velocity
    const speedRatio = shotPowerRef.current / 100;
    const power = (4 + speedRatio * 20) * currentCue.powerMultiplier;
    const angle = cueAimAngleRef.current;

    // Apply Real Cue Ball Falso (Spin)
    const spin = cueSpinRef.current;
    // Cue squirt (deflection away from strike point)
    const squirtAngle = -spin.x * 0.035 * (power / 20);
    const finalAngle = angle + squirtAngle;

    cueBall.vx = Math.cos(finalAngle) * power;
    cueBall.vy = Math.sin(finalAngle) * power;
    cueBall.shotAngle = finalAngle;
    cueBall.spinZ = spin.x * power * 1.15; // Side spin (falso)
    cueBall.spinBack = spin.y * power * 1.45; // +y: Çekme (Backspin), -y: Takip (Topspin)
    isBallsMovingRef.current = true;

    if (soundEnabled) playSound.hit();

    // Broadcast in online match
    if (activeRoomId) {
      fetch('/api/pool/rooms/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoomId,
          playerId: currentUser.id,
          action: {
            type: 'SHOT',
            vx: cueBall.vx,
            vy: cueBall.vy,
            cueAngle: finalAngle,
            power,
            spinX: spin.x,
            spinY: spin.y,
          },
        }),
      }).catch(() => {});
    }
  }, [currentCue, soundEnabled, activeRoomId, currentUser.id, gameOver, player2Name]);

  // Mouse & Key listeners on canvas
  useEffect(() => {
    if (inLobby) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = TABLE_WIDTH / rect.width;
      const scaleY = TABLE_HEIGHT / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (isBallsMovingRef.current || gameOver) return;
      if (!isMyTurnRef.current) {
        setFoulMessage(`⏳ Sıra rakipte (${player2Name})! Sıra sana geçene kadar sadece rakip atabilir.`);
        return;
      }

      isChargingRef.current = true;
      setIsCharging(true);
      setShotPowerPercent(18);
      shotPowerRef.current = 18;

      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = setInterval(() => {
        if (!isChargingRef.current) {
          clearInterval(chargeIntervalRef.current);
          return;
        }
        setShotPowerPercent((prev) => {
          let next = prev + 2.8;
          if (next > 100) next = 100;
          shotPowerRef.current = next;
          return next;
        });
      }, 30);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isChargingRef.current) return;
      isChargingRef.current = false;
      setIsCharging(false);
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
      if (isMyTurnRef.current) {
        strikeCueBall();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isMyTurnRef.current) return;
      e.preventDefault();
      // Mouse wheel adjusts power smoothly
      setShotPowerPercent((prev) => {
        const delta = e.deltaY < 0 ? 5 : -5;
        const next = Math.max(10, Math.min(100, prev + delta));
        shotPowerRef.current = next;
        return next;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isMyTurnRef.current) {
          setFoulMessage(`⏳ Sıra rakipte (${player2Name})! Sıra sana geçince sadece sen atabilirsin.`);
          return;
        }
        strikeCueBall();
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, [inLobby, strikeCueBall, gameOver]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      {/* Game Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
            🎱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">8 BALL POOL: GERÇEKÇİ BİLARDO 1v1 VS</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                GERÇEKÇİ ÇUHA & FİZİK
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Istaka: <strong className="text-amber-400">{currentCue.name}</strong> • Mod:{' '}
              <strong className="text-emerald-400">
                {gameMode === 'friend_room' ? 'Arkadaşla Şifreli Özel Oda' : gameMode === 'online_match' ? 'Çevrimiçi 1v1 VS' : 'Solo Pratik'}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gold Wallet */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
            <span>🎱</span>
            <span className="text-sm font-black text-amber-200">{(currentUser.poolCoins ?? 0).toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 uppercase">Bilardo Altını</span>
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

          {!inLobby && (
            <button
              onClick={() => {
                setInLobby(true);
                setGameOver(false);
              }}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-lg border border-emerald-500/40 transition cursor-pointer"
            >
              Lobiye Dön
            </button>
          )}
        </div>
      </div>

      {/* Incoming 1v1 Challenge Notification Banner */}
      {incomingChallenge && (
        <div className="p-3 bg-amber-500/20 border-2 border-amber-400 rounded-xl flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2 text-xs text-white font-bold">
            <span className="text-lg">⚔️</span>
            <span>
              <strong className="text-amber-300">{incomingChallenge.fromName}</strong> sana 8 Ball Pool 1v1 VS teklifi gönderdi!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAcceptChallenge(incomingChallenge)}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
            >
              Kabul Et (VS At)
            </button>
            <button
              onClick={() => respondPoolChallenge(incomingChallenge.id, false)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
            >
              Reddet
            </button>
          </div>
        </div>
      )}

      {/* Main Container: Lobby Menu or Table Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[500px]">
        {inLobby ? (
          /* INTERACTIVE LOBBY & 1v1 MATCHMAKING */
          <div className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
            {/* Top Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLobbyTab('modes')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'modes'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>OYUN MODLARI</span>
                </button>

                <button
                  onClick={() => setLobbyTab('online_vs')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'online_vs'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>ÇEVRİMİÇİ İNSANLARLA VS ({onlineUsersList.length})</span>
                </button>

                <button
                  onClick={() => {
                    fetchRooms();
                    setLobbyTab('rooms');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'rooms'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ŞİFRELİ ÖZEL ODALAR</span>
                </button>

                <button
                  onClick={() => setLobbyTab('cosmetics')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'cosmetics'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>MASA & ISTAKA KOZMETİKLERİ</span>
                </button>

                <button
                  onClick={() => setLobbyTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    lobbyTab === 'rules'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>KURALLAR</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span>Bilardo Cüzdanı:</span>
                <strong className="text-amber-200">{(currentUser.poolCoins ?? 0).toLocaleString()} 🪙</strong>
              </div>
            </div>

            {shopFeedback && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-300 text-center animate-fade-in">
                {shopFeedback}
              </div>
            )}

            {/* TAB 1: MODES (Note: Same device / pass & play removed as requested!) */}
            {lobbyTab === 'modes' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Mode 1: Hızlı Çevrimiçi 1v1 VS */}
                <div
                  onClick={() => handleStartMatch('online_match')}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-400 rounded-2xl p-6 flex flex-col justify-between transition cursor-pointer hover:-translate-y-1 shadow-xl group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    ÖNERİLEN
                  </div>
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-black mb-3">
                      ⚡
                    </div>
                    <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition">
                      Hızlı Çevrimiçi 1v1 VS
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Sitedeki çevrimiçi oyuncularla anında eşleş! Sırayla atış yapın, top soktukça sıra sende kalsın. 8 numaralı siyah topu nizami sokan maçı kazanır.
                    </p>
                  </div>
                  <button className="mt-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer">
                    HEMEN EŞLEŞ (1v1 VS)
                  </button>
                </div>

                {/* Mode 2: Arkadaşla Şifreli Oda */}
                <div
                  onClick={() => {
                    fetchRooms();
                    setLobbyTab('rooms');
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-2xl p-6 flex flex-col justify-between transition cursor-pointer hover:-translate-y-1 shadow-xl group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-black mb-3">
                      🔒
                    </div>
                    <h3 className="text-base font-black text-white group-hover:text-amber-400 transition">
                      Arkadaşla Şifreli Özel Oda
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Kendine özel masa kur, şifre belirle ve arkadaşına gönder! Başka kimse giremez, sadece ikiniz canlı 1v1 bilardo kapışın.
                    </p>
                  </div>
                  <button className="mt-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer">
                    ODA AÇ VEYA GİR
                  </button>
                </div>

                {/* Mode 3: Solo Pratik & Hassas Vuruş Masası */}
                <div
                  onClick={() => handleStartMatch('practice')}
                  className="bg-slate-900 border border-slate-800 hover:border-cyan-400 rounded-2xl p-6 flex flex-col justify-between transition cursor-pointer hover:-translate-y-1 shadow-xl group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl font-black mb-3">
                      🎯
                    </div>
                    <h3 className="text-base font-black text-white group-hover:text-cyan-400 transition">
                      Solo Pratik & Hız/Güç Masası
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Yeni vuruş hızı ve güç ayar barını test et! Banttan yansıma açılarını çalış, falsolu plase vuruşlar geliştir.
                    </p>
                  </div>
                  <button className="mt-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl border border-slate-700 cursor-pointer">
                    PRATİK BAŞLAT
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ONLINE VS USERS */}
            {lobbyTab === 'online_vs' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black text-white">Çevrimiçi Oyunculara Meydan Oku</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Aktif Oyuncu: {onlineUsersList.length}
                  </span>
                </div>

                {onlineUsersList.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    Şu anda başka çevrimiçi oyuncu bulunmuyor. Bir arkadaşına site linkini atarak onu 8 Ball Pool'a davet edebilirsin!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                    {onlineUsersList.map((usr) => (
                      <div
                        key={usr.id}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{usr.avatar}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{usr.username}</span>
                              <span className="text-[10px] text-amber-400 font-mono">{usr.tag}</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Şu an sitede aktif
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendChallenge(usr)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition cursor-pointer shadow flex items-center gap-1"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>VS At</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ROOMS */}
            {lobbyTab === 'rooms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Room */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Yeni Özel Bilardo Masası Aç</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Masa Adı</label>
                      <input
                        type="text"
                        value={roomNameInput}
                        onChange={(e) => setRoomNameInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Oda Şifresi (Opsiyonel)</label>
                      <input
                        type="text"
                        value={roomPassInput}
                        onChange={(e) => setRoomPassInput(e.target.value)}
                        placeholder="Örn: 1234"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleCreateRoom}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition"
                    >
                      MASAYI OLUŞTUR VE BEKLE
                    </button>
                  </div>
                </div>

                {/* Join Room */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white">Mevcut Odalar</h4>
                    <button
                      onClick={fetchRooms}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer font-bold"
                    >
                      Yenile
                    </button>
                  </div>

                  {availableRooms.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Şu an açık oda yok. Soldan yeni masa açabilirsin!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableRooms.map((r) => (
                        <div
                          key={r.id}
                          className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {r.hasPassword && <Lock className="w-3 h-3 text-amber-400" />}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Kuran: {r.hostName} {r.isFull ? '• (Dolu)' : '• (Boş)'}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedRoomToJoin(r);
                              handleJoinRoom(r);
                            }}
                            disabled={r.isFull}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-lg cursor-pointer"
                          >
                            Katıl
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {joinError && <div className="text-xs text-rose-400 font-bold">{joinError}</div>}
                </div>
              </div>
            )}

            {/* TAB 4: MASA & ISTAKA KOZMETİKLERİ */}
            {lobbyTab === 'cosmetics' && (
              <div className="flex flex-col gap-6">
                {/* 1. BİLARDO MASALARI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>🎱</span> BİLARDO MASALARI (ÇUHA & AHŞAP ÇERÇEVE RENKLERİ)
                    </h3>
                    <span className="text-xs text-amber-400 font-mono font-bold">
                      Seçili Masa: {currentTable.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {POOL_TABLES.map((tbl) => {
                      const isUnlocked = currentUser.unlockedPoolTables?.includes(tbl.id) || tbl.price === 0;
                      const isEquipped = selectedTableId === tbl.id;
                      const canAfford = (currentUser.poolCoins ?? 0) >= tbl.price;

                      return (
                        <div
                          key={tbl.id}
                          className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                            isEquipped ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {tbl.imageUrl && (
                              <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 border border-slate-800 shadow">
                                <img src={tbl.imageUrl} alt={tbl.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                              </div>
                            )}

                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{tbl.icon}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                {tbl.price === 0 ? 'Varsayılan' : `${tbl.price} 🪙`}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-white">{tbl.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{tbl.description}</p>

                            {/* Table preview mini swatch */}
                            <div
                              className="mt-3 h-6 w-full rounded-lg border-2 flex items-center justify-center p-0.5 shadow-inner"
                              style={{ background: tbl.woodColorStart, borderColor: tbl.rimBorder }}
                            >
                              <div
                                className="w-full h-full rounded shadow-inner flex items-center justify-center text-[9px] text-white/90 font-bold"
                                style={{ background: tbl.feltCenterColor }}
                              >
                                {tbl.name.split(' ')[0]}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-300">
                              {tbl.price === 0 ? 'Ücretsiz' : `${tbl.price} 🪙`}
                            </span>
                            <button
                              onClick={() => handleSelectTable(tbl)}
                              disabled={isEquipped}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                                isEquipped
                                  ? 'bg-slate-800 text-slate-500 cursor-default'
                                  : isUnlocked
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                  : canAfford
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {isEquipped ? 'Kullanımda' : isUnlocked ? 'Donat' : 'Satın Al'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ÖZEL TURNUVA ISTAKALARI */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>🪵</span> ÖZEL TURNUVA ISTAKALARI
                    </h3>
                    <span className="text-xs text-amber-400 font-mono font-bold">
                      Seçili Istaka: {currentCue.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {CUE_STICKS.map((cue) => {
                      const isUnlocked = currentUser.unlockedPoolCues?.includes(cue.id) || cue.price === 0;
                      const isEquipped = selectedCueId === cue.id;
                      const canAfford = (currentUser.poolCoins ?? 0) >= cue.price;

                      return (
                        <div
                          key={cue.id}
                          className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                            isEquipped ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {cue.imageUrl && (
                              <div className="relative h-24 w-full rounded-xl overflow-hidden mb-3 border border-slate-800 shadow">
                                <img src={cue.imageUrl} alt={cue.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                              </div>
                            )}

                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{cue.icon}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                Vuruş Gücü: x{cue.powerMultiplier}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-white">{cue.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{cue.description}</p>
                            <div className="mt-2.5 h-2.5 w-full rounded-full overflow-hidden flex shadow-inner" style={{ background: cue.color }}>
                              <div className="w-1/4 h-full" style={{ background: cue.accent }} />
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                            <span className="text-xs font-bold text-amber-300">
                              {cue.price === 0 ? 'Ücretsiz' : `${cue.price} 🪙`}
                            </span>
                            <button
                              onClick={() => handleSelectCue(cue)}
                              disabled={isEquipped}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                                isEquipped
                                  ? 'bg-slate-800 text-slate-500 cursor-default'
                                  : isUnlocked
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                  : canAfford
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {isEquipped ? 'Kullanımda' : isUnlocked ? 'Donat' : 'Satın Al'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: RULES */}
            {lobbyTab === 'rules' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-xs text-slate-300 space-y-3 leading-relaxed">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>🎱</span> 8 Ball Pool Resmi Maç Kuralları
                </h3>
                <p>
                  • <strong>Açılış Vuruşu:</strong> Beyaz topla üçgen dizilmiş toplara vurularak maç başlar.
                </p>
                <p>
                  • <strong>Düz ve Çizgili Toplar:</strong> İlk topu cebe sokan oyuncunun top türü belirlenir (1-7 Düz, 9-15 Çizgili).
                </p>
                <p>
                  • <strong>Sıra Devamı:</strong> Kendi topunu cebe sokan oyuncu sırasını kaybetmez, atışa devam eder.
                </p>
                <p>
                  • <strong>Hız & Vuruş Gücü:</strong> Masanın altındaki ayar barından veya fare tekerleğiyle vuruş hızını ayarlayabilirsiniz.
                </p>
                <p>
                  • <strong>Siyah 8 Numaralı Top:</strong> Tüm kendi toplarını bitiren oyuncu, 8 numaralı siyah topu nizami sokarsa maçı kazanır!
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE PLAYABLE TABLE VIEWPORT WITH POWER / SPEED ADJUSTMENT */
          <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            {/* Top Match Status Banner */}
            <div className="w-full max-w-[760px] bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 mb-2 flex items-center justify-between shadow-lg text-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
                    isMyTurn()
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-black ring-2 ring-emerald-500/30'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isMyTurn() ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{player1Name}</span>
                  {isMyTurn() && (
                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow animate-pulse">
                      🎯 SIRA SENDE (ATIŞ YAPABİLİRSİN)
                    </span>
                  )}
                  {player1Type && (
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-950">
                      {player1Type === 'solid' ? 'Düz' : 'Çizgili'}
                    </span>
                  )}
                </div>

                <span className="text-slate-600 font-bold">VS</span>

                <div
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
                    !isMyTurn()
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-black ring-2 ring-amber-500/30'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span>{player2Name}</span>
                  {!isMyTurn() && (
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow animate-pulse">
                      ⏳ SIRA RAKİPTE (KONTROLLER KİLİTLİ)
                    </span>
                  )}
                  {player2Type && (
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-950">
                      {player2Type === 'solid' ? 'Düz' : 'Çizgili'}
                    </span>
                  )}
                </div>
              </div>

              {foulMessage && (
                <div className="text-amber-300 font-bold text-xs animate-pulse bg-slate-950 px-2.5 py-1.5 rounded border border-amber-500/40 text-center">
                  {foulMessage}
                </div>
              )}
            </div>

            {/* Billiard Table Canvas, 8 Ball Pool Side Power Bar & Authentic Cue Ball Falso (Spin) Selector */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-3 w-full max-w-none flex-1">
              {/* Billiard Table Canvas (Fills full width & height seamlessly without empty gaps) */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-950/60 bg-emerald-950 w-full flex-1 flex items-center justify-center min-h-[380px]">
                <canvas
                  ref={canvasRef}
                  width={TABLE_WIDTH}
                  height={TABLE_HEIGHT}
                  className={`w-full h-auto max-h-[86vh] aspect-[760/430] object-contain block select-none ${isMyTurn() ? 'cursor-crosshair' : 'pointer-events-none opacity-90 cursor-not-allowed'}`}
                />

                {/* Floating Power Feedback Prompt */}
                {isCharging && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-500/50 text-xs font-mono font-bold text-amber-300 shadow-xl flex items-center gap-2 animate-pulse pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>GÜÇ DOLDURULUYOR: %{Math.round(shotPowerPercent)}</span>
                    <span className="text-[10px] text-slate-300">(Vurmak için sol tıkı bırak!)</span>
                  </div>
                )}

                {/* TOP-RIGHT WHITE CUE BALL FALSO (SPIN) SELECTOR - EXACTLY LIKE 8 BALL POOL MINICLIP */}
                <div className="absolute top-3 right-3 z-30 flex flex-col items-end">
                  <button
                    onClick={() => setShowSpinModal((prev) => !prev)}
                    className="group relative flex items-center gap-2 bg-slate-950/90 hover:bg-slate-900 border-2 border-amber-400/90 rounded-2xl p-2 pr-3.5 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-amber-500/40"
                    title="Beyaz Topa Tıkla: Istakayla Falso / Vuruş Noktası Seç!"
                  >
                    {/* 3D Cue Ball with Current Spin Indicator Dot */}
                    <div
                      className="relative w-12 h-12 rounded-full border-2 border-slate-300 bg-gradient-to-tr from-slate-300 via-white to-slate-100 shadow-md flex items-center justify-center shrink-0 group-hover:border-amber-300"
                      style={{
                        boxShadow: 'inset -4px -4px 10px rgba(0,0,0,0.4), 0 3px 10px rgba(0,0,0,0.7)',
                      }}
                    >
                      <div className="absolute w-full h-[1px] bg-slate-400/40 pointer-events-none" />
                      <div className="absolute h-full w-[1px] bg-slate-400/40 pointer-events-none" />
                      <div
                        className="absolute w-3 h-3 rounded-full bg-rose-600 border-2 border-white shadow-md transition-transform duration-75"
                        style={{
                          transform: `translate(${cueSpin.x * 16}px, ${cueSpin.y * 16}px)`,
                        }}
                      />
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-[10px] text-amber-300 font-black tracking-wider uppercase flex items-center gap-1">
                        <span>🎱 FALSO</span>
                        <span className="text-[8px] bg-amber-500 text-slate-950 px-1 rounded font-bold">SEÇ</span>
                      </div>
                      <div className="text-[10px] text-slate-200 font-bold truncate max-w-[95px]">
                        {cueSpin.x === 0 && cueSpin.y === 0
                          ? '🎯 Düz Vuruş'
                          : cueSpin.y > 0.3 && cueSpin.x < -0.3
                          ? '↙️ Sol-Çekme'
                          : cueSpin.y > 0.3 && cueSpin.x > 0.3
                          ? '↘️ Sağ-Çekme'
                          : cueSpin.y < -0.3 && cueSpin.x < -0.3
                          ? '↖️ Sol-İleri'
                          : cueSpin.y < -0.3 && cueSpin.x > 0.3
                          ? '↗️ Sağ-İleri'
                          : cueSpin.y > 0.3
                          ? '⬇️ Çektirme'
                          : cueSpin.y < -0.3
                          ? '⬆️ Takip'
                          : cueSpin.x < -0.3
                          ? '⬅️ Sol Falso'
                          : '➡️ Sağ Falso'}
                      </div>
                    </div>
                  </button>

                  {/* INTERACTIVE FALSO MODAL POPUP */}
                  {showSpinModal && (
                    <div className="mt-2 w-64 bg-slate-950/95 border-2 border-amber-400/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3 animate-fade-in text-white z-40 select-none">
                      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="text-xs font-black text-amber-400 font-mono flex items-center gap-1.5">
                          <span>🎱</span>
                          <span>ISTAKA VURUŞ NOKTASI</span>
                        </div>
                        <button
                          onClick={() => setShowSpinModal(false)}
                          className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Interactive 3D Cue Ball */}
                      <div
                        className="relative w-28 h-28 rounded-full cursor-crosshair flex items-center justify-center border-4 border-slate-300 bg-gradient-to-tr from-slate-300 via-white to-slate-100 shadow-2xl group"
                        style={{
                          boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.5), 0 6px 20px rgba(0,0,0,0.8)',
                        }}
                        onPointerDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left - rect.width / 2;
                          const clickY = e.clientY - rect.top - rect.height / 2;
                          const radius = rect.width / 2;
                          const dist = Math.hypot(clickX, clickY);
                          const maxR = radius * 0.82;
                          const factor = dist > maxR ? maxR / dist : 1;
                          setCueSpin({
                            x: Math.round(((clickX * factor) / maxR) * 100) / 100,
                            y: Math.round(((clickY * factor) / maxR) * 100) / 100,
                          });
                          playSound.click();
                        }}
                        onPointerMove={(e) => {
                          if (e.buttons === 1) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left - rect.width / 2;
                            const clickY = e.clientY - rect.top - rect.height / 2;
                            const radius = rect.width / 2;
                            const dist = Math.hypot(clickX, clickY);
                            const maxR = radius * 0.82;
                            const factor = dist > maxR ? maxR / dist : 1;
                            setCueSpin({
                              x: Math.round(((clickX * factor) / maxR) * 100) / 100,
                              y: Math.round(((clickY * factor) / maxR) * 100) / 100,
                            });
                          }
                        }}
                      >
                        {/* Aim Crosshairs */}
                        <div className="absolute w-full h-[1px] bg-slate-400/50 pointer-events-none" />
                        <div className="absolute h-full w-[1px] bg-slate-400/50 pointer-events-none" />
                        <div className="absolute w-3 h-3 rounded-full border border-slate-400/60 pointer-events-none" />

                        {/* Red Cue Tip Indicator Dot */}
                        <div
                          className="absolute w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
                          style={{
                            transform: `translate(${cueSpin.x * 38}px, ${cueSpin.y * 38}px)`,
                          }}
                        />
                      </div>

                      {/* Active Spin Description */}
                      <div className="text-[11px] font-bold text-center text-amber-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 w-full font-mono">
                        {cueSpin.x === 0 && cueSpin.y === 0
                          ? '🎯 Düz Vuruş (Top çarptığında durur)'
                          : cueSpin.y > 0.3 && cueSpin.x < -0.3
                          ? '↙️ Sol-Çekme (Top sola ve geriye döner)'
                          : cueSpin.y > 0.3 && cueSpin.x > 0.3
                          ? '↘️ Sağ-Çekme (Top sağa ve geriye döner)'
                          : cueSpin.y < -0.3 && cueSpin.x < -0.3
                          ? '↖️ Sol-İleri (Top sol yönde öne akar)'
                          : cueSpin.y < -0.3 && cueSpin.x > 0.3
                          ? '↗️ Sağ-İleri (Top sağ yönde öne akar)'
                          : cueSpin.y > 0.3
                          ? '⬇️ Çektirme (Top çarptıktan sonra GERİ döner!)'
                          : cueSpin.y < -0.3
                          ? '⬆️ Takip (Top çarptıktan sonra ÖNE devam eder!)'
                          : cueSpin.x < -0.3
                          ? '⬅️ Sol Falso (Banttan sola sert seker)'
                          : '➡️ Sağ Falso (Banttan sağa sert seker)'}
                      </div>

                      {/* Quick Presets */}
                      <div className="grid grid-cols-3 gap-1.5 w-full pt-1 border-t border-slate-800 text-[10px] font-bold">
                        <button
                          onClick={() => setCueSpin({ x: 0, y: 0 })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition text-center cursor-pointer"
                        >
                          🎯 Düz
                        </button>
                        <button
                          onClick={() => setCueSpin({ x: 0, y: 0.85 })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition text-center cursor-pointer"
                        >
                          ⬇️ Çektirme
                        </button>
                        <button
                          onClick={() => setCueSpin({ x: 0, y: -0.85 })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 transition text-center cursor-pointer"
                        >
                          ⬆️ Takip
                        </button>
                        <button
                          onClick={() => setCueSpin({ x: -0.85, y: 0 })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition text-center cursor-pointer"
                        >
                          ⬅️ Sol Falso
                        </button>
                        <button
                          onClick={() => setCueSpin({ x: 0.85, y: 0 })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 transition text-center cursor-pointer"
                        >
                          ➡️ Sağ Falso
                        </button>
                        <button
                          onClick={() => setShowSpinModal(false)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black transition text-center cursor-pointer"
                        >
                          ✓ Tamam
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Game Over Modal */}
                {gameOver && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                    <div className="text-5xl mb-3">🏆</div>
                    <h3 className="text-2xl font-black text-amber-400 tracking-wide">
                      {winner} KAZANDI!
                    </h3>
                    <p className="text-xs text-slate-300 mt-2 max-w-sm">
                      8 Numaralı siyah top nizami cebe girdi. Tebrikler! 100 Bilardo Altını cüzdanınıza eklendi.
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        onClick={initBalls}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Tekrar Oyna</span>
                      </button>
                      <button
                        onClick={() => setInLobby(true)}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition"
                      >
                        Lobiye Dön
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Side Power Bar (8 Ball Pool Vertical Cue Bar) */}
              <div className="flex flex-row lg:flex-col items-center justify-center gap-3 shrink-0">

                {/* 2. 8 Ball Pool Side Power Bar */}
                <div className="flex flex-col items-center justify-between w-14 h-48 lg:h-[220px] bg-slate-900 border-2 border-slate-800 rounded-2xl p-2 shadow-2xl shrink-0 select-none">
                  <div className="text-[10px] font-black text-amber-400 font-mono tracking-wider text-center">
                    <div>GÜÇ</div>
                    <div className="text-xs font-black text-white">%{Math.round(shotPowerPercent)}</div>
                  </div>

                  {/* Vertical Cue Power Bar Slot */}
                  <div
                    className={`relative flex-1 my-1.5 w-6 h-full bg-slate-950 rounded-full border border-slate-700/80 overflow-hidden shadow-inner flex flex-col justify-end ${
                      !isMyTurn() ? 'pointer-events-none opacity-40 cursor-not-allowed' : 'cursor-ns-resize'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (isBallsMovingRef.current || gameOver) return;
                      if (!isMyTurnRef.current) {
                        setFoulMessage(`⏳ Sıra rakipte (${player2Name})! Lütfen sıranızı bekleyin.`);
                        return;
                      }
                      isChargingRef.current = true;
                      setIsCharging(true);
                      setShotPowerPercent(18);
                      shotPowerRef.current = 18;
                      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
                      chargeIntervalRef.current = setInterval(() => {
                        if (!isChargingRef.current) {
                          clearInterval(chargeIntervalRef.current);
                          return;
                        }
                        setShotPowerPercent((prev) => {
                          let next = prev + 2.8;
                          if (next > 100) next = 100;
                          shotPowerRef.current = next;
                          return next;
                        });
                      }, 30);
                    }}
                    title="Basılı tutarak gücü doldur, bırakınca vur!"
                  >
                    {/* Glowing Meter Fill */}
                    <div
                      className="w-full rounded-full transition-all duration-75"
                      style={{
                        height: `${shotPowerPercent}%`,
                        background: 'linear-gradient(to top, #10b981 0%, #f59e0b 60%, #ef4444 100%)',
                        boxShadow: isCharging ? '0 0 16px rgba(245, 158, 11, 0.95)' : 'none',
                      }}
                    />
                    {/* Indicator notch */}
                    <div
                      className="absolute left-0 right-0 h-2 bg-white rounded-full shadow border border-slate-900 pointer-events-none transition-all duration-75"
                      style={{ bottom: `calc(${shotPowerPercent}% - 4px)` }}
                    />
                  </div>

                  <div className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                    {isCharging ? (
                      <span className="text-amber-400 font-black animate-pulse">ŞARJ</span>
                    ) : (
                      <span>BASILI TUT</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Interactive Power & Shot Speed Controller ("nekadar huzlu vuracağını ayarlıya bilelim") */}
            <div className="w-full max-w-[760px] bg-slate-900 border border-slate-800 rounded-xl p-3 mt-3 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">VURUŞ HIZI & GÜÇ AYARI</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      %{shotPowerPercent} ({shotPowerPercent < 35 ? 'Plase' : shotPowerPercent < 75 ? 'Orta Hızlı' : 'Tam Güç'})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Kaydırıcı veya fare tekerleğiyle hızı ayarla, [Boşluk] veya sol tıkla vur.
                  </p>
                </div>
              </div>

              {/* Slider & Presets */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                {/* Quick Presets */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-bold">
                  <button
                    onClick={() => setShotPowerPercent(25)}
                    className={`px-2 py-1 rounded transition cursor-pointer ${
                      shotPowerPercent === 25 ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    %25 Nazik
                  </button>
                  <button
                    onClick={() => setShotPowerPercent(50)}
                    className={`px-2 py-1 rounded transition cursor-pointer ${
                      shotPowerPercent === 50 ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    %50 Orta
                  </button>
                  <button
                    onClick={() => setShotPowerPercent(75)}
                    className={`px-2 py-1 rounded transition cursor-pointer ${
                      shotPowerPercent === 75 ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    %75 Hızlı
                  </button>
                  <button
                    onClick={() => setShotPowerPercent(100)}
                    className={`px-2 py-1 rounded transition cursor-pointer ${
                      shotPowerPercent === 100 ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    %100 Sert
                  </button>
                </div>

                {/* Range Slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    disabled={!isMyTurn()}
                    value={shotPowerPercent}
                    onChange={(e) => setShotPowerPercent(Number(e.target.value))}
                    className={`w-28 sm:w-36 h-2 bg-slate-950 rounded-lg appearance-none accent-amber-500 ${
                      !isMyTurn() ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  />
                  <button
                    onClick={strikeCueBall}
                    disabled={!isMyTurn()}
                    className={`px-4 py-2 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1 ${
                      isMyTurn()
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95'
                        : 'bg-slate-800 text-slate-500 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{isMyTurn() ? 'VURUŞ YAP' : 'SIRA RAKİPTE'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scoreboard Modal Widget */}
      {showScoreboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full relative shadow-2xl">
            <button
              onClick={() => setShowScoreboard(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
            <ScoreboardWidget game="pool" currentUser={currentUser} />
          </div>
        </div>
      )}
    </div>
  );
};
