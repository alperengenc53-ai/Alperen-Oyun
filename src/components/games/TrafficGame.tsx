import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playSound } from '../../utils/audio';
import { Gauge, Trophy, RotateCcw, Volume2, VolumeX, Maximize2, ShieldAlert, Sparkles, ShoppingBag, Check, Play, Car, Palette, Info } from 'lucide-react';
import { UserProfile, TrafficVehicle, TrafficSkin } from '../../types/game';
import { updateGameScore, buyShopItem, equipShopItem } from '../../utils/playerRegistry';
import { ScoreboardWidget } from '../ScoreboardWidget';
import { TRAFFIC_VEHICLES, TRAFFIC_SKINS } from '../../data/cosmeticsData';

interface TrafficGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface TrafficCar {
  id: number;
  x: number;
  y: number;
  lane: number;
  speed: number;
  color: string;
  type: 'sedan' | 'truck' | 'sport' | 'taxi';
  width: number;
  height: number;
}

interface RoadCoin {
  x: number;
  y: number;
  collected: boolean;
}

export const TrafficGame: React.FC<TrafficGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inMenu, setInMenu] = useState<boolean>(true);
  const [menuTab, setMenuTab] = useState<'start' | 'garage' | 'skins' | 'rules'>('start');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(65);
  const [combo, setCombo] = useState<number>(1);
  const [matchCoins, setMatchCoins] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 580;
  const ROAD_WIDTH = 600;
  const ROAD_LEFT = 180;
  const NUM_LANES = 4;
  const LANE_WIDTH = ROAD_WIDTH / NUM_LANES; // 150px per lane

  const currentVehicle = TRAFFIC_VEHICLES.find(
    (v) => v.id === currentUser.selectedTrafficCar
  ) || TRAFFIC_VEHICLES[0];

  const currentSkin = TRAFFIC_SKINS.find(
    (s) => s.id === currentUser.selectedTrafficSkin
  ) || TRAFFIC_SKINS[0];

  const playerRef = useRef({
    x: ROAD_LEFT + LANE_WIDTH * 1.5 - 24,
    y: CANVAS_HEIGHT - 120,
    width: 48,
    height: 84,
  });

  const keysRef = useRef<{ [code: string]: boolean }>({});
  const trafficCarsRef = useRef<TrafficCar[]>([]);
  const coinsRef = useRef<RoadCoin[]>([]);
  const roadOffsetRef = useRef<number>(0);
  const matchCoinsRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setInMenu(false);
    playerRef.current = {
      x: ROAD_LEFT + LANE_WIDTH * 1.5 - 24,
      y: CANVAS_HEIGHT - 120,
      width: 48,
      height: 84,
    };
    // Pre-populate traffic cars ahead so the road is filled from the start!
    trafficCarsRef.current = [
      { id: 1, lane: 0, x: ROAD_LEFT + 0 * LANE_WIDTH + (LANE_WIDTH - 46) / 2, y: 320, speed: 3.4, color: '#3b82f6', type: 'sedan', width: 46, height: 80 },
      { id: 2, lane: 2, x: ROAD_LEFT + 2 * LANE_WIDTH + (LANE_WIDTH - 46) / 2, y: 210, speed: 3.8, color: '#eab308', type: 'sedan', width: 46, height: 80 },
      { id: 3, lane: 1, x: ROAD_LEFT + 1 * LANE_WIDTH + (LANE_WIDTH - 52) / 2, y: 80, speed: 2.8, color: '#a855f7', type: 'truck', width: 52, height: 110 },
      { id: 4, lane: 3, x: ROAD_LEFT + 3 * LANE_WIDTH + (LANE_WIDTH - 46) / 2, y: -50, speed: 4.0, color: '#10b981', type: 'sedan', width: 46, height: 80 },
      { id: 5, lane: 0, x: ROAD_LEFT + 0 * LANE_WIDTH + (LANE_WIDTH - 46) / 2, y: -190, speed: 3.2, color: '#ef4444', type: 'sedan', width: 46, height: 80 },
    ];
    coinsRef.current = [
      { x: ROAD_LEFT + 1 * LANE_WIDTH + (LANE_WIDTH) / 2, y: 150, collected: false },
      { x: ROAD_LEFT + 3 * LANE_WIDTH + (LANE_WIDTH) / 2, y: 10, collected: false },
      { x: ROAD_LEFT + 2 * LANE_WIDTH + (LANE_WIDTH) / 2, y: -120, collected: false },
    ];
    roadOffsetRef.current = 0;
    matchCoinsRef.current = 0;
    setMatchCoins(0);
    setScore(0);
    setDistance(0);
    setSpeedKmh(110);
    setCombo(1);
    setGameOver(false);
    setIsPlaying(true);
  }, [CANVAS_HEIGHT]);

  // Handle vehicle buy / equip
  const handleSelectVehicle = (vehicle: TrafficVehicle) => {
    const isUnlocked = currentUser.unlockedTrafficCars?.includes(vehicle.id) || vehicle.price === 0;

    if (isUnlocked) {
      const updated = equipShopItem('traffic_car', vehicle.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${vehicle.name}" garajdan seçildi!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('traffic_car', vehicle.id, vehicle.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${vehicle.name}" satın alındı ve garaja eklendi!`);
        playSound.coin();
      } else {
        setShopFeedback(res.message);
      }
    }

    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Handle skin buy / equip
  const handleSelectSkin = (skin: TrafficSkin) => {
    const isUnlocked = currentUser.unlockedTrafficSkins?.includes(skin.id) || skin.price === 0;

    if (isUnlocked) {
      const updated = equipShopItem('traffic_skin', skin.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${skin.name}" kaplaması uygulandı!`);
        playSound.click();
      }
    } else {
      const res = buyShopItem('traffic_skin', skin.id, skin.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${skin.name}" kaplaması satın alındı ve uygulandı!`);
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

    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastSpawn = Date.now();
    let currentScore = 0;
    let currentDist = 0;

    const carColors = ['#f43f5e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#ffffff', '#10b981'];

    const loop = () => {
      const p = playerRef.current;

      // User request: "w basarak gitmememiz lazım sadece a d tuşlarıyla sağa sola gitmemiz lazım ve önümüzde araba olması lazım"
      // Steering with A / D or Left / Right Arrows (Ultra responsive)
      const steerSpeed = 8.0;
      if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) {
        p.x -= steerSpeed;
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) {
        p.x += steerSpeed;
      }

      const minX = ROAD_LEFT + 6;
      const maxX = ROAD_LEFT + NUM_LANES * LANE_WIDTH - p.width - 6;
      p.x = Math.max(minX, Math.min(maxX, p.x));

      // Automatic Forward Cruising Speed (Starts slow, accelerates as score increases, Traffic Racer style)
      const kmTraveled = currentDist / 1000;
      const isBraking = keysRef.current['ArrowDown'] || keysRef.current['KeyS'];
      let currentSpeedFactor = 4.5 + Math.min(12.0, (currentScore / 400) * 1.6 + kmTraveled * 0.8);
      if (isBraking) {
        currentSpeedFactor = Math.max(3.0, currentSpeedFactor * 0.65);
      }

      const kmh = Math.round(currentSpeedFactor * 13);
      setSpeedKmh(kmh);

      // Distance and road scrolling
      currentDist += currentSpeedFactor * 0.38;
      currentScore += Math.round(currentSpeedFactor * 0.22);
      roadOffsetRef.current = (roadOffsetRef.current + currentSpeedFactor) % 80;

      setDistance(Math.floor(currentDist));
      setScore(currentScore);

      // Spawn traffic cars continuously ahead, multiplying as score increases (Traffic Racer style)
      const now = Date.now();
      const spawnInterval = Math.max(280, 850 - currentScore * 0.45);
      const maxCars = Math.min(14, 5 + Math.floor(currentScore / 300));
      if (now - lastSpawn > spawnInterval && trafficCarsRef.current.length < maxCars) {
        lastSpawn = now;

        const lane = Math.floor(Math.random() * NUM_LANES);
        const laneX = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - 48) / 2;

        const laneOccupied = trafficCarsRef.current.some((tc) => tc.lane === lane && tc.y < 30);
        if (!laneOccupied) {
          const isTruck = Math.random() < 0.25;
          trafficCarsRef.current.push({
            id: Date.now() + Math.random(),
            x: laneX,
            y: -120,
            lane,
            speed: 3.0 + Math.random() * 2.2, // slower than player so player continuously catches up and weaves!
            color: carColors[Math.floor(Math.random() * carColors.length)],
            type: isTruck ? 'truck' : 'sedan',
            width: isTruck ? 52 : 46,
            height: isTruck ? 110 : 80,
          });

          // Spawn road gold coins frequently!
          if (Math.random() < 0.6) {
            coinsRef.current.push({
              x: laneX + 23,
              y: -70,
              collected: false,
            });
          }
        }
      }

      // Update traffic cars
      trafficCarsRef.current.forEach((tc) => {
        tc.y += currentSpeedFactor - tc.speed;

        // Overtake combo bonus
        if (
          !(tc as any).overtaken &&
          tc.y > p.y + p.height &&
          tc.y < p.y + p.height + 40
        ) {
          (tc as any).overtaken = true;
          currentScore += 100;
          setCombo((cm) => cm + 1);
          if (soundEnabled) playSound.coin();
        }

        // AABB Collision Detection
        if (
          p.x < tc.x + tc.width &&
          p.x + p.width > tc.x &&
          p.y < tc.y + tc.height &&
          p.y + p.height > tc.y
        ) {
          if (soundEnabled) playSound.carCrash();
          setGameOver(true);
          setIsPlaying(false);

          // Update Score & Add collected road coins to wallet!
          const earned = matchCoinsRef.current;
          const updated = updateGameScore('traffic', currentScore, {
            distance: Math.floor(currentDist),
            coinsEarned: earned,
          });
          if (updated) onProfileUpdated(updated);
        }
      });

      trafficCarsRef.current = trafficCarsRef.current.filter((tc) => tc.y < CANVAS_HEIGHT + 140);

      // Collect Road Coins
      coinsRef.current.forEach((coin) => {
        coin.y += currentSpeedFactor;
        if (
          !coin.collected &&
          Math.hypot(p.x + p.width / 2 - coin.x, p.y + p.height / 2 - coin.y) < 32
        ) {
          coin.collected = true;
          currentScore += 100;
          matchCoinsRef.current += 1;
          setMatchCoins(matchCoinsRef.current);
          if (soundEnabled) playSound.coin();
        }
      });
      coinsRef.current = coinsRef.current.filter((c) => c.y < CANVAS_HEIGHT + 50 && !c.collected);

      // --- RENDER ULTRA-REALISTIC HIGHWAY & ASPHALT ---
      // Outer grass / gravel terrain
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Gravel road shoulders with texture
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ROAD_LEFT - 18, 0, 18, CANVAS_HEIGHT);
      ctx.fillRect(ROAD_LEFT + NUM_LANES * LANE_WIDTH, 0, 18, CANVAS_HEIGHT);

      // Steel corrugated crash barriers (W-Beam guardrails) on both shoulders
      for (let y = -20; y < CANVAS_HEIGHT + 40; y += 32) {
        const postY = (y + roadOffsetRef.current) % (CANVAS_HEIGHT + 32);
        // Left post & reflector
        ctx.fillStyle = '#64748b';
        ctx.fillRect(ROAD_LEFT - 14, postY, 6, 12);
        ctx.fillStyle = '#ef4444'; // Red hazard reflector
        ctx.fillRect(ROAD_LEFT - 14, postY + 4, 3, 4);

        // Right post & reflector
        ctx.fillStyle = '#64748b';
        ctx.fillRect(ROAD_LEFT + NUM_LANES * LANE_WIDTH + 8, postY, 6, 12);
        ctx.fillStyle = '#facc15'; // Amber hazard reflector
        ctx.fillRect(ROAD_LEFT + NUM_LANES * LANE_WIDTH + 11, postY + 4, 3, 4);
      }

      // Continuous steel barrier rails
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT - 11, 0);
      ctx.lineTo(ROAD_LEFT - 11, CANVAS_HEIGHT);
      ctx.moveTo(ROAD_LEFT + NUM_LANES * LANE_WIDTH + 11, 0);
      ctx.lineTo(ROAD_LEFT + NUM_LANES * LANE_WIDTH + 11, CANVAS_HEIGHT);
      ctx.stroke();

      // Premium Dark Asphalt Roadbed
      const roadGrad = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_LEFT + NUM_LANES * LANE_WIDTH, 0);
      roadGrad.addColorStop(0, '#0f172a');
      roadGrad.addColorStop(0.5, '#1e293b');
      roadGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(ROAD_LEFT, 0, NUM_LANES * LANE_WIDTH, CANVAS_HEIGHT);

      // Asphalt grain / motion streaks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      for (let s = 0; s < 18; s++) {
        const sx = ROAD_LEFT + ((s * 47) % (NUM_LANES * LANE_WIDTH - 20));
        const sy = (s * 53 + roadOffsetRef.current * 4) % CANVAS_HEIGHT;
        ctx.fillRect(sx, sy, 3, 24);
      }

      // Solid White Road Edge Lines (Reflective highway margins)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT, 0);
      ctx.lineTo(ROAD_LEFT, CANVAS_HEIGHT);
      ctx.moveTo(ROAD_LEFT + NUM_LANES * LANE_WIDTH, 0);
      ctx.lineTo(ROAD_LEFT + NUM_LANES * LANE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dashed lane divider lines with glittering Cat-Eye studs
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.setLineDash([32, 28]);
      ctx.lineDashOffset = -roadOffsetRef.current;

      for (let i = 1; i < NUM_LANES; i++) {
        const laneLineX = ROAD_LEFT + i * LANE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(laneLineX, 0);
        ctx.lineTo(laneLineX, CANVAS_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Cat-Eye Reflectors along lanes
      for (let i = 1; i < NUM_LANES; i++) {
        const laneLineX = ROAD_LEFT + i * LANE_WIDTH;
        for (let y = 0; y < CANVAS_HEIGHT; y += 60) {
          const catY = (y + roadOffsetRef.current) % CANVAS_HEIGHT;
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(laneLineX, catY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Overhead Highway Direction Signboard passing periodically
      const gantryY = (currentDist * 2) % 4000 - 200;
      if (gantryY > -100 && gantryY < CANVAS_HEIGHT + 100) {
        ctx.fillStyle = '#065f46'; // Official Green Highway Sign
        ctx.fillRect(ROAD_LEFT - 6, gantryY, NUM_LANES * LANE_WIDTH + 12, 44);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(ROAD_LEFT - 4, gantryY + 2, NUM_LANES * LANE_WIDTH + 8, 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛣️ E-5 / TEM OTOYOLU • ANKARA / İSTANBUL', ROAD_LEFT + (NUM_LANES * LANE_WIDTH) / 2, gantryY + 20);
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#fef08a';
        ctx.fillText('⚡ HIZ LİMİTİ 130 KM/S • SOL ŞERİDİ BOŞ BIRAK', ROAD_LEFT + (NUM_LANES * LANE_WIDTH) / 2, gantryY + 34);
      }

      // Draw Coins (Glowing animated 3D coins)
      coinsRef.current.forEach((coin) => {
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', coin.x, coin.y + 4);
        ctx.restore();
      });

      // Draw Other Traffic Cars (Realistic 3D vehicles with glass & lights)
      trafficCarsRef.current.forEach((tc) => {
        ctx.save();
        ctx.translate(tc.x, tc.y);

        // Realistic Underbody Soft Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(tc.width / 2, tc.height / 2 + 4, tc.width * 0.6, tc.height * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Metallic Car Body Gradient
        const carBodyGrad = ctx.createLinearGradient(0, 0, tc.width, 0);
        carBodyGrad.addColorStop(0, tc.color);
        carBodyGrad.addColorStop(0.35, '#ffffff33');
        carBodyGrad.addColorStop(0.65, tc.color);
        carBodyGrad.addColorStop(1, '#00000044');

        ctx.fillStyle = tc.color;
        ctx.beginPath();
        ctx.roundRect(0, 0, tc.width, tc.height, tc.type === 'truck' ? 4 : 8);
        ctx.fill();

        ctx.fillStyle = carBodyGrad;
        ctx.fill();

        // Tinted Glass Windshield & Rear Window with Reflection
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, 15, tc.width - 8, 14); // Front windshield
        ctx.fillRect(4, tc.height - 22, tc.width - 8, 11); // Rear glass
        // Glass Reflection Glare
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(6, 17);
        ctx.lineTo(tc.width - 12, 17);
        ctx.lineTo(6, 27);
        ctx.closePath();
        ctx.fill();

        // Headlights (top)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(4, tc.height - 5, 8, 4);
        ctx.fillRect(tc.width - 12, tc.height - 5, 8, 4);

        // Bright Red Tail Lights (bottom/front facing depending on direction)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, 2, 8, 4);
        ctx.fillRect(tc.width - 12, 2, 8, 4);

        // Ambulance Flashing Siren if special vehicle
        if (tc.type === 'truck') {
          // Semi-trailer details
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(2, 20, tc.width - 4, tc.height - 24);
        }

        ctx.restore();
      });

      // --- DRAW PLAYER CAR (WITH SPECIFIC MODEL & LIVERY) ---
      // 1. Projected Headlights onto the asphalt ahead
      const lightGradLeft = ctx.createRadialGradient(p.x + 8, p.y, 4, p.x - 15, p.y - 130, 140);
      lightGradLeft.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      lightGradLeft.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
      lightGradLeft.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = lightGradLeft;
      ctx.beginPath();
      ctx.moveTo(p.x + 6, p.y);
      ctx.lineTo(p.x - 35, p.y - 130);
      ctx.lineTo(p.x + 25, p.y - 130);
      ctx.closePath();
      ctx.fill();

      const lightGradRight = ctx.createRadialGradient(p.x + p.width - 8, p.y, 4, p.x + p.width + 15, p.y - 130, 140);
      lightGradRight.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      lightGradRight.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
      lightGradRight.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = lightGradRight;
      ctx.beginPath();
      ctx.moveTo(p.x + p.width - 6, p.y);
      ctx.lineTo(p.x + p.width - 25, p.y - 130);
      ctx.lineTo(p.x + p.width + 35, p.y - 130);
      ctx.closePath();
      ctx.fill();

      // 2. Red Tail Light Asphalt Glow behind car
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.width / 2, p.y + p.height + 10, p.width * 0.65, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Dynamic Steering Tilt & 3D Car Body
      const steerTilt = keysRef.current['ArrowLeft'] || keysRef.current['KeyA']
        ? -0.06
        : keysRef.current['ArrowRight'] || keysRef.current['KeyD']
        ? 0.06
        : 0;

      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(steerTilt);
      ctx.translate(-p.width / 2, -p.height / 2);

      // Soft Ambient Shadow under car
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(1, 4, p.width, p.height, 8);
      ctx.fill();

      const vType = currentVehicle.type;
      const vColor = currentVehicle.color;
      const vAccent = currentVehicle.accentColor;

      // Model: Cyberpunk Neon Underglow
      if (vType === 'cyberpunk') {
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 14;
      }

      // Base Chassis with 3D Metallic Gradient
      const chassisGrad = ctx.createLinearGradient(0, 0, p.width, 0);
      chassisGrad.addColorStop(0, vColor);
      chassisGrad.addColorStop(0.3, '#ffffff44');
      chassisGrad.addColorStop(0.7, vColor);
      chassisGrad.addColorStop(1, '#00000044');

      ctx.fillStyle = chassisGrad;
      ctx.beginPath();
      if (vType === 'f1') {
        // F1 Nose and Body
        ctx.moveTo(p.width / 2, 0);
        ctx.lineTo(p.width - 8, 22);
        ctx.lineTo(p.width - 6, p.height);
        ctx.lineTo(6, p.height);
        ctx.lineTo(8, 22);
        ctx.closePath();
      } else {
        ctx.roundRect(0, 0, p.width, p.height, vType === 'bat' ? 4 : 9);
      }
      ctx.fill();
      ctx.shadowBlur = 0; // reset blur

      // Model: F1 Open Wheels
      if (vType === 'f1') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, 12, 6, 16);
        ctx.fillRect(p.width, 12, 6, 16);
        ctx.fillRect(-8, p.height - 24, 8, 20);
        ctx.fillRect(p.width, p.height - 24, 8, 20);

        // F1 Rear Wing
        ctx.fillStyle = vAccent;
        ctx.fillRect(-2, p.height - 8, p.width + 4, 8);
      }

      // Model: Bat Mobile Fins
      if (vType === 'bat') {
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(-3, p.height - 26, 4, 26);
        ctx.fillRect(p.width - 1, p.height - 26, 4, 26);
      }

      // Dual Exhaust Nitro Flames & Sparks
      const flameLen = 6 + Math.random() * 8 + currentSpeedFactor * 1.1;
      const flameGrad = ctx.createLinearGradient(0, p.height, 0, p.height + flameLen);
      flameGrad.addColorStop(0, '#38bdf8');
      flameGrad.addColorStop(0.4, '#f59e0b');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.fillRect(8, p.height, 5, flameLen);
      ctx.fillRect(p.width - 13, p.height, 5, flameLen);

      // Model: Gold Supercar Sparkles
      if (vType === 'gold_super') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(p.width / 2, p.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- LIVERY OVERLAY ---
      if (currentSkin.pattern === 'stripes') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.width / 2 - 5, 0, 3, p.height);
        ctx.fillRect(p.width / 2 + 2, 0, 3, p.height);
      } else if (currentSkin.pattern === 'flames') {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(4, 30);
        ctx.lineTo(p.width / 2 - 2, 12);
        ctx.lineTo(p.width / 2 + 2, 12);
        ctx.lineTo(p.width - 4, 30);
        ctx.lineTo(p.width / 2, 18);
        ctx.closePath();
        ctx.fill();
      } else if (currentSkin.pattern === 'carbon') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(6, 6, p.width - 12, 18);
      }

      // Windshield & Windows with Curved Aerodynamic Glare
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 18, p.width - 12, 16);
      ctx.fillRect(6, p.height - 28, p.width - 12, 10);

      // Sun reflection glare on windshield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(8, 20);
      ctx.lineTo(p.width - 14, 20);
      ctx.lineTo(8, 30);
      ctx.closePath();
      ctx.fill();

      // Model: Police Flashing Lights
      if (vType === 'police') {
        const isBlink = Math.floor(Date.now() / 150) % 2 === 0;
        ctx.fillStyle = isBlink ? '#ef4444' : '#3b82f6';
        ctx.fillRect(p.width / 2 - 8, 36, 7, 5);
        ctx.fillStyle = isBlink ? '#3b82f6' : '#ef4444';
        ctx.fillRect(p.width / 2 + 1, 36, 7, 5);
      }

      // Model: Taxi Sign
      if (vType === 'taxi') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.width / 2 - 10, 35, 20, 6);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TAXI', p.width / 2, 40);
      }

      // Headlights (Front top)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(4, 2, 7, 3);
      ctx.fillRect(p.width - 11, 2, 7, 3);

      // Bright Tail lights (Rear bottom) & Dynamic Brake Glow
      const isCarBraking = keysRef.current['ArrowDown'] || keysRef.current['KeyS'];
      const isCarAccelerating = keysRef.current['ArrowUp'] || keysRef.current['KeyW'];

      if (isCarBraking) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ff2222';
        ctx.fillRect(2, p.height - 5, 10, 5);
        ctx.fillRect(p.width - 12, p.height - 5, 10, 5);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, p.height - 4, 7, 3);
        ctx.fillRect(p.width - 11, p.height - 4, 7, 3);
      }

      // Turbo Exhaust Flames when accelerating with W/Up
      if (isCarAccelerating) {
        const flameLen = 14 + Math.random() * 9;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(8, p.height);
        ctx.lineTo(12, p.height + flameLen);
        ctx.lineTo(16, p.height);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p.width - 16, p.height);
        ctx.lineTo(p.width - 12, p.height + flameLen);
        ctx.lineTo(p.width - 8, p.height);
        ctx.closePath();
        ctx.fill();

        // Neon Nitro Blue Core
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(10, p.height, 4, flameLen * 0.6);
        ctx.fillRect(p.width - 14, p.height, 4, flameLen * 0.6);
      }

      // Player Name Badge above car
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentVehicle.icon} ${currentUser.username}`, p.width / 2, -10);

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, soundEnabled, onProfileUpdated, currentUser.username, currentVehicle, currentSkin]);

  // Keys listener
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
      {/* Top HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-xl">
            {currentVehicle.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">TURBO OTOBAN: GARAJ & YARIŞ</h2>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">
                FAN OYUNU
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Araba: <strong className="text-sky-300">{currentVehicle.name}</strong> • Kaplama: <strong className="text-amber-400">{currentSkin.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet */}
          <div className="bg-sky-950/80 border border-sky-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300">
            <span>🏎️</span>
            <span className="text-sm font-black text-amber-200">{(currentUser.trafficCoins ?? 0).toLocaleString()}</span>
            <span className="text-[10px] text-amber-400 uppercase">Otoban Altını</span>
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
              className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-xs rounded-lg border border-sky-500/40 transition cursor-pointer"
            >
              Garaja Dön
            </button>
          )}
        </div>
      </div>

      {/* Main Container: Menu or Canvas */}
      <div className="relative bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[580px]">
        {inMenu ? (
          /* INTERACTIVE GARAGE MENU */
          <div className="w-full max-w-4xl p-6 sm:p-8 flex flex-col gap-6">
            {/* Menu Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMenuTab('start')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'start'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>YARIŞA BAŞLA</span>
                </button>

                <button
                  onClick={() => setMenuTab('garage')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'garage'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>GARAJ & ARABALAR ({TRAFFIC_VEHICLES.length})</span>
                </button>

                <button
                  onClick={() => setMenuTab('skins')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'skins'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>BOYA & KOSTÜMLER ({TRAFFIC_SKINS.length})</span>
                </button>

                <button
                  onClick={() => setMenuTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'rules'
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>NASIL OYNANIR?</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-sky-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span>Otoban Cüzdanı:</span>
                <strong className="text-amber-200">{(currentUser.trafficCoins ?? 0).toLocaleString()} 🪙</strong>
              </div>
            </div>

            {/* Notification message */}
            {shopFeedback && (
              <div className="p-3 bg-sky-500/20 border border-sky-500/50 rounded-xl text-xs font-bold text-sky-300 text-center animate-fade-in">
                {shopFeedback}
              </div>
            )}

            {/* TAB 1: START & PREVIEW */}
            {menuTab === 'start' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Vehicle Showcase Card */}
                <div className="bg-slate-900/90 border-2 border-sky-500/40 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded font-bold">
                    Seçili Araba
                  </div>

                  <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-5xl my-3 shadow-inner border border-slate-700">
                    {currentVehicle.icon}
                  </div>

                  <h3 className="text-lg font-black text-white">{currentVehicle.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{currentVehicle.description}</p>

                  <div className="w-full mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs font-mono text-slate-300">
                    <span>Kaplama:</span>
                    <strong className="text-amber-400">{currentSkin.name}</strong>
                  </div>

                  <button
                    onClick={() => setMenuTab('garage')}
                    className="mt-3 text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Garajda Değiştir</span> →
                  </button>
                </div>

                {/* Matchmaking & Start Panel */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <span>🏎️ TURBO OTOBAN: ARABA YARIŞI</span>
                      </h2>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        <strong className="text-sky-400">W tuşuna basmaya gerek yoktur!</strong> Aracınız otomatik olarak akıcı hızda ilerler. Önünüzdeki yoğun arabaların arasından <strong className="text-amber-400">SADECE A ve D tuşlarıyla</strong> (veya sol/sağ oklarla) sıyrılın, çarpmadan makas atarak yüksek skor yapın ve yoldaki altınları toplayın!
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400">En Uzun Mesafe:</span>
                        <div className="text-base font-black text-sky-400 mt-0.5">
                          {((currentUser.trafficDistance || 0) / 1000).toFixed(2)} km
                        </div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-400">En Yüksek Skor:</span>
                        <div className="text-base font-black text-amber-400 mt-0.5">
                          {(currentUser.trafficHighscore || 0).toLocaleString()} Puan
                        </div>
                      </div>
                    </div>

                    {/* Launch Button */}
                    <button
                      onClick={startGame}
                      className="w-full py-4 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-black text-base rounded-xl shadow-lg shadow-sky-500/30 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>GAZA BAS (OTOBANA ÇIK)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GARAGE VEHICLES */}
            {menuTab === 'garage' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Garaj & Araba Koleksiyonu</h3>
                    <p className="text-xs text-slate-400">
                      Yolda topladığınız altınlarla yeni arabalar satın alın ve sürün!
                    </p>
                  </div>
                  <span className="text-xs font-mono text-sky-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    Otoban Bakiyeniz: <strong>{(currentUser.trafficCoins ?? 0).toLocaleString()} 🪙</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {TRAFFIC_VEHICLES.map((v) => {
                    const isUnlocked = currentUser.unlockedTrafficCars?.includes(v.id) || v.price === 0;
                    const isEquipped = currentUser.selectedTrafficCar === v.id;

                    return (
                      <div
                        key={v.id}
                        className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition ${
                          isEquipped
                            ? 'border-sky-400 bg-slate-850 shadow-lg shadow-sky-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {v.imageUrl && (
                          <div className="relative h-28 w-full rounded-xl overflow-hidden mb-3 border border-slate-800 shadow">
                            <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-2xl flex items-center justify-center border border-slate-700 shadow-inner shrink-0">
                            {v.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black text-white">{v.name}</h4>
                              {isEquipped && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                  Seçili
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-snug">{v.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {v.price === 0 ? 'ÜCRETSİZ' : `${v.price} 🪙`}
                          </span>

                          <button
                            onClick={() => handleSelectVehicle(v)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500 cursor-default'
                                : isUnlocked
                                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black'
                                : (currentUser.trafficCoins ?? 0) >= v.price
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Kuşanıldı
                              </>
                            ) : isUnlocked ? (
                              'Bu Arabayı Sür'
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

            {/* TAB 3: SKINS & PAINT */}
            {menuTab === 'skins' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Boya & Kostüm Kaplamaları</h3>
                    <p className="text-xs text-slate-400">
                      Arabanıza özel yarış şeritleri, alev deseni veya karbon kaplama uygulayın!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {TRAFFIC_SKINS.map((s) => {
                    const isUnlocked = currentUser.unlockedTrafficSkins?.includes(s.id) || s.price === 0;
                    const isEquipped = currentUser.selectedTrafficSkin === s.id;

                    return (
                      <div
                        key={s.id}
                        className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between ${
                          isEquipped ? 'border-sky-400 shadow-lg' : 'border-slate-800'
                        }`}
                      >
                        <div>
                          {s.imageUrl && (
                            <div className="relative h-20 w-full rounded-xl overflow-hidden mb-2 border border-slate-800 shadow">
                              <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-white">{s.name}</h4>
                            {isEquipped && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {s.price === 0 ? 'ÜCRETSİZ' : `${s.price} 🪙 Altın`}
                          </span>

                          <button
                            onClick={() => handleSelectSkin(s)}
                            disabled={isEquipped}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-500 cursor-default'
                                : isUnlocked
                                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-black'
                                : (currentUser.trafficCoins ?? 0) >= s.price
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isEquipped ? 'Aktif Kaplama' : isUnlocked ? 'Uygula' : 'Satın Al'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: HOW TO PLAY */}
            {menuTab === 'rules' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-sky-400" />
                  <span>Sürüş & Altın Toplama Rehberi</span>
                </h3>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-sky-400">1. Otomatik ve Dengeli Hızlanma:</strong>
                    <p className="text-slate-400 mt-1">
                      W tuşuna basmanıza gerek yoktur! Araba 65 km/h ile sakin bir şekilde başlar ve yol katettikçe (km arttıkça) yavaş yavaş ve dengeli olarak hızlanır.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-amber-400">2. Yoldaki Altın Paralar:</strong>
                    <p className="text-slate-400 mt-1">
                      Yolda parlayan altınları toplayın! Her altın doğrudan cüzdanınıza eklenir ve garajdan yeni arabalar (Polis arabası, F1, Cyberpunk vb.) ve özel kaplamalar açmanızı sağlar.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">3. Makas Geçiş Bonusu:</strong>
                    <p className="text-slate-400 mt-1">
                      Önünüzdeki arabalara çarpmadan yakınlarından sıyrılarak geçtiğinizde ekstra kombo ve skor bonusu kazanırsınız.
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
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-auto max-h-[84vh] aspect-[16/10] object-cover rounded-2xl shadow-2xl border border-slate-800 block"
            />

            {/* In-Game HUD Overlays */}
            <div className="absolute top-4 left-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 text-xs font-mono shadow-xl">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Gauge className="w-4 h-4" />
                <span>{speedKmh} km/h</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>Mesafe:</span>
                <strong className="text-amber-400">{(distance / 1000).toFixed(2)} km</strong>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <span>🪙 Altın:</span>
                <strong className="text-amber-200">+{matchCoins}</strong>
              </div>
            </div>

            <div className="absolute top-4 right-6 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-1 text-xs font-mono shadow-xl">
              <div className="text-slate-400 text-[10px]">SKOR:</div>
              <div className="text-base font-black text-amber-400">{score.toLocaleString()}</div>
              {combo > 1 && (
                <div className="text-[11px] text-emerald-400 font-bold">
                  {combo}x Kombo!
                </div>
              )}
            </div>

            {/* Bottom Touch / Responsive Steering Buttons */}
            <div className="absolute bottom-4 inset-x-0 flex justify-between px-4 sm:px-8 pointer-events-none z-10">
              <button
                onMouseDown={() => { keysRef.current['KeyA'] = true; }}
                onMouseUp={() => { keysRef.current['KeyA'] = false; }}
                onTouchStart={() => { keysRef.current['KeyA'] = true; }}
                onTouchEnd={() => { keysRef.current['KeyA'] = false; }}
                className="pointer-events-auto w-20 sm:w-24 h-16 sm:h-18 rounded-2xl bg-slate-900/85 hover:bg-sky-600/80 active:bg-sky-500 border-2 border-sky-500/50 text-white font-black text-sm flex flex-col items-center justify-center backdrop-blur shadow-2xl transition active:scale-95 select-none cursor-pointer"
              >
                <span className="text-xl sm:text-2xl">◀</span>
                <span className="text-[10px] text-sky-300 font-bold uppercase">SOL (A)</span>
              </button>

              <div className="bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-1.5 self-center shadow-lg">
                <span>🚗</span>
                <span className="text-sky-400 font-black">A / D</span>
                <span className="hidden sm:inline">ile arabalara çarpmadan makas at</span>
                <span className="sm:hidden">ile makas at</span>
              </div>

              <button
                onMouseDown={() => { keysRef.current['KeyD'] = true; }}
                onMouseUp={() => { keysRef.current['KeyD'] = false; }}
                onTouchStart={() => { keysRef.current['KeyD'] = true; }}
                onTouchEnd={() => { keysRef.current['KeyD'] = false; }}
                className="pointer-events-auto w-20 sm:w-24 h-16 sm:h-18 rounded-2xl bg-slate-900/85 hover:bg-sky-600/80 active:bg-sky-500 border-2 border-sky-500/50 text-white font-black text-sm flex flex-col items-center justify-center backdrop-blur shadow-2xl transition active:scale-95 select-none cursor-pointer"
              >
                <span className="text-xl sm:text-2xl">▶</span>
                <span className="text-[10px] text-sky-300 font-bold uppercase">SAĞ (D)</span>
              </button>
            </div>

            {/* GAME OVER MODAL */}
            {gameOver && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                <div className="max-w-md w-full bg-slate-900 border-2 border-sky-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="text-5xl">💥</div>
                  <h2 className="text-2xl font-black text-white">KAZA YAPTINIZ!</h2>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Kat Edilen Mesafe:</span>
                      <strong className="text-sky-400 text-sm">{(distance / 1000).toFixed(2)} km</strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 font-bold">🪙 Yoldan Toplanan Altın:</span>
                      <strong className="text-amber-200 text-sm font-black">+{matchCoins} 🪙</strong>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                      <span className="text-white font-bold">TOPLAM SKOR:</span>
                      <strong className="text-amber-400 font-black text-base">{score.toLocaleString()} P</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={startGame}
                      className="py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Tekrar Yarış</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setGameOver(false);
                        setInMenu(true);
                      }}
                      className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Garaja Dön
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
              <span>Canlı Skorboard - Turbo Otoban Rekortmenleri</span>
            </h3>
            <button
              onClick={() => setShowScoreboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
          <ScoreboardWidget game="traffic" currentUserId={currentUser.id} />
        </div>
      )}
    </div>
  );
};
