(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/supabase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-client] (ecmascript)");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://klvosnnkhofhqkwwehev.supabase.co") || 'https://klvosnnkhofhqkwwehev.supabase.co';
const supabaseAnonKey = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsdm9zbm5raG9maHFrd3dlaGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTY3MTgsImV4cCI6MjA3MjQ5MjcxOH0.C6TOPCx3sasiZj1ST3LHTnYOAnzSrcpcQSyEXfFqZlY';
// Lazy initialization to avoid SSR issues
let supabaseInstance = null;
function createSupabaseClient() {
    // Safe check for browser environment
    const isBrowser = ("TURBOPACK compile-time value", "object") !== 'undefined';
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: isBrowser,
            detectSessionInUrl: isBrowser,
            // Only use localStorage in browser - this check prevents SSR errors
            storage: ("TURBOPACK compile-time truthy", 1) ? window.localStorage : "TURBOPACK unreachable"
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    });
}
// Lazy getter - only creates client when first accessed (not at module load)
function getSupabaseClient() {
    if (!supabaseInstance) {
        supabaseInstance = createSupabaseClient();
    }
    return supabaseInstance;
}
const supabase = (()=>{
    // Create a proxy that lazily initializes the client
    return new Proxy({}, {
        get (_target, prop) {
            const client = getSupabaseClient();
            const value = client[prop];
            // If it's a function, bind it to the client
            if (typeof value === 'function') {
                return value.bind(client);
            }
            return value;
        }
    });
})();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/services/coachService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CoachService",
    ()=>CoachService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase.ts [app-client] (ecmascript)");
