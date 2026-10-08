import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import { Pickaxe, Shield, Heart, Sun, Moon, Utensils, Maximize2, RotateCcw, Users, Lock, Unlock, Key, Plus, LogIn, MessageSquare, Send, Check, Sparkles, Hammer } from 'lucide-react';
import { UserProfile } from '../../types/game';
import { updateGameScore } from '../../utils/playerRegistry';
import {
  CoopRoom,
  CoopPlayerState,
  getCoopRooms,
  saveCoopRoom,
  deleteCoopRoom,
  broadcastCoopAction,
  onCoopMessage,
} from '../../utils/minecraftCoop';

interface PaperMinecraftGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

// Block IDs
const BLOCK_AIR = 0;
const BLOCK_GRASS = 1;
const BLOCK_DIRT = 2;
const BLOCK_STONE = 3;
const BLOCK_WOOD = 4;
const BLOCK_LEAVES = 5;
const BLOCK_COAL = 6;
const BLOCK_IRON = 7;
const BLOCK_DIAMOND = 8;
const BLOCK_PLANKS = 9;
const BLOCK_CRAFTING = 10;
const BLOCK_TORCH = 11;
const BLOCK_BEDROCK = 12;
const BLOCK_COBBLE = 13;

interface BlockMeta {
  id: number;
  name: string;
  icon: string;
  color: string;
  hardness: number; // hits needed to break
  isSolid: boolean;
}

const BLOCKS: Record<number, BlockMeta> = {
  [BLOCK_AIR]: { id: BLOCK_AIR, name: 'Hava', icon: '💨', color: 'transparent', hardness: 0, isSolid: false },
  [BLOCK_GRASS]: { id: BLOCK_GRASS, name: 'Çim Blok', icon: '🟩', color: '#22c55e', hardness: 1, isSolid: true },
  [BLOCK_DIRT]: { id: BLOCK_DIRT, name: 'Toprak', icon: '🟫', color: '#78350f', hardness: 1, isSolid: true },
  [BLOCK_STONE]: { id: BLOCK_STONE, name: 'Taş', icon: '🪨', color: '#64748b', hardness: 3, isSolid: true },
  [BLOCK_WOOD]: { id: BLOCK_WOOD, name: 'Meşe Kütüğü', icon: '🪵', color: '#92400e', hardness: 2, isSolid: true },
  [BLOCK_LEAVES]: { id: BLOCK_LEAVES, name: 'Meşe Yaprağı', icon: '🍃', color: '#15803d', hardness: 1, isSolid: false },
  [BLOCK_COAL]: { id: BLOCK_COAL, name: 'Kömür Cevheri', icon: '⬛', color: '#334155', hardness: 3, isSolid: true },
  [BLOCK_IRON]: { id: BLOCK_IRON, name: 'Demir Cevheri', icon: '🪙', color: '#94a3b8', hardness: 4, isSolid: true },
  [BLOCK_DIAMOND]: { id: BLOCK_DIAMOND, name: 'Elmas Cevheri', icon: '💎', color: '#06b6d4', hardness: 5, isSolid: true },
  [BLOCK_PLANKS]: { id: BLOCK_PLANKS, name: 'Tahta Kalas', icon: '📦', color: '#d97706', hardness: 2, isSolid: true },
  [BLOCK_CRAFTING]: { id: BLOCK_CRAFTING, name: 'Çalışma Masası', icon: '🔨', color: '#b45309', hardness: 2, isSolid: true },
  [BLOCK_TORCH]: { id: BLOCK_TORCH, name: 'Meşale', icon: '🕯️', color: '#facc15', hardness: 1, isSolid: false },
  [BLOCK_BEDROCK]: { id: BLOCK_BEDROCK, name: 'Katman Kayası', icon: '⚫', color: '#090d16', hardness: 9999, isSolid: true },
  [BLOCK_COBBLE]: { id: BLOCK_COBBLE, name: 'Kırıktaş', icon: '🧱', color: '#475569', hardness: 3, isSolid: true },
};

const WORLD_WIDTH = 120;
const WORLD_HEIGHT = 45;
const TILE_SIZE = 24;
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 540;

interface HotbarSlot {
  blockId: number;
  count: number;
}

