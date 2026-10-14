import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

interface OnlineUser {
  id: string;
  username: string;
  tag: string;
  avatar: string;
  game: 'snake' | 'pool' | 'traffic' | 'lobby';
  lastPing: number;
}

interface PoolRoom {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  guestId?: string;
  guestName?: string;
  guestAvatar?: string;
  password?: string;
  currentTurn: string; // userId
  solidPlayerId?: string;
  stripePlayerId?: string;
  winnerId?: string;
  lastAction?: any;
  ballsState?: any[];
  updatedAt: number;
}

interface Challenge {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  roomId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

// In-memory presence, rooms and shared players store
const onlineUsers = new Map<string, OnlineUser>();
const poolRooms = new Map<string, PoolRoom>();
const challenges = new Map<string, Challenge>();
const sharedPlayers = new Map<string, any>();
const sharedChat: any[] = [];

// Cleanup stale presence every 1.5 seconds (disconnect after 4.5s without ping)
setInterval(() => {
  const now = Date.now();
  for (const [id, user] of onlineUsers.entries()) {
    if (now - user.lastPing > 4500) {
      onlineUsers.delete(id);
    }
  }

  // Cleanup old empty rooms (> 30 mins)
  for (const [roomId, room] of poolRooms.entries()) {
    if (now - room.updatedAt > 30 * 60 * 1000) {
      poolRooms.delete(roomId);
    }
  }

  // Cleanup old challenges (> 1 min)
  for (const [cId, ch] of challenges.entries()) {
    if (now - ch.createdAt > 60 * 1000) {
      challenges.delete(cId);
    }
  }
}, 1500);

// --- PRESENCE API ---
app.post('/api/presence', (req, res) => {
  const { id, username, tag, avatar, game } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  onlineUsers.set(id, {
    id,
    username: username || 'Oyuncu',
    tag: tag || '[TR]',
    avatar: avatar || '👑',
    game: game || 'lobby',
    lastPing: Date.now(),
  });

  return res.json({ success: true });
});

app.post('/api/presence/leave', (req, res) => {
  const { id } = req.body;
  if (id) {
    onlineUsers.delete(id);
  }
  return res.json({ success: true });
});

app.get('/api/presence', (req, res) => {
  const now = Date.now();
  const activeList: OnlineUser[] = [];
  const counts = {
    snake: 0,
    pool: 0,
    traffic: 0,
    lobby: 0,
  };

  for (const user of onlineUsers.values()) {
    if (now - user.lastPing <= 6000) {
      activeList.push(user);
      if (user.game in counts) {
        counts[user.game]++;
      } else {
        counts.lobby++;
      }
    }
  }

  return res.json({
    total: activeList.length,
    counts,
    users: activeList,
  });
});

// --- 8 BALL POOL MATCHMAKING & ROOMS API ---
app.get('/api/pool/rooms', (req, res) => {
  const list = Array.from(poolRooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    hostId: r.hostId,
    hostName: r.hostName,
    hostAvatar: r.hostAvatar,
    guestId: r.guestId,
    guestName: r.guestName,
    guestAvatar: r.guestAvatar,
    hasPassword: Boolean(r.password),
    isFull: Boolean(r.guestId),
    updatedAt: r.updatedAt,
  }));
  return res.json({ rooms: list });
});

app.post('/api/pool/rooms/create', (req, res) => {
  const { name, hostId, hostName, hostAvatar, password } = req.body;
  if (!hostId || !name) {
    return res.status(400).json({ error: 'Missing required room fields' });
  }

  const roomId = 'room_' + Date.now().toString(36);
  const newRoom: PoolRoom = {
    id: roomId,
    name: name.trim(),
    hostId,
    hostName: hostName || 'Oyuncu 1',
    hostAvatar: hostAvatar || '👑',
    password: password ? String(password).trim() : undefined,
    currentTurn: hostId,
    updatedAt: Date.now(),
  };

  poolRooms.set(roomId, newRoom);
  return res.json({ success: true, room: newRoom });
});

app.post('/api/pool/rooms/join', (req, res) => {
  const { roomId, guestId, guestName, guestAvatar, password } = req.body;
  const room = poolRooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Oda bulunamadı veya kapandı' });
  }

  if (room.password && room.password !== String(password || '').trim()) {
    return res.status(403).json({ error: 'Hatalı oda şifresi!' });
  }

  if (room.guestId && room.guestId !== guestId) {
    return res.status(409).json({ error: 'Bu oda şu anda dolu!' });
  }

  room.guestId = guestId;
  room.guestName = guestName || 'Rakip';
  room.guestAvatar = guestAvatar || '⚡';
  room.updatedAt = Date.now();

  return res.json({ success: true, room });
});

