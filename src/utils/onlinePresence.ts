import { UserProfile } from '../types/game';

export interface OnlineUserInfo {
  id: string;
  username: string;
  tag: string;
  avatar: string;
  game: 'snake' | 'pool' | 'traffic' | 'cyber3d' | 'lobby';
}

export interface PresenceData {
  total: number;
  counts: {
    snake: number;
    pool: number;
    traffic: number;
    cyber3d: number;
    lobby: number;
    [key: string]: number;
  };
  users: OnlineUserInfo[];
}

export interface ChallengeData {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  roomId: string;
}

export interface SquadInviteData {
  id: string;
  fromUser: {
    id: string;
    username: string;
    avatar: string;
    level?: number;
    tag?: string;
  };
  toUserId: string;
  createdAt: number;
}

let activeUser: UserProfile | null = null;
let currentGame: 'snake' | 'pool' | 'traffic' | 'cyber3d' | 'lobby' = 'lobby';
let heartbeatInterval: any = null;
let pollInterval: any = null;
const presenceListeners = new Set<(data: PresenceData) => void>();
const challengeListeners = new Set<(challenge: ChallengeData | null) => void>();
const squadListeners = new Set<(invite: SquadInviteData | null) => void>();

let cachedPresence: PresenceData = {
  total: 1,
  counts: { snake: 0, pool: 0, traffic: 0, cyber3d: 0, lobby: 1 },
  users: [],
};

export const startPresenceService = (
  user: UserProfile,
  initialGame: 'snake' | 'pool' | 'traffic' | 'cyber3d' | 'lobby' = 'lobby'
) => {
  activeUser = user;
  currentGame = initialGame;

  // Send initial ping and sync player to server
  sendPing();
  syncPlayerToServer(user);

  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(sendPing, 1200);

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(fetchPresence, 1000);

  // Handle unload to immediately decrement online count
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', sendLeave);
  }
};

export const updatePresenceUser = (user: UserProfile) => {
  activeUser = user;
  sendPing();
  syncPlayerToServer(user);
};

export const syncPlayerToServer = async (user: UserProfile) => {
  try {
    const { db } = await import('../firebase');
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', user.id), {
      ...user,
      lastSeen: Date.now(),
      status: 'online'
    }, { merge: true });
  } catch (e) {
    console.error('Error syncing player to Firestore:', e);
  }
};

export const setPresenceGame = (game: 'snake' | 'pool' | 'traffic' | 'cyber3d' | 'lobby') => {
  if (currentGame !== game) {
    currentGame = game;
    sendPing();
  }
};

const sendPing = async () => {
  if (!activeUser) return;
  try {
    const { db } = await import('../firebase');
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', activeUser.id), {
      lastSeen: Date.now(),
      status: 'online',
      currentGame: currentGame
    }, { merge: true });
  } catch (e) {
    console.error('Error sending ping to Firestore:', e);
  }
};

export const sendLeave = async () => {
  if (!activeUser) return;
  try {
    const { db } = await import('../firebase');
    await setDoc(doc(db, 'users', activeUser.id), {
      status: 'offline',
      lastSeen: Date.now()
    }, { merge: true });
  } catch (e) {
    console.error('Error setting offline in Firestore:', e);
  }
};

let unsubscribePresence: (() => void) | null = null;

export const fetchPresence = async () => {
  if (unsubscribePresence) return;

  const { db } = await import('../firebase');
  const { collection, onSnapshot, query, where } = await import('firebase/firestore');
  
  const q = query(collection(db, 'users'), where('status', '==', 'online'));
  
  unsubscribePresence = onSnapshot(q, (snapshot) => {
    const users: OnlineUserInfo[] = [];
    const counts: PresenceData['counts'] = {
      snake: 0,
      pool: 0,
      traffic: 0,
      cyber3d: 0,
      lobby: 0
    };

    snapshot.forEach((doc) => {
      const data = doc.data() as OnlineUserInfo;
      users.push(data);
      if (data.game in counts) {
        counts[data.game]++;
      } else {
        counts.lobby++;
      }
    });

    const data: PresenceData = {
      total: users.length,
      counts,
      users
    };
    
    cachedPresence = data;
    presenceListeners.forEach((fn) => fn(data));
  });
};

export const subscribePresence = (callback: (data: PresenceData) => void) => {
  presenceListeners.add(callback);
  callback(cachedPresence);
  return () => {
    presenceListeners.delete(callback);
  };
};

export const getCachedPresence = (): PresenceData => cachedPresence;

// Challenge system
export const sendPoolChallenge = async (toUserId: string) => {
  if (!activeUser) return null;
  try {
    const res = await fetch('/api/pool/challenge/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUser: {
          id: activeUser.id,
          username: activeUser.username,
          avatar: activeUser.avatar,
        },
        toUserId,
      }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
};

export const checkChallenges = async () => {
  if (!activeUser) return;
  try {
    const res = await fetch(`/api/pool/challenges/${activeUser.id}`);
    if (res.ok) {
      const data = await res.json();
      challengeListeners.forEach((fn) => fn(data.challenge));
    }
  } catch (e) {
    // ignore
  }
};

export const subscribeChallenges = (callback: (challenge: ChallengeData | null) => void) => {
  challengeListeners.add(callback);
  return () => {
    challengeListeners.delete(callback);
  };
};

export const respondPoolChallenge = async (challengeId: string, accept: boolean) => {
  if (!activeUser) return null;
  try {
    const res = await fetch('/api/pool/challenge/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        accept,
        responder: {
          id: activeUser.id,
          username: activeUser.username,
          avatar: activeUser.avatar,
        },
      }),
    });
    return await res.json();
  } catch (e) {
    return null;
  }
};

// Squad (Takım) Invite System
export const sendSquadInvite = async (toUserId: string) => {
  if (!activeUser) return null;
  try {
    const res = await fetch('/api/squad/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUser: {
          id: activeUser.id,
          username: activeUser.username,
          avatar: activeUser.avatar,
          tag: activeUser.tag,
          level: activeUser.level || 1,
        },
        toUserId,
      }),
    });
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const checkSquadInvites = async () => {
  if (!activeUser) return;
  try {
    const res = await fetch(`/api/squad/invites/${activeUser.id}`);
    if (res.ok) {
      const data = await res.json();
      squadListeners.forEach((fn) => fn(data.invite));
    }
  } catch (e) {
    // ignore
  }
};

export const subscribeSquadInvites = (callback: (invite: SquadInviteData | null) => void) => {
  squadListeners.add(callback);
  return () => {
    squadListeners.delete(callback);
  };
};

export const respondSquadInvite = async (inviteId: string, accept: boolean) => {
  if (!activeUser) return null;
  try {
    const res = await fetch('/api/squad/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteId,
        accept,
        responder: {
          id: activeUser.id,
          username: activeUser.username,
          avatar: activeUser.avatar,
        },
      }),
    });
    return await res.json();
  } catch (e) {
    return null;
  }
};

