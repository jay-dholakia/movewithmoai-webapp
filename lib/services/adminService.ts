import { supabase } from "../supabase";
import type {
  AdminStats,
  AdminUser,
  AdminCoach,
  AdminCoachWithStatus,
  AdminMoai,
  LoginActivity,
} from "../types/admin";

export class AdminService {
  /**
   * Check if user is an admin
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === "admin";
  }

  /**
   * Get admin user profile
   */
  static async getAdminProfile(
    userId: string,
  ): Promise<{ id: string; email: string; role: string } | null> {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .eq("role", "admin")
      .single();

    if (error) {
      console.error("Error fetching admin profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Get overall admin dashboard stats
   */
  static async getAdminStats(): Promise<AdminStats> {
    try {
      // Get user stats
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, created_at, is_deleted")
        .eq("is_deleted", false);

      // Get active users (users with workout sessions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUsersData } = await supabase
        .from("workout_sessions")
        .select("user_id")
        .gte("started_at", thirtyDaysAgo.toISOString())
        .not("user_id", "is", null);

      const activeUserIds = new Set(
        activeUsersData?.map((s) => s.user_id) || [],
      );

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth =
        users?.filter((u) => new Date(u.created_at) >= startOfMonth).length ||
        0;

      // Get coach stats
      const { data: coaches, error: coachesError } = await supabase
        .from("coaches")
        .select("id, is_available");

      const activeCoaches = coaches?.filter((c) => c.is_available).length || 0;

      // Get Moai stats
      const { data: moais, error: moaisError } = await supabase
        .from("circles")
        .select("id, status");

      const activeMoais =
        moais?.filter((m) => m.status === "active").length || 0;

      // Get subscription stats using RPC function (bypasses RLS)
      let totalSubscriptions = 0;
      let activeSubscriptions = 0;
      try {
        const { data: subscriptions, error: subsError } = await supabase.rpc(
          "get_all_subscriptions_for_admin",
          {},
        );

        if (!subsError && subscriptions) {
          totalSubscriptions = subscriptions.length;
          activeSubscriptions = subscriptions.filter(
            (s: any) => s.status === "active",
          ).length;
        } else if (subsError) {
          console.error("Error fetching subscriptions:", subsError);
        }
      } catch (error) {
        console.error("Exception fetching subscription stats:", error);
      }

      // Get workout session stats (for totalWorkoutSessions and completedWorkoutSessions)
      const { data: workoutSessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, status");

      const completedSessions =
        workoutSessions?.filter((s) => s.status === "completed").length || 0;

      const totalSessions = workoutSessions?.length || 0;

      // Get commitment stats for Commitment % calculation
      // Commitment % = total workouts completed / total workouts committed to
      let totalCommitted = 0;
      let totalCompleted = 0;
      let commitmentRate = 0;
      try {
        const { data: commitments, error: commitmentsError } = await supabase
          .from("weekly_commitments")
          .select("commitment_count, completed_sessions");

        if (!commitmentsError && commitments) {
          totalCommitted = commitments.reduce(
            (sum, c) => sum + (c.commitment_count || 0),
            0,
          );
          totalCompleted = commitments.reduce(
            (sum, c) => sum + (c.completed_sessions || 0),
            0,
          );
          commitmentRate =
            totalCommitted > 0 ? (totalCompleted / totalCommitted) * 100 : 0;
        }
      } catch (error) {
        console.warn("Could not fetch commitment stats:", error);
      }

      return {
        totalUsers: users?.length || 0,
        activeUsers: activeUserIds.size,
        newUsersThisMonth,
        totalCoaches: coaches?.length || 0,
        activeCoaches,
        totalMoais: moais?.length || 0,
        activeMoais,
        totalSubscriptions,
        activeSubscriptions,
        totalWorkoutSessions: totalSessions,
        completedWorkoutSessions: completedSessions,
        averageCompletionRate: commitmentRate,
        totalCommitted,
        totalCompleted,
      };
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        totalCoaches: 0,
        activeCoaches: 0,
        totalMoais: 0,
        activeMoais: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalWorkoutSessions: 0,
        completedWorkoutSessions: 0,
        averageCompletionRate: 0,
        totalCommitted: 0,
        totalCompleted: 0,
      };
    }
  }

  /**
   * Get all users with admin view
   */
  static async getAllUsers(limit = 100, offset = 0): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          username,
          first_name,
          last_name,
          role,
          created_at,
          city,
          country,
          is_deleted
        `,
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching users:", error);
        return [];
      }

      // Get subscription status and workout counts for each user
      const userIds = data?.map((u) => u.id) || [];
      const usersWithStats = await Promise.all(
        (data || []).map(async (user) => {
          // Get subscription status using RPC function (bypasses RLS)
          let subscriptionStatus: string | null = null;
          try {
            const { data: sub, error: subError } = await supabase.rpc(
              "get_user_subscription_status",
              { p_user_id: user.id },
            );

            if (!subError && sub && sub.length > 0) {
              subscriptionStatus = sub[0].status;
            }
          } catch (error) {
            console.warn(
              `Could not fetch subscription for user ${user.id}:`,
              error,
            );
          }

          // Get workout count - handle errors gracefully
          let workoutCount = 0;
          try {
            const { count } = await supabase
              .from("workout_sessions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id);
            workoutCount = count || 0;
          } catch (error) {
            console.warn(
              `Could not fetch workout count for user ${user.id}:`,
              error,
            );
          }

          // Get Moai count - handle errors gracefully
          let moaiCount = 0;
          try {
            const { count } = await supabase
              .from("circle_members")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("status", "active");
            moaiCount = count || 0;
          } catch (error) {
            console.warn(
              `Could not fetch Moai count for user ${user.id}:`,
              error,
            );
          }

          // Get referrals count (users who signed up with this user's invite code)
          let referralsCount = 0;
          try {
            const { count } = await supabase
              .from("invites")
              .select("id", { count: "exact", head: true })
              .eq("inviter_id", user.id)
              .eq("status", "completed");
            referralsCount = count || 0;
          } catch (error) {
            console.warn(
              `Could not fetch referrals count for user ${user.id}:`,
              error,
            );
          }

          // Get last login (from auth.sessions - this might need RPC)
          // For now, we'll use created_at as a proxy
          const lastLoginAt = null; // TODO: Implement proper login tracking

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role as "user" | "coach" | "admin",
            created_at: user.created_at,
            last_login_at: lastLoginAt,
            subscription_status: subscriptionStatus,
            total_workouts: workoutCount,
            total_moais: moaiCount,
            city: user.city,
            country: user.country,
            invite_code: (user as any).invite_code || null,
            referrals_count: referralsCount,
          };
        }),
      );

      return usersWithStats;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  }

  /**
   * Get all coaches with admin view
   */
  static async getAllCoaches(): Promise<AdminCoach[]> {
    try {
      const { data, error } = await supabase
        .from("coaches")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching coaches:", error);
        return [];
      }

      // Get actual Moai counts for each coach by counting active subscriptions
      // Only count subscriptions where BOTH the subscription AND the circle (Moai) are active
      const { data: allSubscriptions, error: subsError } = await supabase
        .from("moai_coach_subscriptions")
        .select("coach_id, status, moai_id")
        .eq("status", "active");

      if (subsError) {
        console.error(
          "Error fetching Moai subscriptions for admin:",
          subsError,
        );
        // Fall back to stored values if query fails
      }

      // Create a map of coach_id -> count of active subscriptions with active circles
      const moaiCountMap = new Map<string, number>();

      if (allSubscriptions && allSubscriptions.length > 0) {
        // Get unique Moai IDs from active subscriptions
        const moaiIds = [
          ...new Set(
            allSubscriptions.map((s: any) => s.moai_id).filter(Boolean),
          ),
        ];

        if (moaiIds.length > 0) {
          // Fetch circle statuses - only get active circles
          const { data: circles, error: circlesError } = await supabase
            .from("circles")
            .select("id, status")
            .in("id", moaiIds)
            .eq("status", "active");

          if (circlesError) {
            console.error("Error fetching circle statuses:", circlesError);
          }

          // Create set of active circle IDs for fast lookup
          const activeCircleIds = new Set(circles?.map((c) => c.id) || []);

          // Count only subscriptions where the circle is also active
          allSubscriptions.forEach((sub: any) => {
            if (
              sub.coach_id &&
              sub.moai_id &&
              activeCircleIds.has(sub.moai_id)
            ) {
              const currentCount = moaiCountMap.get(sub.coach_id) || 0;
              moaiCountMap.set(sub.coach_id, currentCount + 1);
            }
          });
        }
      }

      const coachesWithMoaiCounts = (data || []).map((coach) => {
        // Get count from map, or fall back to stored value
        const currentMoaiCount =
          moaiCountMap.get(coach.id) ?? coach.current_moais ?? 0;

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
          current_moais: currentMoaiCount, // Use actual count instead of stored value
          max_moais: coach.max_moais || 10,
          created_at: coach.created_at,
          profile_image_url: coach.profile_image_url,
        };
      });

      return coachesWithMoaiCounts;
    } catch (error) {
      console.error("Error fetching coaches:", error);
      return [];
    }
  }

  /**
   * Get coaches with signup confirmation status (uses API with service role)
   */
  static async getCoachesWithStatus(): Promise<AdminCoachWithStatus[]> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await fetch("/api/admin/coaches-with-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return [];

      const { coaches } = await response.json();
      return coaches || [];
    } catch (error) {
      console.error("Error fetching coaches with status:", error);
      return [];
    }
  }

  // static async resendCoachInvite(email: string): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  //   try {
  //     const { data: { session } } = await supabase.auth.getSession()
  //     if (!session) return { success: false, error: 'Not authenticated' }

  //     const response = await fetch('/api/admin/resend-coach-invite', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${session.access_token}`,
  //       },
  //       body: JSON.stringify({ email }),
  //     })

  //     const result = await response.json()
  //     if (!response.ok || !result.success) {
  //       return { success: false, error: result.error || 'Failed to generate invite link' }
  //     }
  //     return { success: true, inviteLink: result.inviteLink }
  //   } catch (error) {
  //     console.error('Error resending coach invite:', error)
  //     return { success: false, error: 'Failed to generate invite link' }
  //   }
  // }

  // In adminService.ts

  static async resendCoachInvite(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return { success: false, error: "Not authenticated" };

      const response = await fetch("/api/admin/resend-coach-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      return result.success
        ? { success: true }
        : { success: false, error: result.error || "Failed to resend invite" };
    } catch {
      return { success: false, error: "Unexpected error" };
    }
  }

  /**
   * Create a new coach account with invitation
   * This calls an API route that uses service role key to create auth user
   */
  static async createCoach(data: {
    email: string
    first_name: string
    last_name: string
    is_available?: boolean
    max_clients?: number
    max_moais?: number
    monthly_price?: number
    bio?: string
    specializations?: string[]
  }): Promise<{ success: boolean; coachId?: string; error?: string; warning?: string }> {
    try {
      // Get current session for auth header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: "Not authenticated" };
      }

      // Call API route to create coach account
      const response = await fetch("/api/admin/create-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      console.log(
        "📡 [Client] Fetch completed, status:",
        response.status,
        "ok:",
        response.ok,
      );

      let result: any = null;
      let responseText = "";
      try {
        responseText = await response.text();
        console.log("📡 [Client] Response text length:", responseText.length);
        console.log("📡 [Client] Response text (full):", responseText);

        if (!responseText || responseText.trim() === "") {
          console.error("❌ [Client] Empty response body");
          return {
            success: false,
            error: `Server error (${response.status}): Empty response`,
          };
        }

        if (responseText.trim() === "{}") {
          console.error("❌ [Client] Response is empty JSON object");
          return {
            success: false,
            error: `Server error (${response.status}): Received empty JSON object`,
          };
        }

        result = JSON.parse(responseText);
        console.log("✅ [Client] Response parsed successfully:", result);
        console.log("✅ [Client] Result type:", typeof result);
        console.log("✅ [Client] Result keys:", Object.keys(result || {}));
      } catch (parseError: any) {
        console.error("❌ [Client] Failed to parse API response:", parseError);
        console.error("❌ [Client] Parse error message:", parseError?.message);
        console.error(
          "❌ [Client] Response text was:",
          responseText?.substring(0, 500),
        );
        return {
          success: false,
          error: `Server error (${response.status}): Failed to parse response - ${parseError?.message}`,
        };
      }

      if (!response.ok || !result?.success) {
        console.error("❌ [Client] API returned error:");
        console.error("   - response.ok:", response.ok);
        console.error("   - result:", result);
        console.error("   - result.success:", result?.success);
        console.error("   - result.error:", result?.error);
        console.error("   - result.debug:", result?.debug);
        console.error(
          "   - Full error object:",
          JSON.stringify(result, null, 2),
        );
        return {
          success: false,
          error:
            result?.error ||
            result?.message ||
            "Failed to create coach account",
          ...(result?.debug && { debug: result.debug }),
        } as { success: false; error: string; debug?: unknown };
      }

      return {
        success: true,
        coachId: result.coachId,
        warning: result.warning,
      };
    } catch (error: any) {
      console.error("Exception creating coach account:", error);
      return {
        success: false,
        error: error.message || "Failed to create coach account",
      };
    }
  }

  /**
   * Get all Moais with admin view
   */
  static async getAllMoais(): Promise<AdminMoai[]> {
    try {
      const { data: circles, error: circlesError } = await supabase
        .from("circles")
        .select("*")
        .order("created_at", { ascending: false });

      if (circlesError) {
        console.error("Error fetching circles:", circlesError);
        return [];
      }

      // Get member counts and coach info for each circle
      const moaisWithStats = await Promise.all(
        (circles || []).map(async (circle) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from("circle_members")
            .select("id", { count: "exact", head: true })
            .eq("circle_id", circle.id)
            .eq("status", "active");

          // Check if Moai has a coach subscription - handle RLS errors gracefully
          let hasCoach = false;
          let coachId: string | null = null;
          try {
            const { data: coachSub } = await supabase
              .from("moai_coach_subscriptions")
              .select("coach_id, status")
              .eq("moai_id", circle.id)
              .eq("status", "active")
              .maybeSingle();

            if (coachSub) {
              hasCoach = true;
              coachId = coachSub.coach_id;
            }
          } catch (error) {
            console.warn(
              `Could not fetch coach subscription for Moai ${circle.id}:`,
              error,
            );
          }

          return {
            id: circle.id,
            name: circle.name,
            status: circle.status as "forming" | "active" | "inactive",
            created_by_user_id: circle.created_by_user_id,
            created_at: circle.created_at,
            activated_at: circle.activated_at,
            member_count: memberCount || 0,
            min_members: circle.min_members || 4,
            has_coach: hasCoach,
            coach_id: coachId,
          };
        }),
      );

      return moaisWithStats;
    } catch (error) {
      console.error("Error fetching Moais:", error);
      return [];
    }
  }

  /**
   * Get login activity (simplified - using created_at as proxy for now)
   * TODO: Implement proper login tracking via auth.sessions or custom logging
   */
  static async getLoginActivity(): Promise<LoginActivity[]> {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, username, created_at, is_deleted")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching login activity:", error);
        return [];
      }