app.get('/api/pool/rooms/:id', (req, res) => {
  const room = poolRooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Oda bulunamadı' });
  }
  return res.json({ room });
});

app.post('/api/pool/rooms/action', (req, res) => {
  const { roomId, playerId, action } = req.body;
  const room = poolRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Oda bulunamadı' });
  }

  // Strict Turn Security: Only the active turn player can strike
  if (action && action.type === 'SHOT' && room.currentTurn && room.currentTurn !== playerId) {
    return res.status(403).json({ error: 'Sıra sende değil! Rakibin atışını beklemelisin.' });
  }

  room.lastAction = {
    ...action,
    senderId: playerId,
    timestamp: Date.now(),
  };

  if (action.nextTurn) {
    room.currentTurn = action.nextTurn;
  }
  if (action.ballsState) {
    room.ballsState = action.ballsState;
  }
  if (action.solidPlayerId) {
    room.solidPlayerId = action.solidPlayerId;
  }
  if (action.stripePlayerId) {
    room.stripePlayerId = action.stripePlayerId;
  }
  if (action.winnerId) {
    room.winnerId = action.winnerId;
  }

  room.updatedAt = Date.now();
  return res.json({ success: true, room });
});

app.post('/api/pool/rooms/leave', (req, res) => {
  const { roomId, playerId } = req.body;
  const room = poolRooms.get(roomId);
  if (room) {
    if (room.hostId === playerId) {
      poolRooms.delete(roomId);
    } else if (room.guestId === playerId) {
      room.guestId = undefined;
      room.guestName = undefined;
      room.updatedAt = Date.now();
    }
  }
  return res.json({ success: true });
});

// --- 1v1 DIRECT CHALLENGE API ---
app.post('/api/pool/challenge/send', (req, res) => {
  const { fromUser, toUserId } = req.body;
  if (!fromUser || !toUserId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // Create room automatically for challenge
  const roomId = 'vs_' + Date.now().toString(36);
  const room: PoolRoom = {
    id: roomId,
    name: `${fromUser.username} vs Rakip`,
    hostId: fromUser.id,
    hostName: fromUser.username,
    hostAvatar: fromUser.avatar,
    currentTurn: fromUser.id,
    updatedAt: Date.now(),
  };
  poolRooms.set(roomId, room);

  const challengeId = 'ch_' + Date.now();
  challenges.set(challengeId, {
    id: challengeId,
    fromId: fromUser.id,
    fromName: fromUser.username,
    fromAvatar: fromUser.avatar,
    toId: toUserId,
    roomId,
    status: 'pending',
    createdAt: Date.now(),
  });

  return res.json({ success: true, challengeId, roomId });
});

app.get('/api/pool/challenges/:userId', (req, res) => {
  const userId = req.params.userId;
  const now = Date.now();
  const pending = Array.from(challenges.values()).find(
    (c) => c.toId === userId && c.status === 'pending' && now - c.createdAt < 25000
  );
  return res.json({ challenge: pending || null });
});

app.post('/api/pool/challenge/respond', (req, res) => {
  const { challengeId, accept, responder } = req.body;
  const ch = challenges.get(challengeId);
  if (!ch) {
    return res.status(404).json({ error: 'Davet bulunamadı veya süresi doldu' });
  }

  if (accept) {
    ch.status = 'accepted';
    const room = poolRooms.get(ch.roomId);
    if (room && responder) {
      room.guestId = responder.id;
      room.guestName = responder.username;
      room.guestAvatar = responder.avatar;
      room.updatedAt = Date.now();
    }
    return res.json({ success: true, accepted: true, roomId: ch.roomId });
  } else {
    ch.status = 'declined';
    return res.json({ success: true, accepted: false });
  }
});

// In-memory accounts store with password
const registeredAccounts = new Map<string, any>();
const squadInvites = new Map<string, any>();

// Seed default player if empty
if (registeredAccounts.size === 0) {
  const defaultAcc = {
    id: 'user_master',
    username: 'Komutan',
    password: '123',
    avatar: '👑',
    tag: '[TR]',
    level: 2,
    totalScore: 450,
    coins: 300,
    unlockedPubgCostumes: ['balon_komando'],
    selectedPubgCostume: 'balon_komando',
    unlockedTrafficCars: ['red_lightning'],
    selectedTrafficCar: 'red_lightning',
    unlockedTrafficSkins: ['plain'],
    selectedTrafficSkin: 'plain',
    unlockedSnakeSkins: ['emerald'],
    selectedSnakeSkin: 'emerald',
    pubgKills: 5,
    pubgWins: 1,
    pubgHighscore: 350,
    trafficHighscore: 420,
    trafficDistance: 2400,
    snakeHighscore: 480,
    snakeKills: 3,
    poolWins: 2,
    poolHighscore: 500,
    joinedAt: 'Kayıtlı',
  };
  registeredAccounts.set(defaultAcc.username.toLowerCase(), defaultAcc);
  sharedPlayers.set(defaultAcc.id, defaultAcc);
}

// --- REAL AUTHENTICATION API (İsim ve Şifre ile Kayıt & Giriş) ---
app.post('/api/auth/register', (req, res) => {
  const { username, password, avatar, tag } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur!' });
  }

  const cleanName = String(username).trim();
  const cleanPass = String(password).trim();

  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Kullanıcı adı en az 2 karakter olmalıdır!' });
  }
  if (cleanPass.length < 3) {
    return res.status(400).json({ error: 'Şifre en az 3 karakter olmalıdır!' });
  }

  const key = cleanName.toLowerCase();
  if (registeredAccounts.has(key)) {
    return res.status(409).json({ error: 'Bu isim kullanımda! Lütfen farklı bir isim seçin.' });
  }

  const newUser = {
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    username: cleanName,
    password: cleanPass,
    avatar: avatar || '👑',
    tag: tag || '[TR]',
    level: 1,
    totalScore: 0,
    coins: 200, // Hoş geldin ödülü
    unlockedPubgCostumes: ['balon_komando'],
    selectedPubgCostume: 'balon_komando',
    unlockedTrafficCars: ['red_lightning'],
    selectedTrafficCar: 'red_lightning',
    unlockedTrafficSkins: ['plain'],
    selectedTrafficSkin: 'plain',
    unlockedSnakeSkins: ['emerald'],
    selectedSnakeSkin: 'emerald',
    pubgKills: 0,
    pubgWins: 0,
    pubgHighscore: 0,
    trafficHighscore: 0,
    trafficDistance: 0,
    snakeHighscore: 0,
    snakeKills: 0,
    poolWins: 0,
    poolHighscore: 0,
    joinedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };

  registeredAccounts.set(key, newUser);
  sharedPlayers.set(newUser.id, newUser);

  // Return user without revealing raw password in responses
  return res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir!' });
  }

  const cleanName = String(username).trim().toLowerCase();
  const cleanPass = String(password).trim();

  const account = registeredAccounts.get(cleanName);
  if (!account) {
    return res.status(404).json({ error: 'Bu kullanıcı adı bulunamadı! Lütfen önce kayıt olun.' });
  }

  if (account.password !== cleanPass) {
    return res.status(401).json({ error: 'Hatalı şifre! Lütfen şifrenizi kontrol edip tekrar deneyin.' });
  }

  return res.json({ success: true, user: account });
});