;
class CoachService {
    /**
   * Get all clients for a coach with their metrics
   */ static async getClients(coachId) {
        try {
            // Query the view directly (RLS should allow coaches to see their clients)
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coach_client_metrics').select('*').eq('coach_id', coachId).order('last_message_at', {
                ascending: false,
                nullsFirst: false
            }).order('user_created_at', {
                ascending: false
            });
            if (error) {
                console.error('Error fetching clients:', error);
                return [];
            }
            // Sort the results (additional client-side sorting for consistency)
            const sorted = (data || []).sort((a, b)=>{
                if (a.last_message_at && b.last_message_at) {
                    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
                }
                if (a.last_message_at) return -1;
                if (b.last_message_at) return 1;
                return new Date(b.user_created_at).getTime() - new Date(a.user_created_at).getTime();
            });
            return sorted;
        } catch (err) {
            console.error('Exception fetching clients:', err);
            return [];
        }
    }
    /**
   * Get commitment history for a specific client
   */ static async getClientCommitmentHistory(userId, coachId) {
        // Try using the function first if coachId is provided
        if (coachId) {
            try {
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].rpc('get_coach_client_commitment_history', {
                    client_uuid: userId,
                    coach_uuid: coachId
                });
                if (!error && data) {
                    return data;
                }
            } catch (err) {
                console.log('Function call failed, trying direct query:', err);
            }
        }
        // Fallback to direct query
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coach_client_commitment_history').select('*').eq('user_id', userId).order('week_start', {
            ascending: false
        });
        if (error) {
            console.error('Error fetching commitment history:', error);
            return [];
        }
        return data || [];
    }
    /**
   * Get workout history for a specific client
   */ static async getClientWorkoutHistory(userId, coachId, limit = 50) {
        // Try using the function first if coachId is provided
        if (coachId) {
            try {
                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].rpc('get_coach_client_workout_history', {
                    client_uuid: userId,
                    coach_uuid: coachId,
                    result_limit: limit
                });
                if (!error && data) {
                    return data;
                }
            } catch (err) {
                console.log('Function call failed, trying direct query:', err);
            }
        }
        // Fallback to direct query
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coach_client_workout_history').select('*').eq('user_id', userId).order('date', {
            ascending: false
        }).order('started_at', {
            ascending: false
        }).limit(limit);
        if (error) {
            console.error('Error fetching workout history:', error);
            return [];
        }
        return data || [];
    }
    /**
   * Get exercise performance for a specific client
   */ static async getClientExercisePerformance(userId, exerciseName) {
        let query = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coach_client_exercise_performance').select('*').eq('user_id', userId).order('workout_date', {
            ascending: false
        }).order('exercise_name', {
            ascending: true
        });
        if (exerciseName) {
            query = query.eq('exercise_name', exerciseName);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching exercise performance:', error);
            throw error;
        }
        return data || [];
    }
    /**
   * Get coach profile
   */ static async getCoachProfile(coachId) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coaches').select('*').eq('id', coachId).single();
        if (error) {
            console.error('Error fetching coach profile:', error);
            return null;
        }
        return data;
    }
    /**
   * Get coach profile by user_id
   */ static async getCoachProfileByUserId(userId) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coaches').select('*').eq('user_id', userId).single();
        if (error) {
            console.error('Error fetching coach profile by user_id:', error);
            return null;
        }
        return data;
    }
    /**
   * Get a single client's metrics
   */ static async getClientMetrics(userId, coachId) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('coach_client_metrics').select('*').eq('user_id', userId).eq('coach_id', coachId).single();
        if (error) {
            console.error('Error fetching client metrics:', error);
            return null;
        }
        return data;
    }
    /**
   * Get user profile information
   */ static async getUserProfile(userId) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('users').select('id, email, first_name, last_name, username, profile_picture_url, birthdate, gender, height_inches, weight_kg, experience_level, fitness_goal, equipment, injury_history, city, country, created_at').eq('id', userId).single();
        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        return data;
    }
    /**
   * Get workout plans history for a user
   */ static async getUserPlansHistory(userId) {
        try {
            // Get all user workouts with base_plan_id
            const { data: userWorkouts, error: uwError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('user_workouts').select('id, workout_id, base_plan_id, created_at').eq('user_id', userId).order('created_at', {
                ascending: false
            });
            if (uwError) {
                console.error('Error fetching user workouts:', uwError);
                return [];
            }
            if (!userWorkouts || userWorkouts.length === 0) {
                console.log('No user workouts found for user:', userId);
                return [];
            }
            console.log('Found user workouts:', userWorkouts.length);
            console.log('Sample user workout:', JSON.stringify(userWorkouts[0], null, 2));
            // Get unique plan IDs from base_plan_id
            const planIds = [
                ...new Set(userWorkouts.map((uw)=>uw.base_plan_id).filter(Boolean))
            ];
            console.log('Plan IDs found from base_plan_id:', planIds);
            console.log('Plan IDs count:', planIds.length);
            if (planIds.length === 0) {
                console.warn('No plan IDs found in user_workouts.base_plan_id');
                console.log('All user workouts:', JSON.stringify(userWorkouts.slice(0, 5), null, 2));
                return [];
            }
            // Get plan details
            const { data: plans, error: plansError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workout_programs').select('plan_id, plan_name').in('plan_id', planIds);
            if (plansError) {
                console.error('Error fetching plans:', plansError);
                return [];
            }
            console.log('Found plans:', plans?.length, plans);
            // Create plan lookup
            const planLookup = new Map(plans?.map((p)=>[
                    p.plan_id,
                    p.plan_name
                ]) || []);
            console.log('Plan lookup map:', Array.from(planLookup.entries()));
            // Get workout IDs
            const workoutIds = userWorkouts.map((uw)=>uw.workout_id).filter(Boolean);
            console.log('Workout IDs to fetch:', workoutIds);
            console.log('Workout IDs count:', workoutIds.length);
            // Get workout details
            const { data: workouts, error: workoutsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workoutss').select('id, title, type').in('id', workoutIds);
            if (workoutsError) {
                console.error('Error fetching workouts:', workoutsError);
                return [];
            }
            console.log('Found workouts:', workouts?.length, workouts);
            // Get completed workout sessions
            const { data: completedSessions, error: sessionsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workout_sessions').select('id, user_workout_id, completed_at, workout_template_id').eq('user_id', userId).eq('status', 'completed').not('completed_at', 'is', null);
            if (sessionsError) {
                console.error('Error fetching workout sessions:', sessionsError);
            }
            // Create workout lookup
            const workoutLookup = new Map(workouts?.map((w)=>[
                    w.id,
                    w
                ]) || []);
            console.log('Workout lookup map size:', workoutLookup.size);
            console.log('Workout lookup keys:', Array.from(workoutLookup.keys()));
            // Group by plan
            const plansMap = new Map();
            console.log('Processing', userWorkouts.length, 'user workouts');
            let skippedNoPlanId = 0;
            let skippedNoWorkout = 0;
            userWorkouts.forEach((uw)=>{
                // Skip if no base_plan_id
                const basePlanId = uw.base_plan_id;
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
                const completedSession = completedSessions?.find((s)=>s.user_workout_id === uw.id || s.workout_template_id === workout.id);
                if (!plansMap.has(planId)) {
                    plansMap.set(planId, {
                        plan_id: planId,
                        plan_name: planName,
                        assigned_at: uw.created_at,
                        workouts: [],
                        total_workouts: 0,
                        completed_workouts: 0,
                        completion_rate: 0
                    });
                }
                const planData = plansMap.get(planId);
                const workoutInPlan = {
                    workout_id: workout.id,
                    workout_title: workout.title,
                    workout_type: workout.type,
                    assigned_at: uw.created_at,
                    completed_at: completedSession?.completed_at || null,
                    status: completedSession ? 'completed' : 'assigned',
                    workout_session_id: completedSession?.id || null
                };
                planData.workouts.push(workoutInPlan);
                planData.total_workouts++;
                if (completedSession) {
                    planData.completed_workouts++;
                }
            });
            console.log('Skipped workouts - no plan_id:', skippedNoPlanId);
            console.log('Skipped workouts - no workout found:', skippedNoWorkout);
            console.log('Plans map size:', plansMap.size);
            console.log('Plans map keys:', Array.from(plansMap.keys()));
            // Calculate completion rates and sort
            const plansArray = Array.from(plansMap.values()).map((plan)=>({
                    ...plan,
                    completion_rate: plan.total_workouts > 0 ? Math.round(plan.completed_workouts / plan.total_workouts * 100) : 0
                }));
            console.log('Final plans array:', plansArray.length, plansArray);
            // Sort by assigned_at (newest first)
            return plansArray.sort((a, b)=>new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());
        } catch (err) {
            console.error('Exception in getUserPlansHistory:', err);
            return [];
        }
    }
    /**
   * Get personal bests for a user by exercise
   */ static async getUserPersonalBests(userId) {
        try {
            // Get completed workout sessions for the user
            const { data: sessions, error: sessionsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('workout_sessions').select('id, completed_at').eq('user_id', userId).eq('status', 'completed').not('completed_at', 'is', null);
            if (sessionsError) {
                console.error('Error fetching workout sessions:', sessionsError);
                return [];
            }
            if (!sessions || sessions.length === 0) {
                return [];
            }
            const sessionIds = sessions.map((s)=>s.id);
            const sessionLookup = new Map(sessions.map((s)=>[
                    s.id,
                    s.completed_at
                ]));
            // Get exercise sets for these sessions
            // Note: exercise_sets table has exercise_name directly, not workout_exercise_id
            const { data: exerciseSets, error: setsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('exercise_sets').select('id, workout_session_id, exercise_name, weight_lbs, reps').in('workout_session_id', sessionIds).eq('is_completed', true);
            if (setsError) {
                console.error('Error fetching exercise sets:', setsError);
                return [];
            }
            if (!exerciseSets || exerciseSets.length === 0) {
                return [];
            }
            // Get unique exercise names to fetch exercise IDs
            const exerciseNames = [
                ...new Set(exerciseSets.map((es)=>es.exercise_name).filter(Boolean))
            ];
            // Get exercise details by name
            const { data: exercises, error: exercisesError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from('exercises').select('id, name').in('name', exerciseNames);
            if (exercisesError) {
                console.error('Error fetching exercises:', exercisesError);
            // Continue without exercise IDs - we can still use exercise names
            }
            // Create exercise lookup (name -> id)
            const exerciseLookup = new Map(exercises?.map((e)=>[
                    e.name,
                    e.id
                ]) || []);
            // Group by exercise and find personal bests
            const bestsMap = new Map();
            exerciseSets.forEach((set)=>{
                if (!set.exercise_name) return;
                const exerciseName = set.exercise_name;
                const exerciseId = exerciseLookup.get(exerciseName) || exerciseName // Fallback to name if ID not found
                ;
                const sessionCompletedAt = sessionLookup.get(set.workout_session_id);
                if (!sessionCompletedAt) return;
                const key = exerciseName // Use name as key since it's more reliable
                ;
                // Calculate volume (weight * reps)
                const volume = set.weight_lbs && set.reps ? Number(set.weight_lbs) * set.reps : null;
                if (!bestsMap.has(key)) {
                    bestsMap.set(key, {
                        exercise_name: exerciseName,
                        exercise_id: exerciseId,
                        max_weight_lbs: null,
                        max_reps: null,
                        max_volume: null,
                        achieved_at: sessionCompletedAt,
                        workout_session_id: set.workout_session_id
                    });
                }
                const best = bestsMap.get(key);
                // Update max weight
                const weightLbs = set.weight_lbs ? Number(set.weight_lbs) : null;
                if (weightLbs && (!best.max_weight_lbs || weightLbs > best.max_weight_lbs)) {
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
            return Array.from(bestsMap.values()).sort((a, b)=>a.exercise_name.localeCompare(b.exercise_name));
        } catch (err) {
            console.error('Exception in getUserPersonalBests:', err);
            return [];
        }
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=lib_1f2eaed6._.js.map