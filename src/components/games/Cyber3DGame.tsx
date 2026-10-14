import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { UserProfile, CyberShipSkin } from '../../types/game';
import { CYBER_SHIPS } from '../../data/cosmeticsData';
import { buyShopItem, equipShopItem, updateGameScore } from '../../utils/playerRegistry';
import { ScoreboardWidget } from '../ScoreboardWidget';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Trophy,
  Zap,
  Shield,
  ShoppingBag,
  Check,
  Flame,
  Sparkles,
  ArrowLeft,
  Crosshair,
  Compass
} from 'lucide-react';
import { playSound } from '../../utils/audio';

interface Cyber3DGameProps {
  currentUser: UserProfile;
  onOpenAccountModal: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onFullscreenRequest?: () => void;
}

interface Obstacle3D {
  mesh: THREE.Group;
  type: 'gate' | 'pylon' | 'barrier';
  lane: number;
  z: number;
  passed?: boolean;
}

interface Collectible3D {
  mesh: THREE.Group;
  type: 'coin' | 'shield' | 'boost' | 'magnet';
  lane: number;
  z: number;
  collected?: boolean;
}

export const Cyber3DGame: React.FC<Cyber3DGameProps> = ({
  currentUser,
  onOpenAccountModal,
  onProfileUpdated,
  onFullscreenRequest,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [inMenu, setInMenu] = useState<boolean>(true);
  const [menuTab, setMenuTab] = useState<'start' | 'hangar' | 'rules'>('start');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(180);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [boostActive, setBoostActive] = useState<boolean>(false);
  const [magnetActive, setMagnetActive] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);

  // Active equipped skin
  const currentSkin: CyberShipSkin =
    CYBER_SHIPS.find((s) => s.id === currentUser.selectedCyberSkin) || CYBER_SHIPS[0];

  // Game loop references
  const keysRef = useRef<{ [code: string]: boolean }>({});
  const playerStateRef = useRef({
    targetLane: 1, // 0: Left (-3.6), 1: Center (0), 2: Right (3.6)
    x: 0,
    y: 0.6,
    z: 0,
    roll: 0, // Bank angle
    isJumping: false,
    jumpVy: 0,
    hasShield: false,
    boostTimer: 0,
    magnetTimer: 0,
    coins: 0,
    score: 0,
    distance: 0,
  });

  const LANE_COORDS = [-3.8, 0, 3.8];

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    shipGroup: THREE.Group;
    shieldMesh?: THREE.Mesh;
    thrusterLight1?: THREE.PointLight;
    thrusterLight2?: THREE.PointLight;
    obstacles: Obstacle3D[];
    collectibles: Collectible3D[];
    roadGrid: THREE.GridHelper;
    roadMesh: THREE.Mesh;
    starParticles: THREE.Points;
    starGeo: THREE.BufferGeometry;
    neonRails: THREE.LineSegments[];
    cityBuildings: THREE.Mesh[];
  } | null>(null);

  // Create Ship 3D Procedural Model
  const buildShipMesh = (skin: CyberShipSkin): THREE.Group => {
    const group = new THREE.Group();

    const mainColor = new THREE.Color(skin.color);
    const glowColor = new THREE.Color(skin.glowColor);
    const engineColor = new THREE.Color(skin.engineColor);

    // Fuselage (Sleek aerodynamic sci-fi fighter)
    const bodyGeo = new THREE.ConeGeometry(0.8, 3.2, 5);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.scale(1, 0.45, 1);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness: 0.85,
      roughness: 0.25,
      emissive: mainColor.clone().multiplyScalar(0.2),
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Cockpit canopy (tinted luminous glass)
    const cockpitGeo = new THREE.BoxGeometry(0.5, 0.35, 1.1);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: glowColor.clone().multiplyScalar(0.4),
      metalness: 0.9,
      roughness: 0.1,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.25, 0.2);
    group.add(cockpit);

    // Swept delta wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      // Left Wing
      0, 0, 0.8,
      -2.4, -0.05, -0.9,
      0, 0, -1.1,
      // Right Wing
      0, 0, 0.8,
      0, 0, -1.1,
      2.4, -0.05, -0.9,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    group.add(wings);

    // Wingtip glowing stabilizer fins
    const finGeo = new THREE.BoxGeometry(0.08, 0.5, 0.8);
    const finMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const leftFin = new THREE.Mesh(finGeo, finMat);
    leftFin.position.set(-2.3, 0.2, -0.8);
    const rightFin = new THREE.Mesh(finGeo, finMat);
    rightFin.position.set(2.3, 0.2, -0.8);
    group.add(leftFin, rightFin);

    // Twin Plasma Engine Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    leftNozzle.position.set(-0.4, 0.05, -1.5);
    const rightNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    rightNozzle.position.set(0.4, 0.05, -1.5);
    group.add(leftNozzle, rightNozzle);

    // Engine Plasma Thruster Cones (Glowing animated flame effect)
    const flameGeo = new THREE.ConeGeometry(0.18, 0.9, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: engineColor,
      transparent: true,
      opacity: 0.85,
    });
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.4, 0.05, -2.0);
    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.4, 0.05, -2.0);
    group.add(leftFlame, rightFlame);

    // Dynamic Engine Glow Lights
    const tLight1 = new THREE.PointLight(engineColor, 2, 4);
    tLight1.position.set(-0.4, 0.05, -1.8);
    const tLight2 = new THREE.PointLight(engineColor, 2, 4);
    tLight2.position.set(0.4, 0.05, -1.8);
    group.add(tLight1, tLight2);

    // Shield Bubble (initially invisible)
    const shieldGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    group.add(shield);

    // Shadow blob projector underneath
    const shadowGeo = new THREE.PlaneGeometry(1.8, 3.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = -0.55;
    group.add(shadow);

    return group;
  };

  // Start a new 3D Match
  const startMatch = useCallback(() => {
    setInMenu(false);
    setGameOver(false);
    setScore(0);
    setDistance(0);
    setCoinsCollected(0);
    setShieldActive(false);
    setBoostActive(false);
    setMagnetActive(false);
    setMultiplier(1);
    setSpeedKmh(180);

    playerStateRef.current = {
      targetLane: 1,
      x: 0,
      y: 0.6,
      z: 0,
      roll: 0,
      isJumping: false,
      jumpVy: 0,
      hasShield: false,
      boostTimer: 0,
      magnetTimer: 0,
      coins: 0,
      score: 0,
      distance: 0,
    };

    if (threeRef.current) {
      // Clear all active obstacles and collectibles
      threeRef.current.obstacles.forEach((o) => threeRef.current?.scene.remove(o.mesh));
      threeRef.current.collectibles.forEach((c) => threeRef.current?.scene.remove(c.mesh));
      threeRef.current.obstacles = [];
      threeRef.current.collectibles = [];

      // Initial placement of starting obstacles and coins along the highway
      spawnInitialPattern();
    }

    setIsPlaying(true);
    playSound.jump();
  }, []);

  // Pre-spawn initial highway hazards & coins ahead
  const spawnInitialPattern = () => {
    if (!threeRef.current) return;
    const initialZ = [-40, -80, -120, -160, -200, -250, -300];

    initialZ.forEach((z, idx) => {
      const lane = Math.floor(Math.random() * 3);
      if (idx % 2 === 0) {
        // Obstacle
        const type: 'gate' | 'pylon' | 'barrier' = idx % 4 === 0 ? 'gate' : idx % 3 === 0 ? 'barrier' : 'pylon';
        spawnObstacle(lane, z, type);
      } else {
        // Collectible coin
        spawnCollectible(lane, z, 'coin');
      }

      // Add a bonus item on another lane
      const otherLane = (lane + 1) % 3;
      if (Math.random() < 0.6) {
        spawnCollectible(otherLane, z - 10, 'coin');
      }
    });
  };

  // Spawn Obstacle Object
  const spawnObstacle = (lane: number, z: number, type: 'gate' | 'pylon' | 'barrier') => {
    if (!threeRef.current) return;
    const group = new THREE.Group();
    const x = LANE_COORDS[lane];

    if (type === 'gate') {
      // Dönen Holografik Lazer Kapısı (Rotating Laser Ring)
      const ringGeo = new THREE.TorusGeometry(1.5, 0.12, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 1.4;
      group.add(ring);

      const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const beam1 = new THREE.Mesh(beamGeo, beamMat);
      beam1.position.y = 1.4;
      const beam2 = new THREE.Mesh(beamGeo, beamMat);
      beam2.position.y = 1.4;
      beam2.rotateZ(Math.PI / 2);
      group.add(beam1, beam2);
    } else if (type === 'pylon') {
      // Siber Enerji Pilonu (Tall Glowing Pillar)
      const pylonGeo = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 6);
      const pylonMat = new THREE.MeshStandardMaterial({
        color: 0x9333ea,
        emissive: 0xc084fc,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.y = 1.6;
      group.add(pylon);

      // Hazard warning ring around pylon
      const haloGeo = new THREE.RingGeometry(0.5, 0.7, 16);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.y = 0.05;
      group.add(halo);
    } else {
      // Alçak Plazma Bariyeri (Low Energy Barrier - Jumpable!)
      const barGeo = new THREE.BoxGeometry(2.4, 0.6, 0.3);
      const barMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xfb923c,
        emissiveIntensity: 0.8,
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.y = 0.35;
      group.add(bar);

      // Warning poles on sides
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
      const pLeft = new THREE.Mesh(poleGeo, poleMat);
      pLeft.position.set(-1.2, 0.5, 0);
      const pRight = new THREE.Mesh(poleGeo, poleMat);
      pRight.position.set(1.2, 0.5, 0);
      group.add(pLeft, pRight);
    }

    group.position.set(x, 0, z);
    threeRef.current.scene.add(group);
    threeRef.current.obstacles.push({ mesh: group, type, lane, z });
  };

  // Spawn Collectible Coin or Powerup
  const spawnCollectible = (lane: number, z: number, type: 'coin' | 'shield' | 'boost' | 'magnet') => {
    if (!threeRef.current) return;
    const group = new THREE.Group();
    const x = LANE_COORDS[lane];

    if (type === 'coin') {
      // 3D Hexagon Cyber Coin
      const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 6);
      coinGeo.rotateX(Math.PI / 2);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfef08a,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.2,
      });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.y = 0.7;
      group.add(coin);

      const rimGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 16);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.y = 0.7;
      group.add(rim);
    } else if (type === 'shield') {
      // 3D Shield Orb
      const orbGeo = new THREE.IcosahedronGeometry(0.45, 1);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = 0.8;
      group.add(orb);
    } else if (type === 'boost') {
      // 3D Boost Ring
      const boostGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 16);
      boostGeo.rotateX(Math.PI / 2);
      const boostMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
      const boost = new THREE.Mesh(boostGeo, boostMat);
      boost.position.y = 0.8;
      group.add(boost);
    } else {
      // 3D Magnet Icon
      const magGeo = new THREE.TorusGeometry(0.4, 0.1, 6, 12, Math.PI);
      magGeo.rotateZ(Math.PI);
      const magMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const mag = new THREE.Mesh(magGeo, magMat);
      mag.position.y = 0.8;
      group.add(mag);
    }

    group.position.set(x, 0, z);
    threeRef.current.scene.add(group);
    threeRef.current.collectibles.push({ mesh: group, type, lane, z });
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (!isPlaying || gameOver) return;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        // Shift lane left
        playerStateRef.current.targetLane = Math.max(0, playerStateRef.current.targetLane - 1);
        if (soundEnabled) playSound.click();
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        // Shift lane right
        playerStateRef.current.targetLane = Math.min(2, playerStateRef.current.targetLane + 1);
        if (soundEnabled) playSound.click();
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        // 3D Jump
        if (!playerStateRef.current.isJumping) {
          playerStateRef.current.isJumping = true;
          playerStateRef.current.jumpVy = 0.22;
          if (soundEnabled) playSound.jump();
        }
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        // Fast dive
        if (playerStateRef.current.isJumping) {
          playerStateRef.current.jumpVy = -0.3;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, gameOver, soundEnabled]);

  // Handle ship equipment / purchase
  const handleSelectShip = (ship: CyberShipSkin) => {
    const isUnlocked = currentUser.unlockedCyberSkins?.includes(ship.id) || ship.price === 0;

    if (isUnlocked) {
      const updated = equipShopItem('cyber_ship', ship.id);
      if (updated) {
        onProfileUpdated(updated);
        setShopFeedback(`"${ship.name}" mekiği hangardan kuşanıldı!`);
        playSound.click();

        // Refresh 3D model if active
        if (threeRef.current) {
          threeRef.current.scene.remove(threeRef.current.shipGroup);
          const newShip = buildShipMesh(ship);
          threeRef.current.shipGroup = newShip;
          threeRef.current.scene.add(newShip);
        }
      }
    } else {
      const res = buyShopItem('cyber_ship', ship.id, ship.price);
      if (res.success && res.profile) {
        onProfileUpdated(res.profile);
        setShopFeedback(`🎉 "${ship.name}" başarıyla satın alındı ve hangara eklendi!`);
        playSound.coin();

        if (threeRef.current) {
          threeRef.current.scene.remove(threeRef.current.shipGroup);
          const newShip = buildShipMesh(ship);
          threeRef.current.shipGroup = newShip;
          threeRef.current.scene.add(newShip);
        }
      } else {
        setShopFeedback(res.message);
      }
    }

    setTimeout(() => setShopFeedback(null), 3000);
  };

  // Main Three.js Initialization & Render Loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    // 1. Scene with Deep Cyber Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.FogExp2(0x050814, 0.015);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 3.2, 5.5);
    camera.lookAt(0, 1.2, -8);

    // 3. WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 12, 10);
    scene.add(dirLight);

    // Cyber Highway Track (Continuous Dark Metallic Asphalt)
    const roadGeo = new THREE.PlaneGeometry(13, 200);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.6,
      metalness: 0.8,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, -0.01, -70);
    scene.add(roadMesh);

    // Neon Cyber Grid Overlay
    const roadGrid = new THREE.GridHelper(200, 100, 0x06b6d4, 0x1e293b);
    roadGrid.position.set(0, 0, -70);
    scene.add(roadGrid);

    // Neon Laser Boundary Rails (Left & Right)
    const railMatLeft = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    const railMatRight = new THREE.LineBasicMaterial({ color: 0xec4899, linewidth: 2 });
    const railGeoLeft = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-6.2, 0.4, 20),
      new THREE.Vector3(-6.2, 0.4, -200),
    ]);
    const railGeoRight = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(6.2, 0.4, 20),
      new THREE.Vector3(6.2, 0.4, -200),
    ]);
    const railLeft = new THREE.Line(railGeoLeft, railMatLeft);
    const railRight = new THREE.Line(railGeoRight, railMatRight);
    scene.add(railLeft, railRight);

    // Distant Cyberpunk Skyline Towers (Procedural Monoliths)
    const cityBuildings: THREE.Mesh[] = [];
    const towerGeo = new THREE.BoxGeometry(4, 28, 4);
    for (let i = 0; i < 24; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? -18 - Math.random() * 20 : 18 + Math.random() * 20;
      const z = -20 - i * 14;
      const height = 15 + Math.random() * 30;

      const towerMat = new THREE.MeshStandardMaterial({
        color: 0x070b19,
        emissive: isLeft ? 0x06b6d4 : 0xa855f7,
        emissiveIntensity: 0.15,
        roughness: 0.4,
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.scale.set(1, height / 28, 1);
      tower.position.set(x, height / 2, z);
      scene.add(tower);
      cityBuildings.push(tower);
    }

    // Warp Starfield Particle System
    const starCount = 600;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = Math.random() * 35;
      starPositions[i + 2] = -Math.random() * 220;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.6,
      transparent: true,
      opacity: 0.75,
    });
    const starParticles = new THREE.Points(starGeo, starMat);
    scene.add(starParticles);

    // Player 3D Ship Model
    const shipGroup = buildShipMesh(currentSkin);
    shipGroup.position.set(0, 0.6, 0);
    scene.add(shipGroup);

    threeRef.current = {
      scene,
      camera,
      renderer,
      shipGroup,
      obstacles: [],
      collectibles: [],
      roadGrid,
      roadMesh,
      starParticles,
      starGeo,
      neonRails: [],
      cityBuildings,
    };

    // Responsive Canvas Resize Observer
    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 540;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Main 60FPS Game & Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      const delta = clock.getDelta();
      const p = playerStateRef.current;

      if (threeRef.current) {
        const { scene, camera, renderer, shipGroup, obstacles, collectibles, roadGrid, starGeo } =
          threeRef.current;

        // Dynamic forward speed (starts at 180 km/h, climbs steadily)
        const isBoosted = p.boostTimer > 0;
        const forwardSpeed = isBoosted ? 58 : 34 + Math.min(22, p.distance * 0.015);
        const kmh = Math.round(forwardSpeed * 5.2);
        setSpeedKmh(kmh);

        if (isPlaying && !gameOver) {
          p.distance += forwardSpeed * delta * 2;
          p.score += Math.round(forwardSpeed * delta * (isBoosted ? 2 : 1) * 3);
          setDistance(Math.floor(p.distance));
          setScore(p.score);

          // Update Powerup Timers
          if (p.boostTimer > 0) {
            p.boostTimer -= delta;
            setBoostActive(true);
            setMultiplier(2);
            camera.fov = 76; // Warp speed FOV
          } else {
            setBoostActive(false);
            setMultiplier(1);
            camera.fov = 65;
          }
          camera.updateProjectionMatrix();

          if (p.magnetTimer > 0) {
            p.magnetTimer -= delta;
            setMagnetActive(true);
          } else {
            setMagnetActive(false);
          }

          // Smooth Lane Navigation Interpolation (A / D)
          const targetX = LANE_COORDS[p.targetLane];
          const dx = targetX - p.x;
          p.x += dx * 10 * delta;

          // Reactive Banking Roll Tilt
          const targetRoll = -dx * 0.22;
          p.roll += (targetRoll - p.roll) * 12 * delta;

          // 3D Jumping Physics
          if (p.isJumping) {
            p.y += p.jumpVy;
            p.jumpVy -= 0.65 * delta; // Gravity
            if (p.y <= 0.6) {
              p.y = 0.6;
              p.isJumping = false;
              p.jumpVy = 0;
            }
          }

          // Update Ship Group Position & Rotation
          shipGroup.position.set(p.x, p.y, 0);
          shipGroup.rotation.z = p.roll;
          shipGroup.rotation.y = -p.roll * 0.35;

          // Animate Thruster Flame scale
          shipGroup.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.ConeGeometry) {
              child.scale.set(1, 1 + Math.random() * 0.4, 1);
            }
          });

          // Scroll Road Grid to create illusion of continuous supersonic flight
          roadGrid.position.z = (roadGrid.position.z + forwardSpeed * delta) % 4;

          // Animate Starfield particles
          const pos = starGeo.attributes.position.array as Float32Array;
          for (let i = 2; i < pos.length; i += 3) {
            pos[i] += forwardSpeed * delta * 2.5;
            if (pos[i] > 10) {
              pos[i] = -220;
            }
          }
          starGeo.attributes.position.needsUpdate = true;

          // Spawn New Obstacles & Collectibles ahead continuously
          const lastObsZ = obstacles.length > 0 ? obstacles[obstacles.length - 1].z : -40;
          if (lastObsZ > -220) {
            const nextZ = lastObsZ - (24 + Math.random() * 16);
            const lane = Math.floor(Math.random() * 3);

            if (Math.random() < 0.55) {
              const types: ('gate' | 'pylon' | 'barrier')[] = ['gate', 'pylon', 'barrier'];
              spawnObstacle(lane, nextZ, types[Math.floor(Math.random() * types.length)]);
            } else {
              const types: ('coin' | 'shield' | 'boost' | 'magnet')[] =
                Math.random() < 0.75 ? ['coin'] : ['shield', 'boost', 'magnet'];
              spawnCollectible(lane, nextZ, types[Math.floor(Math.random() * types.length)]);
            }
          }

          // Move Obstacles towards player & check collision
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.z += forwardSpeed * delta;
            obs.mesh.position.z = obs.z;

            // Rotate Laser Gate Rings
            if (obs.type === 'gate') {
              obs.mesh.children[0]?.rotateZ(2.5 * delta);
            }

            // Near Miss Pass bonus
            if (!obs.passed && obs.z > 0.5) {
              obs.passed = true;
              p.score += 50;
            }

            // 3D Collision Detection
            const distZ = Math.abs(obs.z - 0);
            const distX = Math.abs(obs.mesh.position.x - p.x);

            if (distZ < 1.2 && distX < 1.3) {
              // Can player jump over a low barrier?
              const jumpedOver = obs.type === 'barrier' && p.y > 1.3;

              if (!jumpedOver) {
                if (p.hasShield) {
                  // Shield absorbs the crash!
                  p.hasShield = false;
                  setShieldActive(false);
                  if (soundEnabled) playSound.stomp();
                  // Remove obstacle
                  scene.remove(obs.mesh);
                  obstacles.splice(i, 1);
                  continue;
                } else {
                  // CRASH! GAME OVER!
                  if (soundEnabled) playSound.carCrash();
                  setGameOver(true);
                  setIsPlaying(false);

                  // Save score and awards
                  const finalEarned = p.coins;
                  const updated = updateGameScore('cyber3d', p.score, {
                    coinsEarned: finalEarned,
                  });
                  if (updated) onProfileUpdated(updated);
                  break;
                }
              }
            }

            // Despawn passed obstacles behind camera
            if (obs.z > 12) {
              scene.remove(obs.mesh);
              obstacles.splice(i, 1);
            }
          }

          // Move Collectibles towards player & check magnet & pickup
          for (let i = collectibles.length - 1; i >= 0; i--) {
            const col = collectibles[i];
            col.z += forwardSpeed * delta;

            // Rotate Collectible
            col.mesh.rotateY(3.5 * delta);

            // Magnet Attraction (drags coins smoothly into ship)
            if (p.magnetTimer > 0 && col.type === 'coin') {
              const dX = p.x - col.mesh.position.x;
              const dZ = 0 - col.z;
              if (Math.hypot(dX, dZ) < 14) {
                col.mesh.position.x += dX * 8 * delta;
                col.z += dZ * 8 * delta;
              }
            }

            col.mesh.position.z = col.z;

            // Pickup Detection
            const distZ = Math.abs(col.z - 0);
            const distX = Math.abs(col.mesh.position.x - p.x);

            if (distZ < 1.4 && distX < 1.4) {
              if (col.type === 'coin') {
                p.coins += 1;
                p.score += 100 * (p.boostTimer > 0 ? 2 : 1);
                setCoinsCollected(p.coins);
                if (soundEnabled) playSound.coin();
              } else if (col.type === 'shield') {
                p.hasShield = true;
                setShieldActive(true);
                if (soundEnabled) playSound.powerup();
              } else if (col.type === 'boost') {
                p.boostTimer = 5;
                setBoostActive(true);
                if (soundEnabled) playSound.victory();
              } else if (col.type === 'magnet') {
                p.magnetTimer = 8;
                setMagnetActive(true);
                if (soundEnabled) playSound.powerup();
              }

              scene.remove(col.mesh);
              collectibles.splice(i, 1);
              continue;
            }

            if (col.z > 10) {
              scene.remove(col.mesh);
              collectibles.splice(i, 1);
            }
          }
        }

        renderer.render(scene, camera);
      }
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 3D Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] min-h-[460px] max-h-[82vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* TOP STATUS BAR OVERLAY */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          {/* Speed & Distance HUD */}
          <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-4 py-2.5 flex items-center gap-4 text-xs font-mono shadow-xl">
            <div className="flex items-center gap-1.5 text-cyan-400 font-black">
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="text-sm">{speedKmh} km/h</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="text-slate-300">
              Mesafe: <strong className="text-amber-400">{distance} m</strong>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="text-amber-300 font-bold flex items-center gap-1">
              <span>🪙</span>
              <span>+{coinsCollected}</span>
            </div>
          </div>

          {/* Active Powerups & Score HUD */}
          <div className="flex items-center gap-2">
            {shieldActive && (
              <div className="bg-sky-500/20 border border-sky-400 text-sky-300 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg animate-pulse">
                <Shield className="w-4 h-4" />
                <span>KALKAN AKTİF</span>
              </div>
            )}
            {boostActive && (
              <div className="bg-fuchsia-500/20 border border-fuchsia-400 text-fuchsia-300 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg animate-bounce">
                <Flame className="w-4 h-4" />
                <span>2X TURBO HIZ!</span>
              </div>
            )}
            {magnetActive && (
              <div className="bg-red-500/20 border border-red-400 text-red-300 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
                <Compass className="w-4 h-4" />
                <span>MANYETİK</span>
              </div>
            )}

            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2 flex flex-col items-end text-xs font-mono shadow-xl">
              <span className="text-[10px] text-slate-400">SKOR:</span>
              <strong className="text-base font-black text-cyan-400">{score.toLocaleString()}</strong>
            </div>

            {/* Sound & Fullscreen controls */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition shadow"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {onFullscreenRequest && (
                <button
                  onClick={onFullscreenRequest}
                  className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition shadow"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM RESPONSIVE ON-SCREEN STEERING CONTROLS */}
        {isPlaying && !gameOver && (
          <div className="absolute bottom-4 inset-x-0 flex justify-between px-6 pointer-events-none z-10">
            <button
              onClick={() => {
                playerStateRef.current.targetLane = Math.max(0, playerStateRef.current.targetLane - 1);
                if (soundEnabled) playSound.click();
              }}
              className="pointer-events-auto w-20 sm:w-24 h-16 sm:h-18 rounded-2xl bg-slate-900/85 hover:bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-500/50 text-white font-black text-sm flex flex-col items-center justify-center backdrop-blur shadow-2xl transition active:scale-95 select-none cursor-pointer"
            >
              <span className="text-xl sm:text-2xl">◀</span>
              <span className="text-[10px] text-cyan-300 font-bold uppercase">SOL (A)</span>
            </button>

            <button
              onClick={() => {
                if (!playerStateRef.current.isJumping) {
                  playerStateRef.current.isJumping = true;
                  playerStateRef.current.jumpVy = 0.22;
                  if (soundEnabled) playSound.jump();
                }
              }}
              className="pointer-events-auto px-6 h-14 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/40 active:bg-cyan-500 border border-cyan-400 text-cyan-300 font-black text-xs flex items-center gap-2 backdrop-blur shadow-2xl transition active:scale-95 select-none self-end mb-1 cursor-pointer"
            >
              <span>🚀 3D ZIPLA (BOŞLUK)</span>
            </button>

            <button
              onClick={() => {
                playerStateRef.current.targetLane = Math.min(2, playerStateRef.current.targetLane + 1);
                if (soundEnabled) playSound.click();
              }}
              className="pointer-events-auto w-20 sm:w-24 h-16 sm:h-18 rounded-2xl bg-slate-900/85 hover:bg-cyan-600/80 active:bg-cyan-500 border-2 border-cyan-500/50 text-white font-black text-sm flex flex-col items-center justify-center backdrop-blur shadow-2xl transition active:scale-95 select-none cursor-pointer"
            >
              <span className="text-xl sm:text-2xl">▶</span>
              <span className="text-[10px] text-cyan-300 font-bold uppercase">SAĞ (D)</span>
            </button>
          </div>
        )}

        {/* START / LOBBY MENU MODAL */}
        {inMenu && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 overflow-y-auto">
            <div className="max-w-xl w-full bg-slate-900 border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5 my-auto">
              {/* Header Title */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase">
                  <span>🚀 THREE.JS GERÇEK ZAMANLI 3D MOTOR</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  CYBER HORIZON 3D
                </h1>
                <p className="text-xs text-slate-300">
                  Sonsuz neon otoyolda süpersonik hız! Dönen lazer halkalarından ve engellerden A/D ile sıyrıl, altınları topla!
                </p>
              </div>

              {/* Subtabs: Başlat / Hangar / Kurallar */}
              <div className="flex justify-center gap-2 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setMenuTab('start')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    menuTab === 'start'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🚀 YARIŞI BAŞLAT
                </button>
                <button
                  onClick={() => setMenuTab('hangar')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    menuTab === 'hangar'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>SİBER HANGAR</span>
                </button>
                <button
                  onClick={() => setMenuTab('rules')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    menuTab === 'rules'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  📖 KONTROLLER
                </button>
              </div>

              {/* TAB 1: START */}
              {menuTab === 'start' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-3xl flex items-center justify-center border border-cyan-500/30">
                        {currentSkin.icon}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Kuşanılan Mekik:</div>
                        <div className="text-sm font-black text-white">{currentSkin.name}</div>
                        <div className="text-[11px] text-slate-400">{currentSkin.description}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setMenuTab('hangar')}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer"
                    >
                      Değiştir →
                    </button>
                  </div>

                  {/* Highscore & Wallet display */}
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                      <span className="text-slate-400">En Yüksek 3D Skor:</span>
                      <div className="text-base font-black text-cyan-400 mt-0.5">
                        {(currentUser.cyberHighscore || 0).toLocaleString()} Puan
                      </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left">
                      <span className="text-slate-400">Siber Cüzdan:</span>
                      <div className="text-base font-black text-amber-300 mt-0.5">
                        {(currentUser.cyberCoins || 0).toLocaleString()} 🪙
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={startMatch}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>3D SİBER PİSTE ÇIK</span>
                  </button>
                </div>
              )}

              {/* TAB 2: HANGAR SHOP */}
              {menuTab === 'hangar' && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Siber Paranızla yeni mekikler satın alın:</span>
                    <strong className="text-amber-300 font-mono">
                      {(currentUser.cyberCoins || 0).toLocaleString()} 🪙
                    </strong>
                  </div>

                  {shopFeedback && (
                    <div className="p-2.5 bg-cyan-500/20 border border-cyan-400 rounded-xl text-xs font-bold text-cyan-300 text-center">
                      {shopFeedback}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {CYBER_SHIPS.map((ship) => {
                      const isUnlocked =
                        currentUser.unlockedCyberSkins?.includes(ship.id) || ship.price === 0;
                      const isEquipped = currentUser.selectedCyberSkin === ship.id;

                      return (
                        <div
                          key={ship.id}
                          className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition ${
                            isEquipped
                              ? 'bg-cyan-950/40 border-cyan-400 shadow'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-2xl">{ship.icon}</span>
                            <div>
                              <div className="text-xs font-black text-white">{ship.name}</div>
                              <div className="text-[10px] text-slate-400 leading-snug">
                                {ship.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                            <span className="text-xs font-mono font-bold text-amber-300">
                              {ship.price === 0 ? 'ÜCRETSİZ' : `${ship.price} 🪙`}
                            </span>

                            <button
                              onClick={() => handleSelectShip(ship)}
                              disabled={isEquipped}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                isEquipped
                                  ? 'bg-slate-800 text-slate-500 cursor-default'
                                  : isUnlocked
                                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                                  : (currentUser.cyberCoins || 0) >= ship.price
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Kuşanıldı
                                </>
                              ) : isUnlocked ? (
                                'Kuşan'
                              ) : (
                                'Satın Al'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: RULES & CONTROLS */}
              {menuTab === 'rules' && (
                <div className="space-y-3 text-left text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                      <span>🕹️ A / D veya Sol / Sağ Ok:</span>
                    </div>
                    <p className="text-slate-300 font-sans text-[11px]">
                      Siber gemiyi 3 şerit arasında sağa sola kaydırır. Gemi dönerken gerçekçi 3D yatış (roll tilt) açısı alır.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold flex items-center gap-1.5">
                      <span>🚀 Boşluk (Space) veya Yukarı Ok:</span>
                    </div>
                    <p className="text-slate-300 font-sans text-[11px]">
                      3D Zıplama manevrası. Alçak plazma bariyerlerinin üstünden atlamanızı sağlar.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="text-sky-400 font-bold flex items-center gap-1.5">
                      <span>🛡️ Kalkan & Turbo Güçlendiricileri:</span>
                    </div>
                    <p className="text-slate-300 font-sans text-[11px]">
                      Mavi Kalkan Küresi 1 çarpmayı absorbe eder. Pembe Turbo ise 2x skor bonusu verir.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-500/60 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="text-5xl">💥</div>
              <h2 className="text-2xl font-black text-white">SİBER MEKİK ÇARPTI!</h2>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Kat Edilen Mesafe:</span>
                  <strong className="text-cyan-400 text-sm">{distance} metre</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-amber-400 font-bold">🪙 Toplanan Siber Altın:</span>
                  <strong className="text-amber-200 text-sm font-black">+{coinsCollected} 🪙</strong>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                  <span className="text-white font-bold">TOPLAM SKOR:</span>
                  <strong className="text-cyan-400 font-black text-base">{score.toLocaleString()} P</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={startMatch}
                  className="py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                  Hangara Dön
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Quick Info Footer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-300 shadow">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-black">🕹️ Kontroller:</span>
          <span>A / D (veya Sol / Sağ) ile şerit değiştir</span>
          <span>•</span>
          <span>Boşluk (Space) ile Zıpla</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="flex items-center gap-1.5 text-cyan-400 hover:underline cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>3D Lider Tablosu</span>
          </button>
        </div>
      </div>

      {/* Real Live Scoreboard Widget if toggled */}
      {showScoreboard && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <span>Canlı Skorboard - Cyber Horizon 3D Rekortmenleri</span>
            </h3>
            <button
              onClick={() => setShowScoreboard(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
            >
              Kapat
            </button>
          </div>
          <ScoreboardWidget game="cyber3d" currentUserId={currentUser.id} />
        </div>
      )}
    </div>
  );
};
