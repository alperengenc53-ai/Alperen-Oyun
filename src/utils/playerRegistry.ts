import { UserProfile, ScoreboardPlayer } from '../types/game';

const CURRENT_USER_KEY = 'oyundiyari_current_user_id';
const PLAYERS_REGISTRY_KEY = 'oyundiyari_registered_players_v3';
const CHAT_STORAGE_KEY = 'oyundiyari_real_chat_messages_v3';

// BroadcastChannel for instant real-time sync across multiple browser tabs
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('oyundiyari_real_sync_v3');
  } catch (e) {
    console.error(e);
  }
}

export interface RealChatMsg {
  id: string;
  user: string;
  tag: string;
  text: string;
  time: string;
  timestamp?: number;
}

// Normalizes player profile to guarantee all shop & customization fields exist
const ensureProfileDefaults = (p: Partial<UserProfile>): UserProfile => {
  const legacyCoins = p.coins !== undefined ? p.coins : 150;
  return {
    id: p.id || 'user_' + Date.now().toString(36),
    username: p.username || 'Oyuncu',
    avatar: p.avatar || '👑',
    tag: p.tag || '[TR]',
    level: p.level || 1,
    totalScore: p.totalScore || 0,
    coins: legacyCoins,
    trafficCoins: p.trafficCoins !== undefined ? p.trafficCoins : (p.coins ?? 120),
    snakeCoins: p.snakeCoins !== undefined ? p.snakeCoins : (p.coins ?? 120),
    poolCoins: p.poolCoins !== undefined ? p.poolCoins : (p.coins ?? 120),
    cyberCoins: p.cyberCoins !== undefined ? p.cyberCoins : (p.coins ?? 120),
    unlockedTrafficCars: Array.isArray(p.unlockedTrafficCars) && p.unlockedTrafficCars.length > 0 ? p.unlockedTrafficCars : ['red_lightning'],
    selectedTrafficCar: p.selectedTrafficCar || 'red_lightning',
    unlockedTrafficSkins: Array.isArray(p.unlockedTrafficSkins) && p.unlockedTrafficSkins.length > 0 ? p.unlockedTrafficSkins : ['plain'],
    selectedTrafficSkin: p.selectedTrafficSkin || 'plain',
    unlockedSnakeSkins: Array.isArray(p.unlockedSnakeSkins) && p.unlockedSnakeSkins.length > 0 ? p.unlockedSnakeSkins : ['emerald'],
    selectedSnakeSkin: p.selectedSnakeSkin || 'emerald',
    unlockedPoolCues: Array.isArray(p.unlockedPoolCues) && p.unlockedPoolCues.length > 0 ? p.unlockedPoolCues : ['standard', 'classic_wood'],
    selectedPoolCue: p.selectedPoolCue || 'standard',
    unlockedPoolTables: Array.isArray(p.unlockedPoolTables) && p.unlockedPoolTables.length > 0 ? p.unlockedPoolTables : ['emerald', 'emerald_classic'],
    selectedPoolTable: p.selectedPoolTable || 'emerald',
    unlockedCyberSkins: Array.isArray(p.unlockedCyberSkins) && p.unlockedCyberSkins.length > 0 ? p.unlockedCyberSkins : ['neon_speeder'],
    selectedCyberSkin: p.selectedCyberSkin || 'neon_speeder',
    trafficHighscore: p.trafficHighscore || 0,
    trafficDistance: p.trafficDistance || 0,
    snakeHighscore: p.snakeHighscore || 0,
    snakeKills: p.snakeKills || 0,
    poolWins: (p as any).poolWins || 0,
    poolHighscore: (p as any).poolHighscore || 0,
    cyberHighscore: p.cyberHighscore || 0,
    password: p.password || '',
    joinedAt: p.joinedAt || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
};

export const getAllRegisteredPlayers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(PLAYERS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ensureProfileDefaults(p));
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const saveAllRegisteredPlayers = (players: UserProfile[]): void => {
  try {
    localStorage.setItem(PLAYERS_REGISTRY_KEY, JSON.stringify(players));
    if (syncChannel) {
      syncChannel.postMessage({ type: 'PLAYERS_UPDATED', players });
    }
  } catch (e) {
    console.error(e);
  }
};

// Get current active player
export const getActiveUser = (): UserProfile | null => {
  const players = getAllRegisteredPlayers();
  const currentId = localStorage.getItem(CURRENT_USER_KEY);

  if (currentId) {
    const found = players.find((p) => p.id === currentId);
    if (found) return found;
  }

  // If players exist but no active is selected, select the first
  if (players.length > 0) {
    setActiveUser(players[0].id);
    return players[0];
  }

  // Auto-create unique guest profile for this device session so multi-device presence works correctly
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 9);
  const guestUser = ensureProfileDefaults({
    id: guestId,
    username: 'Misafir_' + Math.floor(Math.random() * 900 + 100),
    avatar: '👑',
    tag: '[TR]',
  });
  saveAllRegisteredPlayers([guestUser, ...players]);
  setActiveUser(guestId);
  return guestUser;
};

