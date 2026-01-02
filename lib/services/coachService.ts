import { supabase } from "../supabase";
import type {
  ClientMetrics,
  CommitmentHistory,
  WorkoutHistory,
  ExercisePerformance,
  CoachProfile,
  UserProfile,
  WorkoutPlan,
  PersonalBest,
  WorkoutInPlan,
  MoaiMetrics,
  MoaiDetail,
  MoaiMemberMetrics,
} from "../types/coach";

export class CoachService {
  /**
   * Get all clients for a coach with their metrics
   */
  static async getClients(coachId: string): Promise<ClientMetrics[]> {
    try {
      // Query the view directly (RLS should allow coaches to see their clients)
      // Only show clients with active subscriptions who are assigned to this coach
      const { data, error } = await supabase
        .from("coach_client_metrics")
        .select("*")
        .eq("coach_id", coachId)
        .eq("subscription_status", "active")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("user_created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error);
        return [];
      }

      // Sort the results (additional client-side sorting for consistency)
      const sorted = (data || []).sort((a: ClientMetrics, b: ClientMetrics) => {
        if (a.last_message_at && b.last_message_at) {
          return (
            new Date(b.last_message_at).getTime() -
            new Date(a.last_message_at).getTime()
          );
        }
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return (
          new Date(b.user_created_at).getTime() -
          new Date(a.user_created_at).getTime()
        );
      });

      return sorted;
    } catch (err) {
      console.error("Exception fetching clients:", err);
      return [];
    }
  }

  /**
   * Get commitment history for a specific client
   */
  static async getClientCommitmentHistory(
    userId: string,
    coachId?: string
  ): Promise<CommitmentHistory[]> {
    // Try using the function first if coachId is provided
    if (coachId) {
      try {
        const { data, error } = await supabase.rpc(
          "get_coach_client_commitment_history",
          {
            client_uuid: userId,
            coach_uuid: coachId,
          }
        );

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.log("Function call failed, trying direct query:", err);
      }
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from("coach_client_commitment_history")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });

