"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PlayCircle, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatWarmupDose,
  type Stretch,
  type WarmupCatalog,
  type WarmupOverrideInput,
  type WarmupSlot,
} from "@/lib/types/warmup";
import type { WorkoutFocus } from "@/lib/workout-focus";
import {
  adminControlClass,
  adminInputClass,
} from "@/components/admin/workout-builder/formStyles";

type ApiResult<T> = { success: boolean; error?: string } & Partial<T>;

/** Admin and coach portals pass their own service methods (different API prefixes). */
export interface WarmupEditorApi {
  getCatalog: () => Promise<ApiResult<{ catalog: WarmupCatalog }>>;
  getWarmup: (workoutId: string) => Promise<ApiResult<{ warmup: WarmupSlot[] }>>;
  replaceSlot: (
    workoutId: string,
    sequence: number,
    body: WarmupOverrideInput,
  ) => Promise<ApiResult<{ warmup: WarmupSlot[] }>>;
  resetSlot: (
    workoutId: string,
    sequence: number,
  ) => Promise<ApiResult<{ warmup: WarmupSlot[] }>>;
  resetAll: (workoutId: string) => Promise<ApiResult<{ warmup: WarmupSlot[] }>>;
}

// The catalog is static reference data — share one fetch per page load.
let catalogPromise: Promise<WarmupCatalog | null> | null = null;
function loadCatalog(api: WarmupEditorApi): Promise<WarmupCatalog | null> {
  if (!catalogPromise) {
    catalogPromise = api
      .getCatalog()
      .then((res) => (res.success && res.catalog ? res.catalog : null))
      .catch(() => null)
      .then((catalog) => {
        if (!catalog) catalogPromise = null;
        return catalog;
      });
  }
  return catalogPromise;
}