      // For now, we'll use created_at as a proxy
      // In production, you'd query auth.sessions or a custom login_logs table
      return (users || []).map((user) => ({
        user_id: user.id,
        email: user.email,
        username: user.username,
        last_login: null, // TODO: Implement proper login tracking
        login_count: 0, // TODO: Implement proper login tracking
        days_since_last_login: null, // TODO: Implement proper login tracking
      }));
    } catch (error) {
      console.error("Error fetching login activity:", error);
      return [];
    }
  }

  /**
   * Get active subscription counts for a coach (used before deletion confirmation)
   */
  static async getCoachActiveCounts(
    coachId: string,
  ): Promise<{ activeClients: number; activeMoais: number }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return { activeClients: 0, activeMoais: 0 }

      const [clientResult, moaiResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_coach_id', coachId)
          .in('status', ['active', 'trial']),
        supabase
          .from('moai_coach_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('coach_id', coachId)
          .eq('status', 'active'),
      ])

      return {
        activeClients: clientResult.count ?? 0,
        activeMoais: moaiResult.count ?? 0,
      }
    } catch {
      return { activeClients: 0, activeMoais: 0 }
    }
  }

  /**
   * Permanently delete a coach and all associated records
   */
  static async deleteCoach(
    coachId: string,
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return { success: false, error: 'Not authenticated' }

      const response = await fetch('/api/admin/delete-coach', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ coachId }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to delete coach' }
      }
      return { success: true, warnings: result.warnings }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete coach' }
    }
  }

  /**
   * Update coach availability
   */
  static async updateCoachAvailability(
    coachId: string,
    isAvailable: boolean,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("coaches")
        .update({ is_available: isAvailable })
        .eq("id", coachId);

      if (error) {
        console.error("Error updating coach availability:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error updating coach availability:", error);
      return false;
    }
  }

  /**
   * Update coach capacity
   */
  static async updateCoachCapacity(
    coachId: string,
    maxClients: number,
    maxMoais: number,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("coaches")
        .update({
          max_clients: maxClients,
          max_moais: maxMoais,
        })
        .eq("id", coachId);

      if (error) {
        console.error("Error updating coach capacity:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error updating coach capacity:", error);
      return false;
    }
  }

  /**
   * Get user details for admin view
   */
  static async getUserDetails(userId: string): Promise<AdminUser | null> {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !user) {
        return null;
      }

      // Get subscription status using RPC function (bypasses RLS)
      let subscriptionStatus: string | null = null;
      try {
        const { data: sub, error: subError } = await supabase.rpc(
          "get_user_subscription_status",
          { p_user_id: userId },
        );

        if (!subError && sub && sub.length > 0) {
          subscriptionStatus = sub[0].status;
        }
      } catch (error) {
        console.warn(`Could not fetch subscription for user ${userId}:`, error);
      }

      // Get workout count - handle errors gracefully
      let workoutCount = 0;
      try {
        const { count } = await supabase
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        workoutCount = count || 0;
      } catch (error) {
        console.warn(
          `Could not fetch workout count for user ${userId}:`,
          error,
        );
      }

      // Get Moai count - handle errors gracefully
      let moaiCount = 0;
      try {
        const { count } = await supabase
          .from("circle_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active");
        moaiCount = count || 0;
      } catch (error) {
        console.warn(`Could not fetch Moai count for user ${userId}:`, error);
      }

      // Get referrals count (users who signed up with this user's invite code)
      let referralsCount = 0;
      try {
        const { count } = await supabase
          .from("invites")
          .select("id", { count: "exact", head: true })
          .eq("inviter_id", userId)
          .eq("status", "completed");
        referralsCount = count || 0;
      } catch (error) {
        console.warn(
          `Could not fetch referrals count for user ${userId}:`,
          error,
        );
      }

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role as "user" | "coach" | "admin",
        created_at: user.created_at,
        last_login_at: null,
        subscription_status: subscriptionStatus,
        total_workouts: workoutCount,
        total_moais: moaiCount,
        city: user.city,
        country: user.country,
        invite_code: (user as any).invite_code || null,
        referrals_count: referralsCount,
      };
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  }

  /**
   * Get detailed Moai information with members and stats
   */
  static async getMoaiDetail(moaiId: string): Promise<any> {
    try {
      // Get Moai basic info
      const { data: circle, error: circleError } = await supabase
        .from("circles")
        .select("*")
        .eq("id", moaiId)
        .single();

      if (circleError || !circle) {
        console.error("Error fetching Moai:", circleError);
        return null;
      }

      // Get creator info
      const { data: creator } = await supabase
        .from("users")
        .select("first_name, last_name, username")
        .eq("id", circle.created_by_user_id)
        .single();

      // Get coach info if exists
      let coachName: string | null = null;
      let coachId: string | null = null;
      try {
        const { data: coachSub } = await supabase
          .from("moai_coach_subscriptions")
          .select("coach_id")
          .eq("moai_id", moaiId)
          .eq("status", "active")
          .maybeSingle();

        if (coachSub) {
          coachId = coachSub.coach_id;
          const { data: coach } = await supabase
            .from("coaches")
            .select("name")
            .eq("id", coachId)
            .single();
          coachName = coach?.name || null;
        }
      } catch (error) {
        console.warn("Could not fetch coach info:", error);
      }

      // Get members with their stats
      const { data: members, error: membersError } = await supabase
        .from("circle_members")
        .select("user_id, status, joined_at")
        .eq("circle_id", moaiId)
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching circle members:", membersError);
        // Continue with empty members array
      }

      const memberDetails = await Promise.all(
        (members || []).map(async (member) => {
          const { data: user } = await supabase
            .from("users")
            .select(
              "email, username, first_name, last_name, profile_picture_url",
            )
            .eq("id", member.user_id)
            .single();

          // Get commitment stats for this user
          const { data: commitments } = await supabase
            .from("weekly_commitments")
            .select("week_start, commitment_count, completed_sessions")
            .eq("user_id", member.user_id)
            .order("week_start", { ascending: false })
            .limit(52); // Last year

          const currentWeek = commitments?.[0];
          const totalWeeks = commitments?.length || 0;
          const totalCompleted =
            commitments?.reduce(
              (sum, c) => sum + (c.completed_sessions || 0),
              0,
            ) || 0;
          const totalCommitment =
            commitments?.reduce(
              (sum, c) => sum + (c.commitment_count || 0),
              0,
            ) || 0;
          const overallRate =
            totalCommitment > 0 ? (totalCompleted / totalCommitment) * 100 : 0;

          // Get workout stats
          const { count: workoutCount } = await supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", member.user_id)
            .eq("status", "completed");

          return {
            user_id: member.user_id,
            email: user?.email || "",
            username: user?.username,
            first_name: user?.first_name,
            last_name: user?.last_name,
            profile_picture_url: user?.profile_picture_url,
            joined_at: member.joined_at,
            status: member.status,
            current_week_commitment: currentWeek?.commitment_count || 0,
            current_week_completed: currentWeek?.completed_sessions || 0,
            current_week_completion_rate: currentWeek?.commitment_count
              ? (currentWeek.completed_sessions /
                  currentWeek.commitment_count) *
                100
              : 0,
            total_commitment_weeks: totalWeeks,
            total_completed_sessions: totalCompleted,
            overall_completion_rate: overallRate,
            total_workouts: workoutCount || 0,
          };
        }),
      );

      // Get Moai activation date (use activated_at or created_at as fallback)
      const moaiStartDate = circle.activated_at || circle.created_at;
      const moaiStart = new Date(moaiStartDate);

      // Create a map of when each member joined
      const memberJoinDates = new Map<string, Date>();
      memberDetails.forEach((m) => {
        memberJoinDates.set(m.user_id, new Date(m.joined_at));
      });

      // Get Moai-level commitment history (aggregate by week)
      // Only include commitments from weeks where members were actually in the Moai
      const { data: allCommitments } = await supabase
        .from("weekly_commitments")
        .select("week_start, commitment_count, completed_sessions, user_id")
        .in(
          "user_id",
          memberDetails.map((m) => m.user_id),
        )
        .order("week_start", { ascending: false })
        .limit(52);

      // Aggregate by week, only counting weeks where member was in the Moai
      const moaiCommitmentHistory: Record<
        string,
        { commitment: number; completed: number; members: Set<string> }
      > = {};
      allCommitments?.forEach((c) => {
        const weekStart = new Date(c.week_start);
        const memberJoinDate = memberJoinDates.get(c.user_id);

        // Only count if:
        // 1. Week is after Moai was activated/created
        // 2. Week is after member joined
        if (
          weekStart >= moaiStart &&
          memberJoinDate &&
          weekStart >= memberJoinDate
        ) {
          const week = c.week_start;
          if (!moaiCommitmentHistory[week]) {
            moaiCommitmentHistory[week] = {
              commitment: 0,
              completed: 0,
              members: new Set(),
            };
          }
          moaiCommitmentHistory[week].commitment += c.commitment_count || 0;
          moaiCommitmentHistory[week].completed += c.completed_sessions || 0;
          moaiCommitmentHistory[week].members.add(c.user_id);
        }
      });

      const moaiHistory = Object.entries(moaiCommitmentHistory)
        .map(([week_start, data]) => ({
          week_start,
          total_commitment: data.commitment,
          total_completed: data.completed,
          completion_rate:
            data.commitment > 0 ? (data.completed / data.commitment) * 100 : 0,
          member_count: data.members.size,
        }))
        .sort(
          (a, b) =>
            new Date(b.week_start).getTime() - new Date(a.week_start).getTime(),
        )
        .slice(0, 12); // Last 12 weeks

      // Get Moai workout stats - only count workouts after member joined and Moai was active
      const { data: allWorkouts } = await supabase
        .from("workout_sessions")
        .select("id, status, started_at, user_id")
        .in(
          "user_id",
          memberDetails.map((m) => m.user_id),
        );

      // Filter workouts to only include those after member joined and Moai was active
      const validWorkouts = (allWorkouts || []).filter((w) => {
        if (!w.started_at) return false;
        const workoutDate = new Date(w.started_at);
        const memberJoinDate = memberJoinDates.get(w.user_id);

        // Only count if workout is after Moai start and after member joined
        return (
          workoutDate >= moaiStart &&
          memberJoinDate &&
          workoutDate >= memberJoinDate
        );
      });

      const totalWorkouts = validWorkouts.length;
      const completedWorkouts = validWorkouts.filter(
        (w) => w.status === "completed",
      ).length;
      const completionRate =
        totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

      // Calculate weeks active - count unique weeks in commitment history
      const weeksActive = moaiHistory.length;

      return {
        id: circle.id,
        name: circle.name,
        status: circle.status,
        created_by_user_id: circle.created_by_user_id,
        created_by_name: creator
          ? `${creator.first_name || ""} ${creator.last_name || ""}`.trim() ||
            creator.username
          : null,
        created_at: circle.created_at,
        activated_at: circle.activated_at,
        min_members: circle.min_members || 4,
        member_count: memberDetails.length,
        has_coach: !!coachId,
        coach_id: coachId,
        coach_name: coachName,
        members: memberDetails,
        moai_commitment_history: moaiHistory,
        moai_workout_stats: {
          total_workouts: totalWorkouts,
          completed_workouts: completedWorkouts,
          total_sessions: totalWorkouts,
          completed_sessions: completedWorkouts,
          average_completion_rate: completionRate,
        },
        weeks_active: weeksActive,
      };
    } catch (error) {
      console.error("Error fetching Moai detail:", error);
      return null;
    }
  }

  /**
   * Send password reset email for a user (admin action)
   */
  static async sendPasswordReset(userId: string): Promise<boolean> {
    try {
      // Get user email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("Error fetching user:", userError);
        return false;
      }

      // Use Supabase Auth admin API to send password reset
      // Note: This requires the admin API key, which should be done server-side
      // For now, we'll return success and log a warning
      console.warn(
        "Password reset should be implemented server-side with admin API key",
      );
      return true;
    } catch (error) {
      console.error("Error sending password reset:", error);
      return false;
    }
  }

  /**
   * Get commitment analytics data by week and month
   */
  static async getCommitmentAnalytics() {
    try {
      // Get all weekly commitments
      const { data: commitments, error } = await supabase
        .from("weekly_commitments")
        .select("week_start, commitment_count, completed_sessions")
        .order("week_start", { ascending: true });

      if (error) {
        console.error("Error fetching commitment analytics:", error);
        return { weekly: [], monthly: [] };
      }

      // Aggregate by week
      const weeklyData: Record<
        string,
        { committed: number; completed: number }
      > = {};
      commitments?.forEach((c) => {
        const week = c.week_start;
        if (!weeklyData[week]) {
          weeklyData[week] = { committed: 0, completed: 0 };
        }
        weeklyData[week].committed += c.commitment_count || 0;
        weeklyData[week].completed += c.completed_sessions || 0;
      });

      const weekly = Object.entries(weeklyData)
        .map(([week_start, data]) => ({
          week_start,
          committed: data.committed,
          completed: data.completed,
          percentage:
            data.committed > 0 ? (data.completed / data.committed) * 100 : 0,
        }))
        .sort(
          (a, b) =>
            new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
        );

      // Aggregate by month
      const monthlyData: Record<
        string,
        { committed: number; completed: number }
      > = {};
      commitments?.forEach((c) => {
        const date = new Date(c.week_start);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { committed: 0, completed: 0 };
        }
        monthlyData[monthKey].committed += c.commitment_count || 0;
        monthlyData[monthKey].completed += c.completed_sessions || 0;
      });

      const monthly = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          committed: data.committed,
          completed: data.completed,
          percentage:
            data.committed > 0 ? (data.completed / data.committed) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return { weekly, monthly };
    } catch (error) {
      console.error("Error fetching commitment analytics:", error);
      return { weekly: [], monthly: [] };
    }
  }

  /**
   * Get user growth analytics
   */
  static async getUserAnalytics() {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("created_at, is_deleted")
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching user analytics:", error);
        return { daily: [], weekly: [], monthly: [] };
      }

      // Aggregate by day
      const dailyData: Record<string, number> = {};
      users?.forEach((u) => {
        const date = new Date(u.created_at).toISOString().split("T")[0];
        dailyData[date] = (dailyData[date] || 0) + 1;
      });

      const daily = Object.entries(dailyData)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Aggregate by week
      const weeklyData: Record<string, number> = {};
      users?.forEach((u) => {
        const date = new Date(u.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      });

      const weekly = Object.entries(weeklyData)
        .map(([week_start, count]) => ({ week_start, count }))
        .sort((a, b) => a.week_start.localeCompare(b.week_start));

      // Aggregate by month
      const monthlyData: Record<string, number> = {};
      users?.forEach((u) => {
        const date = new Date(u.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      const monthly = Object.entries(monthlyData)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return { daily, weekly, monthly };
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  /**
   * Get subscription analytics
   */
  static async getSubscriptionAnalytics() {
    try {
      const { data: subscriptions, error } = await supabase.rpc(
        "get_all_subscriptions_for_admin",
        {},
      );

      if (error || !subscriptions) {
        console.error("Error fetching subscription analytics:", error);
        return { daily: [], monthly: [], byStatus: {} };
      }

      // Get subscription creation dates
      const { data: subDetails, error: detailsError } = await supabase
        .from("subscriptions")
        .select("created_at, status");

      if (detailsError) {
        console.error("Error fetching subscription details:", detailsError);
        return { daily: [], monthly: [], byStatus: {} };
      }

      // Aggregate by day
      const dailyData: Record<string, { active: number; total: number }> = {};
      subDetails?.forEach((s) => {
        const date = new Date(s.created_at).toISOString().split("T")[0];
        if (!dailyData[date]) {
          dailyData[date] = { active: 0, total: 0 };
        }
        dailyData[date].total += 1;
        if (s.status === "active") {
          dailyData[date].active += 1;
        }
      });

      const daily = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          active: data.active,
          total: data.total,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Aggregate by month
      const monthlyData: Record<string, { active: number; total: number }> = {};
      subDetails?.forEach((s) => {
        const date = new Date(s.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { active: 0, total: 0 };
        }
        monthlyData[monthKey].total += 1;
        if (s.status === "active") {
          monthlyData[monthKey].active += 1;
        }
      });

      const monthly = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          active: data.active,
          total: data.total,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Count by status
      const byStatus: Record<string, number> = {};
      subscriptions.forEach((s: any) => {
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      });

      return { daily, monthly, byStatus };
    } catch (error) {
      console.error("Error fetching subscription analytics:", error);
      return { daily: [], monthly: [], byStatus: {} };
    }
  }

  /**
   * Get comprehensive analytics overview
   */
  static async getAnalyticsOverview() {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, created_at, is_deleted")
        .eq("is_deleted", false);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      const totalUsers = users?.length || 0;
      const userIds = users?.map((u) => u.id) || [];

      // Get users who have set a commitment
      const { data: commitments, error: commitmentsError } = await supabase
        .from("weekly_commitments")
        .select("user_id, commitment_count, completed_sessions, week_start")
        .not("commitment_count", "is", null)
        .gt("commitment_count", 0);

      if (commitmentsError) {
        console.error("Error fetching commitments:", commitmentsError);
      }

      const usersWithCommitments = new Set(
        commitments?.map((c) => c.user_id) || [],
      );
      const totalUsersWithCommitments = usersWithCommitments.size;

      // Get users who've hit their commitment (completed >= commitment)
      const usersWhoHitCommitment = new Set<string>();
      commitments?.forEach((c) => {
        if (c.completed_sessions >= c.commitment_count) {
          usersWhoHitCommitment.add(c.user_id);
        }
      });
      const totalUsersWhoHitCommitment = usersWhoHitCommitment.size;

      // Get all workout sessions for time series (we'll filter by month later)
      const { data: allWorkouts, error: workoutsError } = await supabase
        .from("workout_sessions")
        .select("user_id, created_at, status")
        .eq("status", "completed");

      // Get workout sessions for active users (users with workouts in last 30 days) for overview
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentWorkouts =
        allWorkouts?.filter((w) => new Date(w.created_at) >= thirtyDaysAgo) ||
        [];

      if (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
      }

      // Calculate average workouts per active user
      const activeUserWorkouts = new Map<string, number>();
      recentWorkouts?.forEach((w) => {
        const count = activeUserWorkouts.get(w.user_id) || 0;
        activeUserWorkouts.set(w.user_id, count + 1);
      });

      const activeUserIds = Array.from(activeUserWorkouts.keys());
      const totalWorkouts = Array.from(activeUserWorkouts.values()).reduce(
        (sum, count) => sum + count,
        0,
      );
      const avgWorkoutsPerActiveUser =
        activeUserIds.length > 0 ? totalWorkouts / activeUserIds.length : 0;

      // Get all Moais
      const { data: moais, error: moaisError } = await supabase
        .from("circles")
        .select("id, created_at, status");

      if (moaisError) {
        console.error("Error fetching moais:", moaisError);
      }

      const totalMoais = moais?.length || 0;
      const moaiIds = moais?.map((m) => m.id) || [];

      // Get Moai members to calculate average member size
      const { data: moaiMembers, error: membersError } = await supabase
        .from("circle_members")
        .select("circle_id, user_id, status")
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching moai members:", membersError);
      }

      // Calculate average member size per moai
      const moaiMemberCounts = new Map<string, number>();
      moaiMembers?.forEach((m) => {
        const count = moaiMemberCounts.get(m.circle_id) || 0;
        moaiMemberCounts.set(m.circle_id, count + 1);
      });

      const activeMoaiIds = Array.from(moaiMemberCounts.keys());
      const totalMembers = Array.from(moaiMemberCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      );
      const avgMemberSizePerMoai =
        activeMoaiIds.length > 0 ? totalMembers / activeMoaiIds.length : 0;

      // Get coach-led Moais
      const { data: coachSubscriptions, error: coachSubsError } = await supabase
        .from("moai_coach_subscriptions")
        .select("moai_id, status")
        .eq("status", "active");

      if (coachSubsError) {
        console.error("Error fetching coach subscriptions:", coachSubsError);
      }

      const coachLedMoaiIds = new Set(
        coachSubscriptions?.map((s) => s.moai_id).filter(Boolean) || [],
      );
      const totalCoachLedMoais = coachLedMoaiIds.size;

      // Time series data - aggregate by month
      const monthlyData: Record<
        string,
        {
          users: number;
          usersWithCommitments: number;
          usersWhoHitCommitment: number;
          avgWorkouts: number;
          moaisCreated: number;
          avgMemberSize: number;
          coachLedMoais: number;
        }
      > = {};

      // Users over time
      users?.forEach((user) => {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }
        monthlyData[monthKey].users += 1;
      });

      // Commitments over time - calculate unique users per month
      const commitmentUsersByMonth = new Map<string, Set<string>>();
      const hitCommitmentUsersByMonth = new Map<string, Set<string>>();

      commitments?.forEach((commitment) => {
        const date = new Date(commitment.week_start);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        // Initialize month if needed
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }

        // Track users with commitments
        if (!commitmentUsersByMonth.has(monthKey)) {
          commitmentUsersByMonth.set(monthKey, new Set());
        }
        commitmentUsersByMonth.get(monthKey)!.add(commitment.user_id);

        // Track users who hit commitment
        if (commitment.completed_sessions >= commitment.commitment_count) {
          if (!hitCommitmentUsersByMonth.has(monthKey)) {
            hitCommitmentUsersByMonth.set(monthKey, new Set());
          }
          hitCommitmentUsersByMonth.get(monthKey)!.add(commitment.user_id);
        }
      });

      // Set the counts for each month
      commitmentUsersByMonth.forEach((userSet, monthKey) => {
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].usersWithCommitments = userSet.size;
        }
      });

      hitCommitmentUsersByMonth.forEach((userSet, monthKey) => {
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].usersWhoHitCommitment = userSet.size;
        }
      });

      // Moais over time
      moais?.forEach((moai) => {
        const date = new Date(moai.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }
        monthlyData[monthKey].moaisCreated += 1;
      });

      // Calculate monthly averages for member size and workouts
      Object.keys(monthlyData).forEach((monthKey) => {
        const monthDate = new Date(monthKey + "-01");
        const monthStart = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1,
        );
        const monthEnd = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0,
        );

        // Average member size for moais created in this month
        const moaisInMonth =
          moais?.filter((m) => {
            const mDate = new Date(m.created_at);
            return mDate >= monthStart && mDate <= monthEnd;
          }) || [];

        if (moaisInMonth.length > 0) {
          const moaiIdsInMonth = moaisInMonth.map((m) => m.id);
          const membersInMonth =
            moaiMembers?.filter(
              (m) =>
                moaiIdsInMonth.includes(m.circle_id) && m.status === "active",
            ) || [];
          const memberCountsByMoai = new Map<string, number>();
          membersInMonth.forEach((m) => {
            const count = memberCountsByMoai.get(m.circle_id) || 0;
            memberCountsByMoai.set(m.circle_id, count + 1);
          });
          const totalMembersInMonth = Array.from(
            memberCountsByMoai.values(),
          ).reduce((sum, count) => sum + count, 0);
          monthlyData[monthKey].avgMemberSize =
            memberCountsByMoai.size > 0
              ? totalMembersInMonth / memberCountsByMoai.size
              : 0;
        }

        // Average workouts for active users in this month
        const workoutsInMonth =
          allWorkouts?.filter((w) => {
            const wDate = new Date(w.created_at);
            return wDate >= monthStart && wDate <= monthEnd;
          }) || [];

        const userWorkoutsInMonth = new Map<string, number>();
        workoutsInMonth.forEach((w) => {
          const count = userWorkoutsInMonth.get(w.user_id) || 0;
          userWorkoutsInMonth.set(w.user_id, count + 1);
        });

        const activeUsersInMonth = userWorkoutsInMonth.size;
        const totalWorkoutsInMonth = Array.from(
          userWorkoutsInMonth.values(),
        ).reduce((sum, count) => sum + count, 0);
        monthlyData[monthKey].avgWorkouts =
          activeUsersInMonth > 0
            ? totalWorkoutsInMonth / activeUsersInMonth
            : 0;

        // Coach-led moais in this month
        const coachLedInMonth = moaisInMonth.filter((m) =>
          coachLedMoaiIds.has(m.id),
        ).length;
        monthlyData[monthKey].coachLedMoais = coachLedInMonth;
      });

      // Convert monthly to array and sort
      const monthlyTimeSeries = Object.entries(monthlyData)
        .map(([month, data]) => ({
          period: month,
          ...data,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      // Calculate weekly data
      const weeklyData: Record<
        string,
        {
          users: number;
          usersWithCommitments: number;
          usersWhoHitCommitment: number;
          avgWorkouts: number;
          moaisCreated: number;
          avgMemberSize: number;
          coachLedMoais: number;
        }
      > = {};

      // Helper to get week start date
      const getWeekStart = (date: Date) => {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      };

      // Users over time by week
      users?.forEach((user) => {
        const date = new Date(user.created_at);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split("T")[0];
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }
        weeklyData[weekKey].users += 1;
      });

      // Commitments over time by week
      const commitmentUsersByWeek = new Map<string, Set<string>>();
      const hitCommitmentUsersByWeek = new Map<string, Set<string>>();

      commitments?.forEach((commitment) => {
        const date = new Date(commitment.week_start);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }

        if (!commitmentUsersByWeek.has(weekKey)) {
          commitmentUsersByWeek.set(weekKey, new Set());
        }
        commitmentUsersByWeek.get(weekKey)!.add(commitment.user_id);

        if (commitment.completed_sessions >= commitment.commitment_count) {
          if (!hitCommitmentUsersByWeek.has(weekKey)) {
            hitCommitmentUsersByWeek.set(weekKey, new Set());
          }
          hitCommitmentUsersByWeek.get(weekKey)!.add(commitment.user_id);
        }
      });

      commitmentUsersByWeek.forEach((userSet, weekKey) => {
        if (weeklyData[weekKey]) {
          weeklyData[weekKey].usersWithCommitments = userSet.size;
        }
      });

      hitCommitmentUsersByWeek.forEach((userSet, weekKey) => {
        if (weeklyData[weekKey]) {
          weeklyData[weekKey].usersWhoHitCommitment = userSet.size;
        }
      });

      // Moais over time by week
      moais?.forEach((moai) => {
        const date = new Date(moai.created_at);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split("T")[0];
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            users: 0,
            usersWithCommitments: 0,
            usersWhoHitCommitment: 0,
            avgWorkouts: 0,
            moaisCreated: 0,
            avgMemberSize: 0,
            coachLedMoais: 0,
          };
        }
        weeklyData[weekKey].moaisCreated += 1;
      });

      // Calculate weekly averages
      Object.keys(weeklyData).forEach((weekKey) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const moaisInWeek =
          moais?.filter((m) => {
            const mDate = new Date(m.created_at);
            return mDate >= weekStart && mDate <= weekEnd;
          }) || [];

        if (moaisInWeek.length > 0) {
          const moaiIdsInWeek = moaisInWeek.map((m) => m.id);
          const membersInWeek =
            moaiMembers?.filter(
              (m) =>
                moaiIdsInWeek.includes(m.circle_id) && m.status === "active",
            ) || [];
          const memberCountsByMoai = new Map<string, number>();
          membersInWeek.forEach((m) => {
            const count = memberCountsByMoai.get(m.circle_id) || 0;
            memberCountsByMoai.set(m.circle_id, count + 1);
          });
          const totalMembersInWeek = Array.from(
            memberCountsByMoai.values(),
          ).reduce((sum, count) => sum + count, 0);
          weeklyData[weekKey].avgMemberSize =
            memberCountsByMoai.size > 0
              ? totalMembersInWeek / memberCountsByMoai.size
              : 0;
        }

        const workoutsInWeek =
          allWorkouts?.filter((w) => {
            const wDate = new Date(w.created_at);
            return wDate >= weekStart && wDate <= weekEnd;
          }) || [];

        const userWorkoutsInWeek = new Map<string, number>();
        workoutsInWeek.forEach((w) => {
          const count = userWorkoutsInWeek.get(w.user_id) || 0;
          userWorkoutsInWeek.set(w.user_id, count + 1);
        });

        const activeUsersInWeek = userWorkoutsInWeek.size;
        const totalWorkoutsInWeek = Array.from(
          userWorkoutsInWeek.values(),
        ).reduce((sum, count) => sum + count, 0);
        weeklyData[weekKey].avgWorkouts =
          activeUsersInWeek > 0 ? totalWorkoutsInWeek / activeUsersInWeek : 0;

        const coachLedInWeek = moaisInWeek.filter((m) =>
          coachLedMoaiIds.has(m.id),
        ).length;
        weeklyData[weekKey].coachLedMoais = coachLedInWeek;
      });

      const weeklyTimeSeries = Object.entries(weeklyData)
        .map(([week, data]) => ({
          period: week,
          ...data,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        overview: {
          totalUsers,
          totalUsersWithCommitments,
          totalUsersWhoHitCommitment,
          avgWorkoutsPerActiveUser:
            Math.round(avgWorkoutsPerActiveUser * 10) / 10,
          totalMoais,
          avgMemberSizePerMoai: Math.round(avgMemberSizePerMoai * 10) / 10,
          totalCoachLedMoais,
        },
        weekly: weeklyTimeSeries,
        monthly: monthlyTimeSeries,
      };
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      return {
        overview: {
          totalUsers: 0,
          totalUsersWithCommitments: 0,
          totalUsersWhoHitCommitment: 0,
          avgWorkoutsPerActiveUser: 0,
          totalMoais: 0,
          avgMemberSizePerMoai: 0,
          totalCoachLedMoais: 0,
        },
        weekly: [],
        monthly: [],
      };
    }
  }

  /**
   * Get users by country
   */
  static async getUsersByCountry(country: string) {
    try {
      // Try exact match first
      let { data: users, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, username, city, created_at")
        .eq("is_deleted", false)
        .eq("country", country)
        .order("created_at", { ascending: false });

      // If no results and error, try case-insensitive search
      if ((error || !users || users.length === 0) && country) {
        // Get all users and filter client-side (fallback if RLS blocks the query)
        const { data: allUsers, error: allError } = await supabase
          .from("users")
          .select(
            "id, email, first_name, last_name, username, city, created_at, country",
          )
          .eq("is_deleted", false)
          .not("country", "is", null)
          .order("created_at", { ascending: false });

        if (!allError && allUsers) {
          // Filter by country (case-insensitive)
          users = allUsers.filter(
            (u) =>
              u.country &&
              u.country.trim().toLowerCase() === country.trim().toLowerCase(),
          );
          error = null;
        } else if (allError) {
          error = allError;
        }
      }

      if (error) {
        console.error("Error fetching users by country:", error);
        console.error("Country searched:", country);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return [];
      }

      if (!users) {
        console.warn("No users returned for country:", country);
        return [];
      }

      // Get workout counts for each user
      const usersWithStats = await Promise.all(
        (users || []).map(async (user) => {
          let workoutCount = 0;
          try {
            const { count } = await supabase
              .from("workout_sessions")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("status", "completed");
            workoutCount = count || 0;
          } catch (error) {
            console.warn(
              `Could not fetch workout count for user ${user.id}:`,
              error,
            );
          }

          return {
            ...user,
            total_workouts: workoutCount,
          };
        }),
      );

      return usersWithStats;
    } catch (error) {
      console.error("Error fetching users by country:", error);
      return [];
    }
  }

  /**
   * Get user location data for world heatmap
   */
  static async getUserLocations() {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, country, city, created_at")
        .eq("is_deleted", false)
        .not("country", "is", null);

      if (error) {
        console.error("Error fetching user locations:", error);
        return [];
      }

      // Aggregate by country
      const countryCounts = new Map<string, number>();
      const countryDetails: Record<
        string,
        { count: number; cities: Set<string> }
      > = {};

      users?.forEach((user) => {
        if (user.country) {
          const country = user.country.trim();
          countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

          if (!countryDetails[country]) {
            countryDetails[country] = { count: 0, cities: new Set() };
          }
          countryDetails[country].count += 1;
          if (user.city) {
            countryDetails[country].cities.add(user.city.trim());
          }
        }
      });

      // Convert to array format
      return Object.entries(countryDetails)
        .map(([country, data]) => ({
          country,
          userCount: data.count,
          cityCount: data.cities.size,
          cities: Array.from(data.cities).slice(0, 10), // Top 10 cities
        }))
        .sort((a, b) => b.userCount - a.userCount);
    } catch (error) {
      console.error("Error fetching user locations:", error);
      return [];
    }
  }
}
