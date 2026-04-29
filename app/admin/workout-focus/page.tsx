import { AdminFocusTabs } from "@/components/admin/AdminSectionTabs";
import WorkoutFocusPage from "@/components/admin/workout-focus/WorkoutFocus";

export default function WorkoutFocusRoutePage() {
  return (
    <>
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <AdminFocusTabs />
      </div>
      <WorkoutFocusPage />
    </>
  );
}
