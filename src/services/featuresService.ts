import { supabase } from "@/lib/supabase";
import {
  PlatformFeature,
  SubscriptionPlan,
  PLATFORM_FEATURES,
  DEFAULT_PLANS,
} from "@/types/plans";

const FEATURES_STORAGE_KEY = "orbit_master_features_registry";
const PLANS_STORAGE_KEY = "orbit_master_subscription_plans";

// Event names for reactive synchronization
export const ORBIT_EVENTS = {
  FEATURES_UPDATED: "orbit_features_updated",
  PLANS_UPDATED: "orbit_plans_updated",
  COLLEGE_UPDATED: "orbit_college_features_updated",
} as const;

/**
 * Dispatch reactive events across window and tabs
 */
function broadcastUpdate(eventName: string, detail?: any) {
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // ignore server-side / SSR edge case
  }
}

// ============================================================================
// FEATURE REGISTRY OPERATIONS (EDITABLE FEATURES & CUSTOM FEATURES)
// ============================================================================

/**
 * Retrieve all platform features (built-in + user-created / edited custom features).
 */
export function getRegisteredFeatures(): PlatformFeature[] {
  try {
    const raw = localStorage.getItem(FEATURES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(PLATFORM_FEATURES));
      return PLATFORM_FEATURES;
    }

    const saved: PlatformFeature[] = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) {
      localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(PLATFORM_FEATURES));
      return PLATFORM_FEATURES;
    }

    // Merge: ensure any new built-in features that were added to code are present
    const savedMap = new Map(saved.map((f) => [f.id, f]));
    PLATFORM_FEATURES.forEach((defaultFeat) => {
      if (!savedMap.has(defaultFeat.id)) {
        savedMap.set(defaultFeat.id, defaultFeat);
      }
    });

    return Array.from(savedMap.values());
  } catch (err) {
    console.warn("Could not load features from storage, using defaults:", err);
    return PLATFORM_FEATURES;
  }
}

/**
 * Save or update a feature in the platform registry.
 * This satisfies: "each feature should be editable and all".
 */
export function savePlatformFeature(feature: PlatformFeature): PlatformFeature[] {
  const features = getRegisteredFeatures();
  const existingIndex = features.findIndex((f) => f.id === feature.id);

  let updatedList: PlatformFeature[];
  const timestamp = new Date().toISOString();

  if (existingIndex >= 0) {
    // Update existing feature
    updatedList = [...features];
    updatedList[existingIndex] = {
      ...features[existingIndex],
      ...feature,
      updatedAt: timestamp,
    };
  } else {
    // Insert new custom feature
    const newFeature: PlatformFeature = {
      ...feature,
      isCustom: true,
      status: feature.status || "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    updatedList = [...features, newFeature];
  }

  localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updatedList));
  broadcastUpdate(ORBIT_EVENTS.FEATURES_UPDATED, { features: updatedList, updatedFeature: feature });

  return updatedList;
}

/**
 * Delete a custom platform feature from the registry.
 */
export function deletePlatformFeature(featureId: string): PlatformFeature[] {
  const features = getRegisteredFeatures();
  const target = features.find((f) => f.id === featureId);

  // Filter out the target feature
  const updatedList = features.filter((f) => f.id !== featureId);
  localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(updatedList));

  // Also remove this featureId from any plans that had it enabled
  try {
    const plans = getRegisteredPlans();
    let plansModified = false;
    const cleanedPlans = plans.map((p) => {
      if (p.features.includes(featureId)) {
        plansModified = true;
        return { ...p, features: p.features.filter((f) => f !== featureId) };
      }
      return p;
    });
    if (plansModified) {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(cleanedPlans));
      broadcastUpdate(ORBIT_EVENTS.PLANS_UPDATED, cleanedPlans);
    }
  } catch {}

  broadcastUpdate(ORBIT_EVENTS.FEATURES_UPDATED, { features: updatedList, deletedId: featureId });
  return updatedList;
}

/**
 * Reset all features back to the standard platform defaults.
 */
