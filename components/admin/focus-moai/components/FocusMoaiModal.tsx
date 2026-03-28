"use client";

import React, { useState } from "react";
import { EMPTY_FORM, FocusMoai, FocusMoaiForm } from "./types";
import { FocusSelect } from "./FocusSelect";
import { CoachSelect } from "./CoachSelect";

interface FocusMoaiModalProps {
  mode: "create" | "edit";
  initial?: FocusMoai;
  onClose: () => void;
  onSave: () => void;
  supabase: any;
}

export function FocusMoaiModal({
  mode,
  initial,
  onClose,
  onSave,
  supabase,
}: FocusMoaiModalProps) {
  const [form, setForm] = useState<FocusMoaiForm>(
    initial
      ? {
          name: initial.name,
          description: initial.description || "",
          workout_focus_id: initial.workout_focus_id || "",
          coach_id: initial.coach_id || "",
          max_members: initial.max_members,
          price_monthly: initial.price_monthly,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required");
    if (form.price_monthly <= 0)
      return setError("Price must be greater than 0");
    if (form.max_members < 1) return setError("Max members must be at least 1");

    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {

        if (form.workout_focus_id) {
          const { data: existing } = await supabase
            .from("focus_moais")
            .select("id, name")
            .eq("workout_focus_id", form.workout_focus_id)
            .eq("status", "active")
            .maybeSingle();

          if (existing) {
            setError(
              `This focus is already assigned to "${existing.name}". Each focus can only be used by one Focus Moai.`,
            );
            setSaving(false);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const response = await fetch("/api/admin/create-focus-moai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            workout_focus_id: form.workout_focus_id || null,
            coach_id: form.coach_id || null,
            max_members: form.max_members,
            price_monthly: form.price_monthly,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          setError(result.error || "Failed to create Focus Moai");
          setSaving(false);
          return;
        }
      } else {
        // Edit: update DB only (price/Stripe fields not editable after creation)
        const { error: dbError } = await supabase
          .from("focus_moais")
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            workout_focus_id: form.workout_focus_id || null,
            coach_id: form.coach_id || null,
            max_members: form.max_members,
          })
          .eq("id", initial!.id);

        if (dbError) {
          setError(dbError.message);
          setSaving(false);
          return;
        }
      }

      onSave();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {mode === "create" ? "New Focus Moai" : "Edit Focus Moai"}
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Strength Foundations Group"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
            />
          </div>

          {/* Description */}
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

          {/* Workout Focus */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workout Focus
            </label>
            <FocusSelect
              value={form.workout_focus_id}
              onChange={(id) => setForm({ ...form, workout_focus_id: id })}
              supabase={supabase}
            />
          </div>

          {/* Coach */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Coach
            </label>
            <CoachSelect
              value={form.coach_id}
              onChange={(id) => setForm({ ...form, coach_id: id })}
              supabase={supabase}
            />
          </div>

          {/* Max Members + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Members *
              </label>
              <input
                type="number"
                min={1}
                value={form.max_members}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_members: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Monthly Price (USD) *
                {mode === "edit" && (
                  <span className="ml-1 text-xs text-slate-400 font-normal">
                    (not editable)
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  $
                </span>
                <input
                  type="number"
                  min={0.5}
                  step={0.01}
                  value={form.price_monthly}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price_monthly: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={mode === "edit"}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>
          </div>

          {mode === "create" && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              A Stripe product and monthly recurring price will be automatically
              created.
            </div>
          )}

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
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Focus Moai"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
