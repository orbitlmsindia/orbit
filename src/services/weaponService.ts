import { AstraWeapon, WEAPONS_CATALOG } from "@/types/weapon";
import { getFluxBalance, setFluxBalance } from "@/services/themeService";

const OWNED_WEAPONS_KEY = "orbit_owned_weapons";
const EQUIPPED_WEAPON_KEY = "orbit_equipped_weapon";

// Default starter weapon unlocked for all learners upon joining
const DEFAULT_STARTER_WEAPON_ID = "nano-bana-vajra-seeker";

/**
 * Get all owned weapon IDs for the current student
 */
export function getOwnedWeapons(): string[] {
  try {
    const stored = localStorage.getItem(OWNED_WEAPONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading owned weapons:", e);
  }

  // Initial starter set includes the Nano-Bana Seeker
  const initial = [DEFAULT_STARTER_WEAPON_ID];
  localStorage.setItem(OWNED_WEAPONS_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Check if a weapon is owned
 */
export function isWeaponOwned(weaponId: string): boolean {
  return getOwnedWeapons().includes(weaponId);
}

/**
 * Get the currently equipped weapon ID for current user
 */
export function getEquippedWeaponId(userId?: string): string {
  try {
    if (userId) {
      const studentWeapon = localStorage.getItem(`orbit_student_weapon_${userId}`);
      if (studentWeapon) return studentWeapon;
    }

    const equipped = localStorage.getItem(EQUIPPED_WEAPON_KEY);
    if (equipped && WEAPONS_CATALOG.some(w => w.id === equipped)) {
      return equipped;
    }
  } catch (e) {
    console.error("Error reading equipped weapon:", e);
  }

  return DEFAULT_STARTER_WEAPON_ID;
}

/**
 * Get the full AstraWeapon object currently equipped
 */
export function getEquippedWeapon(userId?: string): AstraWeapon {
  const id = getEquippedWeaponId(userId);
  const found = WEAPONS_CATALOG.find(w => w.id === id);
  return found || WEAPONS_CATALOG[0];
}

/**
 * Equip an owned weapon
 */
export function equipWeapon(weaponId: string, userId?: string): { success: boolean; message: string; weapon?: AstraWeapon } {
  const weapon = WEAPONS_CATALOG.find(w => w.id === weaponId);
  if (!weapon) {
    return { success: false, message: "Astra or Weapon not found in the ancient archives." };
  }

  if (!isWeaponOwned(weaponId)) {
    return { success: false, message: `You have not yet acquired "${weapon.name}". Unlock it with Orbit Flux first!` };
  }

  try {
    localStorage.setItem(EQUIPPED_WEAPON_KEY, weaponId);
    if (userId) {
      localStorage.setItem(`orbit_student_weapon_${userId}`, weaponId);
    }

    window.dispatchEvent(new CustomEvent("orbit_weapon_equipped", { detail: weapon }));
    return {
      success: true,
      message: `Equipped "${weapon.name}" (${weapon.sanskritName})! Passive Aura buff activated.`,
      weapon
    };
  } catch (e: any) {
    return { success: false, message: e.message || "Failed to equip weapon." };
  }
}

/**
 * Unequip active weapon
 */
export function unequipWeapon(userId?: string): void {
  localStorage.removeItem(EQUIPPED_WEAPON_KEY);
  if (userId) {
    localStorage.removeItem(`orbit_student_weapon_${userId}`);
  }
  window.dispatchEvent(new CustomEvent("orbit_weapon_equipped", { detail: null }));
}

/**
 * Purchase a weapon with Orbit Flux
 */
export function purchaseWeapon(weaponId: string, userId?: string): {
  success: boolean;
  message: string;
  remainingFlux: number;
  weapon?: AstraWeapon;
} {
  const weapon = WEAPONS_CATALOG.find(w => w.id === weaponId);
  const currentFlux = getFluxBalance();

  if (!weapon) {
    return { success: false, message: "Weapon not found in celestial armory.", remainingFlux: currentFlux };
  }

  if (isWeaponOwned(weaponId)) {
    return { success: false, message: `You already wield "${weapon.name}"!`, remainingFlux: currentFlux, weapon };
  }

  if (currentFlux < weapon.cost) {
    const deficit = weapon.cost - currentFlux;
    return {
      success: false,
      message: `Insufficient Orbit Flux! You need ⚡ ${deficit} more Flux to unlock "${weapon.name}". Claim your daily reward or complete study modules to earn more!`,
      remainingFlux: currentFlux,
      weapon
    };
  }

  // Deduct Flux
  const nextFlux = currentFlux - weapon.cost;
  setFluxBalance(nextFlux);

  // Add to owned weapons
  const owned = getOwnedWeapons();
  const updatedOwned = [...owned, weaponId];
  localStorage.setItem(OWNED_WEAPONS_KEY, JSON.stringify(updatedOwned));

  // Automatically equip newly unlocked weapon
  localStorage.setItem(EQUIPPED_WEAPON_KEY, weaponId);
  if (userId) {
    localStorage.setItem(`orbit_student_weapon_${userId}`, weaponId);
  }

  window.dispatchEvent(new CustomEvent("orbit_weapon_purchased", { detail: weapon }));
  window.dispatchEvent(new CustomEvent("orbit_weapon_equipped", { detail: weapon }));

  return {
    success: true,
    message: `🎉 Blessed by the Celestials! Unlocked and wielded "${weapon.name}" (${weapon.sanskritName}) for ⚡ ${weapon.cost} Flux.`,
    remainingFlux: nextFlux,
    weapon
  };
}

/**
 * Resolves a student's equipped weapon (either custom equipped or rank-based signature)
 * for Public Profiles and Leaderboards
 */
export function getStudentEquippedWeapon(studentId: string, rank?: number, auraPoints?: number): AstraWeapon {
  try {
    // 1. Check if the student explicitly equipped a weapon in storage
    const custom = localStorage.getItem(`orbit_student_weapon_${studentId}`);
    if (custom) {
      const match = WEAPONS_CATALOG.find(w => w.id === custom);
      if (match) return match;
    }
  } catch (e) {
    // fallback
  }

  // 2. Rank-based Signature Astras for prominent champions on the leaderboard
  if (rank === 1) return WEAPONS_CATALOG.find(w => w.id === "sudarshana-chakra") || WEAPONS_CATALOG[0];
  if (rank === 2) return WEAPONS_CATALOG.find(w => w.id === "pashupatastra") || WEAPONS_CATALOG[1];
  if (rank === 3) return WEAPONS_CATALOG.find(w => w.id === "brahmashira-astra") || WEAPONS_CATALOG[2];
  if (rank === 4) return WEAPONS_CATALOG.find(w => w.id === "gandiva-bow") || WEAPONS_CATALOG[3];
  if (rank === 5) return WEAPONS_CATALOG.find(w => w.id === "vijaya-bow") || WEAPONS_CATALOG[4];
  if (rank === 6) return WEAPONS_CATALOG.find(w => w.id === "vajra-of-indra") || WEAPONS_CATALOG[5];
  if (rank === 7) return WEAPONS_CATALOG.find(w => w.id === "tejas-nano-cannon") || WEAPONS_CATALOG[6];
  if (rank === 8) return WEAPONS_CATALOG.find(w => w.id === "nano-bana-akshaya") || WEAPONS_CATALOG[7];
  if (rank === 9) return WEAPONS_CATALOG.find(w => w.id === "surya-ray-railgun") || WEAPONS_CATALOG[8];
  if (rank === 10) return WEAPONS_CATALOG.find(w => w.id === "narayanastra") || WEAPONS_CATALOG[9];

  // 3. For other students, deterministically map by studentId hash so each has a unique, consistent Astra
  let hash = 0;
  for (let i = 0; i < studentId.length; i++) {
    hash = (hash * 31 + studentId.charCodeAt(i)) % WEAPONS_CATALOG.length;
  }
  return WEAPONS_CATALOG[Math.abs(hash)];
}
