"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import { tryParseDraftForEditor } from "@/lib/ai-program-draft-zod";
import {
  editorToProgramDraft,
  editorToWorkoutDraft,
  programDraftToEditor,
  workoutDraftToEditor,
  type EditorProgramState,
  type EditorWorkoutState,
} from "@/components/admin/ai-program-generator/draftEditorMappers";
import { LocalDraftExerciseTable } from "@/components/admin/ai-program-generator/LocalDraftExerciseTable";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

type ProgramRow = { plan_id: string; plan_name: string };

export default function AiProgramGeneratorPage() {
  const [mode, setMode] = useState<"program" | "workout">("program");
  const [prompt, setPrompt] = useState("");
  const [targetPlanId, setTargetPlanId] = useState("");
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  const [programEditor, setProgramEditor] = useState<EditorProgramState | null>(
    null,
  );
  const [workoutEditor, setWorkoutEditor] = useState<EditorWorkoutState | null>(
    null,
  );
  const [fallbackJson, setFallbackJson] = useState("");
  const [extraNames, setExtraNames] = useState<Record<string, string>>({});

  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>(
    {},
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [generateNote, setGenerateNote] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateEnvDebug, setGenerateEnvDebug] = useState<unknown>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const nameById = useMemo(
    () => ({ ...resolvedNames, ...extraNames }),
    [resolvedNames, extraNames],
  );

  const clearDraft = useCallback(() => {
    setProgramEditor(null);
    setWorkoutEditor(null);
    setFallbackJson("");
    setExtraNames({});
    setValidationErrors([]);
  }, []);

  const setModeProgram = () => {
    setMode("program");
    clearDraft();
  };
  const setModeWorkout = () => {
    setMode("workout");
    clearDraft();
  };

  const loadPrograms = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin/workout-programs", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const j = await res.json();
    if (j.success && Array.isArray(j.programs)) {
      setPrograms(
        j.programs.map((p: { plan_id: string; plan_name: string }) => ({
          plan_id: p.plan_id,
          plan_name: p.plan_name,
        })),
      );
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const authHeader = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const registerName = useCallback((id: string, name: string) => {
    setExtraNames((prev) => ({ ...prev, [id]: name }));
  }, []);

  const generate = async () => {
    setGenerating(true);
    setApplyMessage(null);
    setApplyError(null);
    setGenerateNote(null);
    setGenerateError(null);
    setGenerateEnvDebug(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/ai-program-generator", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode,
          prompt: prompt.trim(),
          target_plan_id: targetPlanId || undefined,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setGenerateError(j.error || "Generate failed");
        setGenerateEnvDebug(
          j.envDebug !== undefined && j.envDebug !== null ? j.envDebug : null,
        );
        clearDraft();
        return;
      }
      setExtraNames({});
      setResolvedNames(
        j.resolvedNames && typeof j.resolvedNames === "object"
          ? j.resolvedNames
          : {},
      );
      setValidationErrors(
        Array.isArray(j.validationErrors) ? j.validationErrors : [],
      );
      setCandidateCount(
        typeof j.candidateCount === "number" ? j.candidateCount : null,
      );
      setGenerateNote(typeof j.note === "string" ? j.note : null);

      if (mode === "program") {
        const parsed = tryParseDraftForEditor("program", j.draft);
        if (parsed) {
          setProgramEditor(programDraftToEditor(parsed));
          setWorkoutEditor(null);
          setFallbackJson("");
        } else {
          setProgramEditor(null);
          setWorkoutEditor(null);
          setFallbackJson(
            typeof j.draft === "object"
              ? JSON.stringify(j.draft, null, 2)
              : String(j.draft ?? ""),
          );
        }
      } else {
        const parsed = tryParseDraftForEditor("workout", j.draft);
        if (parsed) {
          setWorkoutEditor(workoutDraftToEditor(parsed));
          setProgramEditor(null);
          setFallbackJson("");
        } else {
          setProgramEditor(null);
          setWorkoutEditor(null);
          setFallbackJson(
            typeof j.draft === "object"
              ? JSON.stringify(j.draft, null, 2)
              : String(j.draft ?? ""),
          );
        }
      }
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Request failed");
      clearDraft();
    } finally {
      setGenerating(false);
    }
  };

  const canApply =
    Boolean(programEditor) ||
    Boolean(workoutEditor) ||
    fallbackJson.trim().length > 0;

  const apply = async () => {
    setApplying(true);
    setApplyMessage(null);
    setApplyError(null);
    let draft: unknown;
    try {
      if (mode === "program" && programEditor) {
        draft = editorToProgramDraft(programEditor);
      } else if (mode === "workout" && workoutEditor) {
        draft = editorToWorkoutDraft(workoutEditor);
      } else {
        draft = JSON.parse(fallbackJson);
      }
    } catch (e: unknown) {
      setApplyError(
        e instanceof Error ? e.message : "Could not build draft for apply",
      );
      setApplying(false);
      return;
    }
    try {
      const headers = await authHeader();
      const res = await fetch("/api/admin/ai-program-generator/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({ mode, draft }),
      });
      const j = await res.json();
      if (!j.success) {
        setApplyError(j.error || "Apply failed");
        return;
      }
      setApplyMessage(
        j.message ||
          (mode === "program"
            ? `Created program ${j.plan_id}`
            : `Created workout ${j.workout_id}`),
      );
    } catch (e: unknown) {
      setApplyError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const rawJsonPreview = useMemo(() => {
    try {
      if (mode === "program" && programEditor) {
        return JSON.stringify(editorToProgramDraft(programEditor), null, 2);
      }
      if (mode === "workout" && workoutEditor) {
        return JSON.stringify(editorToWorkoutDraft(workoutEditor), null, 2);
      }
    } catch {
      return "";
    }
    return fallbackJson;
  }, [mode, programEditor, workoutEditor, fallbackJson]);

  return (
    <div className="p-8 max-w-5xl">
      <AdminProgramsTabs />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-violet-600" />
          AI program & workout generator
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Generate a draft, then review it in the same table layout as workout templates
          (reorder, edit sets/reps, circuits/supersets). Nothing is saved until you click{" "}
          <strong>Apply to database</strong>.
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
          Circuits / supersets: same <code className="text-xs">group_id</code> and{" "}
          <code className="text-xs">group_type</code> on consecutive rows. Use — for
          standalone moves.
        </p>
      </div>

      <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-medium text-gray-700">Output</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={setModeProgram}
              className={`px-4 py-2 text-sm ${
                mode === "program"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Full program
            </button>
            <button
              type="button"
              onClick={setModeWorkout}
              className={`px-4 py-2 text-sm border-l border-gray-200 ${
                mode === "workout"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Single workout
            </button>
          </div>
        </div>

        {mode === "workout" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Optional: hint <code className="text-xs">plan_id</code> for the model
            </label>
            <select
              className={adminSelectClass}
              value={targetPlanId}
              onChange={(e) => setTargetPlanId(e.target.value)}
            >
              <option value="">— None —</option>
              {programs.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.plan_name} ({p.plan_id})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description / instructions
          </label>
          <textarea
            className={`${adminInputClass} min-h-[140px] font-sans`}
            placeholder={
              mode === "program"
                ? "e.g. 3-day beginner full-body…"
                : "e.g. Upper body superset day…"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating || prompt.trim().length < 8}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Generate draft
          </button>
          {candidateCount !== null && (
            <span className="text-xs text-gray-500">
              Exercises sent to model: ~{candidateCount}
            </span>
          )}
        </div>
      </div>

      {generateError && (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Could not generate</p>
          <p className="mt-1">{generateError}</p>
          {generateEnvDebug != null && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-red-800">
                Where the server looked for env (dev only)
              </summary>
              <pre className="mt-1 p-2 bg-white/80 rounded overflow-x-auto text-[11px] leading-snug">
                {JSON.stringify(generateEnvDebug, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {generateNote && !generateError && (
        <p className="mt-4 text-sm text-violet-800 bg-violet-50 border border-violet-100 rounded-md px-3 py-2">
          {generateNote}
        </p>
      )}

      {validationErrors.length > 0 && (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            validationErrors.some((e) => e.includes("Unknown exercise"))
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <p className="font-medium mb-1">
            Draft issues (fix in the editor below before Apply)
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-8">
        <h2 className="text-lg font-medium text-gray-900">
          Review & edit (same layout as workout templates)
        </h2>

        {programEditor && mode === "program" && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Program</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 block">
                plan_id
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.plan_id}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              plan_id: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                plan_name
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.plan_name}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              plan_name: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                gender
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.gender}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              gender: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                days_per_week
                <input
                  type="number"
                  min={1}
                  max={7}
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.days_per_week}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              days_per_week: Number(e.target.value) || 1,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                min_age
                <input
                  type="number"
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.min_age}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              min_age: Number(e.target.value) || 0,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                max_age
                <input
                  type="number"
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.max_age}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              max_age: Number(e.target.value) || 120,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block sm:col-span-2">
                description
                <textarea
                  className={`${adminInputClass} mt-0.5 min-h-[60px]`}
                  value={programEditor.program.description}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              description: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block sm:col-span-2">
                difficulty_level
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={programEditor.program.difficulty_level}
                  onChange={(e) =>
                    setProgramEditor((s) =>
                      s
                        ? {
                            ...s,
                            program: {
                              ...s.program,
                              difficulty_level: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
            </div>
          </section>
        )}

        {programEditor &&
          mode === "program" &&
          programEditor.workouts.map((w, wi) => (
            <section
              key={w.clientId}
              className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-gray-900">
                Workout {wi + 1}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-600 block sm:col-span-2">
                  Title
                  <input
                    className={`${adminInputClass} mt-0.5`}
                    value={w.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProgramEditor((s) => {
                        if (!s) return s;
                        const workouts = s.workouts.map((x) =>
                          x.clientId === w.clientId ? { ...x, title: v } : x,
                        );
                        return { ...s, workouts };
                      });
                    }}
                  />
                </label>
                <label className="text-xs text-gray-600 block">
                  Type
                  <select
                    className={`${adminSelectClass} mt-0.5`}
                    value={w.type}
                    onChange={(e) => {
                      const v = e.target.value as EditorProgramState["workouts"][0]["type"];
                      setProgramEditor((s) => {
                        if (!s) return s;
                        const workouts = s.workouts.map((x) =>
                          x.clientId === w.clientId ? { ...x, type: v } : x,
                        );
                        return { ...s, workouts };
                      });
                    }}
                  >
                    <option value="upper">upper</option>
                    <option value="lower">lower</option>
                    <option value="full">full</option>
                    <option value="bodyweight">bodyweight</option>
                  </select>
                </label>
                <label className="text-xs text-gray-600 block">
                  order_index
                  <input
                    type="number"
                    min={1}
                    className={`${adminInputClass} mt-0.5`}
                    value={w.order_index}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 1;
                      setProgramEditor((s) => {
                        if (!s) return s;
                        const workouts = s.workouts.map((x) =>
                          x.clientId === w.clientId
                            ? { ...x, order_index: n }
                            : x,
                        );
                        return { ...s, workouts };
                      });
                    }}
                  />
                </label>
                <label className="text-xs text-gray-600 block sm:col-span-2">
                  Description
                  <textarea
                    className={`${adminInputClass} mt-0.5 min-h-[50px]`}
                    value={w.description}
                    onChange={(e) => {
                      const v = e.target.value;
                      setProgramEditor((s) => {
                        if (!s) return s;
                        const workouts = s.workouts.map((x) =>
                          x.clientId === w.clientId
                            ? { ...x, description: v }
                            : x,
                        );
                        return { ...s, workouts };
                      });
                    }}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={w.is_circuit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProgramEditor((s) => {
                        if (!s) return s;
                        const workouts = s.workouts.map((x) =>
                          x.clientId === w.clientId
                            ? { ...x, is_circuit: checked }
                            : x,
                        );
                        return { ...s, workouts };
                      });
                    }}
                  />
                  is_circuit
                </label>
              </div>
              <LocalDraftExerciseTable
                exercises={w.exercises}
                nameById={nameById}
                onExerciseNameResolved={registerName}
                onChange={(next) => {
                  setProgramEditor((s) => {
                    if (!s) return s;
                    const workouts = s.workouts.map((x) =>
                      x.clientId === w.clientId ? { ...x, exercises: next } : x,
                    );
                    return { ...s, workouts };
                  });
                }}
              />
            </section>
          ))}

        {workoutEditor && mode === "workout" && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Workout</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 block sm:col-span-2">
                Title
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={workoutEditor.workout.title}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              title: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                Type
                <select
                  className={`${adminSelectClass} mt-0.5`}
                  value={workoutEditor.workout.type}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              type: e.target.value as EditorWorkoutState["workout"]["type"],
                            },
                          }
                        : s,
                    )
                  }
                >
                  <option value="upper">upper</option>
                  <option value="lower">lower</option>
                  <option value="full">full</option>
                  <option value="bodyweight">bodyweight</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 block">
                plan_id (empty = unassigned)
                <input
                  className={`${adminInputClass} mt-0.5`}
                  value={workoutEditor.workout.plan_id}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              plan_id: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block">
                order_index (optional)
                <input
                  className={`${adminInputClass} mt-0.5`}
                  placeholder="empty = null"
                  value={workoutEditor.workout.order_index}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              order_index: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="text-xs text-gray-600 block sm:col-span-2">
                Description
                <textarea
                  className={`${adminInputClass} mt-0.5 min-h-[50px]`}
                  value={workoutEditor.workout.description}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              description: e.target.value,
                            },
                          }
                        : s,
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={workoutEditor.workout.is_circuit}
                  onChange={(e) =>
                    setWorkoutEditor((s) =>
                      s
                        ? {
                            ...s,
                            workout: {
                              ...s.workout,
                              is_circuit: e.target.checked,
                            },
                          }
                        : s,
                    )
                  }
                />
                is_circuit
              </label>
            </div>
            <LocalDraftExerciseTable
              exercises={workoutEditor.exercises}
              nameById={nameById}
              onExerciseNameResolved={registerName}
              onChange={(next) =>
                setWorkoutEditor((s) =>
                  s ? { ...s, exercises: next } : s,
                )
              }
            />
          </section>
        )}

        {!programEditor && !workoutEditor && fallbackJson && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-sm text-amber-900 mb-2">
              The model output could not be loaded into the visual editor (invalid shape or
              types). Edit raw JSON, or fix issues and generate again.
            </p>
            <textarea
              className="w-full min-h-[360px] font-mono text-sm border border-gray-300 rounded-lg p-3"
              spellCheck={false}
              value={fallbackJson}
              onChange={(e) => setFallbackJson(e.target.value)}
            />
          </div>
        )}

        {!programEditor && !workoutEditor && !fallbackJson && (
          <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-8 text-center">
            Generate a draft to see workouts and exercises here.
          </p>
        )}

        {(programEditor || workoutEditor) && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              Advanced: view JSON payload for Apply
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto border border-gray-200">
              {rawJsonPreview}
            </pre>
          </details>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 items-center border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => void apply()}
          disabled={applying || !canApply}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Apply to database
        </button>
        <Link
          href="/admin/workout-programs"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Programs & workouts →
        </Link>
      </div>
      {applyError && (
        <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
          {applyError}
        </p>
      )}
      {applyMessage && (
        <p className="mt-2 text-sm text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2">
          {applyMessage}
        </p>
      )}
    </div>
  );
}
