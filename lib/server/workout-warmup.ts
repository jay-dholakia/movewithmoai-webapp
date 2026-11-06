import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WarmupCatalog,
  WarmupOverrideInput,
  WarmupRoutine,
  WarmupSlot,
} from "@/lib/types/warmup";

const DURATION_RANGE = { min: 5, max: 300 };
const REPS_RANGE = { min: 1, max: 50 };

type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function getWarmupCatalog(
  admin: SupabaseClient,
): Promise<Result<WarmupCatalog>> {
  const [stretchesRes, routinesRes, slotsRes] = await Promise.all([
    admin
      .from("stretches")
      .select("id, name, description, youtube_url")
      .eq("is_active", true)
      .order("name"),
    admin.from("warmup_routines").select("id, name, workout_focus").order("id"),
    admin
      .from("warmup_routine_stretches")
      .select("routine_id, sequence, stretch_id, duration_seconds, reps, per_side")
      .order("sequence"),
  ]);
  const error = stretchesRes.error || routinesRes.error || slotsRes.error;
  if (error) return { ok: false, error: error.message, status: 400 };

  const routines: WarmupRoutine[] = (routinesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    workout_focus: r.workout_focus,
    slots: (slotsRes.data ?? [])
      .filter((s) => s.routine_id === r.id)
      .map(({ routine_id: _routineId, ...slot }) => slot),
  }));
  return { ok: true, data: { stretches: stretchesRes.data ?? [], routines } };
}

export async function getResolvedWarmup(
  admin: SupabaseClient,
  workoutId: string,
): Promise<Result<WarmupSlot[]>> {
  const { data, error } = await admin.rpc("get_workout_warmup", {
    p_workout_id: workoutId,
  });
  if (error) return { ok: false, error: error.message, status: 400 };
  return { ok: true, data: (data ?? []) as WarmupSlot[] };
}

function parseOverrideInput(body: unknown): Result<WarmupOverrideInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const stretchId = typeof b.stretch_id === "string" ? b.stretch_id.trim() : "";
  if (!stretchId) return { ok: false, error: "stretch_id is required", status: 400 };

  const duration =
    b.duration_seconds === null || b.duration_seconds === undefined || b.duration_seconds === ""
      ? null
      : Number(b.duration_seconds);
  const reps =
    b.reps === null || b.reps === undefined || b.reps === "" ? null : Number(b.reps);

  if ((duration == null) === (reps == null)) {
    return {
      ok: false,
      error: "Set exactly one of duration_seconds or reps",
      status: 400,
    };
  }
  if (
    duration != null &&
    (!Number.isInteger(duration) || duration < DURATION_RANGE.min || duration > DURATION_RANGE.max)
  ) {
    return {
      ok: false,
      error: `duration_seconds must be a whole number between ${DURATION_RANGE.min} and ${DURATION_RANGE.max}`,
      status: 400,
    };
  }
  if (
    reps != null &&
    (!Number.isInteger(reps) || reps < REPS_RANGE.min || reps > REPS_RANGE.max)
  ) {
    return {
      ok: false,
      error: `reps must be a whole number between ${REPS_RANGE.min} and ${REPS_RANGE.max}`,
      status: 400,
    };
  }
  return {
    ok: true,
    data: { stretch_id: stretchId, duration_seconds: duration, reps, per_side: Boolean(b.per_side) },
  };
}

/**
 * Replaces one slot of a workout's warmup (that workout only). Submitting the
 * default slot's exact values removes the override, so defaults stay the
 * source of truth.
 */
