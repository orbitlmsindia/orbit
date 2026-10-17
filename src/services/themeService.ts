import { ThemeId, THEMES_CATALOG } from "@/types/theme";

const FLUX_STORAGE_KEY = "orbit_flux_balance";
const FLUX_LAST_CLAIM_KEY = "orbit_flux_last_claim";
const UNLOCKED_THEMES_KEY = "orbit_unlocked_themes";
const DEFAULT_FLUX_GRANT = 750; // Starter grant for learners
export const DAILY_FLUX_REWARD = 10; // Strictly 10 Orbit Flux per day

// Check if user has already claimed their daily Orbit Flux today
export function hasClaimedFluxToday(): boolean {
  try {
    const lastClaim = localStorage.getItem(FLUX_LAST_CLAIM_KEY);
    if (!lastClaim) return false;
    const lastDate = new Date(lastClaim);
    const today = new Date();
    return (
      lastDate.getFullYear() === today.getFullYear() &&
      lastDate.getMonth() === today.getMonth() &&
      lastDate.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

export function canClaimDailyFlux(): boolean {
  return !hasClaimedFluxToday();
}

// Check if user has Master Admin or Admin VIP privileges
export function isUserAdminOrMaster(role?: string | null): boolean {
  if (!role) {
    const sessionRole = sessionStorage.getItem("userRole") || "";
    const isMasterStaff = sessionStorage.getItem("isMasterStaff") === "true";
    return (
      isMasterStaff ||
      sessionRole === "admin" ||
      sessionRole === "super_admin" ||
      sessionRole === "master_admin" ||
      sessionRole === "master_staff"
    );
  }
  const clean = role.toLowerCase();
  return (
    clean === "admin" ||
    clean === "super_admin" ||
    clean === "master_admin" ||
    clean === "master_staff"
  );
}

// 1. Get Current Orbit Flux Balance
export function getFluxBalance(): number {
  try {
    const stored = localStorage.getItem(FLUX_STORAGE_KEY);
    if (stored !== null) {
      return Number(stored);
    }
    // Set initial starter balance
    localStorage.setItem(FLUX_STORAGE_KEY, String(DEFAULT_FLUX_GRANT));
    return DEFAULT_FLUX_GRANT;
  } catch {
    return DEFAULT_FLUX_GRANT;
  }
}

// 2. Set Flux Balance & Broadcast
export function setFluxBalance(amount: number): void {
  try {
    localStorage.setItem(FLUX_STORAGE_KEY, String(Math.max(0, amount)));
    window.dispatchEvent(new CustomEvent("orbit_flux_updated", { detail: amount }));
  } catch (e) {
    console.error("Error saving flux balance:", e);
  }
}

// 3. Claim Free Daily / Reward Flux (Strictly 10 Flux once per day)
export function claimDailyFlux(amount: number = DAILY_FLUX_REWARD): {
  success: boolean;
  newBalance: number;
  message: string;
} {
  if (hasClaimedFluxToday()) {
    return {
      success: false,
      newBalance: getFluxBalance(),
      message: "Daily Orbit Flux already claimed for today. Resets at midnight (max 10 ⚡ daily)!",
    };
  }

  // Enforce strictly 10 Flux maximum reward per day
  const grantAmount = Math.min(amount, DAILY_FLUX_REWARD);
  const current = getFluxBalance();
  const next = current + grantAmount;

  setFluxBalance(next);
  localStorage.setItem(FLUX_LAST_CLAIM_KEY, new Date().toISOString());

  return {
    success: true,
    newBalance: next,
    message: `Successfully claimed +${grantAmount} Daily Orbit Flux!`,
  };
}

// 4. Get Unlocked Theme IDs for user
export function getUnlockedThemeIds(userRole?: string | null): ThemeId[] {
  // Master Admin & College Admin have ALL themes unlocked for free!
  if (isUserAdminOrMaster(userRole)) {
    return THEMES_CATALOG.map((t) => t.id);
  }

  try {
    const stored = localStorage.getItem(UNLOCKED_THEMES_KEY);
    if (stored) {
      const parsed: ThemeId[] = JSON.parse(stored);
      // Guarantee default free themes are always unlocked
      const alwaysFree: ThemeId[] = ["light", "dark"];
      return Array.from(new Set([...alwaysFree, ...parsed]));
    }
  } catch (e) {
    console.error("Error loading unlocked themes:", e);
  }

  const defaultFree: ThemeId[] = ["light", "dark"];
  localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(defaultFree));
  return defaultFree;
}

// 5. Purchase / Unlock Theme with Orbit Flux
export function purchaseTheme(
  themeId: ThemeId,
  userRole?: string | null
): { success: boolean; message: string; remainingFlux: number } {
  const theme = THEMES_CATALOG.find((t) => t.id === themeId);
  if (!theme) {
    return { success: false, message: "Theme not found in catalog.", remainingFlux: getFluxBalance() };
  }

  // Master Admin & Admin VIP Bypass: Free automatic unlock
  if (isUserAdminOrMaster(userRole)) {
    return {
      success: true,
      message: `✨ VIP Enterprise Privilege: "${theme.name}" is instantly unlocked for your administrator account!`,
      remainingFlux: getFluxBalance(),
    };
  }

  const unlocked = getUnlockedThemeIds(userRole);
  if (unlocked.includes(themeId)) {
    return {
      success: true,
      message: `"${theme.name}" is already unlocked and ready to equip!`,
      remainingFlux: getFluxBalance(),
    };
  }

  const balance = getFluxBalance();
  if (balance < theme.cost) {
    return {
      success: false,
      message: `Insufficient Orbit Flux (⚡). Need ⚡ ${theme.cost - balance} more Flux to unlock "${theme.name}".`,
      remainingFlux: balance,
    };
  }

  // Deduct Flux
  const newBalance = balance - theme.cost;
  setFluxBalance(newBalance);

  // Add to unlocked themes list
  const nextUnlocked = [...unlocked, themeId];
  localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(nextUnlocked));
  window.dispatchEvent(new CustomEvent("orbit_themes_updated", { detail: nextUnlocked }));

  return {
    success: true,
    message: `🎉 Success! Unlocked "${theme.name}" for ⚡ ${theme.cost} Flux.`,
    remainingFlux: newBalance,
  };
}

// 6. Public Profile Theme & Purchasing Intelligence for any Student
export interface StudentProfileThemeData {
  studentId: string;
  fluxBalance: number;
  equippedTheme: ThemeCatalogItem;
  unlockedThemes: ThemeCatalogItem[];
  affordableThemes: ThemeCatalogItem[];
  upcomingThemes: { theme: ThemeCatalogItem; fluxNeeded: number }[];
  isSelf: boolean;
}

export function getStudentProfileThemeData(
  studentId: string,
  currentUserId?: string | null,
  auraPoints: number = 0,
  credits: number = 0,
  currentRole?: string | null
): StudentProfileThemeData {
  const isSelf = Boolean(currentUserId && studentId === currentUserId);

  let fluxBalance = 0;
  let equippedThemeId: ThemeId = "dark";
  let unlockedIds: ThemeId[] = ["light", "dark"];

  if (isSelf) {
    fluxBalance = getFluxBalance();
    equippedThemeId = (localStorage.getItem("vite-ui-theme") as ThemeId) || "dark";
    unlockedIds = getUnlockedThemeIds(currentRole);
  } else {
    // For other students, check if a custom flux has been cached, or calculate from their academic achievements
    const cachedFlux = localStorage.getItem(`orbit_student_flux_${studentId}`);
    if (cachedFlux !== null) {
      fluxBalance = Number(cachedFlux);
    } else {
      // Base starter grant (750) + achievement bonus from Aura & Credits
      fluxBalance = 750 + Math.floor(auraPoints * 1.5) + (credits * 25);
    }

    // Determine signature equipped theme from cache or derived from their prowess
    const cachedTheme = localStorage.getItem(`orbit_student_theme_${studentId}`) as ThemeId | null;
    if (cachedTheme && THEMES_CATALOG.some((t) => t.id === cachedTheme)) {
      equippedThemeId = cachedTheme;
    } else {
      if (auraPoints >= 200) equippedThemeId = "cosmic-aurora";
      else if (auraPoints >= 150) equippedThemeId = "doomsday";
      else if (auraPoints >= 100) equippedThemeId = "sapphire";
      else if (auraPoints >= 50) equippedThemeId = "cyberpunk";
      else equippedThemeId = "dark";
    }

    // Calculate unlocked list for this student
    const autoUnlocked: ThemeId[] = ["light", "dark", equippedThemeId];
    THEMES_CATALOG.forEach((t) => {
      if (t.cost > 0 && t.cost <= fluxBalance && !autoUnlocked.includes(t.id)) {
        // Unlock if their flux naturally exceeded this cost
        if (t.cost <= Math.floor(fluxBalance * 0.6)) {
          autoUnlocked.push(t.id);
        }
      }
    });
    unlockedIds = Array.from(new Set(autoUnlocked));
  }

  const equippedTheme =
    THEMES_CATALOG.find((t) => t.id === equippedThemeId) ||
    THEMES_CATALOG.find((t) => t.id === "dark")!;

  const unlockedThemes = THEMES_CATALOG.filter((t) => unlockedIds.includes(t.id));

  // Themes the student does NOT own yet, but HAS ENOUGH FLUX TO PURCHASE
  const affordableThemes = THEMES_CATALOG.filter(
    (t) => !unlockedIds.includes(t.id) && t.cost > 0 && t.cost <= fluxBalance
  );

  // Locked themes requiring more Flux
  const upcomingThemes = THEMES_CATALOG.filter(
    (t) => !unlockedIds.includes(t.id) && t.cost > fluxBalance
  ).map((theme) => ({
    theme,
    fluxNeeded: theme.cost - fluxBalance,
  }));

  return {
    studentId,
    fluxBalance,
    equippedTheme,
    unlockedThemes,
    affordableThemes,
    upcomingThemes,
    isSelf,
  };
}