export const setActiveUser = (userId: string | null): void => {
  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  if (syncChannel) {
    syncChannel.postMessage({ type: 'ACTIVE_USER_CHANGED', userId });
  }
};

// --- REAL SERVER AUTHENTICATION: REGISTER WITH USERNAME & PASSWORD ---
export const registerAccountWithPassword = async (
  username: string,
  password: string,
  tag: string = '[TR]',
  avatar: string = '👑'
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const cleanName = username.trim();
  const existingLocal = getAllRegisteredPlayers();
  if (existingLocal.some((p) => p.username.toLowerCase() === cleanName.toLowerCase())) {
    return { success: false, error: 'Bu isim kullanımda! Lütfen farklı bir isim seçin.' };
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanName,
        password: password.trim(),
        tag: tag.trim() || '[TR]',
        avatar,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Bu isim kullanımda! Lütfen farklı bir isim seçin.' };
    }

    const newUser = ensureProfileDefaults(data.user);
    const players = getAllRegisteredPlayers();
    const updatedList = [newUser, ...players.filter((p) => p.id !== newUser.id)];
    saveAllRegisteredPlayers(updatedList);
    setActiveUser(newUser.id);

    addRealChatMessage(newUser.username, newUser.tag, 'Merhaba! Yeni hesabımla katıldım 👋');
    return { success: true, user: newUser };
  } catch (e: any) {
    // Fallback to local
    const localNew = ensureProfileDefaults({
      id: 'user_' + Date.now().toString(36),
      username: cleanName,
      password: password.trim(),
      avatar,
      tag: tag.trim() || '[TR]',
      coins: 300,
      trafficCoins: 120,
      snakeCoins: 120,
      poolCoins: 120,
    });
    const players = getAllRegisteredPlayers();
    saveAllRegisteredPlayers([localNew, ...players]);
    setActiveUser(localNew.id);
    return { success: true, user: localNew };
  }
};

// --- REAL SERVER AUTHENTICATION: LOGIN WITH USERNAME & PASSWORD ---
export const loginAccountWithPassword = async (
  username: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Giriş yapılamadı' };
    }

    const account = ensureProfileDefaults(data.user);
    const players = getAllRegisteredPlayers();
    const updatedList = [account, ...players.filter((p) => p.id !== account.id)];
    saveAllRegisteredPlayers(updatedList);
    setActiveUser(account.id);
    return { success: true, user: account };
  } catch (e: any) {
    // Check local fallback
    const players = getAllRegisteredPlayers();
    const found = players.find(
      (p) => p.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!found) {
      return { success: false, error: 'Bu kullanıcı adı bulunamadı!' };
    }
    if (found.password && found.password !== password.trim()) {
      return { success: false, error: 'Hatalı şifre!' };
    }
    setActiveUser(found.id);
    return { success: true, user: found };
  }
};

// Logout
export const logoutAccount = (): void => {
  setActiveUser(null);
};

