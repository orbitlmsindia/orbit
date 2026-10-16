import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "orbit_enabled_features";

export function useCollegeFeatures() {
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [collegeName, setCollegeName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFeatures() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setLoading(false);
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
          if (isMounted) {
            setIsMasterAdmin(true);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch user's college_id
        let collegeId = sessionStorage.getItem("collegeId");
        if (!collegeId) {
          const { data: userData } = await supabase
            .from("users")
            .select("college_id, role")
            .eq("id", user.id)
            .maybeSingle();

          if (userData?.role === "super_admin" || userData?.role === "master_admin") {
            if (isMounted) {
              setIsMasterAdmin(true);
              setLoading(false);
            }
            return;
          }
          collegeId = userData?.college_id || null;
        }

        if (!collegeId) {
          collegeId = "00000000-0000-0000-0000-000000000001";
        }

        // 3. Query college enabled_features
        const { data: college } = await supabase
          .from("colleges")
          .select("name, enabled_features")
          .eq("id", collegeId)
          .maybeSingle();

        if (college && isMounted) {
          setCollegeName(college.name || "");
          const features = Array.isArray(college.enabled_features)
            ? college.enabled_features
            : [];
          setEnabledFeatures(features);
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(features));
          } catch {
            // ignore session storage error
          }
        }
      } catch (err) {
        console.warn("Could not load college features:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFeatures();

    return () => {
      isMounted = false;
    };
  }, []);

  const isFeatureEnabled = (featureId: string): boolean => {
    if (isMasterAdmin) return true; // Master Admin has unrestricted access to all features
    if (!enabledFeatures || enabledFeatures.length === 0) return true; // Default fallback to permissive if unconfigured
    return enabledFeatures.includes(featureId);
  };

  return {
    enabledFeatures,
    isFeatureEnabled,
    collegeName,
    isMasterAdmin,
    loading,
  };
}