function useWarmupCatalog(api: WarmupEditorApi) {
  const [catalog, setCatalog] = useState<WarmupCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void loadCatalog(api).then((c) => {
      if (cancelled) return;
      setCatalog(c);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);
  return { catalog, loading };
}

/**
 * Read-only list of the default warmup for a focus. Used in the create
 * drawers, before the workout exists (overrides need a workout id).
 */
export function WarmupPreview({
  focus,
  api,
}: {
  focus: WorkoutFocus;
  api: WarmupEditorApi;
}) {
  const { catalog, loading } = useWarmupCatalog(api);
  const routine = catalog?.routines.find((r) => r.workout_focus === focus);
  const stretchById = useMemo(
    () => new Map((catalog?.stretches ?? []).map((s) => [s.id, s])),
    [catalog],
  );

  if (loading) {
    return (
      <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading warmup…
      </p>
    );
  }
  if (!routine) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <p className="text-xs font-medium text-gray-700">
        Warmup · {routine.name}
      </p>
      <ol className="mt-1.5 space-y-0.5 text-xs text-gray-600">
        {routine.slots.map((slot) => (
          <li key={slot.sequence} className="flex justify-between gap-3">
            <span>
              {slot.sequence}. {stretchById.get(slot.stretch_id)?.name ?? slot.stretch_id}
            </span>
            <span className="text-gray-500">{formatWarmupDose(slot)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-[11px] text-gray-500">
        You can replace stretches for this workout after it&apos;s created.
      </p>
    </div>
  );
}

/**
 * Warmup section of the workout editor: shows the resolved warmup (default
 * routine for the workout's focus + this workout's replacements) and lets
 * editors replace or reset individual stretches. Changes apply to this
 * workout only; default routines are never modified.
 */
export function WarmupEditor({
  workoutId,
  focus,
  canEdit,
  api,
  refreshKey,
  onOverrideCountChange,
}: {
  workoutId: string;
  /** Saved focus — refetches when it changes (focus change clears overrides). */
  focus: string;
  canEdit: boolean;
  api: WarmupEditorApi;
  refreshKey?: number;
  /** Lets the page warn before a focus change wipes replaced stretches. */
  onOverrideCountChange?: (count: number) => void;
}) {
  const { catalog } = useWarmupCatalog(api);
  const [slots, setSlots] = useState<WarmupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingSlot, setEditingSlot] = useState<WarmupSlot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.getWarmup(workoutId);
    if (res.success && res.warmup) setSlots(res.warmup);
    else setError(res.error || "Failed to load warmup");
    setLoading(false);
  }, [api, workoutId]);

  useEffect(() => {
    void load();
  }, [load, focus, refreshKey]);

  const overrideCount = slots.filter((s) => s.is_override).length;
  useEffect(() => {
    onOverrideCountChange?.(overrideCount);
  }, [overrideCount, onOverrideCountChange]);

  const applyResult = (res: ApiResult<{ warmup: WarmupSlot[] }>) => {
    if (res.success && res.warmup) {
      setSlots(res.warmup);
      return true;
    }
    alert(res.error || "Save failed");
    return false;
  };

  const resetSlot = async (sequence: number) => {
    setBusy(true);
    applyResult(await api.resetSlot(workoutId, sequence));
    setBusy(false);
  };

  const resetAll = async () => {
    if (!confirm("Reset every stretch in this warmup to the default?")) return;
    setBusy(true);
    applyResult(await api.resetAll(workoutId));
    setBusy(false);
  };

  const saveSlot = async (sequence: number, body: WarmupOverrideInput) => {
    setBusy(true);
    const ok = applyResult(await api.replaceSlot(workoutId, sequence, body));
    setBusy(false);
    if (ok) setEditingSlot(null);
  };

  const routineName = slots[0]?.routine_name;
  const hasOverrides = overrideCount > 0;
  const defaultSlots = catalog?.routines.find((r) => r.id === slots[0]?.routine_id)?.slots;
  const slotByStretchId = new Map(slots.map((s) => [s.stretch_id, s]));
  // Reset is blocked when the default stretch is already used by another slot.
  const resetBlockedBy = (slot: WarmupSlot) => {
    const defaultId = defaultSlots?.find((d) => d.sequence === slot.sequence)?.stretch_id;
    const other = defaultId ? slotByStretchId.get(defaultId) : undefined;
    return other && other.sequence !== slot.sequence ? other : undefined;
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 mb-8 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Warmup{routineName ? ` · ${routineName}` : ""}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Shown before the first exercise. Changes apply to this workout only.
            Default routines are not affected.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={resetAll}
            disabled={!hasOverrides || busy}
            className="cursor-pointer shrink-0 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:cursor-default disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to default
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading warmup…
        </p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-gray-500">No warmup for this workout&apos;s focus.</p>
      ) : (
        <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {slots.map((slot) => (
            <li
              key={slot.sequence}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              <span className="w-5 shrink-0 text-xs text-gray-400">{slot.sequence}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{slot.name}</span>
                  {slot.is_override && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{formatWarmupDose(slot)}</p>
              </div>
              {slot.youtube_url && (
                <a
                  href={slot.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={`Watch ${slot.name} video`}
                >
                  <PlayCircle className="h-4 w-4" />
                </a>
              )}
              {canEdit && (
                <>
                  {slot.is_override && (
                    <button
                      type="button"
                      onClick={() => void resetSlot(slot.sequence)}
                      disabled={busy || !!resetBlockedBy(slot)}
                      title={
                        resetBlockedBy(slot)
                          ? `The default stretch is already stretch ${resetBlockedBy(slot)?.sequence}`
                          : undefined
                      }
                      className="cursor-pointer text-xs text-gray-500 hover:text-gray-800 disabled:cursor-default disabled:opacity-40"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingSlot(slot)}
                    disabled={busy || !catalog}
                    className="cursor-pointer rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Replace
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {editingSlot && catalog && (
        <ReplaceStretchDrawer
          slot={editingSlot}
          stretches={catalog.stretches}
          usedBy={slotByStretchId}
          defaultStretchId={
            defaultSlots?.find((d) => d.sequence === editingSlot.sequence)?.stretch_id
          }
          saving={busy}
          onClose={() => setEditingSlot(null)}
          onSave={(body) => void saveSlot(editingSlot.sequence, body)}
        />
      )}
    </section>
  );
}

function ReplaceStretchDrawer({
  slot,
  stretches,
  usedBy,
  defaultStretchId,
  saving,
  onClose,
  onSave,
}: {
  slot: WarmupSlot;
  stretches: Stretch[];
  /** Stretches already in this warmup, keyed by stretch id. */
  usedBy: Map<string, WarmupSlot>;
  defaultStretchId?: string;
  saving: boolean;
  onClose: () => void;
  onSave: (body: WarmupOverrideInput) => void;
}) {
  const [query, setQuery] = useState("");
  const [stretchId, setStretchId] = useState(slot.stretch_id);
  const [mode, setMode] = useState<"time" | "reps">(
    slot.duration_seconds != null ? "time" : "reps",
  );
  const [amount, setAmount] = useState(
    String(slot.duration_seconds ?? slot.reps ?? ""),
  );
  const [perSide, setPerSide] = useState(slot.per_side);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stretches;
    return stretches.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [query, stretches]);

  const amountNum = Number(amount);
  const amountValid =
    Number.isInteger(amountNum) &&
    (mode === "time" ? amountNum >= 5 && amountNum <= 300 : amountNum >= 1 && amountNum <= 50);

  const submit = () => {
    if (!amountValid) return;
    onSave({
      stretch_id: stretchId,
      duration_seconds: mode === "time" ? amountNum : null,
      reps: mode === "reps" ? amountNum : null,
      per_side: perSide,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Replace stretch {slot.sequence}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={cn(adminControlClass, "pl-9")}
              placeholder="Search stretches"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {filtered.map((s) => {
              const usedSlot = usedBy.get(s.id);
              const inUse = !!usedSlot && usedSlot.sequence !== slot.sequence;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStretchId(s.id)}
                    disabled={inUse}
                    className={cn(
                      "cursor-pointer w-full text-left px-3 py-2.5 hover:bg-gray-50",
                      stretchId === s.id && "bg-blue-50 hover:bg-blue-50",
                      inUse && "cursor-not-allowed opacity-50 hover:bg-transparent",
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{s.name}</span>
                      {s.id === slot.stretch_id && (
                        <span className="text-[10px] text-gray-500">current</span>
                      )}
                      {s.id === defaultStretchId && (
                        <span className="text-[10px] text-gray-500">default</span>
                      )}
                      {inUse && (
                        <span className="text-[10px] text-gray-500">
                          already stretch {usedSlot.sequence}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{s.description}</p>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-500">No stretches match.</li>
            )}
          </ul>

          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <p className="text-sm font-medium text-gray-700">Dose</p>
            <div className="flex gap-2">
              {(["time", "reps"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium",
                    mode === m
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {m === "time" ? "Timed" : "Reps"}
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">
                {mode === "time" ? "Seconds (5–300)" : "Reps (1–50)"}
              </span>
              <input
                type="number"
                className={adminInputClass}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={perSide}
                onChange={(e) => setPerSide(e.target.checked)}
              />
              Each side
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!amountValid || saving}
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
