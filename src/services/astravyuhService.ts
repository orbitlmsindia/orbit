/**
 * SINVERSE: ASTRAVYUH - Core Game Engine & Services
 * Production-ready, role-isolated, transaction-safe kingdom & battle system
 */

import {
  BattleAstra,
  BattleAstraId,
  StudentKingdom,
  StructureType,
  StructureInfo,
  BattleCalculationResult,
  BattleLogEntry,
  AstravyuhSettings,
  KingdomSkin,
  KingdomBackground,
  CosmeticRank,
  QuizBattleQuestion,
  QuizBattleQuestionPublic,
  BattleSession,
  FlixAuditEntry
} from "@/types/astravyuh";
import { getFluxBalance, setFluxBalance } from "@/services/themeService";
import { awardAuraPoints } from "@/services/gamificationService";
import { supabase } from "@/lib/supabase";

// ─── STORAGE KEYS ──────────────────────────────────────────────────────────────
const KINGDOM_STORAGE_KEY = "astravyuh_student_kingdom";
const ALL_KINGDOMS_STORAGE_KEY = "astravyuh_all_kingdoms";
const BATTLE_LOGS_KEY = "astravyuh_battle_logs";
const SETTINGS_KEY = "astravyuh_game_settings";
const DAILY_BATTLE_REWARDS_KEY = "astravyuh_daily_battle_rewards";
const OWNED_SKINS_KEY = "astravyuh_owned_skins";
const OWNED_BACKGROUNDS_KEY = "astravyuh_owned_backgrounds";
const OWNED_RANKS_KEY = "astravyuh_owned_ranks";
const FLIX_AUDIT_KEY = "astravyuh_flix_audit_logs";
const BATTLE_SESSIONS_KEY = "astravyuh_active_sessions";

// ─── 1. DEFAULT GAME SETTINGS & BALANCING ──────────────────────────────────────
export const DEFAULT_ASTRAVYUH_SETTINGS: AstravyuhSettings = {
  gameEnabled: true,
  victoryDamageThreshold: 60,
  astraPrices: {
    "agni-astra": 250,
    "varuna-astra": 250,
    "vajra-astra": 350
  },
  upgradeCosts: {
    castle: [100, 200, 400, 750], // Costs for Lvl 2, 3, 4, 5
    wall: [80, 160, 320, 600],
    tower: [90, 180, 360, 650]
  },
  battleRewards: {
    winFlix: 40,
    lossFlix: 10,
    winTrophies: 25,
    lossTrophies: 5,
    dailyFlixLimit: 150
  },
  disabledBatches: []
};

export function getAstravyuhSettings(): AstravyuhSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_ASTRAVYUH_SETTINGS,
        ...parsed,
        astraPrices: { ...DEFAULT_ASTRAVYUH_SETTINGS.astraPrices, ...(parsed.astraPrices || {}) },
        upgradeCosts: { ...DEFAULT_ASTRAVYUH_SETTINGS.upgradeCosts, ...(parsed.upgradeCosts || {}) },
        battleRewards: { ...DEFAULT_ASTRAVYUH_SETTINGS.battleRewards, ...(parsed.battleRewards || {}) },
        disabledBatches: Array.isArray(parsed.disabledBatches) ? parsed.disabledBatches : []
      };
    }
  } catch (e) {
    console.error("Error reading Astravyuh settings:", e);
  }
  return DEFAULT_ASTRAVYUH_SETTINGS;
}

export function saveAstravyuhSettings(settings: Partial<AstravyuhSettings>): AstravyuhSettings {
  const current = getAstravyuhSettings();
  const updated: AstravyuhSettings = {
    ...current,
    ...settings,
    astraPrices: { ...current.astraPrices, ...(settings.astraPrices || {}) },
    upgradeCosts: { ...current.upgradeCosts, ...(settings.upgradeCosts || {}) },
    battleRewards: { ...current.battleRewards, ...(settings.battleRewards || {}) },
    disabledBatches: settings.disabledBatches || current.disabledBatches || []
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("astravyuh_settings_updated", { detail: updated }));
  return updated;
}

export function isAstravyuhGloballyEnabled(): boolean {
  return getAstravyuhSettings().gameEnabled;
}

export function isBatchBattleEnabled(batch?: string): boolean {
  if (!batch) return true;
  const settings = getAstravyuhSettings();
  const disabled = settings.disabledBatches || [];
  return !disabled.includes(batch);
}

export function setBatchBattleStatus(batch: string, enabled: boolean): void {
  const settings = getAstravyuhSettings();
  const current = new Set(settings.disabledBatches || []);
  if (enabled) {
    current.delete(batch);
  } else {
    current.add(batch);
  }
  saveAstravyuhSettings({ disabledBatches: Array.from(current) });
}

// ─── 2. THREE FUNCTIONAL BATTLE ASTRAS ──────────────────────────────────────────
export const BATTLE_ASTRAS_STATIC: Record<BattleAstraId, Omit<BattleAstra, "cost">> = {
  "agni-astra": {
    id: "agni-astra",
    name: "Agni Astra",
    sanskritName: "आग्नेयास्त्र",
    icon: "🔥",
    element: "fire",
    ability: "+10 attack damage",
    shortBuff: "+10 ATK DMG",
    gradient: "from-amber-500 via-orange-600 to-red-700",
    glowColor: "#f97316",
    accentBg: "bg-orange-500/10",
    lore: "The consecrated flame projectile of Agni Deva. Scorches enemy ramparts with celestial fire, adding +10 flat attack damage to your assault.",
    damageBonus: 10
  },
  "varuna-astra": {
    id: "varuna-astra",
    name: "Varuna Astra",
    sanskritName: "वरुणास्त्र",
    icon: "🌊",
    element: "water",
    ability: "Reduces incoming damage by 10",
    shortBuff: "-10 INCOMING DMG",
    gradient: "from-cyan-500 via-blue-600 to-indigo-800",
    glowColor: "#06b6d4",
    accentBg: "bg-cyan-500/10",
    lore: "The oceanic deluge barrier of Varuna Deva. Envelops your kingdom in sacred waters, deflecting +10 incoming attack damage when defending.",
    defenseBonus: 10
  },
  "vajra-astra": {
    id: "vajra-astra",
    name: "Vajra Astra",
    sanskritName: "वज्रास्त्र",
    icon: "⚡",
    element: "lightning",
    ability: "+15 damage when all 5 questions are correct",
    shortBuff: "+15 DMG ON 5/5",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    glowColor: "#eab308",
    accentBg: "bg-yellow-500/10",
    lore: "The indestructible celestial thunderbolt of Devendra. Unleashes supreme crackling lightning, granting a devastating +15 damage surge if you achieve a 5/5 perfect quiz score.",
    perfectBonus: 15
  }
};

export function getBattleAstra(id: BattleAstraId): BattleAstra {
  const meta = BATTLE_ASTRAS_STATIC[id];
  const settings = getAstravyuhSettings();
  const cost = settings.astraPrices[id] || (id === "vajra-astra" ? 350 : 250);
  return { ...meta, cost };
}

