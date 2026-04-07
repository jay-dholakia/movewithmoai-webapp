"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);

  const inviteToken = searchParams.get("invite");

  // Validate token on load WITHOUT consuming it
  useEffect(() => {
    if (!inviteToken) {
      setError("Invalid or missing invitation link. Please check your email.");
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      const { data, error } = await supabase
        .from("coach_invites")
        .select("email, expires_at, used_at")
        .eq("token", inviteToken)
        .single();

      if (error || !data) {
        setError("Invalid invitation link.");
      } else if (data.used_at) {
        setError("This invitation link has already been used.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("This invitation link has expired. Please ask for a new one.");
      } else {
        setInviteEmail(data.email); // pre-fill or use for auth
      }

      setValidating(false);
    };

    validateToken();
  }, [inviteToken]);

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedUsername = username.trim();

    if (
      !trimmedUsername ||
      trimmedUsername.length < 8 ||
      trimmedUsername.length > 20
    ) {
      setError("Username must be between 8 and 20 characters");
      setLoading(false);
      return;
    }
    if (/\s/.test(trimmedUsername)) {
      setError("Username cannot contain spaces");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Re-validate token just before submission (still NOT consuming it yet)
      const { data: invite, error: inviteError } = await supabase
        .from("coach_invites")
        .select("email, expires_at, used_at")
        .eq("token", inviteToken!)
        .single();

      if (
        inviteError ||
        !invite ||
        invite.used_at ||
        new Date(invite.expires_at) < new Date()
      ) {
        setError("Invitation link is no longer valid.");
        setLoading(false);
        return;
      }

      // Check username availability
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", trimmedUsername)
        .maybeSingle();

      if (existingUser) {
        setError("Username is already taken. Please choose a different one.");
        setLoading(false);
        return;
      }

      // Sign in the coach using their email + a Supabase admin password reset
      // OR use signInWithPassword if they already have a temp password set during coach creation
      // Update password via admin API route
      const res = await fetch("/api/admin/coach-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken,
          email: invite.email,
          password,
          username: trimmedUsername,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setError(result.error || "Failed to set up account.");
        setLoading(false);
        return;
      }

      // ✅ Only NOW mark the token as used
      await supabase
        .from("coach_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("token", inviteToken!);

      setSuccess(true);
      setTimeout(() => router.push("/coach"), 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto" />
          <p className="mt-4 text-slate-600">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-md bg-green-50 border border-green-200 p-6">
            <h2 className="text-2xl font-semibold text-green-800 mb-2">
              Account Set Up!
            </h2>
            <p className="text-green-700">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold font-comfortaa text-[#1e3a8a]">
              moai
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">
            Set Up Your Account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Please create a username and password for your coach account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handlePasswordSetup}>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                minLength={8}
                maxLength={20}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Username (8-20 chars, no spaces)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] focus:z-10 sm:text-sm bg-white"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? "Setting up account..." : "Set Up Account"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/coach/login"
              className="text-sm text-[#1e3a8a] hover:text-[#1e40af]"
            >
              Already have a password? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  );
}
