"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminSubNavTab = {
  href: string;
  label: string;
  /**
   * Path prefix for the selected tab (must be JSON-serializable for RSC → client).
   * Defaults to `href`.
   */
  activePrefix?: string;
};

function tabIsActive(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function AdminSubNavTabs({ tabs }: { tabs: AdminSubNavTab[] }) {
  const pathname = usePathname() || "";

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
      <nav
        className="flex flex-wrap gap-1 px-8 pt-3 pb-0"
        aria-label="Section"
      >
        {tabs.map((t) => {
          const prefix = t.activePrefix ?? t.href;
          const active = tabIsActive(pathname, prefix);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-blue-700 shadow-sm border border-gray-200 border-b-white -mb-px"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