    if (error) {
      console.error("Error fetching commitment history:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get workout history for a specific client
   */
  static async getClientWorkoutHistory(
    userId: string,
    coachId?: string,
    limit = 50
  ): Promise<WorkoutHistory[]> {
    // Try using the function first if coachId is provided
    if (coachId) {
      try {
        const { data, error } = await supabase.rpc(
          "get_coach_client_workout_history",
          {
            client_uuid: userId,
            coach_uuid: coachId,
            result_limit: limit,
          }
        );

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.log("Function call failed, trying direct query:", err);
      }
    }

    // Fallback to direct query
    const { data, error } = await supabase
      .from("coach_client_workout_history")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching workout history:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get exercise performance for a specific client
   */
  static async getClientExercisePerformance(
    userId: string,
    exerciseName?: string
  ): Promise<ExercisePerformance[]> {
    let query = supabase
      .from("coach_client_exercise_performance")
      .select("*")
      .eq("user_id", userId)
      .order("workout_date", { ascending: false })
      .order("exercise_name", { ascending: true });

    if (exerciseName) {
      query = query.eq("exercise_name", exerciseName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching exercise performance:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get detailed workout session with exercise sets
   */
  static async getWorkoutSessionDetails(sessionId: string): Promise<{
    session: WorkoutHistory | null
      exercises: Array<{
        exercise_name: string
        sets: Array<{
          id: string
          set_number: number
          weight_lbs: number | null
          reps: number | null
          is_completed: boolean
        }>
      }>
  } | null> {
    try {
      // Get workout session
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .select(
          "id, user_id, workout_template_id, status, started_at, completed_at, total_duration_seconds, notes, rpe"
        )
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        console.error("Error fetching workout session:", sessionError);
        return null;
      }

      // Get workout template info (optional - table might not exist)
      let template: { title: string | null; workout_type: string | null } | null = null
      if (session.workout_template_id) {
        const { data: templateData, error: templateError } = await supabase
          .from("workout_templates")
          .select("title, workout_type")
          .eq("id", session.workout_template_id)
          .single()
        
        if (!templateError && templateData) {
          template = templateData
        }
      }

      // Get exercise sets for this session
      const { data: exerciseSets, error: setsError } = await supabase
        .from("exercise_sets")
        .select("id, exercise_name, weight_lbs, reps, is_completed, created_at")
        .eq("workout_session_id", sessionId);

      if (setsError) {
        console.error("Error fetching exercise sets:", setsError);
        const sessionDate = session.started_at
          ? new Date(session.started_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        return {
          session: {
            session_id: session.id,
            user_id: session.user_id,
            workout_template_id: session.workout_template_id,
            status: session.status,
            started_at: session.started_at,
            completed_at: session.completed_at,
            total_duration_seconds: session.total_duration_seconds,
            date: sessionDate,
            notes: session.notes,
            rpe: session.rpe,
            workout_title: template?.title || null,
            workout_type: template?.workout_type || null,
            total_sets: 0,
            completed_sets: 0,
            exercise_count: 0,
            user_name: null,
            username: null,
          },
          exercises: [],
        };
      }

      if (!exerciseSets || exerciseSets.length === 0) {
        const sessionDate = session.started_at
          ? new Date(session.started_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
        return {
          session: {
            session_id: session.id,
            user_id: session.user_id,
            workout_template_id: session.workout_template_id,
            status: session.status,
            started_at: session.started_at,
            completed_at: session.completed_at,
            total_duration_seconds: session.total_duration_seconds,
            date: sessionDate,
            notes: session.notes,
            rpe: session.rpe,
            workout_title: template?.title || null,
            workout_type: template?.workout_type || null,
            total_sets: 0,
            completed_sets: 0,
            exercise_count: 0,
            user_name: null,
            username: null,
          },
          exercises: [],
        };
      }

      // Group sets by exercise and sort
      const exerciseMap = new Map<string, typeof exerciseSets>();
      exerciseSets.forEach((set) => {
        if (!exerciseMap.has(set.exercise_name)) {
          exerciseMap.set(set.exercise_name, []);
        }
        exerciseMap.get(set.exercise_name)!.push(set);
      });

      // Sort exercises by name, then sort sets within each exercise by created_at
      const exercises = Array.from(exerciseMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by exercise name
        .map(([exercise_name, sets]) => {
          // Sort sets by created_at to maintain order
          const sortedSets = [...sets].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
            return dateA - dateB
          })
          
          return {
            exercise_name,
            sets: sortedSets.map((s, index) => ({
              id: s.id,
              set_number: index + 1, // Use index + 1 as set number
              weight_lbs: s.weight_lbs,
              reps: s.reps,
              is_completed: s.is_completed,
            })),
          }
        });

      const sessionDate = session.started_at
        ? new Date(session.started_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      return {
        session: {
          session_id: session.id,
          user_id: session.user_id,
          workout_template_id: session.workout_template_id,
          status: session.status,
          started_at: session.started_at,
          completed_at: session.completed_at,
          total_duration_seconds: session.total_duration_seconds,
          date: sessionDate,
          notes: session.notes,
          rpe: session.rpe,
          workout_title: template?.title || null,
          workout_type: template?.workout_type || null,
          total_sets: exerciseSets.length,
          completed_sets: exerciseSets.filter((s) => s.is_completed).length,
          exercise_count: exercises.length,
          user_name: null,
          username: null,
        },
        exercises,
      };
    } catch (error) {
      console.error("Error getting workout session details:", error);
      return null;
    }
  }

  /**
   * Get coach profile
   */
  static async getCoachProfile(coachId: string): Promise<CoachProfile | null> {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("id", coachId)
      .single();

    if (error) {
      console.error("Error fetching coach profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Get coach profile by user_id
   */
  static async getCoachProfileByUserId(
    userId: string
  ): Promise<CoachProfile | null> {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching coach profile by user_id:", error);
      return null;
    }

    return data;
  }

  /**
   * Update coach profile
   */
  static async updateCoachProfile(
    coachId: string,
    updates: Partial<{
      name: string;
      first_name: string;
      last_name: string;
      email: string;
      bio: string;
      specializations: string[];
      profile_image_url: string;
      is_available: boolean;
      target_demographic: string;
      age_range_min: number;
      age_range_max: number;
      fitness_goals: string[];
      equipment_focus: string[];
      injury_specializations: string[];
      max_clients: number;
      calendly_event_uri: string | null;
    }>
  ): Promise<CoachProfile | null> {
    const { data, error } = await supabase
      .from("coaches")
      .update(updates)
      .eq("id", coachId)
      .select()
      .single();

    if (error) {
      console.error("Error updating coach profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Upload profile image to Supabase Storage
   * Note: The 'coach-profiles' bucket must exist in Supabase Storage
   * and be configured as public for this to work.
   */
  static async uploadProfileImage(
    coachId: string,
    file: File
  ): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${coachId}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('coach-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting existing files
        });

      if (error) {
        console.error("Error uploading image:", error);
        // If bucket doesn't exist, provide helpful error
        if (error.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket "coach-profiles" not found. Please create it in Supabase Storage settings.');
        }
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('coach-profiles')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Exception uploading image:", err);
      throw err; // Re-throw to allow UI to show error message
    }
  }

  /**
   * Get a single client's metrics
   */
  static async getClientMetrics(
    userId: string,
    coachId: string
  ): Promise<ClientMetrics | null> {
    const { data, error } = await supabase
      .from("coach_client_metrics")
      .select("*")
      .eq("user_id", userId)
      .eq("coach_id", coachId)
      .eq("subscription_status", "active")
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record found

    if (error) {
      // Only log actual errors, not "not found" cases
      // maybeSingle() shouldn't error on "not found", but log if there's a real error
      console.error("Error fetching client metrics:", error);
      return null;
    }

    return data;
  }

  /**
   * Get user profile information
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, first_name, last_name, username, profile_picture_url, birthdate, gender, height_inches, weight_kg, experience_level, fitness_goal, equipment, injury_history, city, country, created_at"
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  }

  /**
   * Get workout plans history for a user
   */
  static async getUserPlansHistory(userId: string): Promise<WorkoutPlan[]> {
    try {
      // Get all user workouts with base_plan_id
      const { data: userWorkouts, error: uwError } = await supabase
        .from("user_workouts")
        .select("id, workout_id, base_plan_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (uwError) {
        console.error("Error fetching user workouts:", uwError);
        return [];
      }

      if (!userWorkouts || userWorkouts.length === 0) {
        console.log("No user workouts found for user:", userId);
        return [];
      }

      console.log("Found user workouts:", userWorkouts.length);
      console.log(
        "Sample user workout:",
        JSON.stringify(userWorkouts[0], null, 2)
      );

      // Get unique plan IDs from base_plan_id
      const planIds = [
        ...new Set(
          userWorkouts.map((uw) => (uw as any).base_plan_id).filter(Boolean)
        ),
      ];

      console.log("Plan IDs found from base_plan_id:", planIds);
      console.log("Plan IDs count:", planIds.length);

      if (planIds.length === 0) {
        console.warn("No plan IDs found in user_workouts.base_plan_id");
        console.log(
          "All user workouts:",
          JSON.stringify(userWorkouts.slice(0, 5), null, 2)
        );
        return [];
      }

      // Get plan details
      const { data: plans, error: plansError } = await supabase
        .from("workout_programs")
        .select("plan_id, plan_name")
        .in("plan_id", planIds);

      if (plansError) {
        console.error("Error fetching plans:", plansError);
        return [];
      }

      console.log("Found plans:", plans?.length, plans);

      // Create plan lookup
      const planLookup = new Map(
        plans?.map((p) => [p.plan_id, p.plan_name]) || []
      );
      console.log("Plan lookup map:", Array.from(planLookup.entries()));

      // Get workout IDs
      const workoutIds = userWorkouts
        .map((uw) => uw.workout_id)
        .filter(Boolean);
      console.log("Workout IDs to fetch:", workoutIds);
      console.log("Workout IDs count:", workoutIds.length);

      // Get workout details
      const { data: workouts, error: workoutsError } = await supabase
        .from("workoutss")
        .select("id, title, type")
        .in("id", workoutIds);

      if (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
        return [];
      }

      console.log("Found workouts:", workouts?.length, workouts);

      // Get completed workout sessions
      const { data: completedSessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, user_workout_id, completed_at, workout_template_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("completed_at", "is", null);

      if (sessionsError) {
        console.error("Error fetching workout sessions:", sessionsError);
      }

      // Create workout lookup
      const workoutLookup = new Map(workouts?.map((w) => [w.id, w]) || []);
      console.log("Workout lookup map size:", workoutLookup.size);
      console.log("Workout lookup keys:", Array.from(workoutLookup.keys()));

      // Group by plan
      const plansMap = new Map<string, WorkoutPlan>();

      console.log("Processing", userWorkouts.length, "user workouts");
      let skippedNoPlanId = 0;
      let skippedNoWorkout = 0;

      userWorkouts.forEach((uw) => {
        // Skip if no base_plan_id
        const basePlanId = (uw as any).base_plan_id;
        if (!basePlanId) {
          skippedNoPlanId++;
          return;
        }

        const planId = basePlanId;
        const planName = planLookup.get(planId) || planId;
        const workout = workoutLookup.get(uw.workout_id);

        if (!workout) {
          skippedNoWorkout++;
          return;
        }

        const completedSession = completedSessions?.find(
          (s) =>
            s.user_workout_id === uw.id || s.workout_template_id === workout.id
        );

        if (!plansMap.has(planId)) {
          plansMap.set(planId, {
            plan_id: planId,
            plan_name: planName,
            assigned_at: uw.created_at,
            workouts: [],
            total_workouts: 0,
            completed_workouts: 0,
            completion_rate: 0,
          });
        }

        const planData = plansMap.get(planId)!;
        const workoutInPlan: WorkoutInPlan = {
          workout_id: workout.id,
          workout_title: workout.title,
          workout_type: workout.type,
          assigned_at: uw.created_at,
          completed_at: completedSession?.completed_at || null,
          status: completedSession ? "completed" : "assigned",
          workout_session_id: completedSession?.id || null,
        };

        planData.workouts.push(workoutInPlan);
        planData.total_workouts++;
        if (completedSession) {
          planData.completed_workouts++;
        }
      });

      console.log("Skipped workouts - no plan_id:", skippedNoPlanId);
      console.log("Skipped workouts - no workout found:", skippedNoWorkout);
      console.log("Plans map size:", plansMap.size);
      console.log("Plans map keys:", Array.from(plansMap.keys()));

      // Calculate completion rates and sort
      const plansArray = Array.from(plansMap.values()).map((plan) => ({
        ...plan,
        completion_rate:
          plan.total_workouts > 0
            ? Math.round((plan.completed_workouts / plan.total_workouts) * 100)
            : 0,
      }));

      console.log("Final plans array:", plansArray.length, plansArray);

      // Sort by assigned_at (newest first)
      return plansArray.sort(
        (a, b) =>
          new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );
    } catch (err) {
      console.error("Exception in getUserPlansHistory:", err);
      return [];
    }
  }

  /**
   * Get weekly assigned workouts for a user based on their commitment
   */
  static async getWeeklyAssignedWorkouts(userId: string, weekStart?: string): Promise<WorkoutInPlan[]> {
    try {
      // Calculate current week start (Monday) if not provided
      let weekStartDate: Date
      if (weekStart) {
        weekStartDate = new Date(weekStart + 'T00:00:00') // Parse as local date
      } else {
        const now = new Date()
        weekStartDate = new Date(now)
        const dayOfWeek = weekStartDate.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        weekStartDate.setDate(weekStartDate.getDate() - daysToMonday)
        // Set to start of day (midnight) in local time
        weekStartDate.setHours(0, 0, 0, 0)
      }
      
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7) // End of week (next Monday)
      
      // Format as YYYY-MM-DD in local time (not UTC)
      const year = weekStartDate.getFullYear()
      const month = String(weekStartDate.getMonth() + 1).padStart(2, '0')
      const day = String(weekStartDate.getDate()).padStart(2, '0')
      const weekStartStr = `${year}-${month}-${day}`
      
      const yearEnd = weekEndDate.getFullYear()
      const monthEnd = String(weekEndDate.getMonth() + 1).padStart(2, '0')
      const dayEnd = String(weekEndDate.getDate()).padStart(2, '0')
      const weekEndStr = `${yearEnd}-${monthEnd}-${dayEnd}`
      
      const today = new Date()
      console.log(`Week calculation for user ${userId}:`, {
        today: today.toLocaleDateString(),
        todayDayOfWeek: today.getDay(), // 0=Sunday, 1=Monday, etc.
        calculatedMonday: weekStartStr,
        weekStartDate: weekStartDate.toLocaleDateString(),
      })

      // First, check what week_of values exist for this user (for debugging)
      const { data: allUserWorkoutsSample, error: sampleError } = await supabase
        .from("user_workouts")
        .select("week_of, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (!sampleError && allUserWorkoutsSample) {
        const uniqueWeekOfs = [...new Set(allUserWorkoutsSample.map(uw => uw.week_of).filter(Boolean))]
        console.log(`Sample week_of values for user ${userId}:`, uniqueWeekOfs)
      }

      // Get user workouts for this specific week using week_of column
      const { data: userWorkouts, error: uwError } = await supabase
        .from("user_workouts")
        .select("id, workout_id, base_plan_id, created_at, week_of")
        .eq("user_id", userId)
        .eq("week_of", weekStartStr) // Filter by the week_of column
        .order("created_at", { ascending: true })

      if (uwError) {
        console.error("Error fetching weekly user workouts:", uwError)
        return []
      }

      console.log(`Weekly workouts for user ${userId} (week_of: ${weekStartStr}):`, {
        count: userWorkouts?.length || 0,
        workouts: userWorkouts,
        weekOfValues: userWorkouts?.map(uw => uw.week_of), // Show all week_of values found
      })

      if (!userWorkouts || userWorkouts.length === 0) {
        console.log(`No user workouts found for week ${weekStartStr}`)
        return []
      }

      // Get workout details
      const workoutIds = userWorkouts.map((uw) => uw.workout_id).filter(Boolean)
      if (workoutIds.length === 0) {
        return []
      }

      const { data: workouts, error: workoutsError } = await supabase
        .from("workoutss")
        .select("id, title, type")
        .in("id", workoutIds)

      if (workoutsError) {
        console.error("Error fetching workouts:", workoutsError)
        return []
      }

      const workoutLookup = new Map(workouts?.map((w) => [w.id, w]) || [])

      // Get completed workout sessions for this week
      const { data: completedSessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, user_workout_id, completed_at, workout_template_id")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", weekStartStr)
        .lt("completed_at", weekEndStr)

      if (sessionsError) {
        console.error("Error fetching workout sessions:", sessionsError)
      }

      // Map user workouts to WorkoutInPlan format
      const weeklyWorkouts: WorkoutInPlan[] = userWorkouts.map((uw) => {
        const workout = workoutLookup.get(uw.workout_id)
        const completedSession = completedSessions?.find(
          (s) => s.user_workout_id === uw.id || s.workout_template_id === workout?.id
        )

        return {
          workout_id: uw.workout_id,
          workout_title: workout?.title || "Unknown Workout",
          workout_type: workout?.type || "unknown",
          assigned_at: uw.created_at,
          completed_at: completedSession?.completed_at || null,
          status: completedSession ? "completed" : "assigned",
          workout_session_id: completedSession?.id || null,
        }
      })

      console.log(`Mapped weekly workouts for user ${userId}:`, {
        count: weeklyWorkouts.length,
        workouts: weeklyWorkouts,
      })

      return weeklyWorkouts
    } catch (err) {
      console.error("Exception in getWeeklyAssignedWorkouts:", err)
      return []
    }
  }

  /**
   * Get personal bests for a user by exercise
   */
  static async getUserPersonalBests(userId: string): Promise<PersonalBest[]> {
    try {
      // Get completed workout sessions for the user
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("id, completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("completed_at", "is", null);

      if (sessionsError) {
        console.error("Error fetching workout sessions:", sessionsError);
        return [];
      }

      if (!sessions || sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map((s) => s.id);
      const sessionLookup = new Map(
        sessions.map((s) => [s.id, s.completed_at])
      );

      // Get exercise sets for these sessions
      // Note: exercise_sets table has exercise_name directly, not workout_exercise_id
      const { data: exerciseSets, error: setsError } = await supabase
        .from("exercise_sets")
        .select("id, workout_session_id, exercise_name, weight_lbs, reps")
        .in("workout_session_id", sessionIds)
        .eq("is_completed", true);

      if (setsError) {
        console.error("Error fetching exercise sets:", setsError);
        return [];
      }

      if (!exerciseSets || exerciseSets.length === 0) {
        return [];
      }

      // Get unique exercise names to fetch exercise IDs
      const exerciseNames = [
        ...new Set(exerciseSets.map((es) => es.exercise_name).filter(Boolean)),
      ];

      // Get exercise details by name
      const { data: exercises, error: exercisesError } = await supabase
        .from("exercises")
        .select("id, name")
        .in("name", exerciseNames);

      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
        // Continue without exercise IDs - we can still use exercise names
      }

      // Create exercise lookup (name -> id)
      const exerciseLookup = new Map(
        exercises?.map((e) => [e.name, e.id]) || []
      );

      // Group by exercise and find personal bests
      const bestsMap = new Map<string, PersonalBest>();

      exerciseSets.forEach((set) => {
        if (!set.exercise_name) return;

        const exerciseName = set.exercise_name;
        const exerciseId = exerciseLookup.get(exerciseName) || exerciseName; // Fallback to name if ID not found
        const sessionCompletedAt = sessionLookup.get(set.workout_session_id);
        if (!sessionCompletedAt) return;

        const key = exerciseName; // Use name as key since it's more reliable

        // Calculate volume (weight * reps)
        const volume =
          set.weight_lbs && set.reps ? Number(set.weight_lbs) * set.reps : null;

        if (!bestsMap.has(key)) {
          bestsMap.set(key, {
            exercise_name: exerciseName,
            exercise_id: exerciseId,
            max_weight_lbs: null,
            max_reps: null,
            max_volume: null,
            achieved_at: sessionCompletedAt,
            workout_session_id: set.workout_session_id,
          });
        }

        const best = bestsMap.get(key)!;

        // Update max weight
        const weightLbs = set.weight_lbs ? Number(set.weight_lbs) : null;
        if (
          weightLbs &&
          (!best.max_weight_lbs || weightLbs > best.max_weight_lbs)
        ) {
          best.max_weight_lbs = weightLbs;
          best.achieved_at = sessionCompletedAt;
          best.workout_session_id = set.workout_session_id;
        }

        // Update max reps
        if (set.reps && (!best.max_reps || set.reps > best.max_reps)) {
          best.max_reps = set.reps;
          if (!best.max_weight_lbs || weightLbs === best.max_weight_lbs) {
            best.achieved_at = sessionCompletedAt;
            best.workout_session_id = set.workout_session_id;
          }
        }

        // Update max volume
        if (volume && (!best.max_volume || volume > best.max_volume)) {
          best.max_volume = volume;
          if (!best.max_weight_lbs || weightLbs === best.max_weight_lbs) {
            best.achieved_at = sessionCompletedAt;
            best.workout_session_id = set.workout_session_id;
          }
        }
      });

      return Array.from(bestsMap.values()).sort((a, b) =>
        a.exercise_name.localeCompare(b.exercise_name)
      );
    } catch (err) {
      console.error("Exception in getUserPersonalBests:", err);
      return [];
    }
  }

  /**
   * Get workout template details with exercises, sets, and reps
   */
  static async getWorkoutTemplateDetails(workoutId: string): Promise<{
    workout_id: string
    title: string
    type: string
    exercises: Array<{
      exercise_name: string
      sets: Array<{
        set_number: number
        target_reps: number | null
        target_weight_lbs: number | null
      }>
    }>
  } | null> {
    try {
      // Get workout template
      const { data: workout, error: workoutError } = await supabase
        .from("workoutss")
        .select("id, title, type")
        .eq("id", workoutId)
        .single()

      if (workoutError || !workout) {
        console.error("Error fetching workout template:", workoutError)
        return null
      }

      // Get workout exercises - first query all columns to see what exists
      let workoutExercises: any[] = []
      let exercisesError: any = null

      // Query all columns to discover the actual schema
      const { data: workoutExercisesData, error: dataError } = await supabase
        .from("workout_exercises")
        .select("*")
        .eq("workout_id", workoutId)
        .limit(10)

      if (dataError) {
        console.error("Error fetching workout exercises:", dataError)
        exercisesError = dataError
      } else if (workoutExercisesData && workoutExercisesData.length > 0) {
        // Log the actual columns to help debug
        console.log("workout_exercises actual columns:", Object.keys(workoutExercisesData[0]))
        console.log("workout_exercises sample row:", workoutExercisesData[0])
        
        // Get unique exercise IDs (try different possible column names)
        const exerciseIds: string[] = []
        workoutExercisesData.forEach((row: any) => {
          if (row.exercise_id) exerciseIds.push(row.exercise_id)
        })
        
        if (exerciseIds.length > 0) {
          // Fetch exercise names from exercises table
          const { data: exercises, error: exercisesNameError } = await supabase
            .from("exercises")
            .select("id, name")
            .in("id", [...new Set(exerciseIds)])

          if (exercisesNameError) {
            console.error("Error fetching exercise names:", exercisesNameError)
            exercisesError = exercisesNameError
          } else if (exercises) {
            // Create a map of exercise_id -> exercise_name
            const exerciseNameMap = new Map(exercises.map((e: any) => [e.id, e.name]))
            
            // Map workout exercises - use whatever columns actually exist
            workoutExercises = workoutExercisesData.map((row: any) => {
              const exerciseName = exerciseNameMap.get(row.exercise_id) || null
              
              // Try to find set number, reps, and weight columns (could be various names)
              const setNumber = row.set_number || row.set_num || row.set || row.order || null
              const targetReps = row.target_reps || row.reps || row.rep_count || null
              const targetWeight = row.target_weight_lbs || row.weight_lbs || row.weight || row.target_weight || null
              
              return {
                exercise_name: exerciseName,
                set_number: setNumber,
                target_reps: targetReps,
                target_weight_lbs: targetWeight,
              }
            }).filter((ex: any) => ex.exercise_name) // Filter out any without names
          }
        }
      }

      if (exercisesError || workoutExercises.length === 0) {
        console.warn("Could not fetch workout exercises, returning workout without exercise details")
        return {
          workout_id: workout.id,
          title: workout.title || "Unknown Workout",
          type: workout.type || "unknown",
          exercises: [],
        }
      }

      // Group exercises by name
      const exercisesMap = new Map<string, Array<{ set_number: number; target_reps: number | null; target_weight_lbs: number | null }>>()
      workoutExercises.forEach((ex: any) => {
        if (!ex.exercise_name) return
        if (!exercisesMap.has(ex.exercise_name)) {
          exercisesMap.set(ex.exercise_name, [])
        }
        exercisesMap.get(ex.exercise_name)!.push({
          set_number: ex.set_number,
          target_reps: ex.target_reps,
          target_weight_lbs: ex.target_weight_lbs,
        })
      })

      return {
        workout_id: workout.id,
        title: workout.title || "Unknown Workout",
        type: workout.type || "unknown",
        exercises: Array.from(exercisesMap.entries()).map(([exercise_name, sets]) => ({
          exercise_name,
          sets,
        })),
      }
    } catch (err) {
      console.error("Exception in getWorkoutTemplateDetails:", err)
      return null
    }
  }

  /**
   * Get all Moais that a coach is subscribed to
   */
  static async getMoais(coachId: string): Promise<MoaiMetrics[]> {
    try {
      // Get all active Moai coach subscriptions for this coach using RPC function (bypasses RLS)
      const { data: subscriptions, error: subsError } = await supabase.rpc(
        "get_coach_moai_subscriptions",
        { p_coach_id: coachId }
      );

      if (subsError) {
        console.error("Error fetching Moai subscriptions:", subsError);
        return [];
      }

      if (!subscriptions || subscriptions.length === 0) {
        return [];
      }

      const moaiIds = subscriptions.map((s: any) => s.moai_id);
      const subscriptionMap = new Map(
        subscriptions.map((s: any) => [s.moai_id, s.started_at])
      );

      // Get circle details
      const { data: circles, error: circlesError } = await supabase
        .from("circles")
        .select("id, name, status, created_at, activated_at")
        .in("id", moaiIds);

      if (circlesError) {
        console.error("Error fetching circles:", circlesError);
        return [];
      }

      // Get member counts
      const { data: members, error: membersError } = await supabase
        .from("circle_members")
        .select("circle_id, status")
        .in("circle_id", moaiIds)
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching members:", membersError);
      }

      const memberCounts = new Map<string, number>();
      members?.forEach((m) => {
        memberCounts.set(m.circle_id, (memberCounts.get(m.circle_id) || 0) + 1);
      });

      // Get chat info (last message, unread count)
      const { data: chats, error: chatsError } = await supabase
        .from("moai_chats")
        .select("id, circle_id, last_message_at")
        .in("circle_id", moaiIds);

      if (chatsError) {
        console.error("Error fetching chats:", chatsError);
      }

      const chatMap = new Map<string, { id: string; last_message_at: string | null }>();
      chats?.forEach((c) => {
        chatMap.set(c.circle_id, { id: c.id, last_message_at: c.last_message_at });
      });

      // Get unread message counts for coach (messages from when coach was added)
      const moaiMetrics: MoaiMetrics[] = [];

      for (const circle of circles || []) {
        const subscriptionStart = subscriptionMap.get(circle.id);
        const chat = chatMap.get(circle.id);
        const memberCount = memberCounts.get(circle.id) || 0;

        // Get unread messages count (messages after subscription start, not from coach)
        let unreadCount = 0;
        if (chat && subscriptionStart) {
          const { count } = await supabase
            .from("moai_chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("moai_chat_id", chat.id)
            .eq("is_deleted", false)
            .eq("is_coach", false) // Only count member messages
            .gte("timestamp", subscriptionStart);

          unreadCount = count || 0;
        }

        // Get current week commitment stats for the Moai
        // Note: week_start in database is stored as Monday (not Sunday)
        const currentWeekStart = new Date();
        const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
        // Calculate Monday of current week: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
        const currentWeekStartStr = currentWeekStart.toISOString().split("T")[0];

        // Get all active members
        const { data: activeMembers } = await supabase
          .from("circle_members")
          .select("user_id, joined_at")
          .eq("circle_id", circle.id)
          .eq("status", "active");

        const memberUserIds = activeMembers?.map((m) => m.user_id) || [];
        const memberJoinDates = new Map(
          activeMembers?.map((m) => [m.user_id, m.joined_at]) || []
        );

        // Get current week commitments for all members using RPC function (bypasses RLS)
        let currentWeekCommitment = 0;
        let currentWeekCompleted = 0;
        if (memberUserIds.length > 0) {
          const { data: commitments } = await supabase.rpc(
            "get_moai_members_weekly_commitments",
            {
              p_user_ids: memberUserIds,
              p_week_start: currentWeekStartStr,
            }
          );

          commitments?.forEach((c: any) => {
            const memberJoinedAt = memberJoinDates.get(c.user_id);
            if (memberJoinedAt && new Date(currentWeekStartStr) >= new Date(memberJoinedAt)) {
              currentWeekCommitment += c.commitment_count || 0;
              currentWeekCompleted += c.completed_sessions || 0;
            }
          });
        }

        // Get overall stats using RPC function (bypasses RLS) - show ALL historical data
        let overallCommitment = 0;
        let overallCompleted = 0;
        if (memberUserIds.length > 0) {
          const { data: allCommitments } = await supabase.rpc(
            "get_moai_members_weekly_commitments",
            {
              p_user_ids: memberUserIds,
              p_week_start: null, // Get all weeks
            }
          );

          allCommitments?.forEach((c: any) => {
            const memberJoinedAt = memberJoinDates.get(c.user_id);
            // Only filter by member join date, not coach subscription
            if (
              memberJoinedAt &&
              new Date(c.week_start) >= new Date(memberJoinedAt)
            ) {
              overallCommitment += c.commitment_count || 0;
              overallCompleted += c.completed_sessions || 0;
            }
          });
        }

        // Get total workouts - show ALL historical data
        let totalWorkouts = 0;
        if (memberUserIds.length > 0) {
          const { count } = await supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .in("user_id", memberUserIds)
            .eq("status", "completed");

          totalWorkouts = count || 0;
        }

        const currentWeekRate =
          currentWeekCommitment > 0
            ? (currentWeekCompleted / currentWeekCommitment) * 100
            : 0;
        const overallRate =
          overallCommitment > 0 ? (overallCompleted / overallCommitment) * 100 : 0;

        moaiMetrics.push({
          moai_id: circle.id,
          moai_name: circle.name,
          status: circle.status as "forming" | "active" | "inactive",
          member_count: memberCount,
          coach_subscription_started_at: subscriptionStart || circle.created_at,
          last_message_at: chat?.last_message_at || null,
          unread_messages_count: unreadCount,
          current_week_commitment: currentWeekCommitment,
          current_week_completed: currentWeekCompleted,
          current_week_completion_rate: currentWeekRate,
          overall_completion_rate: overallRate,
          total_workouts: totalWorkouts,
          created_at: circle.created_at,
          activated_at: circle.activated_at,
        });
      }

      // Sort by last message or created date
      return moaiMetrics.sort((a, b) => {
        if (a.last_message_at && b.last_message_at) {
          return (
            new Date(b.last_message_at).getTime() -
            new Date(a.last_message_at).getTime()
          );
        }
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (err) {
      console.error("Exception in getMoais:", err);
      return [];
    }
  }

  /**
   * Get detailed Moai information for a coach
   */
  static async getMoaiDetail(
    moaiId: string,
    coachId: string
  ): Promise<MoaiDetail | null> {
    try {
      // Verify coach has access to this Moai using RPC function (bypasses RLS)
      const { data: subscriptions, error: subError } = await supabase.rpc(
        "get_coach_moai_subscriptions",
        { p_coach_id: coachId }
      );

      const subscription = subscriptions?.find((s: any) => s.moai_id === moaiId);

      if (subError || !subscription) {
        console.error("Coach does not have access to this Moai:", subError);
        return null;
      }

      const subscriptionStart = subscription.started_at;

      // Get circle details
      const { data: circle, error: circleError } = await supabase
        .from("circles")
        .select("*")
        .eq("id", moaiId)
        .single();

      if (circleError || !circle) {
        console.error("Error fetching circle:", circleError);
        return null;
      }

      // Get active members
      const { data: members, error: membersError } = await supabase
        .from("circle_members")
        .select("user_id, joined_at, status")
        .eq("circle_id", moaiId)
        .eq("status", "active");

      if (membersError) {
        console.error("Error fetching members:", membersError);
        return null;
      }

      const memberUserIds = members?.map((m) => m.user_id) || [];
      const memberJoinDates = new Map(
        members?.map((m) => [m.user_id, m.joined_at]) || []
      );

      // Get member details with metrics
      const memberDetails: MoaiMemberMetrics[] = await Promise.all(
        (members || []).map(async (member) => {
          const { data: user } = await supabase
            .from("users")
            .select("email, username, first_name, last_name, profile_picture_url")
            .eq("id", member.user_id)
            .single();

          // Get current week stats using RPC function (bypasses RLS)
          // Note: week_start in database is stored as Monday (not Sunday)
          const currentWeekStart = new Date();
          const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
          // Calculate Monday of current week: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
          const currentWeekStartStr = currentWeekStart.toISOString().split("T")[0];

          const { data: currentWeekData, error: currentWeekError } = await supabase.rpc(
            "get_moai_member_weekly_commitments",
            {
              p_user_id: member.user_id,
              p_week_start: currentWeekStartStr,
            }
          );
          
          if (currentWeekError) {
            console.error(`Error fetching current week for user ${member.user_id}:`, currentWeekError);
          }
          
          console.log(`Current week data for ${member.user_id}:`, {
            currentWeekStartStr,
            currentWeekData,
            isArray: Array.isArray(currentWeekData),
            length: Array.isArray(currentWeekData) ? currentWeekData.length : 0,
          });
          
          const currentWeek = Array.isArray(currentWeekData) && currentWeekData.length > 0 
            ? currentWeekData[0] 
            : null;

          // Get overall stats (show ALL historical data, not filtered by coach subscription) using RPC function
          const { data: allCommitmentsData } = await supabase.rpc(
            "get_moai_member_weekly_commitments",
            {
              p_user_id: member.user_id,
              p_week_start: null, // Get all weeks
            }
          );
          
          // Filter only by member join date (not coach subscription start)
          const memberJoinedDate = new Date(member.joined_at).toISOString().split('T')[0];
          
          const allCommitments = (allCommitmentsData || []).filter(
            (c: any) => {
              // week_start is already in 'YYYY-MM-DD' format from the RPC function
              const weekStartDate = c.week_start?.split('T')[0] || c.week_start;
              return weekStartDate >= memberJoinedDate;
            }
          );

          const totalCommitment = allCommitments?.reduce(
            (sum: number, c: any) => sum + (c.commitment_count || 0),
            0
          ) || 0;
          const totalCompleted = allCommitments?.reduce(
            (sum: number, c: any) => sum + (c.completed_sessions || 0),
            0
          ) || 0;
          const overallRate =
            totalCommitment > 0 ? (totalCompleted / totalCommitment) * 100 : 0;

          // Get workout count (show ALL historical data, not filtered by coach subscription)
          const { count: workoutCount } = await supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", member.user_id)
            .eq("status", "completed")
            .gte("created_at", member.joined_at);

          return {
            user_id: member.user_id,
            email: user?.email || "",
            username: user?.username,
            first_name: user?.first_name,
            last_name: user?.last_name,
            profile_picture_url: user?.profile_picture_url,
            joined_at: member.joined_at,
            current_week_commitment: currentWeek?.commitment_count || 0,
            current_week_completed: currentWeek?.completed_sessions || 0,
            current_week_completion_rate:
              currentWeek?.commitment_count && currentWeek.commitment_count > 0
                ? (currentWeek.completed_sessions / currentWeek.commitment_count) * 100
                : 0,
            overall_completion_rate: overallRate,
            total_workouts: workoutCount || 0,
            total_commitment_weeks: allCommitments?.length || 0,
          };
        })
      );

      // Get Moai-level commitment history (aggregate by week) using RPC function (bypasses RLS)
      // Show ALL historical data, not filtered by coach subscription start
      const { data: allCommitmentsData, error: commitmentsError } = await supabase.rpc(
        "get_moai_members_weekly_commitments",
        {
          p_user_ids: memberUserIds,
          p_week_start: null, // Get all weeks
        }
      );

      if (commitmentsError) {
        console.error("Error fetching Moai commitment history:", commitmentsError);
      }
      
      // Sort all commitments by date (descending) - no filtering by coach subscription
      // Note: week_start is a DATE, returned as 'YYYY-MM-DD' string from RPC
      const allCommitments = (allCommitmentsData || [])
        .sort((a: any, b: any) => {
          // Sort descending by date
          const dateA = a.week_start?.split('T')[0] || a.week_start;
          const dateB = b.week_start?.split('T')[0] || b.week_start;
          return dateB.localeCompare(dateA);
        })
        .slice(0, 52);

      // Aggregate by week, only counting weeks where member was in the Moai (no coach subscription filter)
      const moaiCommitmentHistory: Record<
        string,
        { commitment: number; completed: number; members: Set<string> }
      > = {};

      allCommitments?.forEach((c: any) => {
        // week_start is already in 'YYYY-MM-DD' format from the RPC function
        const weekStartDate = c.week_start?.split('T')[0] || c.week_start;
        const memberJoinedAt = memberJoinDates.get(c.user_id);
        const memberJoinedDate = memberJoinedAt 
          ? new Date(memberJoinedAt).toISOString().split('T')[0] 
          : null;

        // Only count if the week started after the member joined (no coach subscription filter)
        if (memberJoinedDate && weekStartDate >= memberJoinedDate) {
          const week = weekStartDate; // Use normalized date string as key
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
        .sort((a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime())
        .slice(0, 12); // Last 12 weeks

      // Get Moai workout stats (show ALL historical data, not filtered by coach subscription)
      const { data: allWorkouts } = await supabase
        .from("workout_sessions")
        .select("id, status, created_at, user_id")
        .in("user_id", memberUserIds);

      // Filter workouts only by member join date (not coach subscription start)
      const filteredWorkouts =
        allWorkouts?.filter((w) => {
          const workoutDate = new Date(w.created_at);
          const memberJoinedAt = memberJoinDates.get(w.user_id);
          // Only filter by member join date, not coach subscription
          return memberJoinedAt && workoutDate >= new Date(memberJoinedAt);
        }) || [];

      const totalWorkouts = filteredWorkouts.length;
      const completedWorkouts = filteredWorkouts.filter(
        (w) => w.status === "completed"
      ).length;
      const workoutCompletionRate =
        totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

      return {
        id: circle.id,
        name: circle.name,
        status: circle.status as "forming" | "active" | "inactive",
        created_at: circle.created_at,
        activated_at: circle.activated_at,
        member_count: memberDetails.length,
        coach_subscription_started_at: subscriptionStart,
        members: memberDetails,
        moai_commitment_history: moaiHistory,
        moai_workout_stats: {
          total_workouts: totalWorkouts,
          completed_workouts: completedWorkouts,
          average_completion_rate: workoutCompletionRate,
        },
        weeks_active: moaiHistory.length,
      };
    } catch (err) {
      console.error("Exception in getMoaiDetail:", err);
      return null;
    }
  }
}
