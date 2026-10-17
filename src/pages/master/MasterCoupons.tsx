import { MasterLayout } from "@/components/layout/MasterLayout";
import { UnifiedCouponManager } from "@/components/coupons/UnifiedCouponManager";

export default function MasterCoupons() {
  return (
    <MasterLayout
      headerTitle="Global Coupon Engine & Discounts"
      headerDescription="Create platform-wide and institution-specific discount codes with precise redemption limits and usage tracking."
    >
      <div className="space-y-6">
        <UnifiedCouponManager scope="master" />
      </div>
    </MasterLayout>
  );
}