// Register a real player (legacy quick create)
export const registerNewPlayer = (username: string, tag: string = '[TR]', avatar: string = '👑'): UserProfile => {
  const players = getAllRegisteredPlayers();
  const cleanName = username.trim();

  // If already registered with this name, switch to it
  const existing = players.find((p) => p.username.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    setActiveUser(existing.id);
    return existing;
  }

  const newPlayer = ensureProfileDefaults({
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    username: cleanName,
    avatar,
    tag: tag.trim() || '[TR]',
    coins: 200,
  });

  const updatedList = [newPlayer, ...players];
  saveAllRegisteredPlayers(updatedList);
  setActiveUser(newPlayer.id);

  addRealChatMessage(newPlayer.username, newPlayer.tag, `Merhaba! Oyuna katıldım 👋`);
  return newPlayer;
};

// Update existing player profile
export const updatePlayerProfile = (profile: UserProfile): void => {
  const players = getAllRegisteredPlayers();
  const normalized = ensureProfileDefaults(profile);
  const index = players.findIndex((p) => p.id === normalized.id);
  if (index !== -1) {
    players[index] = normalized;
  } else {
    players.unshift(normalized);
  }
  saveAllRegisteredPlayers(players);

  // Sync to server
  fetch('/api/auth/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  }).catch(() => {});
};

// Add coins to active player
export const addPlayerCoins = (amount: number): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;
  current.coins = Math.max(0, (current.coins || 0) + amount);
  updatePlayerProfile(current);
  return current;
};

// Buy shop item with independent game currency
export const buyShopItem = (
  category: 'traffic_car' | 'traffic_skin' | 'snake_skin' | 'pool_cue' | 'pool_table' | 'cyber_ship',
  itemId: string,
  price: number
): { success: boolean; message: string; profile?: UserProfile } => {
  const current = getActiveUser();
  if (!current) {
    return { success: false, message: 'Lütfen önce profilinize giriş yapın!' };
  }

  // Determine game-specific currency
  let walletName = 'Altın';
  let availableCoins = current.coins ?? 0;

  if (category === 'traffic_car' || category === 'traffic_skin') {
    walletName = 'Turbo Otoban';
    availableCoins = current.trafficCoins ?? 0;
  } else if (category === 'snake_skin') {
    walletName = 'Snake.io';
    availableCoins = current.snakeCoins ?? 0;
  } else if (category === 'pool_cue' || category === 'pool_table') {
    walletName = '8 Ball Pool';
    availableCoins = current.poolCoins ?? 0;
  } else if (category === 'cyber_ship') {
    walletName = 'Cyber Runner 3D';
    availableCoins = current.cyberCoins ?? 0;
  }

  if (price > 0 && availableCoins < price) {
    return {
      success: false,
      message: `Yetersiz ${walletName} parası! Gerekli: ${price} 🪙, Mevcut bakiyen: ${availableCoins} 🪙`,
      profile: current,
    };
  }

  if (category === 'traffic_car') {
    if (!current.unlockedTrafficCars.includes(itemId)) {
      current.unlockedTrafficCars.push(itemId);
    }
    current.selectedTrafficCar = itemId;
    if (price > 0) current.trafficCoins = Math.max(0, (current.trafficCoins ?? 0) - price);
  } else if (category === 'traffic_skin') {
    if (!current.unlockedTrafficSkins.includes(itemId)) {
      current.unlockedTrafficSkins.push(itemId);
    }
    current.selectedTrafficSkin = itemId;
    if (price > 0) current.trafficCoins = Math.max(0, (current.trafficCoins ?? 0) - price);
  } else if (category === 'snake_skin') {
    if (!current.unlockedSnakeSkins.includes(itemId)) {
      current.unlockedSnakeSkins.push(itemId);
    }
    current.selectedSnakeSkin = itemId;
    if (price > 0) current.snakeCoins = Math.max(0, (current.snakeCoins ?? 0) - price);
  } else if (category === 'pool_cue') {
    if (!current.unlockedPoolCues) current.unlockedPoolCues = ['standard', 'classic_wood'];
    if (!current.unlockedPoolCues.includes(itemId)) {
      current.unlockedPoolCues.push(itemId);
    }
    current.selectedPoolCue = itemId;
    if (price > 0) current.poolCoins = Math.max(0, (current.poolCoins ?? 0) - price);
  } else if (category === 'pool_table') {
    if (!current.unlockedPoolTables) current.unlockedPoolTables = ['emerald', 'emerald_classic'];
    if (!current.unlockedPoolTables.includes(itemId)) {
      current.unlockedPoolTables.push(itemId);
    }
    current.selectedPoolTable = itemId;
    if (price > 0) current.poolCoins = Math.max(0, (current.poolCoins ?? 0) - price);
  } else if (category === 'cyber_ship') {
    if (!current.unlockedCyberSkins) current.unlockedCyberSkins = ['neon_speeder'];
    if (!current.unlockedCyberSkins.includes(itemId)) {
      current.unlockedCyberSkins.push(itemId);
    }
    current.selectedCyberSkin = itemId;
    if (price > 0) current.cyberCoins = Math.max(0, (current.cyberCoins ?? 0) - price);
  }

  current.coins = (current.trafficCoins ?? 0) + (current.snakeCoins ?? 0) + (current.poolCoins ?? 0) + (current.cyberCoins ?? 0);
  updatePlayerProfile(current);
  return { success: true, message: `🎉 "${itemId}" başarıyla satın alındı ve ${price} 🪙 düşüldü!`, profile: current };
};