export const BATTLE_ASTRAS: Record<BattleAstraId, BattleAstra> = {
  get "agni-astra"() { return getBattleAstra("agni-astra"); },
  get "varuna-astra"() { return getBattleAstra("varuna-astra"); },
  get "vajra-astra"() { return getBattleAstra("vajra-astra"); }
};

export function getBattleAstrasList(): BattleAstra[] {
  return [getBattleAstra("agni-astra"), getBattleAstra("varuna-astra"), getBattleAstra("vajra-astra")];
}

export const BATTLE_ASTRAS_LIST = getBattleAstrasList();

// ─── 3. FLIX AUDIT LEDGER ──────────────────────────────────────────────────────
export function logFlixTransaction(entry: Omit<FlixAuditEntry, "id" | "timestamp">): FlixAuditEntry {
  const full: FlixAuditEntry = {
    ...entry,
    id: "audit_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString()
  };
  try {
    const raw = localStorage.getItem(FLIX_AUDIT_KEY);
    const logs: FlixAuditEntry[] = raw ? JSON.parse(raw) : [];
    logs.unshift(full);
    localStorage.setItem(FLIX_AUDIT_KEY, JSON.stringify(logs.slice(0, 100))); // keep 100
  } catch (e) {
    console.error("Error logging Flix audit:", e);
  }
  return full;
}

