"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Dumbbell, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matches: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/coach/workout-programs",
    label: "Programs",
    icon: <ClipboardList className="h-4 w-4" />,
    matches: (p) => p.startsWith("/coach/workout-programs"),
  },
  {
    href: "/coach/workout-templates",
    label: "Workouts",
    icon: <Dumbbell className="h-4 w-4" />,
    matches: (p) => p.startsWith("/coach/workout-templates"),
  },
  {
    href: "/coach/exercises",
    label: "Exercises",
    icon: <BookOpen className="h-4 w-4" />,
    matches: (p) => p.startsWith("/coach/exercises"),
  },
  {
    href: "/coach/assignments",
    label: "Assignments",
    icon: <Users2 className="h-4 w-4" />,
    matches: (p) => p.startsWith("/coach/assignments"),
  },
];

export function CoachProgramsTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="mb-6 border-b border-gray-200"
      aria-label="Coach programs navigation"
    >
      <ul className="flex flex-wrap gap-1 -mb-px">
        {TABS.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                )}
              >
                {tab.icon}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
