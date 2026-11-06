import { AdminService } from "@/lib/services/adminService";
import { CoachService } from "@/lib/services/coachService";
import type { WarmupEditorApi } from "@/components/admin/workout-builder/WarmupEditor";

export const adminWarmupApi: WarmupEditorApi = {
  getCatalog: () => AdminService.getWarmupCatalog(),
  getWarmup: (id) => AdminService.getWorkoutWarmup(id),
  replaceSlot: (id, seq, body) => AdminService.replaceWorkoutWarmupSlot(id, seq, { ...body }),
  resetSlot: (id, seq) => AdminService.resetWorkoutWarmupSlot(id, seq),
  resetAll: (id) => AdminService.resetWorkoutWarmup(id),
};

export const coachWarmupApi: WarmupEditorApi = {
  getCatalog: () => CoachService.getWarmupCatalog(),
  getWarmup: (id) => CoachService.getWorkoutWarmup(id),
  replaceSlot: (id, seq, body) => CoachService.replaceWorkoutWarmupSlot(id, seq, { ...body }),
  resetSlot: (id, seq) => CoachService.resetWorkoutWarmupSlot(id, seq),
  resetAll: (id) => CoachService.resetWorkoutWarmup(id),
};
