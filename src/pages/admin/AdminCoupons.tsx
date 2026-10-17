import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UnifiedCouponManager } from "@/components/coupons/UnifiedCouponManager";
import { supabase } from "@/lib/supabase";

export default function AdminCoupons() {
  const [collegeId, setCollegeId] = useState<string | null>(() => {
    return sessionStorage.getItem("collegeId") || localStorage.getItem("admin_college_id");
  });

  useEffect(() => {
    const fetchCollege = async () => {
      if (collegeId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("college_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.college_id) {
        setCollegeId(profile.college_id);
        sessionStorage.setItem("collegeId", profile.college_id);
      }
    };

    fetchCollege();
  }, [collegeId]);

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
