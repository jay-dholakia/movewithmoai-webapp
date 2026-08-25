import { type NextRequest, NextResponse } from "next/server";
import { verifyCoachRequest } from "@/lib/server/coach-auth";
import { getCoachScope } from "@/lib/server/coach-scope";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCoachRequest(request);
    if ("error" in auth) return auth.error;
    const scope = await getCoachScope(auth.coachId, auth.userId);

    const body = await request.json();
    const {
      prompt,
      difficulty_level,
      is_paid = false,
      assign_type,
      assign_to_id,
    } = body as {
      prompt?: string;
      difficulty_level?: string;
      is_paid?: boolean;
      assign_type?: "focus_moai" | "user";
      assign_to_id?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required" },
        { status: 400 },
      );
    }
    if (!assign_type || !assign_to_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "assign_type and assign_to_id are required for coach generation.",
        },
        { status: 400 },
      );
    }
    if (assign_type === "focus_moai") {
      if (!scope.focusMoaiIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "Focus moai not in your scope." },
          { status: 403 },
        );
      }
    } else if (assign_type === "user") {
      if (!scope.allAssignableUserIds.includes(assign_to_id)) {
        return NextResponse.json(
          { success: false, error: "User not in your scope." },
          { status: 403 },
        );
      }
    }

    // TODO: replace with the same generation logic your admin route uses.
    // The output should insert a workout_programs row with:
    //   created_by = auth.userId
    //   assigned_focus_moai_id / assigned_user_id per assign_type
    //   status = 'draft'
    // Plus the generated workouts + exercises.
    return NextResponse.json(
      {
        success: false,
        error:
          "Coach AI program generation not wired yet. Share app/api/admin/workout-programs/generate/route.ts and I'll mirror it here.",
      },
      { status: 501 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
