/**
 * SINVERSE: ASTRAVYUH - Core Type Definitions
 * Clash of Clans-inspired Kingdom Builder & Battle System for Orbit LMS
 */

export type StructureType = 'castle' | 'wall' | 'tower';

export interface StructureInfo {
  type: StructureType;
  name: string;
  level: number; // 1 to 5
  maxLevel: number;
  description: string;
  defenseContribution: number;
  upgradeCost: number; // in Flix
  icon: string;
}

export type BattleAstraId = 'agni-astra' | 'varuna-astra' | 'vajra-astra';

export interface BattleAstra {
  id: BattleAstraId;
  name: string;
  sanskritName: string;
  icon: string;
  element: 'fire' | 'water' | 'lightning';
  ability: string;
  shortBuff: string;
  cost: number; // in Flix
  gradient: string;
  glowColor: string;
  accentBg: string;
  lore: string;
  damageBonus?: number; // Agni (+10)
  defenseBonus?: number; // Varuna (+10)
  perfectBonus?: number; // Vajra (+15 if 5/5)
}

export interface KingdomSkin {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlockedByDefault?: boolean;
  previewColor: string;
  bannerGradient: string;
}

export interface KingdomBackground {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlockedByDefault?: boolean;
  bgClass: string;
  previewColor: string;
}

export interface CosmeticRank {
  id: string;
  title: string;
  badge: string;
  cost: number;
  minTrophies?: number;
  description: string;
}

export interface StudentKingdom {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  avatarUrl?: string;
  batch?: string;
  department?: string;
  house?: 'surya' | 'chandra' | 'vayu' | 'agni';
  winStreak?: number;
  castleLevel: number; // 1 - 5
  wallLevel: number;   // 1 - 5
  towerLevel: number;  // 1 - 5
  equippedAstraId: BattleAstraId | null;
  activeSkinId: string;
  activeBackgroundId: string;
  trophies: number;
  battleWins: number;
  battleLosses: number;
  lastBattleAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Authoritative internal question schema
export interface QuizBattleQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  subject?: string;
}

// Public question schema sent to client (EXCLUDES correctAnswer for anti-tamper security)
export interface QuizBattleQuestionPublic {
  id: string;
  questionText: string;
  options: string[];
  subject?: string;
}

// Secure active battle session
export interface BattleSession {
  sessionId: string;
  attackerId: string;
  defenderId: string;
  questionIds: string[];
  createdAt: string;
  expiresAt: string;
  completed: boolean;
}

export interface BattleLogEntry {
  id: string;
  attackerId: string;
  attackerName: string;
  attackerAvatar?: string;
  attackerAstra: BattleAstraId | null;
  defenderId: string;
  defenderName: string;
  defenderAvatar?: string;
  defenderAstra: BattleAstraId | null;
  defenderCastleLevel: number;
  defenderWallLevel: number;
  defenderTowerLevel: number;
  correctAnswersCount: number;
  totalQuestions: number;
  attackScore: number;
  defenseReduction: number;
  finalDamage: number;
  isVictory: boolean;
  flixEarned: number;
  trophiesDelta: number;
  timestamp: string;
}

export interface AstravyuhSettings {
  gameEnabled: boolean;
  victoryDamageThreshold: number; // default 60
  astraPrices: Record<BattleAstraId, number>;
  upgradeCosts: {
    castle: [number, number, number, number]; // costs for level 2, 3, 4, 5
    wall: [number, number, number, number];
    tower: [number, number, number, number];
  };
  battleRewards: {
    winFlix: number;     // e.g. 40
    lossFlix: number;    // e.g. 10
    winTrophies: number; // e.g. 25
    lossTrophies: number;// e.g. 5
    dailyFlixLimit: number; // e.g. 150
  };
  disabledBatches?: string[]; // Batches paused by instructors or admins
}

export interface BattleCalculationResult {
  correctAnswers: number;
  totalQuestions: number;
  baseAttack: number;
  attackerAstraBonus: number;
  attackerAstraId: BattleAstraId | null;
  totalAttackScore: number;
  defenderWallReduction: number;
  defenderTowerReduction: number;
  defenderCastleReduction: number;
  defenderVarunaBonus: number;
  totalDefenseReduction: number;
  finalDamage: number;
  isVictory: boolean;
  flixAwarded: number;
  trophiesDelta: number;
  summaryMessage: string;
}

export interface FlixAuditEntry {
  id: string;
  userId: string;
  type: 'structure_upgrade' | 'purchase_astra' | 'purchase_skin' | 'purchase_background' | 'purchase_rank' | 'battle_reward' | 'instructor_award';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: string;
  details?: string;
}