export const PaperMinecraftGame: React.FC<PaperMinecraftGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inMenu, setInMenu] = useState<boolean>(true);
  const [menuTab, setMenuTab] = useState<'solo' | 'coop_create' | 'coop_join' | 'guide'>('solo');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeRoom, setActiveRoom] = useState<CoopRoom | null>(null);
  const [coopRoomsList, setCoopRoomsList] = useState<CoopRoom[]>(getCoopRooms());

  // Room creation form state
  const [newRoomName, setNewRoomName] = useState(`${currentUser.username}'in Dünyası`);
  const [newRoomPass, setNewRoomPass] = useState('1234');

  // Room join state
  const [joinSelectedRoom, setJoinSelectedRoom] = useState<CoopRoom | null>(null);
  const [joinPassInput, setJoinPassInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // In-game stats
  const [blocksMined, setBlocksMined] = useState<number>(0);
  const [diamondsFound, setDiamondsFound] = useState<number>(0);
  const [craftingOpen, setCraftingOpen] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Hotbar state (Slots 1 to 9)
  const [hotbar, setHotbar] = useState<HotbarSlot[]>([
    { blockId: BLOCK_WOOD, count: 12 },
    { blockId: BLOCK_STONE, count: 16 },
    { blockId: BLOCK_DIRT, count: 24 },
    { blockId: BLOCK_PLANKS, count: 8 },
    { blockId: BLOCK_TORCH, count: 6 },
    { blockId: BLOCK_CRAFTING, count: 1 },
    { blockId: BLOCK_AIR, count: 0 },
    { blockId: BLOCK_AIR, count: 0 },
    { blockId: BLOCK_AIR, count: 0 },
  ]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  // World grid: 2D array [y][x]
  const worldRef = useRef<number[][]>([]);
  const remotePlayersRef = useRef<Map<string, CoopPlayerState>>(new Map());

  // Player physics state
  const playerRef = useRef({
    x: 40 * TILE_SIZE,
    y: 14 * TILE_SIZE,
    vx: 0,
    vy: 0,
    width: 16,
    height: 34,
    isGrounded: false,
    facing: 'right' as 'left' | 'right',
    hp: 20,
    hunger: 20,
    swingTimer: 0,
    miningProgress: 0,
    miningTarget: null as { x: number; y: number } | null,
  });

  const keysRef = useRef<{ [code: string]: boolean }>({});
  const mousePosRef = useRef<{ screenX: number; screenY: number; isDown: boolean; rightDown: boolean }>({
    screenX: 400,
    screenY: 300,
    isDown: false,
    rightDown: false,
  });
  const cameraRef = useRef<{ x: number; y: number }>({ x: 40 * TILE_SIZE, y: 14 * TILE_SIZE });

  // Generate 2D Paper Minecraft world
  const generateWorld = (seed: number = 42) => {
    const grid: number[][] = [];
    const surfaceY = 17;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      grid[y] = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        // Natural gentle hills
        const hillOffset = Math.round(Math.sin((x + seed) * 0.12) * 2 + Math.cos((x + seed) * 0.05) * 1.5);
        const groundLevel = surfaceY + hillOffset;

        if (y < groundLevel) {
          grid[y][x] = BLOCK_AIR;
        } else if (y === groundLevel) {
          grid[y][x] = BLOCK_GRASS;
        } else if (y < groundLevel + 4) {
          grid[y][x] = BLOCK_DIRT;
        } else if (y === WORLD_HEIGHT - 1) {
          grid[y][x] = BLOCK_BEDROCK;
        } else {
          // Stone layer with ores
          const rand = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
          const noise = rand - Math.floor(rand);

          if (y > 34 && noise < 0.035) {
            grid[y][x] = BLOCK_DIAMOND; // Rare diamonds deep underground!
          } else if (y > 26 && noise < 0.07) {
            grid[y][x] = BLOCK_IRON;
          } else if (noise < 0.11) {
            grid[y][x] = BLOCK_COAL;
          } else {
            grid[y][x] = BLOCK_STONE;
          }
        }
      }
    }

    // Place trees on surface
    for (let x = 6; x < WORLD_WIDTH - 6; x += 7) {
      if ((x * 13 + seed) % 5 === 0) {
        // find ground level at x
        let gy = 0;
        while (gy < WORLD_HEIGHT && grid[gy][x] === BLOCK_AIR) {
          gy++;
        }
        if (gy < WORLD_HEIGHT && grid[gy][x] === BLOCK_GRASS) {
          // trunk
          for (let th = 1; th <= 4; th++) {
            if (gy - th >= 0) grid[gy - th][x] = BLOCK_WOOD;
          }
          // leaves
          for (let ly = gy - 6; ly <= gy - 4; ly++) {
            for (let lx = x - 2; lx <= x + 2; lx++) {
              if (ly >= 0 && lx >= 0 && lx < WORLD_WIDTH && grid[ly][lx] === BLOCK_AIR) {
                grid[ly][lx] = BLOCK_LEAVES;
              }
            }
          }
        }
      }
    }

    worldRef.current = grid;
  };

  // Start Solo Match
  const handleStartSolo = () => {
    setActiveRoom(null);
    generateWorld(Date.now());
    playerRef.current.x = 24 * TILE_SIZE;
    playerRef.current.y = 12 * TILE_SIZE;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.hp = 20;
    setBlocksMined(0);
    setDiamondsFound(0);
    setInMenu(false);
    setIsPlaying(true);
    playSound.victory();
  };

  // Create Co-op Room with Password
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoom: CoopRoom = {
      id: 'room_' + Date.now().toString(36),
      name: newRoomName.trim(),
      hostId: currentUser.id,
      hostName: currentUser.username,
      password: newRoomPass.trim(),
      seed: Math.floor(Math.random() * 10000),
      createdAt: Date.now(),
      playersCount: 1,
    };

    saveCoopRoom(newRoom);
    setActiveRoom(newRoom);
    generateWorld(newRoom.seed);

    playerRef.current.x = 24 * TILE_SIZE;
    playerRef.current.y = 12 * TILE_SIZE;
    setInMenu(false);
    setIsPlaying(true);
    playSound.victory();
  };

  // Join Co-op Room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinSelectedRoom) return;

    if (joinSelectedRoom.password && joinPassInput.trim() !== joinSelectedRoom.password) {
      setJoinError('Hatalı oda şifresi! Lütfen tekrar deneyin.');
      return;
    }

    setJoinError(null);
    setActiveRoom(joinSelectedRoom);
    generateWorld(joinSelectedRoom.seed);

    playerRef.current.x = 26 * TILE_SIZE;
    playerRef.current.y = 12 * TILE_SIZE;
    setInMenu(false);
    setIsPlaying(true);

    broadcastCoopAction({
      type: 'PLAYER_JOIN',
      roomId: joinSelectedRoom.id,
      data: {
        id: currentUser.id,
        name: currentUser.username,
        avatar: currentUser.avatar,
      },
    });

    playSound.victory();
  };

  // Co-op message sync listener
  useEffect(() => {
    if (!activeRoom) return;

    const unsub = onCoopMessage(activeRoom.id, (action) => {
      if (action.type === 'PLAYER_UPDATE') {
        const pState = action.data as CoopPlayerState;
        if (pState.id !== currentUser.id) {
          remotePlayersRef.current.set(pState.id, pState);
        }
      } else if (action.type === 'BLOCK_CHANGE') {
        const { x, y, blockId } = action.data;
        if (worldRef.current[y] && worldRef.current[y][x] !== undefined) {
          worldRef.current[y][x] = blockId;
        }
      } else if (action.type === 'CHAT_MSG') {
        setChatMessages((prev) => [action.data, ...prev.slice(0, 30)]);
        playSound.coin();
      } else if (action.type === 'PLAYER_JOIN') {
        setChatMessages((prev) => [
          {
            id: 'sys_' + Date.now(),
            sender: 'SİSTEM',
            text: `👋 ${action.data.name} odaya bağlandı!`,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
      } else if (action.type === 'PLAYER_LEAVE') {
        remotePlayersRef.current.delete(action.data.id);
      }
    });

    return () => {
      unsub();
      if (activeRoom) {
        broadcastCoopAction({
          type: 'PLAYER_LEAVE',
          roomId: activeRoom.id,
          data: { id: currentUser.id },
        });
      }
    };
  }, [activeRoom, currentUser.id]);

  // Main game loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastBroadcast = 0;

    const loop = () => {
      const p = playerRef.current;
      const world = worldRef.current;

      // 1. Controls & Horizontal movement
      const moveSpeed = 3.6;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) {
        p.vx = -moveSpeed;
        p.facing = 'left';
      } else if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) {
        p.vx = moveSpeed;
        p.facing = 'right';
      } else {
        p.vx *= 0.7;
      }

      // 2. Jump
      if ((keysRef.current['KeyW'] || keysRef.current['Space'] || keysRef.current['ArrowUp']) && p.isGrounded) {
        p.vy = -7.2;
        p.isGrounded = false;
        playSound.jump();
      }

      // 3. Gravity
      p.vy = Math.min(10, p.vy + 0.38);

      // 4. Horizontal Collision check
      p.x += p.vx;
      const leftCol = Math.floor(p.x / TILE_SIZE);
      const rightCol = Math.floor((p.x + p.width) / TILE_SIZE);
      const topRow = Math.floor(p.y / TILE_SIZE);
      const botRow = Math.floor((p.y + p.height - 2) / TILE_SIZE);

      for (let r = topRow; r <= botRow; r++) {
        if (p.vx > 0 && world[r]?.[rightCol] && BLOCKS[world[r][rightCol]].isSolid) {
          p.x = rightCol * TILE_SIZE - p.width - 0.1;
          p.vx = 0;
        } else if (p.vx < 0 && world[r]?.[leftCol] && BLOCKS[world[r][leftCol]].isSolid) {
          p.x = (leftCol + 1) * TILE_SIZE + 0.1;
          p.vx = 0;
        }
      }

      // 5. Vertical Collision check
      p.y += p.vy;
      const newLeftCol = Math.floor((p.x + 2) / TILE_SIZE);
      const newRightCol = Math.floor((p.x + p.width - 2) / TILE_SIZE);
      const newTopRow = Math.floor(p.y / TILE_SIZE);
      const newBotRow = Math.floor((p.y + p.height) / TILE_SIZE);

      p.isGrounded = false;

      for (let c = newLeftCol; c <= newRightCol; c++) {
        if (p.vy > 0 && world[newBotRow]?.[c] && BLOCKS[world[newBotRow][c]].isSolid) {
          p.y = newBotRow * TILE_SIZE - p.height;
          p.vy = 0;
          p.isGrounded = true;
        } else if (p.vy < 0 && world[newTopRow]?.[c] && BLOCKS[world[newTopRow][c]].isSolid) {
          p.y = (newTopRow + 1) * TILE_SIZE;
          p.vy = 0;
        }
      }

      // Clamp inside world bounds
      p.x = Math.max(0, Math.min(WORLD_WIDTH * TILE_SIZE - p.width, p.x));
      p.y = Math.max(0, Math.min(WORLD_HEIGHT * TILE_SIZE - p.height, p.y));

      // 6. Camera follows player smoothly
      cameraRef.current = {
        x: p.x - VIEW_WIDTH / 2 + p.width / 2,
        y: Math.max(0, p.y - VIEW_HEIGHT / 2 + p.height / 2),
      };
      const cam = cameraRef.current;

      // 7. Mining & Block Placing
      const mouse = mousePosRef.current;
      const worldMouseX = cam.x + mouse.screenX;
      const worldMouseY = cam.y + mouse.screenY;
      const targetTileX = Math.floor(worldMouseX / TILE_SIZE);
      const targetTileY = Math.floor(worldMouseY / TILE_SIZE);

      const pCenterX = p.x + p.width / 2;
      const pCenterY = p.y + p.height / 2;
      const distToMouse = Math.hypot(worldMouseX - pCenterX, worldMouseY - pCenterY);
      const REACH = 5 * TILE_SIZE; // 5 blocks reach

      // MINE BLOCK (Left Click)
      if (mouse.isDown && distToMouse < REACH) {
        if (targetTileY >= 0 && targetTileY < WORLD_HEIGHT && targetTileX >= 0 && targetTileX < WORLD_WIDTH) {
          const currentBlock = world[targetTileY][targetTileX];
          if (currentBlock !== BLOCK_AIR && currentBlock !== BLOCK_BEDROCK) {
            p.swingTimer = (p.swingTimer + 1) % 15;

            if (p.miningTarget?.x === targetTileX && p.miningTarget?.y === targetTileY) {
              p.miningProgress += 1;
              const requiredHits = BLOCKS[currentBlock].hardness * 6;

              if (p.miningProgress >= requiredHits) {
                // Break block!
                world[targetTileY][targetTileX] = BLOCK_AIR;
                playSound.hit();
                p.miningProgress = 0;
                p.miningTarget = null;

                setBlocksMined((b) => b + 1);
                if (currentBlock === BLOCK_DIAMOND) {
                  setDiamondsFound((d) => d + 1);
                  playSound.victory();
                }

                // Add to inventory
                setHotbar((prev) => {
                  const copy = [...prev];
                  const existing = copy.find((s) => s.blockId === currentBlock && s.count < 64);
                  if (existing) {
                    existing.count += 1;
                  } else {
                    const empty = copy.find((s) => s.blockId === BLOCK_AIR || s.count === 0);
                    if (empty) {
                      empty.blockId = currentBlock;
                      empty.count = 1;
                    }
                  }
                  return copy;
                });

                // Broadcast in Co-op
                if (activeRoom) {
                  broadcastCoopAction({
                    type: 'BLOCK_CHANGE',
                    roomId: activeRoom.id,
                    data: { x: targetTileX, y: targetTileY, blockId: BLOCK_AIR },
                  });
                }
              }
            } else {
              p.miningTarget = { x: targetTileX, y: targetTileY };
              p.miningProgress = 0;
            }
          }
        }
      } else {
        p.miningTarget = null;
        p.miningProgress = 0;
      }

      // PLACE BLOCK (Right Click)
      if (mouse.rightDown && distToMouse < REACH) {
        mouse.rightDown = false; // consume click
        if (targetTileY >= 0 && targetTileY < WORLD_HEIGHT && targetTileX >= 0 && targetTileX < WORLD_WIDTH) {
          if (world[targetTileY][targetTileX] === BLOCK_AIR) {
            const currentSlot = hotbar[selectedSlotIndex];
            if (currentSlot && currentSlot.count > 0 && currentSlot.blockId !== BLOCK_AIR) {
              world[targetTileY][targetTileX] = currentSlot.blockId;
              playSound.coin();

              setHotbar((prev) => {
                const copy = [...prev];
                copy[selectedSlotIndex].count -= 1;
                if (copy[selectedSlotIndex].count <= 0) {
                  copy[selectedSlotIndex].blockId = BLOCK_AIR;
                }
                return copy;
              });

              if (activeRoom) {
                broadcastCoopAction({
                  type: 'BLOCK_CHANGE',
                  roomId: activeRoom.id,
                  data: { x: targetTileX, y: targetTileY, blockId: currentSlot.blockId },
                });
              }
            }
          }
        }
      }

      // Broadcast position to Co-op room (throttled every 70ms)
      const now = Date.now();
      if (activeRoom && now - lastBroadcast > 70) {
        lastBroadcast = now;
        broadcastCoopAction({
          type: 'PLAYER_UPDATE',
          roomId: activeRoom.id,
          data: {
            id: currentUser.id,
            name: currentUser.username,
            tag: currentUser.tag,
            avatar: currentUser.avatar,
            x: p.x,
            y: p.y,
            vx: p.vx,
            vy: p.vy,
            facing: p.facing,
            isSwinging: mouse.isDown,
            selectedBlock: hotbar[selectedSlotIndex]?.blockId || BLOCK_AIR,
            hp: p.hp,
            lastSeen: now,
          },
        });
      }

      // --- RENDER 2D PAPER MINECRAFT CANVAS ---
      // Sky gradient
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 5; i++) {
        const cloudX = ((i * 320 - cam.x * 0.3) % (VIEW_WIDTH + 200)) - 100;
        ctx.fillRect(cloudX, 50 + (i % 2) * 30, 110, 24);
        ctx.fillRect(cloudX + 15, 38 + (i % 2) * 30, 80, 24);
      }

      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      // Visible blocks
      const startTileX = Math.max(0, Math.floor(cam.x / TILE_SIZE));
      const endTileX = Math.min(WORLD_WIDTH - 1, Math.ceil((cam.x + VIEW_WIDTH) / TILE_SIZE));
      const startTileY = Math.max(0, Math.floor(cam.y / TILE_SIZE));
      const endTileY = Math.min(WORLD_HEIGHT - 1, Math.ceil((cam.y + VIEW_HEIGHT) / TILE_SIZE));

      for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          const bId = world[y]?.[x];
          if (bId && bId !== BLOCK_AIR) {
            const bx = x * TILE_SIZE;
            const by = y * TILE_SIZE;

            if (bId === BLOCK_GRASS) {
              ctx.fillStyle = '#78350f'; // dirt
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#22c55e'; // grass top
              ctx.fillRect(bx, by, TILE_SIZE, 6);
            } else if (bId === BLOCK_DIRT) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#5c2b09';
              ctx.fillRect(bx + 4, by + 4, 4, 4);
              ctx.fillRect(bx + 14, by + 12, 4, 4);
            } else if (bId === BLOCK_STONE) {
              ctx.fillStyle = '#64748b';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#475569';
              ctx.fillRect(bx + 3, by + 5, 5, 4);
              ctx.fillRect(bx + 12, by + 14, 6, 4);
            } else if (bId === BLOCK_WOOD) {
              ctx.fillStyle = '#92400e';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#78350f';
              ctx.fillRect(bx + 4, by, 3, TILE_SIZE);
              ctx.fillRect(bx + 14, by, 3, TILE_SIZE);
            } else if (bId === BLOCK_LEAVES) {
              ctx.fillStyle = '#15803d';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#16a34a';
              ctx.fillRect(bx + 2, by + 2, 8, 8);
              ctx.fillRect(bx + 12, by + 12, 8, 8);
            } else if (bId === BLOCK_DIAMOND) {
              ctx.fillStyle = '#64748b';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#06b6d4';
              ctx.fillRect(bx + 5, by + 5, 4, 4);
              ctx.fillRect(bx + 14, by + 7, 5, 5);
              ctx.fillRect(bx + 7, by + 13, 6, 5);
            } else if (bId === BLOCK_IRON) {
              ctx.fillStyle = '#64748b';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#fed7aa';
              ctx.fillRect(bx + 6, by + 6, 4, 4);
              ctx.fillRect(bx + 13, by + 13, 5, 5);
            } else if (bId === BLOCK_COAL) {
              ctx.fillStyle = '#64748b';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(bx + 5, by + 5, 5, 5);
              ctx.fillRect(bx + 12, by + 12, 6, 6);
            } else if (bId === BLOCK_PLANKS) {
              ctx.fillStyle = '#d97706';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = '#b45309';
              ctx.lineWidth = 1;
              ctx.strokeRect(bx, by, TILE_SIZE, TILE_SIZE);
            } else if (bId === BLOCK_CRAFTING) {
              ctx.fillStyle = '#b45309';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(bx + 4, by + 4, 16, 16);
            } else if (bId === BLOCK_TORCH) {
              ctx.fillStyle = '#78350f';
              ctx.fillRect(bx + 10, by + 8, 4, 16);
              ctx.fillStyle = '#facc15';
              ctx.fillRect(bx + 9, by + 4, 6, 6);
            } else {
              ctx.fillStyle = BLOCKS[bId]?.color || '#475569';
              ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
            }

            // Tile outline
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Draw Mining Progress Crack
      if (p.miningTarget && p.miningProgress > 0) {
        const mx = p.miningTarget.x * TILE_SIZE;
        const my = p.miningTarget.y * TILE_SIZE;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(mx + 2, my + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.beginPath();
        ctx.moveTo(mx + 4, my + 4);
        ctx.lineTo(mx + TILE_SIZE - 4, my + TILE_SIZE - 4);
        ctx.moveTo(mx + TILE_SIZE - 4, my + 4);
        ctx.lineTo(mx + 4, my + TILE_SIZE - 4);
        ctx.stroke();
      }

      // Mouse Hover Tile Box
      if (distToMouse < REACH && targetTileX >= 0 && targetTileX < WORLD_WIDTH && targetTileY >= 0 && targetTileY < WORLD_HEIGHT) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(targetTileX * TILE_SIZE, targetTileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }

      // RENDER REMOTE CO-OP PLAYERS
      remotePlayersRef.current.forEach((rp) => {
        const rpWidth = 16;
        // Buddy avatar & name
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${rp.avatar} ${rp.name}`, rp.x + 8, rp.y - 10);

        // Buddy body
        ctx.fillStyle = '#0284c7'; // Cyan Shirt
        ctx.fillRect(rp.x, rp.y + 10, rpWidth, 14);
        ctx.fillStyle = '#1e3a8a'; // Blue Pants
        ctx.fillRect(rp.x + 2, rp.y + 24, rpWidth - 4, 10);
        // Head
        ctx.fillStyle = '#fed7aa'; // Skin
        ctx.fillRect(rp.x, rp.y, rpWidth, 10);
        ctx.fillStyle = '#78350f'; // Hair
        ctx.fillRect(rp.x, rp.y, rpWidth, 3);
      });

      // RENDER MAIN PLAYER (STEVE / PAPER CHARACTER)
      // Player Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentUser.avatar} ${currentUser.username} (Sen)`, p.x + p.width / 2, p.y - 12);

      // Head
      ctx.fillStyle = '#fed7aa'; // Skin tone
      ctx.fillRect(p.x, p.y, p.width, 10);
      ctx.fillStyle = '#78350f'; // Hair
      ctx.fillRect(p.x, p.y, p.width, 3);
      // Eyes
      ctx.fillStyle = '#1e3a8a';
      if (p.facing === 'right') {
        ctx.fillRect(p.x + p.width - 5, p.y + 4, 3, 2);
      } else {
        ctx.fillRect(p.x + 2, p.y + 4, 3, 2);
      }

      // Body (Cyan classic Steve shirt)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(p.x, p.y + 10, p.width, 14);

      // Pants (Dark blue)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(p.x + 2, p.y + 24, p.width - 4, 10);

      // Tool / Pickaxe in hand
      ctx.save();
      ctx.translate(p.facing === 'right' ? p.x + p.width : p.x, p.y + 14);
      if (mouse.isDown) {
        ctx.rotate(Math.sin(p.swingTimer) * 0.7);
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 8, 3);
      ctx.fillStyle = '#64748b'; // pickaxe tip
      ctx.fillRect(8, -4, 4, 11);
      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, activeRoom, currentUser, hotbar, selectedSlotIndex]);

  // Keyboard and mouse events
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      // Hotbar 1-9
      if (e.key >= '1' && e.key <= '9') {
        setSelectedSlotIndex(parseInt(e.key) - 1);
      }
      if (e.code === 'KeyE') {
        setCraftingOpen((c) => !c);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEW_WIDTH / rect.width;
      const scaleY = VIEW_HEIGHT / rect.height;
      mousePosRef.current.screenX = (e.clientX - rect.left) * scaleX;
      mousePosRef.current.screenY = (e.clientY - rect.top) * scaleY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mousePosRef.current.isDown = true;
      if (e.button === 2) mousePosRef.current.rightDown = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mousePosRef.current.isDown = false;
      if (e.button === 2) mousePosRef.current.rightDown = false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // disable right click context menu on game canvas
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPlaying]);

  // Crafting helpers
  const craftPlanks = () => {
    const woodSlot = hotbar.find((s) => s.blockId === BLOCK_WOOD && s.count > 0);
    if (!woodSlot) return;
    woodSlot.count -= 1;
    if (woodSlot.count <= 0) woodSlot.blockId = BLOCK_AIR;

    setHotbar((prev) => {
      const copy = [...prev];
      const planksSlot = copy.find((s) => s.blockId === BLOCK_PLANKS && s.count < 60);
      if (planksSlot) {
        planksSlot.count += 4;
      } else {
        const empty = copy.find((s) => s.blockId === BLOCK_AIR || s.count === 0);
        if (empty) {
          empty.blockId = BLOCK_PLANKS;
          empty.count = 4;
        }
      }
      return copy;
    });
    playSound.coin();
  };

  const craftTable = () => {
    const planksSlot = hotbar.find((s) => s.blockId === BLOCK_PLANKS && s.count >= 4);
    if (!planksSlot) return;
    planksSlot.count -= 4;
    if (planksSlot.count <= 0) planksSlot.blockId = BLOCK_AIR;

    setHotbar((prev) => {
      const copy = [...prev];
      const empty = copy.find((s) => s.blockId === BLOCK_AIR || s.count === 0);
      if (empty) {
        empty.blockId = BLOCK_CRAFTING;
        empty.count = 1;
      }
      return copy;
    });
    playSound.coin();
  };

  const craftTorches = () => {
    const coalSlot = hotbar.find((s) => s.blockId === BLOCK_COAL && s.count > 0);
    const planksSlot = hotbar.find((s) => s.blockId === BLOCK_PLANKS && s.count > 0);
    if (!coalSlot || !planksSlot) return;

    coalSlot.count -= 1;
    if (coalSlot.count <= 0) coalSlot.blockId = BLOCK_AIR;
    planksSlot.count -= 1;
    if (planksSlot.count <= 0) planksSlot.blockId = BLOCK_AIR;

    setHotbar((prev) => {
      const copy = [...prev];
      const torchSlot = copy.find((s) => s.blockId === BLOCK_TORCH && s.count < 60);
      if (torchSlot) {
        torchSlot.count += 4;
      } else {
        const empty = copy.find((s) => s.blockId === BLOCK_AIR || s.count === 0);
        if (empty) {
          empty.blockId = BLOCK_TORCH;
          empty.count = 4;
        }
      }
      return copy;
    });
    playSound.coin();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom) return;

    const newMsg = {
      id: 'chat_' + Date.now(),
      sender: currentUser.username,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [newMsg, ...prev]);
    broadcastCoopAction({
      type: 'CHAT_MSG',
      roomId: activeRoom.id,
      data: newMsg,
    });
    setChatInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
            ⛏️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">PAPER MINECRAFT 2D</h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {activeRoom ? `CO-OP: ${activeRoom.name}` : 'SOLO DÜNYA'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeRoom ? (
                <>
                  Şifreli Oda: <strong className="text-amber-400">{activeRoom.password ? `🔑 ${activeRoom.password}` : 'Şifresiz'}</strong> • Arkadaşınla Birlikte Kaz & İnşa Et!
                </>
              ) : (
                'Tek Başına Hayatta Kalma & Özgür 2D Sandbox'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeRoom && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-sky-400">
              <Users className="w-3.5 h-3.5" />
              <span>{remotePlayersRef.current.size + 1} Oyuncu Bağlı</span>
            </div>
          )}

          {!inMenu && (
            <button
              onClick={() => {
                setIsPlaying(false);
                setInMenu(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Lobiye Dön
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Menu or Game Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[540px]">
        {inMenu ? (
          /* PRE-GAME INTERACTIVE LOBBY & CO-OP ROOMS */
          <div className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuTab('solo')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'solo'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>🎮 TEK BAŞINA OYNA (SOLO)</span>
                </button>

                <button
                  onClick={() => setMenuTab('coop_create')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'coop_create'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ŞİFRELİ CO-OP LOBİ OLUŞTUR</span>
                </button>

                <button
                  onClick={() => {
                    setCoopRoomsList(getCoopRooms());
                    setMenuTab('coop_join');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'coop_join'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ARKADAŞININ LOBİSİNE KATIL ({coopRoomsList.length})</span>
                </button>

                <button
                  onClick={() => setMenuTab('guide')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'guide'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>REHBER & KONTROLLER</span>
                </button>
              </div>
            </div>

            {/* TAB 1: SOLO PLAY */}
            {menuTab === 'solo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                      <span>⛏️ SOLO HAYATTA KALMA</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Kendi sınırsız dünyanızda tek başınıza maden kazın, ağaç kesin, ev yapın ve derinlerde elmas arayın!
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                    <div>• Sol Tık: Blok Kazma / Kırma</div>
                    <div>• Sağ Tık: Seçili Bloğu Yerleştirme</div>
                    <div>• A / D: Yürüme • Boşluk / W: Zıplama</div>
                    <div>• E Tuşu: Hızlı Eşya Üretimi (Crafting)</div>
                  </div>

                  <button
                    onClick={handleStartSolo}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>DÜNYAYA BAŞLA (TEK BAŞINA)</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-3">
                  <div className="text-5xl">💎</div>
                  <h4 className="text-base font-black text-white">Derinlerdeki Elmasları Bul!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Yüzeydeki ağaçları kesip tahta yapın, kazmanızı hazırlayın ve derin taş katmanlarındaki parlayan elmasları kazıp rekor kırın.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CREATE CO-OP ROOM */}
            {menuTab === 'coop_create' && (
              <form onSubmit={handleCreateRoom} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 max-w-xl mx-auto w-full">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Şifreli Co-op Lobi Oluştur</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Odanıza bir isim ve şifre belirleyin. Arkadaşınız şifreyi girip sizin dünyanıza anında bağlansın!
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Oda Adı:</label>
                    <input
                      type="text"
                      required
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Örn: Ali'nin Elmas Dünyası"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Oda Şifresi (Arkadaşınla Paylaş):</span>
                    </label>
                    <input
                      type="text"
                      value={newRoomPass}
                      onChange={(e) => setNewRoomPass(e.target.value)}
                      placeholder="Örn: 1234"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300">
                  💡 <strong>Nasıl Çalışır?</strong> Odayı kurduktan sonra arkadaşınız başka bir sekmeden veya tarayıcıdan "Lobiye Katıl" sekmesine gidip belirlediğiniz şifreyi girdiğinde yan yana aynı 2D dünyada oynamaya başlarsınız!
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>LOBİYİ OLUŞTUR & BAŞLA</span>
                </button>
              </form>
            )}

            {/* TAB 3: JOIN CO-OP ROOM */}
            {menuTab === 'coop_join' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 max-w-xl mx-auto w-full">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-sky-400" />
                    <span>Arkadaşının Lobisine Katıl</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktif kurulan odalardan birini seçin ve şifresini girerek katılın.
                  </p>
                </div>

                {coopRoomsList.length === 0 ? (
                  <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                    <div className="text-3xl">🏜️</div>
                    <p>Şu anda açık oda bulunamadı.</p>
                    <p className="text-slate-500">Arkadaşınız bir oda oluşturduğunda veya siz yeni oda kurduğunuzda burada listelenecektir.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {coopRoomsList.map((room) => {
                      const isSelected = joinSelectedRoom?.id === room.id;
                      return (
                        <div
                          key={room.id}
                          onClick={() => {
                            setJoinSelectedRoom(room);
                            setJoinError(null);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/20 border-sky-400 text-white'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-black flex items-center gap-2">
                              <span>{room.name}</span>
                              {room.password ? (
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              Kurucu: {room.hostName}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="px-3 py-1.5 bg-slate-800 text-xs font-bold rounded-lg text-sky-300"
                          >
                            Seç
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {joinSelectedRoom && (
                  <form onSubmit={handleJoinRoom} className="p-4 bg-slate-950 rounded-xl border border-sky-500/40 space-y-3 animate-fade-in">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Seçilen Oda:</span>
                      <strong className="text-sky-300">{joinSelectedRoom.name}</strong>
                    </div>

                    {joinSelectedRoom.password && (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Oda Şifresini Girin:
                        </label>
                        <input
                          type="text"
                          required
                          value={joinPassInput}
                          onChange={(e) => setJoinPassInput(e.target.value)}
                          placeholder="Şifre"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    )}

                    {joinError && (
                      <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 text-xs font-bold">
                        {joinError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>ODAYA GİRİŞ YAP</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 4: GUIDE */}
            {menuTab === 'guide' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-base font-black text-white">Paper Minecraft Oynanış Rehberi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">1. Kazma & İnşa Etme:</strong>
                    <p className="text-slate-400 mt-1">
                      Sol tık ile blokları kırın. 1-9 tuşlarıyla elinizdeki bloğu seçip Sağ Tık ile istediğiniz boşluğa yerleştirin.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-amber-400">2. Eşya Üretimi (Crafting):</strong>
                    <p className="text-slate-400 mt-1">
                      E tuşuna basarak hızlı üretim menüsünü açın. Meşe kütüklerinden tahta kalas, çalışma masası ve meşale üretin!
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-sky-400">3. Co-op Birlikte Oynama:</strong>
                    <p className="text-slate-400 mt-1">
                      Şifreli lobi kurup şifreyi arkadaşınıza verin. Arkadaşınız bağlandığında dünyanızdaki tüm blok değişimleri ve arkadaşınızın karakteri ekranda anlık olarak görünür!
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-cyan-400">4. Elmas Avı:</strong>
                    <p className="text-slate-400 mt-1">
                      Dünyanın en alt katmanlarına inerek parıldayan mavi elmas cevherlerini kazın ve rekor kırın!
                    </p>
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
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT}
              className="rounded-lg shadow-2xl cursor-crosshair"
            />

            {/* In-Game HUD Overlays */}
            <div className="absolute top-4 left-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-4 text-xs font-mono shadow-xl">
              {/* Hearts */}
              <div className="flex items-center gap-1 text-rose-500 font-bold">
                <Heart className="w-4 h-4 fill-current" />
                <span>{playerRef.current.hp / 2} / 10</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Pickaxe className="w-4 h-4" />
                <span>Kazılan: {blocksMined}</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400 font-bold">
                <span>💎 Elmas:</span>
                <span>{diamondsFound}</span>
              </div>
            </div>

            {/* Top Right: Co-op Room info */}
            {activeRoom && (
              <div className="absolute top-4 right-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-2.5 flex items-center gap-3 text-xs font-mono shadow-xl">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <Users className="w-4 h-4" />
                  <span>{activeRoom.name}</span>
                </div>
                {activeRoom.password && (
                  <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    🔑 {activeRoom.password}
                  </span>
                )}
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className="p-1 bg-slate-800 text-slate-300 hover:text-white rounded"
                  title="Sohbet"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* In-Game Co-op Chat Box if opened */}
            {chatOpen && activeRoom && (
              <div className="absolute bottom-20 right-6 w-72 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-3 flex flex-col gap-2 z-30">
                <div className="flex justify-between text-xs font-bold text-white border-b border-slate-800 pb-1">
                  <span>Co-op Sohbet</span>
                  <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="h-32 overflow-y-auto space-y-1 text-[11px] font-mono">
                  {chatMessages.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">Henüz mesaj yok.</div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="text-slate-300">
                        <strong className="text-sky-400">{msg.sender}:</strong> {msg.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendChat} className="flex gap-1 pt-1 border-t border-slate-800">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Mesaj yaz..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                  />
                  <button type="submit" className="p-1.5 bg-sky-500 text-slate-950 rounded-lg font-bold">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Quick Crafting Modal if E is pressed */}
            {craftingOpen && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-2xl z-30 max-w-sm w-full space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-white font-black text-sm">
                  <div className="flex items-center gap-1.5">
                    <Hammer className="w-4 h-4 text-amber-400" />
                    <span>Hızlı Üretim (Crafting)</span>
                  </div>
                  <button onClick={() => setCraftingOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-white">Tahta Kalas (x4)</span>
                      <p className="text-[10px] text-slate-400">1x Meşe Kütüğü gerekir</p>
                    </div>
                    <button
                      onClick={craftPlanks}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                    >
                      Üret
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-white">Çalışma Masası</span>
                      <p className="text-[10px] text-slate-400">4x Tahta Kalas gerekir</p>
                    </div>
                    <button
                      onClick={craftTable}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                    >
                      Üret
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-white">Meşale (x4)</span>
                      <p className="text-[10px] text-slate-400">1x Kömür + 1x Kalas</p>
                    </div>
                    <button
                      onClick={craftTorches}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                    >
                      Üret
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom 9-Slot Hotbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border-2 border-slate-700 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl z-20">
              {hotbar.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                const meta = BLOCKS[slot.blockId];
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center relative border transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 scale-105 shadow-md shadow-amber-500/30'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">{slot.blockId !== BLOCK_AIR ? meta?.icon : ''}</span>
                    {slot.count > 0 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-white drop-shadow">
                        {slot.count}
                      </span>
                    )}
                    <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-500">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
