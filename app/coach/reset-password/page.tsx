"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CoachResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [noSession, setNoSession] = useState(false);

  // Guard: only show the form if a Supabase session exists (from OTP verify).
  // If the user landed here directly without verifying a code, bounce them.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setNoSession(true);
      }
      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => router.push("/coach/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold font-comfortaa text-[#1e3a8a] mb-8">
            moai
          </h1>
          <h2 className="text-2xl font-semibold text-slate-800">
            Set a new password
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Choose a strong password for your coach account.
          </p>
        </div>

        {checking ? (
          <p className="text-center text-sm text-slate-600">Loading…</p>
        ) : noSession ? (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-red-800">
              This page can only be reached after verifying your reset code.
            </p>
            <Link
              href="/coach/forgot-password"
              className="inline-block text-sm text-[#1e3a8a] hover:underline mt-2"
            >
              Request a reset code
            </Link>
          </div>
        ) : success ? (
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-sm font-medium text-emerald-900">
              Password updated. Redirecting to login…
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm bg-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
