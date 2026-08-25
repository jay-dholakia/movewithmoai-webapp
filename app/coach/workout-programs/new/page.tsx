"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachProgramsTabs } from "@/components/coach/CoachSectionTabs/CoachSectionTabs";
import { CreationMethodPicker } from "@/components/admin/program-creation/CreationMethodPicker";
import { ManualCreateForm } from "@/components/coach/program-creation/ManualCreateForm";
import { AICreateForm } from "@/components/coach/program-creation/AiCreateForm";
import { DuplicateCreateForm } from "@/components/coach/program-creation/DuplicateCreateForm";

export type CreationMethod = "manual" | "ai" | "duplicate";

export default function NewCoachWorkoutProgramPage() {
  const [method, setMethod] = useState<CreationMethod | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <CoachProgramsTabs />

      <Link
        href="/coach/workout-programs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Programs
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Create a new program
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Every program has 5 workouts. Pick how you want to start — build from
          scratch, generate with AI, or duplicate an existing one from the
          shared library.
        </p>
      </header>

      <CreationMethodPicker selected={method} onSelect={setMethod} />

      <div className="mt-8">
        {method === "manual" && <ManualCreateForm />}
        {method === "ai" && <AICreateForm />}
        {method === "duplicate" && <DuplicateCreateForm />}
      </div>
    </div>
  );
}
