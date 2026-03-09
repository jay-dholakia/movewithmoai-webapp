"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Users, User, LogOut, MessageSquare, Settings } from "lucide-react";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Skip sidebar for login, test, and debug pages
  if (
    pathname === "/coach/login" ||
    pathname === "/coach/test" ||
    pathname === "/coach/debug" ||
    pathname === "/coach/setup-password"
  ) {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/coach/login");
  };

  const isActive = (path: string) => {
    if (path === "/coach") {
      return pathname === "/coach";
    }
    return pathname.startsWith(path);
  };

  // Update isActive check for clients to exclude other routes
  const isClientsActive =
    pathname === "/coach" ||
    (pathname.startsWith("/coach/clients") &&
      !pathname.startsWith("/coach/moais") &&
      !pathname.startsWith("/coach/community") &&
      !pathname.startsWith("/coach/chat") &&
      !pathname.startsWith("/coach/profile"));

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Coach Portal</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/coach"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isClientsActive
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Clients</span>
          </Link>

          <Link
            href="/coach/moais"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/coach/moais")
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Moais</span>
          </Link>

          <Link
            href="/coach/chat"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/coach/chat")
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Chat</span>
          </Link>

          <Link
            href="/coach/community"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/coach/community")
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <User className="h-5 w-5" />
            <span>Community</span>
          </Link>

          <Link
            href="/coach/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/coach/profile")
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Profile</span>
          </Link>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
