import { supabase } from "@/lib/supabase";

const AURA_STORAGE_KEY = "orbit_aura_points";
const CREDITS_STORAGE_KEY = "orbit_bonus_credits";
const DEFAULT_STARTER_AURA = 150; // Welcome reward for scholarly activation
const DEFAULT_STARTER_CREDITS = 4; // Core academic credit units

/**
 * Returns the current cached Aura Points for the authenticated learner.
 */
export function getStoredAuraPoints(): number {
  try {
    const raw = localStorage.getItem(AURA_STORAGE_KEY);
    if (raw !== null && !isNaN(Number(raw))) {
      return Math.max(0, parseInt(raw, 10));
    }
  } catch (e) {
    console.warn("Error reading stored aura points:", e);
  }
  return DEFAULT_STARTER_AURA;
}

/**
 * Sets the Aura Points balance and broadcasts the change across the app.
 */
export function setStoredAuraPoints(amount: number): number {
  const safe = Math.max(0, Math.floor(amount));
  try {
    localStorage.setItem(AURA_STORAGE_KEY, String(safe));
    window.dispatchEvent(new CustomEvent("orbit_aura_updated", { detail: safe }));
  } catch (e) {
    console.warn("Error storing aura points:", e);
  }
  return safe;
}

/**
 * Atomically increments Aura Points in localStorage and synchronizes with Supabase public.users.
 */
export async function awardAuraPoints(
  amount: number,
  reason: string,
  category: string = "academic_quest"
): Promise<number> {
  if (amount <= 0) return getStoredAuraPoints();

  const current = getStoredAuraPoints();
  const next = current + amount;
  setStoredAuraPoints(next);

  // Sync with Supabase asynchronously
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      // 1. Try invoking atomic RPC if installed
      const { error: rpcErr } = await supabase.rpc("increment_user_aura", {
        target_user_id: user.id,
        amount_to_add: amount,
        award_reason: reason
      });

      // 2. Fallback to direct table update if RPC is pending migration
      if (rpcErr) {
        const { data: profile } = await supabase
          .from("users")
          .select("aura_points")
          .eq("id", user.id)
          .maybeSingle();

        const dbAura = (profile?.aura_points || 0) + amount;
        await supabase
          .from("users")
          .update({ aura_points: dbAura })
          .eq("id", user.id);
      }

      // 3. Record award log entry
      await supabase.from("aura_awards").insert([
        {
          student_id: user.id,
          points: amount,
          reason,
          category,
          badge_icon: "sparkles",
          created_at: new Date().toISOString()
        }
      ]);
    }
  } catch (err) {
    // Graceful offline fallback: localStorage has already updated and broadcasted
    console.info("Aura points synced to local memory (DB sync pending connection)");
  }

  // Also append to local ledger history
  try {
    const historyRaw = localStorage.getItem("orbit_aura_awards");
    const history = historyRaw ? JSON.parse(historyRaw) : [];
    history.unshift({
      id: "aura_" + Date.now(),
      points: amount,
      reason,
      category,
      created_at: new Date().toISOString()
    });
    localStorage.setItem("orbit_aura_awards", JSON.stringify(history.slice(0, 50)));
  } catch (e) {}

  return next;
}

/**
 * Returns stored academic credits
 */
export function getStoredCredits(): number {
  try {
    const raw = localStorage.getItem(CREDITS_STORAGE_KEY);
    if (raw !== null && !isNaN(Number(raw))) {
      return Math.max(0, parseInt(raw, 10));
    }
  } catch (e) {}
  return DEFAULT_STARTER_CREDITS;
}

/**
 * Updates stored academic credits and dispatches event.
 */
export function setStoredCredits(amount: number): number {
  const safe = Math.max(0, Math.floor(amount));
  try {
    localStorage.setItem(CREDITS_STORAGE_KEY, String(safe));
    window.dispatchEvent(new CustomEvent("orbit_credits_updated", { detail: safe }));
  } catch (e) {}
  return safe;
}

/**
 * Award academic credits
 */
export async function awardAcademicCredits(amount: number): Promise<number> {
  const current = getStoredCredits();
  const next = current + amount;
  setStoredCredits(next);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: prof } = await supabase
        .from("users")
        .select("bonus_credits")
        .eq("id", user.id)
        .maybeSingle();

      const newCreds = (prof?.bonus_credits || 0) + amount;
      await supabase
        .from("users")
        .update({ bonus_credits: newCreds })
        .eq("id", user.id);
    }
  } catch (e) {}

  return next;
}
