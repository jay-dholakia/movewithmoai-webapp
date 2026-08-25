"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";
import { CreationMethodPicker } from "@/components/admin/program-creation/CreationMethodPicker";
import { ManualCreateForm } from "@/components/admin/program-creation/ManualCreateForm";
import { AICreateForm } from "@/components/admin/program-creation/AiCreateForm";
import { DuplicateCreateForm } from "@/components/admin/program-creation/DuplicateCreateForm";

export type CreationMethod = "manual" | "ai" | "duplicate";

export default function NewWorkoutProgramPage() {
  const [method, setMethod] = useState<CreationMethod | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AdminProgramsTabs />

      <Link
        href="/admin/workout-programs"
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
          Every program has 5 workouts. Pick how you want to start.
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
