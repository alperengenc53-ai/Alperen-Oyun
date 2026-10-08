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
}

// Normalizes player profile to guarantee all shop & customization fields exist
const ensureProfileDefaults = (p: Partial<UserProfile>): UserProfile => {
  return {
    id: p.id || 'user_' + Date.now().toString(36),
    username: p.username || 'Oyuncu',
    avatar: p.avatar || '👑',
    tag: p.tag || '[TR]',
    level: p.level || 1,
    totalScore: p.totalScore || 0,
    coins: p.coins !== undefined ? p.coins : 150, // Welcome gift coins!
    unlockedPubgCostumes: Array.isArray(p.unlockedPubgCostumes) && p.unlockedPubgCostumes.length > 0 ? p.unlockedPubgCostumes : ['balon_komando'],
    selectedPubgCostume: p.selectedPubgCostume || 'balon_komando',
    unlockedTrafficCars: Array.isArray(p.unlockedTrafficCars) && p.unlockedTrafficCars.length > 0 ? p.unlockedTrafficCars : ['red_lightning'],
    selectedTrafficCar: p.selectedTrafficCar || 'red_lightning',
    unlockedTrafficSkins: Array.isArray(p.unlockedTrafficSkins) && p.unlockedTrafficSkins.length > 0 ? p.unlockedTrafficSkins : ['plain'],
    selectedTrafficSkin: p.selectedTrafficSkin || 'plain',
    unlockedSnakeSkins: Array.isArray(p.unlockedSnakeSkins) && p.unlockedSnakeSkins.length > 0 ? p.unlockedSnakeSkins : ['emerald'],
    selectedSnakeSkin: p.selectedSnakeSkin || 'emerald',
    pubgKills: p.pubgKills || 0,
    pubgWins: p.pubgWins || 0,
    pubgHighscore: p.pubgHighscore || 0,
    trafficHighscore: p.trafficHighscore || 0,
    trafficDistance: p.trafficDistance || 0,
    snakeHighscore: p.snakeHighscore || 0,
    snakeKills: p.snakeKills || 0,
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

  return null;
};

export const setActiveUser = (userId: string): void => {
  localStorage.setItem(CURRENT_USER_KEY, userId);
  if (syncChannel) {
    syncChannel.postMessage({ type: 'ACTIVE_USER_CHANGED', userId });
  }
};

// Register a real player
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
    coins: 150, // Welcome gift coins!
  });

  const updatedList = [newPlayer, ...players];
  saveAllRegisteredPlayers(updatedList);
  setActiveUser(newPlayer.id);

  // Auto post registration greeting into real chat
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
};

// Add coins to active player
export const addPlayerCoins = (amount: number): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;
  current.coins = Math.max(0, (current.coins || 0) + amount);
  updatePlayerProfile(current);
  return current;
};

// Buy shop item
export const buyShopItem = (
  category: 'pubg_costume' | 'traffic_car' | 'traffic_skin' | 'snake_skin',
  itemId: string,
  price: number
): { success: boolean; message: string; profile?: UserProfile } => {
  const current = getActiveUser();
  if (!current) {
    return { success: false, message: 'Lütfen önce profilinize giriş yapın!' };
  }

  if (price > 0 && current.coins < price) {
    return {
      success: false,
      message: `Yetersiz altın! Gerekli: ${price} 🪙, Mevcut: ${current.coins} 🪙`,
      profile: current,
    };
  }

  if (category === 'pubg_costume') {
    if (!current.unlockedPubgCostumes.includes(itemId)) {
      current.unlockedPubgCostumes.push(itemId);
    }
    current.selectedPubgCostume = itemId;
  } else if (category === 'traffic_car') {
    if (!current.unlockedTrafficCars.includes(itemId)) {
      current.unlockedTrafficCars.push(itemId);
    }
    current.selectedTrafficCar = itemId;
  } else if (category === 'traffic_skin') {
    if (!current.unlockedTrafficSkins.includes(itemId)) {
      current.unlockedTrafficSkins.push(itemId);
    }
    current.selectedTrafficSkin = itemId;
  } else if (category === 'snake_skin') {
    if (!current.unlockedSnakeSkins.includes(itemId)) {
      current.unlockedSnakeSkins.push(itemId);
    }
    current.selectedSnakeSkin = itemId;
  }

  if (price > 0) {
    current.coins -= price;
  }

  updatePlayerProfile(current);
  return { success: true, message: 'Başarıyla satın alındı ve kuşandı!', profile: current };
};

// Equip already owned item
export const equipShopItem = (
  category: 'pubg_costume' | 'traffic_car' | 'traffic_skin' | 'snake_skin',
  itemId: string
): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;

  if (category === 'pubg_costume') {
    current.selectedPubgCostume = itemId;
  } else if (category === 'traffic_car') {
    current.selectedTrafficCar = itemId;
  } else if (category === 'traffic_skin') {
    current.selectedTrafficSkin = itemId;
  } else if (category === 'snake_skin') {
    current.selectedSnakeSkin = itemId;
  }

  updatePlayerProfile(current);
  return current;
};

// Update game score and coins for current player
export const updateGameScore = (
  game: 'pubg' | 'traffic' | 'snake' | 'minecraft',
  score: number,
  extra?: { kills?: number; win?: boolean; distance?: number; coinsEarned?: number; blocksMined?: number }
): UserProfile | null => {
  const current = getActiveUser();
  if (!current) return null;

  current.totalScore += Math.floor(score / 2);
  current.level = Math.floor(current.totalScore / 500) + 1;

  if (extra?.coinsEarned && extra.coinsEarned > 0) {
    current.coins = (current.coins || 0) + extra.coinsEarned;
  }

  if (game === 'pubg') {
    if (score > current.pubgHighscore) current.pubgHighscore = score;
    if (extra?.kills) current.pubgKills += extra.kills;
    if (extra?.win) current.pubgWins += 1;
  } else if (game === 'traffic') {
    if (score > current.trafficHighscore) current.trafficHighscore = score;
    if (extra?.distance && extra.distance > current.trafficDistance) {
      current.trafficDistance = extra.distance;
    }
  } else if (game === 'snake') {
    if (score > current.snakeHighscore) current.snakeHighscore = score;
    if (extra?.kills) current.snakeKills += extra.kills;
  } else if (game === 'minecraft') {
    // Blocks mined and craft score
    if (score > (current as any).minecraftScore || 0) {
      (current as any).minecraftScore = score;
    }
  }

  updatePlayerProfile(current);
  return current;
};

// Real Scoreboard containing ONLY real registered users
export const getRealScoreboard = (game: 'pubg' | 'traffic' | 'snake' | 'minecraft'): ScoreboardPlayer[] => {
  const players = getAllRegisteredPlayers();

  const list: ScoreboardPlayer[] = players.map((p) => {
    let score = 0;
    let metric = '';

    if (game === 'pubg') {
      score = p.pubgHighscore || 0;
      metric = `${p.pubgWins} Zafer • ${p.pubgKills} Av`;
    } else if (game === 'traffic') {
      score = p.trafficHighscore || 0;
      metric = `${(p.trafficDistance / 1000).toFixed(1)} km`;
    } else if (game === 'snake') {
      score = p.snakeHighscore || 0;
      metric = `${p.snakeKills} Av`;
    } else if (game === 'minecraft') {
      score = (p as any).minecraftScore || p.totalScore || 0;
      metric = `Co-op Madenci`;
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

// REAL CHAT MESSAGES STORAGE (NO FAKE BOTS)
export const getRealChatMessages = (): RealChatMsg[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
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
