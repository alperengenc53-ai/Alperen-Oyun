export type GameId = 'pool' | 'traffic' | 'snake' | 'cyber3d';

export interface TrafficVehicle {
  id: string;
  name: string;
  price: number;
  speedRating: number;
  handlingRating: number;
  color: string;
  accentColor: string;
  type: 'sedan' | 'police' | 'taxi' | 'cyberpunk' | 'f1' | 'bat' | 'gold_super';
  icon: string;
  description: string;
  imageUrl?: string;
}

export interface TrafficSkin {
  id: string;
  name: string;
  price: number;
  pattern: 'plain' | 'stripes' | 'flames' | 'carbon' | 'camo';
  description: string;
  imageUrl?: string;
}

export interface SnakeSkin {
  id: string;
  name: string;
  price: number;
  color: string;
  secondaryColor: string;
  pattern: 'solid' | 'rainbow' | 'fire' | 'cyber' | 'tiger' | 'gold_king' | 'galaxy' | 'candy';
  accessory?: 'none' | 'crown' | 'sunglasses' | 'horns' | 'party_hat';
  icon: string;
  description: string;
  imageUrl?: string;
}

export interface PoolCue {
  id: string;
  name: string;
  price: number;
  power: number;
  aimLength: number;
  color: string;
  accentColor: string;
  icon: string;
  description: string;
  imageUrl?: string;
}

export interface PoolTableSkin {
  id: string;
  name: string;
  price: number;
  feltColor: string;
  woodColor: string;
  cushionColor: string;
  icon: string;
  description: string;
  imageUrl?: string;
}

export interface CyberShipSkin {
  id: string;
  name: string;
  price: number;
  color: string;
  glowColor: string;
  engineColor: string;
  icon: string;
  description: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  tag: string;
  level: number;
  totalScore: number; // Toplam profil skoru
  coins: number; // Toplam genel altın
  trafficCoins: number; // Turbo Otoban cüzdanı
  snakeCoins: number;   // Snake.io cüzdanı
  poolCoins: number;    // 8 Ball Pool cüzdanı
  cyberCoins?: number;  // Cyber Runner 3D cüzdanı
  unlockedTrafficCars: string[];
  selectedTrafficCar: string;
  unlockedTrafficSkins: string[];
  selectedTrafficSkin: string;
  unlockedSnakeSkins: string[];
  selectedSnakeSkin: string;
  unlockedPoolCues?: string[];
  selectedPoolCue?: string;
  unlockedPoolTables?: string[];
  selectedPoolTable?: string;
  unlockedCyberSkins?: string[];
  selectedCyberSkin?: string;
  trafficHighscore: number;
  trafficDistance: number;
  snakeHighscore: number;
  snakeKills: number;
  poolWins?: number;
  poolHighscore?: number;
  cyberHighscore?: number;
  password?: string;
  joinedAt: string;
}

export interface ScoreboardPlayer {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  score: number;
  metric: string;
  isOnline: boolean;
  tag?: string;
  coins?: number;
}

export interface GameInfo {
  id: GameId;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  badgeColor: string;
  description: string;
  onlinePlayers: number;
  rating: number;
  reviewsCount: number;
  bannerImage: string;
  icon: string;
  controls: {
    key: string;
    action: string;
  }[];
  features: string[];
}
