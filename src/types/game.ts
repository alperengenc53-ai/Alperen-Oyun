export type GameId = 'pubg' | 'minecraft' | 'traffic' | 'snake';

export interface PubgCostume {
  id: string;
  name: string;
  price: number;
  icon: string;
  description: string;
  bodyColor: string;
  headgearColor: string;
  accessory: 'beret' | 'bear_ears' | 'robot_antenna' | 'ninja_band' | 'duck_beak' | 'hero_cape';
}

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
}

export interface TrafficSkin {
  id: string;
  name: string;
  price: number;
  pattern: 'plain' | 'stripes' | 'flames' | 'carbon' | 'camo';
  description: string;
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
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  tag: string;
  level: number;
  totalScore: number;
  coins: number; // Gold coins earned in matches & highway
  unlockedPubgCostumes: string[];
  selectedPubgCostume: string;
  unlockedTrafficCars: string[];
  selectedTrafficCar: string;
  unlockedTrafficSkins: string[];
  selectedTrafficSkin: string;
  unlockedSnakeSkins: string[];
  selectedSnakeSkin: string;
  pubgKills: number;
  pubgWins: number;
  pubgHighscore: number;
  trafficHighscore: number;
  trafficDistance: number;
  snakeHighscore: number;
  snakeKills: number;
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
