import { AdminFocusTabs } from "@/components/admin/AdminSectionTabs";
import FocusReferrals from "@/components/admin/focus-referrals/FocusReferrals";

export default function FocusReferralsRoutePage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <AdminFocusTabs />
      </div>
      <FocusReferrals />
    </>
  );
}
