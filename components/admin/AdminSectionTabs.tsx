"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const FOCUS_TABS = [
  { href: "/admin/workout-focus", label: "Workout focus" },
  { href: "/admin/focus-moai", label: "Focus Moai" },
] as const;

const PROGRAMS_TABS = [
  { href: "/admin/workout-programs", label: "Programs" },
  { href: "/admin/workout-templates", label: "Workout library" },
  { href: "/admin/exercises", label: "Exercises" },
  { href: "/admin/ai-program-generator", label: "AI generator" },
] as const;

function focusTabActive(pathname: string, href: string): boolean {
  if (href === "/admin/workout-focus") {
    return (
      pathname === "/admin/workout-focus" ||
      pathname.startsWith("/admin/workout-focus/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function programsTabActive(pathname: string, href: string): boolean {
  if (href === "/admin/workout-programs") {
    return (
      pathname === "/admin/workout-programs" ||
      pathname.startsWith("/admin/workout-programs/")
    );
  }
  if (href === "/admin/workout-templates") {
    return pathname.startsWith("/admin/workout-templates");
  }
  if (href === "/admin/exercises") {
    return (
      pathname === "/admin/exercises" ||
      pathname.startsWith("/admin/exercises/")
    );
  }
  if (href === "/admin/ai-program-generator") {
    return pathname.startsWith("/admin/ai-program-generator");
  }
  return false;
}

export function AdminFocusTabs({ className }: { className?: string }) {
  const pathname = usePathname() || "";
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 border-b border-gray-200 pb-px mb-6",
        className,
      )}
      aria-label="Focus section"
    >
      {FOCUS_TABS.map((tab) => {
        const active = focusTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-blue-600 bg-blue-50/70 text-blue-800"
                : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminProgramsTabs({ className }: { className?: string }) {
  const pathname = usePathname() || "";
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 border-b border-gray-200 pb-px mb-6",
        className,
      )}
      aria-label="Programs and workouts section"
    >
      {PROGRAMS_TABS.map((tab) => {
        const active = programsTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-blue-600 bg-blue-50/70 text-blue-800"
                : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
