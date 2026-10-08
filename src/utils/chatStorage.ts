export interface RealChatMessage {
  id: string;
  userId: string;
  username: string;
  tag: string;
  avatar: string;
  text: string;
  time: string;
}

const CHAT_STORAGE_KEY = 'oyundiyari_real_chat_messages';

let chatSyncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    chatSyncChannel = new BroadcastChannel('oyundiyari_chat_sync');
  } catch (e) {
    console.error(e);
  }
}

export const getRealChatMessages = (): RealChatMessage[] => {
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

export const sendRealChatMessage = (
  userId: string,
  username: string,
  tag: string,
  avatar: string,
  text: string
): RealChatMessage[] => {
  const current = getRealChatMessages();
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const newMsg: RealChatMessage = {
    id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
    userId,
    username,
    tag,
    avatar,
    text: text.trim(),
    time: timeStr,
  };

  const updated = [newMsg, ...current.slice(0, 30)];
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
    if (chatSyncChannel) {
      chatSyncChannel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: newMsg });
    }
  } catch (e) {
    console.error(e);
  }
  return updated;
};

export const onChatSync = (callback: () => void): (() => void) => {
  if (!chatSyncChannel) return () => {};
  const handler = () => {
    callback();
  };
  chatSyncChannel.addEventListener('message', handler);
  return () => {
    chatSyncChannel?.removeEventListener('message', handler);
  };
};
