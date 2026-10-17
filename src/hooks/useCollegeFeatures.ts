import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getRegisteredFeatures,
  ORBIT_EVENTS,
} from "@/services/featuresService";
import { PlatformFeature } from "@/types/plans";

const STORAGE_KEY = "orbit_enabled_features";

export function useCollegeFeatures() {
  const [allFeatures, setAllFeatures] = useState<PlatformFeature[]>(() =>
    getRegisteredFeatures()
  );
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [collegeName, setCollegeName] = useState<string>("");
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  const fetchFeaturesForCollege = useCallback(async () => {
    try {
      setLoading(true);
      // Reload registry features
      setAllFeatures(getRegisteredFeatures());

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Check user role
      const role = (
        user.app_metadata?.user_role ||
        user.user_metadata?.role ||
        sessionStorage.getItem("userRole") ||
        ""
      ).toLowerCase();

      if (role === "super_admin" || role === "master_admin") {
        setIsMasterAdmin(true);
        setLoading(false);
        return;
      }

      // 2. Fetch user's college_id
      let userCollegeId = sessionStorage.getItem("collegeId");
      if (!userCollegeId) {
        const { data: userData } = await supabase
          .from("users")
          .select("college_id, role")
          .eq("id", user.id)
          .maybeSingle();

        if (
          userData?.role === "super_admin" ||
          userData?.role === "master_admin"
        ) {
          setIsMasterAdmin(true);
          setLoading(false);
          return;
        }
        userCollegeId = userData?.college_id || null;
      }

      if (!userCollegeId) {
        userCollegeId = "00000000-0000-0000-0000-000000000001";
      }

      setCollegeId(userCollegeId);

      // 3. Query college enabled_features from Supabase
      const { data: college } = await supabase
        .from("colleges")
        .select("name, enabled_features")
        .eq("id", userCollegeId)
        .maybeSingle();

      if (college) {
        setCollegeName(college.name || "");
        const features = Array.isArray(college.enabled_features)
          ? college.enabled_features
          : [];
        setEnabledFeatures(features);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(features));
        } catch {}
      }
    } catch (err) {
      console.warn("Could not load college features:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturesForCollege();

    // Listen to real-time sync events
    const handleFeaturesRegistryUpdated = (e: any) => {
      setAllFeatures(getRegisteredFeatures());
    };

    const handleCollegeUpdated = (e: any) => {
      const detail = e?.detail;
      if (detail && (!collegeId || detail.collegeId === collegeId)) {
        if (Array.isArray(detail.enabledFeatures)) {
          setEnabledFeatures(detail.enabledFeatures);
          try {
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(detail.enabledFeatures)
            );
          } catch {}
        }
      } else {
        fetchFeaturesForCollege();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "orbit_master_features_registry" ||
        e.key === "orbit_master_subscription_plans"
      ) {
        setAllFeatures(getRegisteredFeatures());
      }
    };

    window.addEventListener(
      ORBIT_EVENTS.FEATURES_UPDATED,
      handleFeaturesRegistryUpdated
    );
    window.addEventListener(ORBIT_EVENTS.COLLEGE_UPDATED, handleCollegeUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        ORBIT_EVENTS.FEATURES_UPDATED,
        handleFeaturesRegistryUpdated
      );
      window.removeEventListener(
        ORBIT_EVENTS.COLLEGE_UPDATED,
        handleCollegeUpdated
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchFeaturesForCollege, collegeId]);

  /**
   * Check if a specific feature is enabled for the current college/tenant.
   * Master Admin always has unrestricted full access.
   */
  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      if (isMasterAdmin) return true; // Master Admin has unrestricted root access
      if (!enabledFeatures || enabledFeatures.length === 0) {
        // Fallback: If college has no feature record at all, check if feature is enabled by default
        const feat = allFeatures.find((f) => f.id === featureId);
        return feat ? feat.isEnabledByDefault !== false : true;
      }
      return enabledFeatures.includes(featureId);
    },
    [isMasterAdmin, enabledFeatures, allFeatures]
  );

  /**
   * Get metadata for a feature by its ID
   */
  const getFeature = useCallback(
    (featureId: string): PlatformFeature | undefined => {
      return allFeatures.find((f) => f.id === featureId);
    },
    [allFeatures]
  );

  return {
    allFeatures,
    enabledFeatures,
    isFeatureEnabled,
    getFeature,
    collegeName,
    collegeId,
    isMasterAdmin,
    loading,
    refreshFeatures: fetchFeaturesForCollege,
  };
}
