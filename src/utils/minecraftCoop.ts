// Real-time Co-op room synchronization for Paper Minecraft via BroadcastChannel and localStorage

export interface CoopPlayerState {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  isSwinging: boolean;
  selectedBlock: number;
  hp: number;
  lastSeen: number;
}

export interface CoopRoom {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  password: string;
  seed: number;
  createdAt: number;
  playersCount: number;
}

export interface CoopChatMsg {
  id: string;
  sender: string;
  text: string;
  time: string;
}

const ROOMS_KEY = 'paper_mc_coop_rooms_v1';

let coopChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    coopChannel = new BroadcastChannel('paper_mc_coop_channel_v1');
  } catch (e) {
    console.error(e);
  }
}

export const getCoopRooms = (): CoopRoom[] => {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // filter rooms older than 6 hours
        const now = Date.now();
        return parsed.filter((r) => now - r.createdAt < 6 * 3600 * 1000);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const saveCoopRoom = (room: CoopRoom): void => {
  const current = getCoopRooms().filter((r) => r.id !== room.id);
  const updated = [room, ...current];
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(updated));
    coopChannel?.postMessage({ type: 'ROOMS_UPDATED' });
  } catch (e) {
    console.error(e);
  }
};

export const deleteCoopRoom = (roomId: string): void => {
  const updated = getCoopRooms().filter((r) => r.id !== roomId);
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(updated));
    coopChannel?.postMessage({ type: 'ROOMS_UPDATED' });
  } catch (e) {
    console.error(e);
  }
};

export const broadcastCoopAction = (action: {
  type: 'PLAYER_UPDATE' | 'BLOCK_CHANGE' | 'CHAT_MSG' | 'PLAYER_JOIN' | 'PLAYER_LEAVE';
  roomId: string;
  data: any;
}): void => {
  try {
    coopChannel?.postMessage(action);
  } catch (e) {
    console.error(e);
  }
};

export const onCoopMessage = (
  roomId: string,
  callback: (action: { type: string; roomId: string; data: any }) => void
): (() => void) => {
  if (!coopChannel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.roomId === roomId) {
      callback(event.data);
    }
  };
  coopChannel.addEventListener('message', handler);
  return () => {
    coopChannel?.removeEventListener('message', handler);
  };
};
