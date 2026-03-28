"use client";

import React, { useState } from "react";
import { WorkoutFocus, FocusForm, EMPTY_FORM } from "./types";
import { ProgramSelect } from "./ProgramSelect";

interface FocusModalProps {
  mode: "create" | "edit";
  initial?: WorkoutFocus;
  onClose: () => void;
  onSave: () => void;
  supabase: any;
}

export function FocusModal({
  mode,
  initial,
  onClose,
  onSave,
  supabase,
}: FocusModalProps) {
  const [form, setForm] = useState<FocusForm>(
    initial
      ? {
          name: initial.name,
          description: initial.description || "",
          workout_program_id: initial.workout_program_id || "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    setSaving(true);
    setError(null);

    if (form.workout_program_id) {
      const query = supabase
        .from("workout_focus")
        .select("id, name")
        .eq("workout_program_id", form.workout_program_id)
        .maybeSingle();

      if (mode === "edit") query.neq("id", initial!.id);

      const { data: existing } = await query;

      if (existing) {
        setError(
          `This program is already assigned to "${existing.name}". Each program can only be used by one focus.`,
        );
        setSaving(false);
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      workout_program_id: form.workout_program_id || null,
    };

    const { error: dbError } =
      mode === "create"
        ? await supabase.from("workout_focus").insert(payload)
        : await supabase
            .from("workout_focus")
            .update(payload)
            .eq("id", initial!.id);

    if (dbError) {
      setError(dbError.message);
      setSaving(false);
      return;
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {mode === "create" ? "New Workout Focus" : "Edit Workout Focus"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Strength & Conditioning"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workout Program
            </label>
            <ProgramSelect
              value={form.workout_program_id}
              onChange={(id) => setForm({ ...form, workout_program_id: id })}
              supabase={supabase}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                  ? "Create Focus"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
