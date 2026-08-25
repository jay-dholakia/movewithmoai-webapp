"use client";

import { Copy, Pencil, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreationMethod } from "@/app/admin/workout-programs/new/page";

const methods: {
  id: CreationMethod;
  label: string;
  description: string;
  icon: typeof Pencil;
}[] = [
  {
    id: "manual",
    label: "Start manually",
    description: "Build each workout yourself",
    icon: Pencil,
  },
  {
    id: "ai",
    label: "Generate with AI",
    description: "Describe what you want in plain language",
    icon: Sparkles,
  },
  {
    id: "duplicate",
    label: "Duplicate existing",
    description: "Copy a program and modify it",
    icon: Copy,
  },
];

export function CreationMethodPicker({
  selected,
  onSelect,
}: {
  selected: CreationMethod | null;
  onSelect: (m: CreationMethod) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {methods.map((m) => {
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "cursor-pointer flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              active
                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
            )}
          >
            <m.icon
              className={cn(
                "h-5 w-5",
                active ? "text-blue-600" : "text-gray-400",
              )}
            />
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  active ? "text-blue-900" : "text-gray-900",
                )}
              >
                {m.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{m.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