export async function upsertWarmupOverride(
  admin: SupabaseClient,
  params: { workoutId: string; sequence: number; body: unknown; userId: string },
): Promise<Result<WarmupSlot[]>> {
  const { workoutId, sequence, body, userId } = params;
  if (!Number.isInteger(sequence) || sequence < 1) {
    return { ok: false, error: "Invalid sequence", status: 400 };
  }
  const parsed = parseOverrideInput(body);
  if (!parsed.ok) return parsed;
  const input = parsed.data;

  const { data: workout } = await admin
    .from("workoutss")
    .select("id, type")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return { ok: false, error: "Workout not found", status: 404 };

  const { data: routine } = await admin
    .from("warmup_routines")
    .select("id")
    .eq("workout_focus", workout.type)
    .maybeSingle();
  if (!routine) {
    return { ok: false, error: "No warmup routine for this workout's focus", status: 400 };
  }

  const { data: defaultSlot } = await admin
    .from("warmup_routine_stretches")
    .select("stretch_id, duration_seconds, reps, per_side")
    .eq("routine_id", routine.id)
    .eq("sequence", sequence)
    .maybeSingle();
  if (!defaultSlot) {
    return { ok: false, error: "This warmup has no stretch at that position", status: 400 };
  }

  const { data: stretch } = await admin
    .from("stretches")
    .select("id")
    .eq("id", input.stretch_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!stretch) return { ok: false, error: "Unknown stretch", status: 400 };

  const current = await getResolvedWarmup(admin, workoutId);
  if (!current.ok) return current;
  const duplicate = findDuplicateSlot(current.data, sequence, input.stretch_id);
  if (duplicate) return duplicateStretchError(duplicate);

  const matchesDefault =
    defaultSlot.stretch_id === input.stretch_id &&
    defaultSlot.duration_seconds === input.duration_seconds &&
    defaultSlot.reps === input.reps &&
    defaultSlot.per_side === input.per_side;

  const { error } = matchesDefault
    ? await admin
        .from("workout_warmup_overrides")
        .delete()
        .eq("workout_id", workoutId)
        .eq("sequence", sequence)
    : await admin.from("workout_warmup_overrides").upsert(
        {
          workout_id: workoutId,
          sequence,
          ...input,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workout_id,sequence" },
      );
  if (error) return { ok: false, error: error.message, status: 400 };

  return getResolvedWarmup(admin, workoutId);
}

/** Resets one slot (when `sequence` is given) or the whole warmup to the defaults. */
function findDuplicateSlot(
  slots: WarmupSlot[],
  sequence: number,
  stretchId: string,
): WarmupSlot | undefined {
  return slots.find((s) => s.sequence !== sequence && s.stretch_id === stretchId);
}

function duplicateStretchError(slot: WarmupSlot): Result<never> {
  return {
    ok: false,
    error: `${slot.name} is already stretch ${slot.sequence} of this warmup`,
    status: 409,
  };
}

export async function resetWarmupOverrides(
  admin: SupabaseClient,
  workoutId: string,
  sequence?: number,
): Promise<Result<WarmupSlot[]>> {
  // Resetting one slot restores its default stretch, which another slot may
  // have been replaced with in the meantime.
  if (sequence != null) {
    const current = await getResolvedWarmup(admin, workoutId);
    if (!current.ok) return current;
    const slot = current.data.find((s) => s.sequence === sequence);
    if (slot?.is_override) {
      const { data: defaultSlot } = await admin
        .from("warmup_routine_stretches")
        .select("stretch_id")
        .eq("routine_id", slot.routine_id)
        .eq("sequence", sequence)
        .maybeSingle();
      const duplicate =
        defaultSlot && findDuplicateSlot(current.data, sequence, defaultSlot.stretch_id);
      if (duplicate) return duplicateStretchError(duplicate);
    }
  }
  let query = admin.from("workout_warmup_overrides").delete().eq("workout_id", workoutId);
  if (sequence != null) query = query.eq("sequence", sequence);
  const { error } = await query;
  if (error) return { ok: false, error: error.message, status: 400 };
  return getResolvedWarmup(admin, workoutId);
}

/**
 * Overrides are tied to the slots of the workout's current routine, so they
 * are dropped when the focus changes. Returns whether any were removed.
 */
export async function clearWarmupOverridesOnFocusChange(
  admin: SupabaseClient,
  workoutId: string,
  previousType: string | null | undefined,
  nextType: string | null | undefined,
): Promise<boolean> {
  if (!nextType || previousType === nextType) return false;
  const { data, error } = await admin
    .from("workout_warmup_overrides")
    .delete()
    .eq("workout_id", workoutId)
    .select("sequence");
  if (error) {
    console.error("[workout-warmup] clear overrides", error);
    return false;
  }
  return (data ?? []).length > 0;
}

/** Copies a workout's warmup overrides onto a duplicate. Non-fatal on failure. */
export async function copyWarmupOverrides(
  admin: SupabaseClient,
  fromWorkoutId: string,
  toWorkoutId: string,
  userId?: string | null,
): Promise<void> {
  const { data, error } = await admin
    .from("workout_warmup_overrides")
    .select("sequence, stretch_id, duration_seconds, reps, per_side")
    .eq("workout_id", fromWorkoutId);
  if (error) {
    console.error("[workout-warmup] read overrides for copy", error);
    return;
  }
  if (!data || data.length === 0) return;
  const { error: insertError } = await admin.from("workout_warmup_overrides").insert(
    data.map((row) => ({ ...row, workout_id: toWorkoutId, created_by: userId ?? null })),
  );
  if (insertError) console.error("[workout-warmup] copy overrides", insertError);
}