export function resetFeaturesToDefaults(): PlatformFeature[] {
  localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(PLATFORM_FEATURES));
  broadcastUpdate(ORBIT_EVENTS.FEATURES_UPDATED, { features: PLATFORM_FEATURES, reset: true });
  return PLATFORM_FEATURES;
}

// ============================================================================
// SUBSCRIPTION PLANS & CUSTOM PLANS OPERATIONS
// ============================================================================

/**
 * Retrieve all registered subscription plans (Standard + Custom Plans).
 */
export async function fetchAllPlans(): Promise<SubscriptionPlan[]> {
  let loadedPlans: SubscriptionPlan[] = [];

  // 1. Try Supabase subscription_plans table first
  try {
    const { data: dbPlans } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (dbPlans && dbPlans.length > 0) {
      loadedPlans = dbPlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        tier: p.tier || "pro",
        priceMonthlyINR: Number(p.price_monthly) || 0,
        priceAnnualINR: Number(p.price_annual) || 0,
        isCustomQuote: Boolean(p.is_custom_quote),
        maxStudents: Number(p.max_students) || 1000,
        isUnlimitedStudents: Boolean(p.is_unlimited_students),
        durationDays: Number(p.duration_days) || 30,
        features: Array.isArray(p.enabled_features) ? p.enabled_features : [],
        isActive: p.is_active !== false,
        isPopular: Boolean(p.is_popular),
        customCollegeId: p.custom_college_id || null,
        customCollegeName: p.custom_college_name || null,
        badgeText: p.badge_text || undefined,
        accentColor: p.accent_color || undefined,
        notes: p.notes || "",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    }
  } catch {
    // Supabase table does not exist or network unavailable
  }

  // 2. Fallback to localStorage
  if (loadedPlans.length === 0) {
    try {
      const stored = localStorage.getItem(PLANS_STORAGE_KEY);
      if (stored) {
        loadedPlans = JSON.parse(stored);
      } else {
        loadedPlans = DEFAULT_PLANS;
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(DEFAULT_PLANS));
      }
    } catch {
      loadedPlans = DEFAULT_PLANS;
    }
  }

  return loadedPlans;
}

/**
 * Synchronous local retrieval of plans
 */
