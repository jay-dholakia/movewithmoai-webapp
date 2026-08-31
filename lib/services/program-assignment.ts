import type { SupabaseClient } from "@supabase/supabase-js";

type ProgramForAssignment = {
  id: string;
  assigned_focus_moai_id: string | null;
  assigned_user_id: string | null;
};

export async function applyProgramAssignment(
  admin: SupabaseClient,
  program: ProgramForAssignment,
): Promise<void> {
  const { id, assigned_focus_moai_id, assigned_user_id } = program;

  if (!assigned_focus_moai_id && !assigned_user_id) return;

  try {
    if (assigned_focus_moai_id) {
      // Link workout_focus → this program
      const { data: fm } = await admin
        .from("focus_moais")
        .select("workout_focus_id")
        .eq("id", assigned_focus_moai_id)
        .single();

      if (fm?.workout_focus_id) {
        await admin
          .from("workout_focus")
          .update({ workout_program_id: id })
          .eq("id", fm.workout_focus_id);
      }

      // Assign current_plan to all active members of this focus moai
      const { data: members } = await admin
        .from("focus_moai_members")
        .select("user_id")
        .eq("focus_moai_id", assigned_focus_moai_id)
        .eq("status", "active");

      const memberIds = (members || []).map((m) => m.user_id as string);
      if (memberIds.length > 0) {
        await admin
          .from("users")
          .update({ current_plan: id })
          .in("id", memberIds);
      }
    } else if (assigned_user_id) {
      await admin
        .from("users")
        .update({ current_plan: id })
        .eq("id", assigned_user_id);
    }
  } catch (err) {
    // Don't fail the publish action if assignment has a hiccup — log and move on
    console.warn("[applyProgramAssignment] failed:", err);
  }
}
