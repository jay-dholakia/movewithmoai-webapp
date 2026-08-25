"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";

const EXAMPLE_PROMPTS = [
  "Create a 5-day intermediate strength program with Push, Pull, Legs, Upper and Lower days. Keep workouts around 45–60 minutes.",
  "Build a beginner full-body program using mainly bodyweight and dumbbells. 30-minute sessions.",
  "Advanced powerlifting program focused on squat, bench, deadlift with accessory supersets.",
];

export function AICreateForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [difficultyHint, setDifficultyHint] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = prompt.trim().length > 10 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await AdminService.generateWorkoutProgram({
        prompt: prompt.trim(),
        difficulty_level: difficultyHint || undefined,
        is_paid: isPaid,
      });

      if (res.success && res.program?.plan_id) {
        router.push(
          `/admin/workout-programs/${encodeURIComponent(res.program.plan_id)}`,
        );
      } else {
        setError(
          res.error || "AI generation failed. Try rephrasing your prompt.",
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Describe the program you want
        </label>
        <textarea
          rows={4}
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Create a 5-day intermediate strength program with Push, Pull, Legs, Upper and Lower days…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Be specific about workout types, duration, equipment, and any exercise
          preferences. AI will select from your existing exercise library.
        </p>
      </div>

      {/* Example prompts */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Try an example</p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="text-left rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty hint */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Level hint (optional)
        </label>
        <select
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={difficultyHint}
          onChange={(e) => setDifficultyHint(e.target.value)}
        >
          <option value="">Let AI decide</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {/* Paid toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Paid program</p>
          <p className="text-xs text-gray-500">
            Paid programs are for Focus Moai or individually assigned users.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPaid}
          onClick={() => setIsPaid((v) => !v)}
          className={`cursor-pointer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isPaid ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isPaid ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating program…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate program
          </>
        )}
      </button>

      {loading && (
        <p className="text-center text-xs text-gray-500">
          This may take 15–30 seconds. AI is building 5 workouts with exercises
          from your library.
        </p>
      )}
    </form>
  );
}