export function getRegisteredPlans(): SubscriptionPlan[] {
  try {
    const stored = localStorage.getItem(PLANS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return DEFAULT_PLANS;
}

/**
 * Persist plans to both localStorage and Supabase.
 * This satisfies: "make sure custom plans can be created and based on that every single feature in the application can be customizable".
 */
export async function persistSubscriptionPlans(updatedPlans: SubscriptionPlan[]): Promise<void> {
  // Store locally
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
  broadcastUpdate(ORBIT_EVENTS.PLANS_UPDATED, updatedPlans);

  // Try to sync to Supabase table
  try {
    const records = updatedPlans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      tier: p.tier || "pro",
      price_monthly: p.priceMonthlyINR,
      price_annual: p.priceAnnualINR,
      is_custom_quote: Boolean(p.isCustomQuote),
      max_students: p.maxStudents,
      is_unlimited_students: Boolean(p.isUnlimitedStudents),
      duration_days: p.durationDays,
      enabled_features: p.features || [],
      is_active: p.isActive !== false,
      is_popular: Boolean(p.isPopular),
      custom_college_id: p.customCollegeId || null,
      custom_college_name: p.customCollegeName || null,
      badge_text: p.badgeText || null,
      accent_color: p.accentColor || null,
      notes: p.notes || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from("subscription_plans").upsert(records, { onConflict: "id" });
  } catch {
    // Table may not exist yet, local storage remains source of truth
  }
}

/**
 * Save (create or edit) a single subscription plan (standard or custom)
 */
export async function saveSubscriptionPlan(plan: SubscriptionPlan): Promise<SubscriptionPlan[]> {
  const currentPlans = getRegisteredPlans();
  const existingIdx = currentPlans.findIndex((p) => p.id === plan.id);

  let updatedList: SubscriptionPlan[];
  const timestamp = new Date().toISOString();

  if (existingIdx >= 0) {
    updatedList = [...currentPlans];
    updatedList[existingIdx] = {
      ...currentPlans[existingIdx],
      ...plan,
      updatedAt: timestamp,
    };
  } else {
    const newPlan: SubscriptionPlan = {
      ...plan,
      id: plan.id || `plan-custom-${Date.now()}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    updatedList = [...currentPlans, newPlan];
  }

  await persistSubscriptionPlans(updatedList);
  return updatedList;
}

/**
 * Delete a plan by ID
 */
export async function deleteSubscriptionPlan(planId: string): Promise<SubscriptionPlan[]> {
  const currentPlans = getRegisteredPlans();
  const updatedList = currentPlans.filter((p) => p.id !== planId);

  await persistSubscriptionPlans(updatedList);

  try {
    await supabase.from("subscription_plans").delete().eq("id", planId);
  } catch {}

  return updatedList;
}

/**
 * Clone a plan into a new custom plan
 */
export async function duplicatePlanAsCustom(
  sourcePlan: SubscriptionPlan,
  customName?: string
): Promise<SubscriptionPlan> {
  const cloned: SubscriptionPlan = {
    ...sourcePlan,
    id: `plan-custom-${Date.now()}`,
    name: customName || `${sourcePlan.name} (Custom Plan)`,
    tier: "custom",
    isPopular: false,
    badgeText: "Custom Tier",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const currentPlans = getRegisteredPlans();
  const updatedList = [...currentPlans, cloned];
  await persistSubscriptionPlans(updatedList);

  return cloned;
}

// ============================================================================
// TENANT COLLEGE ALLOCATION & GRANULAR FEATURE OVERRIDES
// ============================================================================

export interface AssignPlanResult {
  success: boolean;
  collegeId: string;
  collegeName: string;
  planName: string;
  newExpiry: string;
  featuresCount: number;
}

/**
 * Assign a plan to a partner college with full DB persistence and billing record.
 */
export async function assignPlanToCollege(
  plan: SubscriptionPlan,
  collegeId: string,
  collegeName: string
): Promise<AssignPlanResult> {
  const duration = plan.durationDays || 30;
  const newExpiry = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

  // 1. Update college in Supabase
  const { error } = await supabase
    .from("colleges")
    .update({
      max_students: plan.isUnlimitedStudents ? 999999 : plan.maxStudents,
      enabled_features: plan.features,
      subscription_status: "active",
      activation_status: true,
      subscription_expiry_date: newExpiry,
    })
    .eq("id", collegeId);

  if (error) throw error;

  // 2. Generate billing invoice record
  try {
    const invNum = `INV-PLAN-${Date.now().toString().slice(-6)}`;
    await supabase.from("invoices").insert([
      {
        college_id: collegeId,
        invoice_number: invNum,
        student_count: plan.maxStudents,
        cost_per_student:
          Math.round(plan.priceMonthlyINR / Math.max(1, plan.maxStudents)) || 50,
        total_amount: plan.priceMonthlyINR,
        status: "pending",
      },
    ]);
  } catch (invErr) {
    console.warn("Could not create invoice record for plan assignment:", invErr);
  }

  // 3. Broadcast real-time update
  broadcastUpdate(ORBIT_EVENTS.COLLEGE_UPDATED, {
    collegeId,
    enabledFeatures: plan.features,
    maxStudents: plan.maxStudents,
    planId: plan.id,
  });

  return {
    success: true,
    collegeId,
    collegeName,
    planName: plan.name,
    newExpiry,
    featuresCount: plan.features.length,
  };
}

/**
 * Save granular custom feature toggles specifically for an individual college.
 * This allows per-college custom feature configuration on demand.
 */
export async function updateCollegeCustomFeatures(
  collegeId: string,
  features: string[],
  maxStudents: number
): Promise<{ success: boolean; featuresCount: number }> {
  const { error } = await supabase
    .from("colleges")
    .update({
      enabled_features: features,
      max_students: Number(maxStudents),
    })
    .eq("id", collegeId);

  if (error) throw error;

  // Broadcast real-time update so active sessions reflect the changes instantly
  broadcastUpdate(ORBIT_EVENTS.COLLEGE_UPDATED, {
    collegeId,
    enabledFeatures: features,
    maxStudents,
  });

  return {
    success: true,
    featuresCount: features.length,
  };
}
