import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UnifiedCouponManager } from "@/components/coupons/UnifiedCouponManager";
import { supabase } from "@/lib/supabase";

export default function AdminCoupons() {
  const [collegeId, setCollegeId] = useState<string>(() => {
    return sessionStorage.getItem("collegeId") || localStorage.getItem("admin_college_id") || "00000000-0000-0000-0000-000000000001";
  });

  useEffect(() => {
    const fetchCollege = async () => {
      const stored = sessionStorage.getItem("collegeId") || localStorage.getItem("admin_college_id");
      if (stored) {
        setCollegeId(stored);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("college_id")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.college_id) {
            setCollegeId(profile.college_id);
            sessionStorage.setItem("collegeId", profile.college_id);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not fetch user college:", e);
      }

      // Default institutional college fallback (e.g. SIN Education)
      const defaultCol = "00000000-0000-0000-0000-000000000001";
      setCollegeId(defaultCol);
      sessionStorage.setItem("collegeId", defaultCol);
    };

    fetchCollege();
  }, []);

  return (
    <AdminLayout
      title="Coupons & Promotional Discounts"
      subtitle="Configure campus-wide and course-specific scholarship promo codes for your institution."
    >
      <div className="space-y-6">
        <UnifiedCouponManager scope="admin" collegeId={collegeId} />
      </div>
    </AdminLayout>
  );
}