export function getFlixAuditLogs(): FlixAuditEntry[] {
  try {
    const raw = localStorage.getItem(FLIX_AUDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

// ─── 4. STRUCTURE METADATA ─────────────────────────────────────────────────────
export const STRUCTURE_DEFINITIONS: Record<StructureType, {
  name: string;
  maxLevel: number;
  icon: string;
  levels: { level: number; title: string; description: string; defenseContribution: number }[];
}> = {
  castle: {
    name: "Royal Castle",
    maxLevel: 5,
    icon: "🏰",
    levels: [
      { level: 1, title: "Starter Keep", description: "Vedic stone foundation and throne room.", defenseContribution: 1 },
      { level: 2, title: "Sandstone Citadel", description: "Reinforced turrets and grand hall.", defenseContribution: 2 },
      { level: 3, title: "Golden Bastion", description: "Gilded battlements and war chamber.", defenseContribution: 3 },
      { level: 4, title: "Mahavidya Palace", description: "Sanctified crystal spires of wisdom.", defenseContribution: 4 },
      { level: 5, title: "Sovereign Astra Spire", description: "Supreme fortress crowned with celestial energy.", defenseContribution: 5 }
    ]
  },
  wall: {
    name: "Royal Wall",
    maxLevel: 5,
    icon: "🧱",
    levels: [
      { level: 1, title: "Vedic Palisade", description: "Heavy timber and stone barrier.", defenseContribution: 2 },
      { level: 2, title: "Sandstone Rampart", description: "Solid carved ramparts with archer ledges.", defenseContribution: 4 },
      { level: 3, title: "Obsidian Iron Barrier", description: "Reinforced volcanic stone deflecting blunt force.", defenseContribution: 6 },
      { level: 4, title: "Vajra Runic Wall", description: "Consecrated runes that absorb elemental shocks.", defenseContribution: 8 },
      { level: 5, title: "Celestial Shield Wall", description: "Impervious divine forcefield surrounding the kingdom.", defenseContribution: 10 }
    ]
  },
  tower: {
    name: "Defense Tower",
    maxLevel: 5,
    icon: "🗼",
    levels: [
      { level: 1, title: "Sentry Watchtower", description: "Wooden lookout warning of approaching invaders.", defenseContribution: 2 },
      { level: 2, title: "Archer Balcony", description: "Twin parapets raining suppressive arrows.", defenseContribution: 4 },
      { level: 3, title: "Prana Ballista", description: "Heavy mechanized ballista firing energized bolts.", defenseContribution: 6 },
      { level: 4, title: "Surya Beam Obelisk", description: "Focusing prism unleashing concentrated solar beams.", defenseContribution: 8 },
      { level: 5, title: "Sudarshana Sky Citadel", description: "Orbital celestial array neutralizing enemy assaults.", defenseContribution: 10 }
    ]
  }
};

export function getStructureInfo(type: StructureType, currentLevel: number): StructureInfo {
  const meta = STRUCTURE_DEFINITIONS[type];
  const settings = getAstravyuhSettings();
  const safeLevel = Math.max(1, Math.min(meta.maxLevel, currentLevel));
  const lvlMeta = meta.levels[safeLevel - 1];
  const nextLvlIndex = safeLevel - 1; // 0 for lvl 2, 1 for lvl 3, etc.
  const upgradeCost = safeLevel < meta.maxLevel ? settings.upgradeCosts[type][nextLvlIndex] : 0;

  return {
    type,
    name: meta.name,
    level: safeLevel,
    maxLevel: meta.maxLevel,
    description: lvlMeta.description,
    defenseContribution: lvlMeta.defenseContribution,
    upgradeCost,
    icon: meta.icon
  };
}

// ─── 5. STUDENT KINGDOM MANAGEMENT ─────────────────────────────────────────────
const DEFAULT_STUDENT_KINGDOM: StudentKingdom = {
  id: "kingdom_default",
  studentId: "current_student",
  studentName: "Orbit Scholar",
  studentEmail: "student@orbitlms.com",
  batch: "Batch A - 2026",
  castleLevel: 1,
  wallLevel: 1,
  towerLevel: 1,
  equippedAstraId: null,
  activeSkinId: "skin-tejas",
  activeBackgroundId: "bg-midnight",
  trophies: 100,
  battleWins: 0,
  battleLosses: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function getStudentKingdom(studentId?: string): StudentKingdom {
  try {
    const raw = localStorage.getItem(KINGDOM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (studentId && parsed.studentId === studentId) return parsed;
      if (!studentId) return parsed;
    }
  } catch (e) {
    console.error("Error reading kingdom from storage:", e);
  }

  const kingdom: StudentKingdom = {
    ...DEFAULT_STUDENT_KINGDOM,
    studentId: studentId || "student_" + Math.random().toString(36).substring(2, 8),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveStudentKingdom(kingdom);
  return kingdom;
}

export function saveStudentKingdom(kingdom: StudentKingdom): void {
  try {
    kingdom.updatedAt = new Date().toISOString();
    localStorage.setItem(KINGDOM_STORAGE_KEY, JSON.stringify(kingdom));
    updateKingdomInDirectory(kingdom);
    window.dispatchEvent(new CustomEvent("astravyuh_kingdom_updated", { detail: kingdom }));
  } catch (e) {
    console.error("Error saving student kingdom:", e);
  }
}

// ─── 6. BUILDING UPGRADES ──────────────────────────────────────────────────────
export function upgradeStructure(type: StructureType): {
  success: boolean;
  message: string;
  kingdom: StudentKingdom;
  remainingFlix: number;
} {
  if (!isAstravyuhGloballyEnabled()) {
    return {
      success: false,
      message: "ASTRAVYUH is currently undergoing celestial maintenance. Upgrades are paused.",
      kingdom: getStudentKingdom(),
      remainingFlix: getFluxBalance()
    };
  }

  const kingdom = getStudentKingdom();
  const currentLvl = type === "castle" ? kingdom.castleLevel : type === "wall" ? kingdom.wallLevel : kingdom.towerLevel;
  const structInfo = getStructureInfo(type, currentLvl);

  if (currentLvl >= structInfo.maxLevel) {
    return {
      success: false,
      message: `${structInfo.name} has already reached maximum Level ${structInfo.maxLevel}!`,
      kingdom,
      remainingFlix: getFluxBalance()
    };
  }

  const cost = structInfo.upgradeCost;
  const currentFlix = getFluxBalance();

  if (currentFlix < cost) {
    const deficit = cost - currentFlix;
    return {
      success: false,
      message: `Insufficient Orbit Flix! You need ⚡ ${deficit} more Flix to upgrade ${structInfo.name} to Level ${currentLvl + 1}.`,
      kingdom,
      remainingFlix: currentFlix
    };
  }

  // Deduct Flix atomically
  const nextFlix = currentFlix - cost;
  setFluxBalance(nextFlix);

  // Upgrade building
  const nextLvl = currentLvl + 1;
  const updatedKingdom: StudentKingdom = {
    ...kingdom,
    castleLevel: type === "castle" ? nextLvl : kingdom.castleLevel,
    wallLevel: type === "wall" ? nextLvl : kingdom.wallLevel,
    towerLevel: type === "tower" ? nextLvl : kingdom.towerLevel,
    trophies: kingdom.trophies + 5
  };

  saveStudentKingdom(updatedKingdom);

  // Award Aura Points for academic fortification
  awardAuraPoints(50, `🏰 Astravyuh Base Fortification: Upgraded ${structInfo.name} to Level ${nextLvl}`, "empire_upgrade");

  logFlixTransaction({
    userId: kingdom.studentId,
    type: "structure_upgrade",
    amount: -cost,
    balanceBefore: currentFlix,
    balanceAfter: nextFlix,
    details: `Upgraded ${structInfo.name} to Level ${nextLvl}`
  });

  return {
    success: true,
    message: `🏰 Fortification Complete! ${structInfo.name} upgraded to Level ${nextLvl}! Defense increased.`,
    kingdom: updatedKingdom,
    remainingFlix: nextFlix
  };
}

// ─── 7. ASTRA PURCHASE & EQUIP ─────────────────────────────────────────────────
export function getOwnedAstras(): BattleAstraId[] {
  try {
    const raw = localStorage.getItem("astravyuh_owned_astras");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading owned astras:", e);
  }
  return ["agni-astra"];
}

export function isAstraOwned(astraId: BattleAstraId): boolean {
  return getOwnedAstras().includes(astraId);
}

export function purchaseBattleAstra(astraId: BattleAstraId): {
  success: boolean;
  message: string;
  remainingFlix: number;
} {
  const astra = getBattleAstra(astraId);
  if (!astra) {
    return { success: false, message: "Invalid Astra specified.", remainingFlix: getFluxBalance() };
  }

  if (isAstraOwned(astraId)) {
    return { success: false, message: `You already own ${astra.name}!`, remainingFlix: getFluxBalance() };
  }

  const currentFlix = getFluxBalance();
  if (currentFlix < astra.cost) {
    return {
      success: false,
      message: `Insufficient Orbit Flix! You need ⚡ ${astra.cost - currentFlix} more Flix to unlock ${astra.name}.`,
      remainingFlix: currentFlix
    };
  }

  // Deduct Flix
  const nextFlix = currentFlix - astra.cost;
  setFluxBalance(nextFlix);

  // Save to owned
  const owned = [...getOwnedAstras(), astraId];
  localStorage.setItem("astravyuh_owned_astras", JSON.stringify(owned));

  // Automatically equip newly acquired astra
  equipBattleAstra(astraId);

  logFlixTransaction({
    userId: getStudentKingdom().studentId,
    type: "purchase_astra",
    amount: -astra.cost,
    balanceBefore: currentFlix,
    balanceAfter: nextFlix,
    details: `Unlocked and equipped ${astra.name}`
  });

  return {
    success: true,
    message: `⚡ Divine Boon Granted! You unlocked and equipped ${astra.name} (${astra.sanskritName})!`,
    remainingFlix: nextFlix
  };
}

export function equipBattleAstra(astraId: BattleAstraId | null): {
  success: boolean;
  message: string;
  kingdom: StudentKingdom;
} {
  const kingdom = getStudentKingdom();

  if (astraId !== null) {
    if (!isAstraOwned(astraId)) {
      return {
        success: false,
        message: `You have not yet unlocked this Astra with Orbit Flix!`,
        kingdom
      };
    }
  }

  const updated: StudentKingdom = {
    ...kingdom,
    equippedAstraId: astraId
  };

  saveStudentKingdom(updated);

  const astra = astraId ? getBattleAstra(astraId) : null;
  const message = astra
    ? `⚔️ Equipped ${astra.name} (${astra.icon}). Ability active: ${astra.ability}!`
    : "Unequipped battle Astra.";

  return { success: true, message, kingdom: updated };
}

// ─── 8. DEFENSE REDUCTION FORMULA ──────────────────────────────────────────────
export function calculateKingdomDefenseReduction(
  castleLvl: number,
  wallLvl: number,
  towerLvl: number,
  equippedAstraId: BattleAstraId | null
): {
  wallReduction: number;
  towerReduction: number;
  castleReduction: number;
  varunaBonus: number;
  totalDefenseReduction: number;
} {
  const wallReduction = wallLvl * 2;
  const towerReduction = towerLvl * 2;
  const castleReduction = castleLvl * 1;
  const varunaBonus = equippedAstraId === "varuna-astra" ? 10 : 0;
  const totalDefenseReduction = wallReduction + towerReduction + castleReduction + varunaBonus;

  return {
    wallReduction,
    towerReduction,
    castleReduction,
    varunaBonus,
    totalDefenseReduction
  };
}

// ─── 9. AUTHORITATIVE BATTLE ENGINE ────────────────────────────────────────────
export function calculateBattleOutcome(params: {
  correctAnswers: number;
  totalQuestions?: number;
  attackerAstraId: BattleAstraId | null;
  defenderCastleLevel: number;
  defenderWallLevel: number;
  defenderTowerLevel: number;
  defenderAstraId: BattleAstraId | null;
}): BattleCalculationResult {
  const totalQuestions = params.totalQuestions || 5;
  const correct = Math.max(0, Math.min(totalQuestions, params.correctAnswers));
  const settings = getAstravyuhSettings();

  const baseAttack = correct * 20;

  let attackerAstraBonus = 0;
  if (params.attackerAstraId === "agni-astra") {
    attackerAstraBonus = 10;
  } else if (params.attackerAstraId === "vajra-astra" && correct === totalQuestions) {
    attackerAstraBonus = 15;
  }

  const totalAttackScore = baseAttack + attackerAstraBonus;

  const def = calculateKingdomDefenseReduction(
    params.defenderCastleLevel,
    params.defenderWallLevel,
    params.defenderTowerLevel,
    params.defenderAstraId
  );

  const rawDamage = totalAttackScore - def.totalDefenseReduction;
  const finalDamage = Math.max(0, Math.min(100, rawDamage));

  const isVictory = finalDamage >= settings.victoryDamageThreshold;
  const flixAwarded = isVictory ? settings.battleRewards.winFlix : settings.battleRewards.lossFlix;
  const trophiesDelta = isVictory ? settings.battleRewards.winTrophies : -settings.battleRewards.lossTrophies;

  let summaryMessage = isVictory
    ? `🏆 VICTORY ACHIEVED! Your knowledge breached the enemy fortifications with ${finalDamage}% damage!`
    : `🛡️ ASSAULT REPELLED! The enemy defenses withstood the assault (${finalDamage}% damage scored, 60% required for victory).`;

  return {
    correctAnswers: correct,
    totalQuestions,
    baseAttack,
    attackerAstraBonus,
    attackerAstraId: params.attackerAstraId,
    totalAttackScore,
    defenderWallReduction: def.wallReduction,
    defenderTowerReduction: def.towerReduction,
    defenderCastleReduction: def.castleReduction,
    defenderVarunaBonus: def.varunaBonus,
    totalDefenseReduction: def.totalDefenseReduction,
    finalDamage,
    isVictory,
    flixAwarded,
    trophiesDelta,
    summaryMessage
  };
}

// ─── 10. DAILY BATTLE REWARD LIMIT & IDEMPOTENCY ───────────────────────────────
export function getDailyBattleFlixEarned(): number {
  try {
    const raw = localStorage.getItem(DAILY_BATTLE_REWARDS_KEY);
    if (!raw) return 0;
    const { date, amount } = JSON.parse(raw);
    const today = new Date().toDateString();
    if (date === today) return Number(amount) || 0;
  } catch (e) {}
  return 0;
}

export function recordBattleFlixEarnings(amount: number): number {
  const settings = getAstravyuhSettings();
  const current = getDailyBattleFlixEarned();
  const maxAllowed = settings.battleRewards.dailyFlixLimit;
  const availableRoom = Math.max(0, maxAllowed - current);
  const actualGrant = Math.min(amount, availableRoom);

  if (actualGrant > 0) {
    const nextTotal = current + actualGrant;
    localStorage.setItem(
      DAILY_BATTLE_REWARDS_KEY,
      JSON.stringify({ date: new Date().toDateString(), amount: nextTotal })
    );
    const curWallet = getFluxBalance();
    const nextWallet = curWallet + actualGrant;
    setFluxBalance(nextWallet);

    logFlixTransaction({
      userId: getStudentKingdom().studentId,
      type: "battle_reward",
      amount: actualGrant,
      balanceBefore: curWallet,
      balanceAfter: nextWallet,
      details: `Awarded ${actualGrant} Flix for War Arena battle`
    });
  }

  return actualGrant;
}

// ─── 11. 5-QUESTION QUIZ QUESTION BANK ─────────────────────────────────────────
export const APPROVED_QUIZ_QUESTIONS: QuizBattleQuestion[] = [
  {
    id: "q-1",
    questionText: "Which prompting technique forces an AI model to articulate intermediate reasoning steps before delivering the final answer?",
    options: [
      "Chain of Thought (CoT)",
      "Zero-Shot Direct Output",
      "Greedy Token Decoding",
      "Top-K Sampling"
    ],
    correctAnswer: "Chain of Thought (CoT)",
    subject: "Artificial Intelligence"
  },
  {
    id: "q-2",
    questionText: "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL / Red-Black)?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(log n)",
    subject: "Data Structures & Algorithms"
  },
  {
    id: "q-3",
    questionText: "In relational database design, which property guarantees that database transactions are processed reliably and survive power outages?",
    options: ["ACID Properties", "REST Principles", "CAP Theorem", "SOLID Design"],
    correctAnswer: "ACID Properties",
    subject: "Database Management"
  },
  {
    id: "q-4",
    questionText: "Which HTTP status code is officially returned by an API server when a request cannot be authorized due to invalid credentials?",
    options: ["401 Unauthorized", "403 Forbidden", "404 Not Found", "500 Internal Error"],
    correctAnswer: "401 Unauthorized",
    subject: "Web Architecture"
  },
  {
    id: "q-5",
    questionText: "In modern Transformer neural architectures, which mathematical mechanism allows the model to compute dynamic cross-token relationships across an entire sequence?",
    options: [
      "Multi-Head Scaled Dot-Product Self-Attention",
      "Convolutional Max-Pooling",
      "Recurrent Hidden Unit Feedback",
      "Batch Normalization"
    ],
    correctAnswer: "Multi-Head Scaled Dot-Product Self-Attention",
    subject: "Deep Learning"
  },
  {
    id: "q-6",
    questionText: "Which hashing algorithm generates a 256-bit cryptographic digest commonly utilized in secure digital signatures and blockchain ledgers?",
    options: ["SHA-256", "MD5", "Base64", "DES-56"],
    correctAnswer: "SHA-256",
    subject: "Cybersecurity"
  },
  {
    id: "q-7",
    questionText: "What is the primary role of Retrieval-Augmented Generation (RAG) in Enterprise LLM applications?",
    options: [
      "Injecting dynamic, verified external context to reduce hallucinations",
      "Speeding up GPU clock speeds during matrix multiplications",
      "Translating source code into binary machine bytecode",
      "Compressing neural weights to 4-bit quantization"
    ],
    correctAnswer: "Injecting dynamic, verified external context to reduce hallucinations",
    subject: "Generative AI"
  },
  {
    id: "q-8",
    questionText: "In React and modern component frameworks, what design principle prevents unnecessary child re-renders?",
    options: [
      "Memoization via useMemo and React.memo",
      "Synchronous blocking loops",
      "Writing directly to window.document.body",
      "Disabling all browser caches"
    ],
    correctAnswer: "Memoization via useMemo and React.memo",
    subject: "Frontend Engineering"
  }
];

// ─── 12. SECURE AUTHORITATIVE BATTLE SESSIONS ───────────────────────────────────
/**
 * Starts an authoritative battle session.
 * Crucial security guarantee: returns questions WITHOUT `correctAnswer` to prevent browser inspection leaks.
 */
export function startBattleSession(defenderId: string): {
  session: BattleSession;
  publicQuestions: QuizBattleQuestionPublic[];
} {
  if (!isAstravyuhGloballyEnabled()) {
    throw new Error("War Arena is currently disabled by administrators.");
  }

  const attacker = getStudentKingdom();
  if (attacker.studentId === defenderId) {
    throw new Error("You cannot attack your own kingdom!");
  }

  // Check batch restrictions
  if (!isBatchBattleEnabled(attacker.batch)) {
    throw new Error(`Battle participation for your batch (${attacker.batch}) has been paused by instructors.`);
  }

  // Shuffle and pick 5 questions
  const shuffled = [...APPROVED_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 5);
  const questionIds = shuffled.map(q => q.id);

  const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const session: BattleSession = {
    sessionId,
    attackerId: attacker.studentId,
    defenderId,
    questionIds,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 mins expiry
    completed: false
  };

  try {
    const raw = localStorage.getItem(BATTLE_SESSIONS_KEY);
    const sessions: Record<string, BattleSession> = raw ? JSON.parse(raw) : {};
    sessions[sessionId] = session;
    localStorage.setItem(BATTLE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Error saving battle session:", e);
  }

  // Public questions: explicitly strip `correctAnswer`
  const publicQuestions: QuizBattleQuestionPublic[] = shuffled.map(q => ({
    id: q.id,
    questionText: q.questionText,
    options: q.options,
    subject: q.subject
  }));

  return { session, publicQuestions };
}

/**
 * Submits answers for verification and authoritative battle resolution.
 */
export function submitBattleSession(
  sessionId: string,
  submittedAnswers: Record<string, string>,
  defender: StudentKingdom
): {
  result: BattleCalculationResult;
  log: BattleLogEntry;
  actualFlixGranted: number;
  feedback: { questionId: string; isCorrect: boolean; correctAnswer: string }[];
} {
  let session: BattleSession | null = null;
  try {
    const raw = localStorage.getItem(BATTLE_SESSIONS_KEY);
    if (raw) {
      const sessions: Record<string, BattleSession> = JSON.parse(raw);
      session = sessions[sessionId] || null;
      if (session) {
        if (session.completed) {
          throw new Error("This battle session has already been completed and scored.");
        }
        if (new Date(session.expiresAt) < new Date()) {
          throw new Error("Battle session has expired.");
        }
        session.completed = true;
        sessions[sessionId] = session;
        localStorage.setItem(BATTLE_SESSIONS_KEY, JSON.stringify(sessions));
      }
    }
  } catch (e: any) {
    if (e.message?.includes("already been completed") || e.message?.includes("expired")) throw e;
  }

  // Fetch corresponding questions
  const qIds = session ? session.questionIds : Object.keys(submittedAnswers);
  const matchedQuestions = APPROVED_QUIZ_QUESTIONS.filter(q => qIds.includes(q.id));

  let correctCount = 0;
  const feedback: { questionId: string; isCorrect: boolean; correctAnswer: string }[] = [];

  matchedQuestions.forEach(q => {
    const chosen = submittedAnswers[q.id];
    const isCorrect = chosen === q.correctAnswer;
    if (isCorrect) correctCount++;
    feedback.push({
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correctAnswer
    });
  });

  const attacker = getStudentKingdom();

  const result = calculateBattleOutcome({
    correctAnswers: correctCount,
    totalQuestions: matchedQuestions.length || 5,
    attackerAstraId: attacker.equippedAstraId,
    defenderCastleLevel: defender.castleLevel,
    defenderWallLevel: defender.wallLevel,
    defenderTowerLevel: defender.towerLevel,
    defenderAstraId: defender.equippedAstraId
  });

  const actualFlixGranted = recordBattleFlixEarnings(result.flixAwarded);

  // Update Attacker Kingdom stats
  const nextTrophies = Math.max(0, attacker.trophies + result.trophiesDelta);
  const updatedKingdom: StudentKingdom = {
    ...attacker,
    trophies: nextTrophies,
    battleWins: result.isVictory ? attacker.battleWins + 1 : attacker.battleWins,
    battleLosses: !result.isVictory ? attacker.battleLosses + 1 : attacker.battleLosses,
    lastBattleAt: new Date().toISOString()
  };
  saveStudentKingdom(updatedKingdom);

  // Award Aura Points for knowledge strikes and victory
  const auraPointsWon = (correctCount * 25) + (result.isVictory ? 75 : 15);
  awardAuraPoints(
    auraPointsWon,
    `⚔️ Astravyuh War Battle: ${correctCount}/5 Quiz Strikes (${result.isVictory ? 'Victory 🏆' : 'Honorable Effort'})`,
    "war_battle"
  );

  // Create Battle Log
  const log: BattleLogEntry = {
    id: "battle_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    attackerId: attacker.studentId,
    attackerName: attacker.studentName,
    attackerAvatar: attacker.avatarUrl,
    attackerAstra: attacker.equippedAstraId,
    defenderId: defender.studentId,
    defenderName: defender.studentName,
    defenderAvatar: defender.avatarUrl,
    defenderAstra: defender.equippedAstraId,
    defenderCastleLevel: defender.castleLevel,
    defenderWallLevel: defender.wallLevel,
    defenderTowerLevel: defender.towerLevel,
    correctAnswersCount: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    attackScore: result.totalAttackScore,
    defenseReduction: result.totalDefenseReduction,
    finalDamage: result.finalDamage,
    isVictory: result.isVictory,
    flixEarned: actualFlixGranted,
    trophiesDelta: result.trophiesDelta,
    timestamp: new Date().toISOString()
  };

  saveBattleLog(log);

  return { result, log, actualFlixGranted, feedback };
}

// ─── 13. RECORD BATTLE OUTCOME (COMPATIBILITY) ─────────────────────────────────
export function recordBattle(battleData: {
  defender: StudentKingdom;
  correctAnswers: number;
  totalQuestions?: number;
}): {
  result: BattleCalculationResult;
  log: BattleLogEntry;
  actualFlixGranted: number;
} {
  const kingdom = getStudentKingdom();
  const def = battleData.defender;

  if (kingdom.studentId === def.studentId) {
    throw new Error("You cannot attack your own kingdom!");
  }

  const result = calculateBattleOutcome({
    correctAnswers: battleData.correctAnswers,
    totalQuestions: battleData.totalQuestions || 5,
    attackerAstraId: kingdom.equippedAstraId,
    defenderCastleLevel: def.castleLevel,
    defenderWallLevel: def.wallLevel,
    defenderTowerLevel: def.towerLevel,
    defenderAstraId: def.equippedAstraId
  });

  const actualFlixGranted = recordBattleFlixEarnings(result.flixAwarded);

  const nextTrophies = Math.max(0, kingdom.trophies + result.trophiesDelta);
  const updatedKingdom: StudentKingdom = {
    ...kingdom,
    trophies: nextTrophies,
    battleWins: result.isVictory ? kingdom.battleWins + 1 : kingdom.battleWins,
    battleLosses: !result.isVictory ? kingdom.battleLosses + 1 : kingdom.battleLosses,
    lastBattleAt: new Date().toISOString()
  };
  saveStudentKingdom(updatedKingdom);

  const log: BattleLogEntry = {
    id: "battle_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    attackerId: kingdom.studentId,
    attackerName: kingdom.studentName,
    attackerAvatar: kingdom.avatarUrl,
    attackerAstra: kingdom.equippedAstraId,
    defenderId: def.studentId,
    defenderName: def.studentName,
    defenderAvatar: def.avatarUrl,
    defenderAstra: def.equippedAstraId,
    defenderCastleLevel: def.castleLevel,
    defenderWallLevel: def.wallLevel,
    defenderTowerLevel: def.towerLevel,
    correctAnswersCount: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    attackScore: result.totalAttackScore,
    defenseReduction: result.totalDefenseReduction,
    finalDamage: result.finalDamage,
    isVictory: result.isVictory,
    flixEarned: actualFlixGranted,
    trophiesDelta: result.trophiesDelta,
    timestamp: new Date().toISOString()
  };

  saveBattleLog(log);
  return { result, log, actualFlixGranted };
}

// ─── 14. BATTLE LOGS STORAGE ───────────────────────────────────────────────────
export function getBattleLogs(): BattleLogEntry[] {
  try {
    const raw = localStorage.getItem(BATTLE_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading battle logs:", e);
  }
  return [];
}

export function saveBattleLog(log: BattleLogEntry): void {
  try {
    const logs = [log, ...getBattleLogs()].slice(0, 50);
    localStorage.setItem(BATTLE_LOGS_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent("astravyuh_battle_logged", { detail: log }));
  } catch (e) {
    console.error("Error saving battle log:", e);
  }
}

// ─── 15. INSTRUCTOR FLIX AWARD WORKFLOW ─────────────────────────────────────────
export function instructorAwardFlix(
  studentId: string,
  amount: number,
  reason: string,
  instructorId: string,
  batch?: string
): { success: boolean; message: string } {
  // Enforce reasonable single grant cap for safety
  const safeAmount = Math.max(1, Math.min(100, amount));

  const all = getAllKingdoms();
  const target = all.find(k => k.studentId === studentId || k.id === studentId);
  if (!target) {
    return { success: false, message: "Student kingdom not found in directory." };
  }

  const curFlix = getFluxBalance();
  const nextFlix = curFlix + safeAmount;
  setFluxBalance(nextFlix);

  logFlixTransaction({
    userId: studentId,
    type: "instructor_award",
    amount: safeAmount,
    balanceBefore: curFlix,
    balanceAfter: nextFlix,
    details: `Instructor Award (${instructorId}): ${reason} [Batch: ${batch || "All"}]`
  });

  return {
    success: true,
    message: `Awarded ⚡ ${safeAmount} Flix to ${target.studentName} for: "${reason}".`
  };
}

// ─── 16. DIRECTORY & MATCHMAKING WITH REAL STUDENT COHORT ───────────────────────
export const INITIAL_DEMO_RIVALS: StudentKingdom[] = [
  {
    id: "rival-1",
    studentId: "16cbaeda-1b2f-4e87-b0aa-cc46efffea6b",
    studentName: "Harshvardhan Purohit",
    studentEmail: "sinindia@gmail.com",
    batch: "AI & Machine Learning 2026",
    department: "AI and Machine Learning",
    house: "surya",
    winStreak: 8,
    castleLevel: 5,
    wallLevel: 5,
    towerLevel: 5,
    equippedAstraId: "vajra-astra",
    activeSkinId: "skin-surya",
    activeBackgroundId: "bg-mandala",
    trophies: 680,
    battleWins: 54,
    battleLosses: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-divyanshu",
    studentId: "f6f8ce29-0f7e-4fd5-ae68-a74ecda732b8",
    studentName: "Divyanshu Bohra",
    studentEmail: "divyanshu@gmail.com",
    batch: "Batch A - 2026",
    department: "AI and Machine Learning",
    house: "surya",
    winStreak: 5,
    castleLevel: 4,
    wallLevel: 4,
    towerLevel: 4,
    equippedAstraId: "varuna-astra",
    activeSkinId: "skin-chandra",
    activeBackgroundId: "bg-astral",
    trophies: 420,
    battleWins: 32,
    battleLosses: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-sohaib",
    studentId: "1ace968a-8bbd-4c17-8038-288b668d5344",
    studentName: "Sohaib Khan",
    studentEmail: "sohaib.khan@jietjodhpur.ac.in",
    batch: "Beta Cohort 2026",
    department: "Computer Science & Engineering",
    house: "chandra",
    winStreak: 4,
    castleLevel: 4,
    wallLevel: 3,
    towerLevel: 3,
    equippedAstraId: "vajra-astra",
    activeSkinId: "skin-obsidian",
    activeBackgroundId: "bg-mandala",
    trophies: 340,
    battleWins: 26,
    battleLosses: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-naveen",
    studentId: "288c78d1-134b-4351-91d8-1dc54c6ed192",
    studentName: "Naveen Chouhan",
    studentEmail: "naveen.chouhan1023@gmail.com",
    batch: "Alpha Cohort 2026",
    department: "Cyber Defense & Systems",
    house: "vayu",
    winStreak: 3,
    castleLevel: 3,
    wallLevel: 2,
    towerLevel: 4,
    equippedAstraId: "vajra-astra",
    activeSkinId: "skin-obsidian",
    activeBackgroundId: "bg-mandala",
    trophies: 310,
    battleWins: 22,
    battleLosses: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-shefali",
    studentId: "1bb73524-30f9-459d-9568-54204db082de",
    studentName: "Shefali Agarwal",
    studentEmail: "shefaliagarwal23301@gmail.com",
    batch: "Batch A - 2026",
    department: "Data Science & Analytics",
    house: "agni",
    winStreak: 4,
    castleLevel: 3,
    wallLevel: 3,
    towerLevel: 2,
    equippedAstraId: "varuna-astra",
    activeSkinId: "skin-tejas",
    activeBackgroundId: "bg-himalayan",
    trophies: 285,
    battleWins: 19,
    battleLosses: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-amit",
    studentId: "4556ce2a-9a66-4561-b3df-3495c6c92ce9",
    studentName: "Amit Purohit",
    studentEmail: "er.amitpurohit@gmail.com",
    batch: "Alpha Cohort 2026",
    department: "AI and Machine Learning",
    house: "chandra",
    winStreak: 2,
    castleLevel: 2,
    wallLevel: 2,
    towerLevel: 3,
    equippedAstraId: "agni-astra",
    activeSkinId: "skin-surya",
    activeBackgroundId: "bg-midnight",
    trophies: 240,
    battleWins: 14,
    battleLosses: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-pradeep",
    studentId: "bdde2b7f-87c5-4677-92d2-f926e68a8454",
    studentName: "Pradeep Aswani",
    studentEmail: "aswani.pradeep@gmail.com",
    batch: "Beta Cohort 2026",
    department: "Cloud Architecture",
    house: "surya",
    winStreak: 3,
    castleLevel: 2,
    wallLevel: 3,
    towerLevel: 2,
    equippedAstraId: "varuna-astra",
    activeSkinId: "skin-tejas",
    activeBackgroundId: "bg-midnight",
    trophies: 215,
    battleWins: 12,
    battleLosses: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-bhaskar",
    studentId: "77002fb6-1def-4296-9690-f0c36995e247",
    studentName: "Bhaskar Dwivedi",
    studentEmail: "bhaskardwivedi25@yahoo.com",
    batch: "Beta Cohort 2026",
    department: "Robotics & Automation",
    house: "vayu",
    winStreak: 2,
    castleLevel: 2,
    wallLevel: 2,
    towerLevel: 2,
    equippedAstraId: "agni-astra",
    activeSkinId: "skin-obsidian",
    activeBackgroundId: "bg-astral",
    trophies: 180,
    battleWins: 9,
    battleLosses: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-harshita",
    studentId: "897d63ab-70cf-405a-a629-ca4120eafb60",
    studentName: "Harshita Phophalia",
    studentEmail: "harshitaphophalia97@gmail.com",
    batch: "Alpha Cohort 2026",
    department: "Software Engineering",
    house: "agni",
    winStreak: 2,
    castleLevel: 2,
    wallLevel: 1,
    towerLevel: 2,
    equippedAstraId: "varuna-astra",
    activeSkinId: "skin-surya",
    activeBackgroundId: "bg-himalayan",
    trophies: 155,
    battleWins: 7,
    battleLosses: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "rival-satish",
    studentId: "3039eb20-088b-401f-bb5c-29761deb57b5",
    studentName: "Satish Gaur",
    studentEmail: "satishgaur.hp@gmail.com",
    batch: "Batch A - 2026",
    department: "Information Technology",
    house: "surya",
    winStreak: 1,
    castleLevel: 1,
    wallLevel: 2,
    towerLevel: 1,
    equippedAstraId: null,
    activeSkinId: "skin-tejas",
    activeBackgroundId: "bg-midnight",
    trophies: 110,
    battleWins: 3,
    battleLosses: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getAllKingdoms(): StudentKingdom[] {
  try {
    const raw = localStorage.getItem(ALL_KINGDOMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If parsed contains legacy demo names like Acharya Drona, upgrade to real database cohort
      const hasLegacyDemo = Array.isArray(parsed) && parsed.some((k: any) => k.studentName === "Acharya Drona" || k.studentName === "Arjuna of Gandiva");
      if (Array.isArray(parsed) && parsed.length > 0 && !hasLegacyDemo) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading all kingdoms:", e);
  }
  localStorage.setItem(ALL_KINGDOMS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RIVALS));
  return INITIAL_DEMO_RIVALS;
}

export async function syncRealKingdomsFromDatabase(): Promise<StudentKingdom[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, department')
      .order('created_at', { ascending: false });

    if (!error && users && users.length > 0) {
      const currentList = getAllKingdoms();
      const currentMap = new Map(currentList.map(k => [k.studentId, k]));

      const houses: ('surya' | 'chandra' | 'vayu' | 'agni')[] = ['surya', 'chandra', 'vayu', 'agni'];
      const batches = ['Batch A - 2026', 'Alpha Cohort 2026', 'Beta Cohort 2026'];
      const astras: (BattleAstraId | null)[] = ['vajra-astra', 'varuna-astra', 'agni-astra', null];

      const merged: StudentKingdom[] = users.map((u, i) => {
        const existing = currentMap.get(u.id);
        if (existing) {
          return {
            ...existing,
            studentName: u.full_name || existing.studentName,
            studentEmail: u.email || existing.studentEmail,
            department: u.department || existing.department || 'Computer Science & Engineering',
            house: existing.house || houses[i % 4]
          };
        }

        const house = houses[i % 4];
        const batch = batches[i % 3];
        const astra = astras[i % 4];
        const wins = Math.max(2, 45 - (i * 3));
        const losses = Math.max(1, Math.floor(wins / 4));
        const trophies = wins * 15 + 40;
        const totalLvl = Math.min(15, Math.max(3, Math.floor(wins / 3)));
        const castleLevel = Math.min(5, Math.max(1, Math.ceil(totalLvl / 3)));
        const wallLevel = Math.min(5, Math.max(1, Math.floor(totalLvl / 3)));
        const towerLevel = Math.min(5, Math.max(1, totalLvl - castleLevel - wallLevel));

        return {
          id: `kingdom-${u.id}`,
          studentId: u.id,
          studentName: u.full_name || (u.email ? u.email.split('@')[0] : `Scholar ${i + 1}`),
          studentEmail: u.email,
          batch,
          department: u.department || (i % 2 === 0 ? 'AI and Machine Learning' : 'Computer Science & Engineering'),
          house,
          winStreak: Math.max(1, wins % 6),
          castleLevel,
          wallLevel,
          towerLevel,
          equippedAstraId: astra,
          activeSkinId: i % 2 === 0 ? 'skin-chandra' : 'skin-tejas',
          activeBackgroundId: i % 2 === 0 ? 'bg-astral' : 'bg-midnight',
          trophies,
          battleWins: wins,
          battleLosses: losses,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      // Ensure logged in student / current kingdom is preserved
      const myKingdom = getStudentKingdom();
      const myIdx = merged.findIndex(k => k.studentId === myKingdom.studentId);
      if (myIdx >= 0) {
        merged[myIdx] = { ...merged[myIdx], ...myKingdom };
      } else {
        merged.unshift(myKingdom);
      }

      merged.sort((a, b) => b.trophies - a.trophies);
      localStorage.setItem(ALL_KINGDOMS_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("astravyuh_directory_updated", { detail: merged }));
      return merged;
    }
  } catch (e) {
    console.error("Error syncing kingdoms with database users:", e);
  }
  return getAllKingdoms();
}

export function updateKingdomInDirectory(kingdom: StudentKingdom): void {
  try {
    const all = getAllKingdoms();
    const index = all.findIndex(k => k.studentId === kingdom.studentId);
    let nextList: StudentKingdom[];
    if (index >= 0) {
      nextList = [...all];
      nextList[index] = kingdom;
    } else {
      nextList = [kingdom, ...all];
    }
    localStorage.setItem(ALL_KINGDOMS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error("Error updating directory:", e);
  }
}

export function getEligibleOpponents(): StudentKingdom[] {
  const current = getStudentKingdom();
  const all = getAllKingdoms();
  const myStrength = current.castleLevel * 2 + current.towerLevel * 2 + current.wallLevel * 2;
  const rivals = all.filter(k => k.studentId !== current.studentId);

  return rivals.sort((a, b) => {
    const strA = a.castleLevel * 2 + a.towerLevel * 2 + a.wallLevel * 2;
    const strB = b.castleLevel * 2 + b.towerLevel * 2 + b.wallLevel * 2;
    return Math.abs(strA - myStrength) - Math.abs(strB - myStrength);
  });
}

// ─── 17. SKINS, BACKGROUNDS & RANKS ────────────────────────────────────────────
export const KINGDOM_SKINS: KingdomSkin[] = [
  {
    id: "skin-tejas",
    name: "Imperial Tejas Citadel",
    description: "Classic Vedic stone architecture with golden spires and sun banners.",
    cost: 0,
    unlockedByDefault: true,
    previewColor: "#f59e0b",
    bannerGradient: "from-amber-500 to-orange-600"
  },
  {
    id: "skin-surya",
    name: "Surya Golden Citadel",
    description: "Radiant solar-forged bastions bathed in perpetual dawn-light.",
    cost: 300,
    previewColor: "#fbbf24",
    bannerGradient: "from-yellow-400 to-amber-600"
  },
  {
    id: "skin-chandra",
    name: "Chandra Moonstone Palace",
    description: "Luminous white-marble walls etched with celestial soma glyphs.",
    cost: 300,
    previewColor: "#67e8f9",
    bannerGradient: "from-cyan-400 to-blue-600"
  },
  {
    id: "skin-obsidian",
    name: "Midnight Obsidian Bastion",
    description: "Black-volcanic stone with crackling purple lightning conduits.",
    cost: 450,
    previewColor: "#a855f7",
    bannerGradient: "from-purple-600 to-indigo-900"
  }
];

export const KINGDOM_BACKGROUNDS: KingdomBackground[] = [
  {
    id: "bg-midnight",
    name: "Midnight Obsidian",
    description: "Deep starlit void with subtle cosmic nebula dust.",
    cost: 0,
    unlockedByDefault: true,
    bgClass: "from-[#080C16] via-[#0B0F19] to-[#05070D]",
    previewColor: "#0B0F19"
  },
  {
    id: "bg-astral",
    name: "Astral Nebula",
    description: "Vibrant indigo and violet celestial aurora.",
    cost: 200,
    bgClass: "from-[#110E28] via-[#1E1B4B] to-[#0A071E]",
    previewColor: "#1E1B4B"
  },
  {
    id: "bg-himalayan",
    name: "Sacred Himalayan Peak",
    description: "Mystic snow-capped fortresses under holy moonlight.",
    cost: 250,
    bgClass: "from-[#0A192F] via-[#0F2942] to-[#040D1A]",
    previewColor: "#0F2942"
  },
  {
    id: "bg-mandala",
    name: "Vedic Cosmic Mandala",
    description: "Golden sacred geometry pulsing with divine mantras.",
    cost: 350,
    bgClass: "from-[#1C1206] via-[#2D1B08] to-[#0F0A03]",
    previewColor: "#2D1B08"
  }
];

export const COSMETIC_RANKS: CosmeticRank[] = [
  {
    id: "rank-vedic-knight",
    title: "Vedic Knight",
    badge: "🛡️",
    cost: 150,
    minTrophies: 100,
    description: "Initiate defender of the ancient kingdom ramparts."
  },
  {
    id: "rank-astra-adept",
    title: "Astra Adept",
    badge: "⚔️",
    cost: 300,
    minTrophies: 300,
    description: "Proficient wielder of elemental mantras and quiz combat."
  },
  {
    id: "rank-celestial-commander",
    title: "Celestial Commander",
    badge: "👑",
    cost: 500,
    minTrophies: 600,
    description: "Distinguished battle tactician commanding fortified spires."
  },
  {
    id: "rank-maharathi",
    title: "Maharathi Sovereign",
    badge: "🔱",
    cost: 1000,
    minTrophies: 1000,
    description: "Supreme ruler whose knowledge strikes with the force of ten thousand warriors."
  }
];

export function getOwnedSkins(): string[] {
  try {
    const raw = localStorage.getItem(OWNED_SKINS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return ["skin-tejas"];
}

export function purchaseKingdomSkin(skinId: string): { success: boolean; message: string; remainingFlix: number } {
  const skin = KINGDOM_SKINS.find(s => s.id === skinId);
  if (!skin) return { success: false, message: "Skin not found", remainingFlix: getFluxBalance() };

  const owned = getOwnedSkins();
  if (owned.includes(skinId)) {
    return { success: false, message: "Skin already owned!", remainingFlix: getFluxBalance() };
  }

  const currentFlix = getFluxBalance();
  if (currentFlix < skin.cost) {
    return { success: false, message: `Insufficient Flix! Need ⚡ ${skin.cost - currentFlix} more.`, remainingFlix: currentFlix };
  }

  const nextFlix = currentFlix - skin.cost;
  setFluxBalance(nextFlix);

  const updatedOwned = [...owned, skinId];
  localStorage.setItem(OWNED_SKINS_KEY, JSON.stringify(updatedOwned));

  const kingdom = getStudentKingdom();
  saveStudentKingdom({ ...kingdom, activeSkinId: skinId });

  logFlixTransaction({
    userId: kingdom.studentId,
    type: "purchase_skin",
    amount: -skin.cost,
    balanceBefore: currentFlix,
    balanceAfter: nextFlix,
    details: `Purchased skin: ${skin.name}`
  });

  return { success: true, message: `🎉 Acquired and applied "${skin.name}"!`, remainingFlix: nextFlix };
}

export function getOwnedBackgrounds(): string[] {
  try {
    const raw = localStorage.getItem(OWNED_BACKGROUNDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return ["bg-midnight"];
}

export function purchaseKingdomBackground(bgId: string): { success: boolean; message: string; remainingFlix: number } {
  const bg = KINGDOM_BACKGROUNDS.find(b => b.id === bgId);
  if (!bg) return { success: false, message: "Background not found", remainingFlix: getFluxBalance() };

  const owned = getOwnedBackgrounds();
  if (owned.includes(bgId)) {
    return { success: false, message: "Background already owned!", remainingFlix: getFluxBalance() };
  }

  const currentFlix = getFluxBalance();
  if (currentFlix < bg.cost) {
    return { success: false, message: `Insufficient Flix! Need ⚡ ${bg.cost - currentFlix} more.`, remainingFlix: currentFlix };
  }

  const nextFlix = currentFlix - bg.cost;
  setFluxBalance(nextFlix);

  const updatedOwned = [...owned, bgId];
  localStorage.setItem(OWNED_BACKGROUNDS_KEY, JSON.stringify(updatedOwned));

  const kingdom = getStudentKingdom();
  saveStudentKingdom({ ...kingdom, activeBackgroundId: bgId });

  logFlixTransaction({
    userId: kingdom.studentId,
    type: "purchase_background",
    amount: -bg.cost,
    balanceBefore: currentFlix,
    balanceAfter: nextFlix,
    details: `Purchased background realm: ${bg.name}`
  });

  return { success: true, message: `🌌 Acquired and applied "${bg.name}"!`, remainingFlix: nextFlix };
}

export function getOwnedRanks(): string[] {
  try {
    const raw = localStorage.getItem(OWNED_RANKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return ["rank-vedic-knight"];
}

export function purchaseCosmeticRank(rankId: string): { success: boolean; message: string; remainingFlix: number } {
  const rank = COSMETIC_RANKS.find(r => r.id === rankId);
  if (!rank) return { success: false, message: "Rank not found", remainingFlix: getFluxBalance() };

  const kingdom = getStudentKingdom();
  if (rank.minTrophies && kingdom.trophies < rank.minTrophies) {
    return {
      success: false,
      message: `Trophy Requirement Not Met: You need at least 🏆 ${rank.minTrophies} trophies to unlock this rank!`,
      remainingFlix: getFluxBalance()
    };
  }

  const owned = getOwnedRanks();
  if (owned.includes(rankId)) {
    return { success: false, message: "Rank already owned!", remainingFlix: getFluxBalance() };
  }

  const currentFlix = getFluxBalance();
  if (currentFlix < rank.cost) {
    return { success: false, message: `Insufficient Flix! Need ⚡ ${rank.cost - currentFlix} more.`, remainingFlix: currentFlix };
  }

  const nextFlix = currentFlix - rank.cost;
  setFluxBalance(nextFlix);

  const updatedOwned = [...owned, rankId];
  localStorage.setItem(OWNED_RANKS_KEY, JSON.stringify(updatedOwned));

  logFlixTransaction({
    userId: kingdom.studentId,
    type: "purchase_rank",
    amount: -rank.cost,
    balanceBefore: currentFlix,
    balanceAfter: nextFlix,
    details: `Purchased cosmetic rank: ${rank.title}`
  });

  return { success: true, message: `👑 Bestowed title of "${rank.title}"!`, remainingFlix: nextFlix };
}
