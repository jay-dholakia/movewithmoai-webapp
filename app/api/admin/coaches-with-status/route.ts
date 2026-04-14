import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminRequest(request);
    if ("error" in authResult) return authResult.error;

    const admin = getSupabaseAdmin();

    const { data: coaches, error: coachesError } = await admin
      .from("coaches")
      .select("*")
      .order("created_at", { ascending: false });

    if (coachesError) {
      console.error("[coaches-with-status] Error fetching coaches:", coachesError);
      return NextResponse.json(
        {
          success: false,
          error: coachesError.message || "Failed to fetch coaches",
        },
        { status: 500 },
      );
    }

    const { data: allSubscriptions, error: subError } = await admin
      .from("moai_coach_subscriptions")
      .select("coach_id, status, moai_id")
      .eq("status", "active");

    if (subError) {
      console.warn("[coaches-with-status] moai_coach_subscriptions:", subError);
    }

    const moaiCountMap = new Map<string, number>();
    if (allSubscriptions && allSubscriptions.length > 0) {
      const moaiIds = [
        ...new Set(
          allSubscriptions
            .map((s: { moai_id: string }) => s.moai_id)
            .filter(Boolean),
        ),
      ];
      if (moaiIds.length > 0) {
        const { data: circles, error: circlesError } = await admin
          .from("circles")
          .select("id, status")
          .in("id", moaiIds)
          .eq("status", "active");
        if (circlesError) {
          console.warn("[coaches-with-status] circles:", circlesError);
        }
        const activeCircleIds = new Set(circles?.map((c) => c.id) || []);
        allSubscriptions.forEach((sub: { coach_id: string; moai_id: string }) => {
          if (sub.coach_id && sub.moai_id && activeCircleIds.has(sub.moai_id)) {
            const cid = String(sub.coach_id);
            moaiCountMap.set(cid, (moaiCountMap.get(cid) || 0) + 1);
          }
        });
      }
    }

    const coachesWithStatus = await Promise.all(
      (coaches || []).map(async (coach: Record<string, unknown>) => {
        let signupConfirmed = false;
        const uid = coach.user_id as string | null | undefined;
        if (uid) {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(uid);
            signupConfirmed = !!authUser?.user?.last_sign_in_at;
          } catch {
            signupConfirmed = false;
          }
        }

        return {
          id: coach.id,
          user_id: coach.user_id,
          name: coach.name,
          email: coach.email,
          first_name: coach.first_name,
          last_name: coach.last_name,
          is_available: coach.is_available || false,
          current_clients: coach.current_clients || 0,
          max_clients: coach.max_clients || 50,
          current_moais:
            moaiCountMap.get(String(coach.id)) ??
            coach.current_moais ??
            0,
          max_moais: coach.max_moais || 10,
          created_at: coach.created_at,
          profile_image_url: coach.profile_image_url,
          signup_confirmed: signupConfirmed,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      coaches: coachesWithStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[coaches-with-status] Error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