// Equip already owned item (VERIFIES OWNERSHIP STRICTLY - NO FREE ITEMS!)
export const equipShopItem = (
  category: 'traffic_car' | 'traffic_skin' | 'snake_skin' | 'pool_cue' | 'pool_table' | 'cyber_ship',
  itemId: string
): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;

  if (category === 'traffic_car') {
    if (!current.unlockedTrafficCars?.includes(itemId)) {
      console.warn(`Attempted to equip locked car: ${itemId}`);
      return null;
    }
    current.selectedTrafficCar = itemId;
  } else if (category === 'traffic_skin') {
    if (!current.unlockedTrafficSkins?.includes(itemId)) {
      console.warn(`Attempted to equip locked car skin: ${itemId}`);
      return null;
    }
    current.selectedTrafficSkin = itemId;
  } else if (category === 'snake_skin') {
    if (!current.unlockedSnakeSkins?.includes(itemId)) {
      console.warn(`Attempted to equip locked snake skin: ${itemId}`);
      return null;
    }
    current.selectedSnakeSkin = itemId;
  } else if (category === 'pool_cue') {
    if (!current.unlockedPoolCues?.includes(itemId)) {
      console.warn(`Attempted to equip locked cue: ${itemId}`);
      return null;
    }
    current.selectedPoolCue = itemId;
  } else if (category === 'pool_table') {
    if (!current.unlockedPoolTables?.includes(itemId)) {
      console.warn(`Attempted to equip locked table: ${itemId}`);
      return null;
    }
    current.selectedPoolTable = itemId;
  } else if (category === 'cyber_ship') {
    if (!current.unlockedCyberSkins?.includes(itemId)) {
      console.warn(`Attempted to equip locked cyber ship: ${itemId}`);
      return null;
    }
    current.selectedCyberSkin = itemId;
  }

  updatePlayerProfile(current);
  return current;
};