app.post('/api/auth/save', (req, res) => {
  const profile = req.body;
  if (profile && profile.username) {
    const key = String(profile.username).toLowerCase();
    const existing = registeredAccounts.get(key);
    const updated = {
      ...existing,
      ...profile,
      password: existing?.password || profile.password,
    };
    registeredAccounts.set(key, updated);
    sharedPlayers.set(profile.id, updated);
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'Geçersiz profil verisi' });
});

// --- SQUAD / TAKIM DAVETİ API ---
app.post('/api/squad/invite', (req, res) => {
  const { fromUser, toUserId } = req.body;
  if (!fromUser || !toUserId) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  const inviteId = 'sq_inv_' + Date.now();
  squadInvites.set(inviteId, {
    id: inviteId,
    fromUser,
    toUserId,
    status: 'pending',
    createdAt: Date.now(),
  });

  return res.json({ success: true, inviteId });
});

app.get('/api/squad/invites/:userId', (req, res) => {
  const userId = req.params.userId;
  const now = Date.now();
  const pending = Array.from(squadInvites.values()).find(
    (inv) => inv.toUserId === userId && inv.status === 'pending' && now - inv.createdAt < 30000
  );
  return res.json({ invite: pending || null });
});

app.post('/api/squad/respond', (req, res) => {
  const { inviteId, accept, responder } = req.body;
  const inv = squadInvites.get(inviteId);
  if (!inv) {
    return res.status(404).json({ error: 'Davet bulunamadı veya süresi doldu' });
  }

  if (accept) {
    inv.status = 'accepted';
    return res.json({ success: true, accepted: true, fromUser: inv.fromUser });
  } else {
    inv.status = 'declined';
    return res.json({ success: true, accepted: false });
  }
});

// --- VITE DEV MIDDLEWARES / PRODUCTION STATIC ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Oyundiyarı Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
