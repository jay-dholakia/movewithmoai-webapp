import { AdminFocusTabs } from "@/components/admin/AdminSectionTabs";
import FocusMoai from "@/components/admin/focus-moai/FocusMoai";

export default function FocusMoaiRoutePage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <AdminFocusTabs />
      </div>
      <FocusMoai />
    </>
  );
}