// Update game score and independent coins for current player
export const updateGameScore = (
  game: 'traffic' | 'snake' | 'pool' | 'cyber3d',
  score: number,
  extra?: { kills?: number; win?: boolean; distance?: number; coinsEarned?: number }
): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;

  current.totalScore += Math.floor(score / 2);
  current.level = Math.floor(current.totalScore / 500) + 1;

  if (extra?.coinsEarned && extra.coinsEarned > 0) {
    if (game === 'traffic') {
      current.trafficCoins = (current.trafficCoins || 0) + extra.coinsEarned;
    } else if (game === 'snake') {
      current.snakeCoins = (current.snakeCoins || 0) + extra.coinsEarned;
    } else if (game === 'pool') {
      current.poolCoins = (current.poolCoins || 0) + extra.coinsEarned;
    } else if (game === 'cyber3d') {
      current.cyberCoins = (current.cyberCoins || 0) + extra.coinsEarned;
    }
    current.coins = (current.trafficCoins || 0) + (current.snakeCoins || 0) + (current.poolCoins || 0) + (current.cyberCoins || 0);
  }

  if (game === 'traffic') {
    if (score > current.trafficHighscore) current.trafficHighscore = score;
    if (extra?.distance && extra.distance > current.trafficDistance) {
      current.trafficDistance = extra.distance;
    }
  } else if (game === 'snake') {
    if (score > current.snakeHighscore) current.snakeHighscore = score;
    if (extra?.kills) current.snakeKills += extra.kills;
  } else if (game === 'pool') {
    if (score > ((current as any).poolHighscore || 0)) (current as any).poolHighscore = score;
    if (extra?.win) (current as any).poolWins = ((current as any).poolWins || 0) + 1;
  } else if (game === 'cyber3d') {
    if (score > (current.cyberHighscore || 0)) current.cyberHighscore = score;
  }

  updatePlayerProfile(current);
  return current;
};

// Real Scoreboard containing ONLY real registered users
export const getRealScoreboard = (game: 'traffic' | 'snake' | 'pool' | 'cyber3d'): ScoreboardPlayer[] => {
  const players = getAllRegisteredPlayers();

  const list: ScoreboardPlayer[] = players.map((p) => {
    let score = 0;
    let metric = '';

    if (game === 'traffic') {
      score = p.trafficHighscore || 0;
      metric = `${(p.trafficDistance / 1000).toFixed(1)} km`;
    } else if (game === 'snake') {
      score = p.snakeHighscore || 0;
      metric = `${p.snakeKills} Av`;
    } else if (game === 'pool') {
      score = (p as any).poolHighscore || 0;
      metric = `${(p as any).poolWins || 0} Zafer`;
    } else if (game === 'cyber3d') {
      score = p.cyberHighscore || 0;
      metric = `${score.toLocaleString()} Puan`;
    }

    return {
      id: p.id,
      rank: 1,
      username: p.username,
      avatar: p.avatar,
      score,
      metric,
      isOnline: true,
      tag: p.tag,
      coins: p.coins,
    };
  });

  list.sort((a, b) => b.score - a.score);

  return list.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
};

// Opponent real players
export const getRegisteredOpponents = (currentUserId: string): UserProfile[] => {
  const all = getAllRegisteredPlayers();
  return all.filter((p) => p.id !== currentUserId);
};

// REAL CHAT MESSAGES STORAGE (HOURLY AUTO-RESET AT EVERY NEW HOUR)
export const getRealChatMessages = (): RealChatMsg[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Hourly auto-reset: calculate start of current hour (e.g. 14:00:00)
        const now = new Date();
        const startOfCurrentHour = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          0,
          0,
          0
        ).getTime();

        const valid = parsed.filter((m: any) => m.timestamp && m.timestamp >= startOfCurrentHour);
        if (valid.length !== parsed.length) {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(valid));
        }
        return valid;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const addRealChatMessage = (user: string, tag: string, text: string): RealChatMsg[] => {
  const current = getRealChatMessages();
  const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const newMsg: RealChatMsg = {
    id: 'msg_' + Date.now(),
    user,
    tag,
    text: text.trim(),
    time,
    timestamp: Date.now(),
  };
  const updated = [newMsg, ...current.slice(0, 40)];
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
    if (syncChannel) {
      syncChannel.postMessage({ type: 'CHAT_UPDATED', messages: updated });
    }
  } catch (e) {
    console.error(e);
  }
  return updated;
};

// Real-time inter-tab sync listener
export const onPlayersSync = (callback: () => void): (() => void) => {
  if (!syncChannel) return () => {};
  const handler = () => {
    callback();
  };
  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel?.removeEventListener('message', handler);
  };
};
