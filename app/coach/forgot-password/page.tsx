"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CoachForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong");
      } else {
        setStep("code");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError("Enter the code from your email.");
      return;
    }
    setLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      // Verify the OTP — this establishes an authenticated session for the user
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email", // OTP delivered via email
      });
      if (verifyErr) {
        setError(verifyErr.message || "Invalid or expired code");
        setLoading(false);
        return;
      }
      // Success — go set the new password. Session is live.
      router.push("/coach/reset-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setResent(false);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) setResent(true);
      else setError(data.error || "Could not resend");
    } catch {
      setError("Network error");
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
            {step === "email" ? "Reset your password" : "Enter your code"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {step === "email"
              ? "Enter your coach email and we'll send you a reset code."
              : `We sent a code to ${email}. It expires in 1 hour.`}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {step === "email" && (
          <form className="mt-8 space-y-6" onSubmit={requestCode}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] sm:text-sm bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex justify-center py-3 px-4 text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? "Sending…" : "Send reset code"}
            </button>
            <p className="text-center text-sm">
              <Link
                href="/coach/login"
                className="text-[#1e3a8a] hover:underline"
              >
                Back to login
              </Link>
            </p>
          </form>
        )}

        {step === "code" && (
          <form className="mt-8 space-y-6" onSubmit={submitCode}>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Verification code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="12345678"
                className="w-full px-3 py-3 border border-slate-300 rounded-md text-slate-900 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full flex justify-center py-3 px-4 text-sm font-medium rounded-md text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <div className="text-center space-y-2">
              {resent && (
                <p className="text-sm text-emerald-700">
                  A new code has been sent.
                </p>
              )}
              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
                className="text-sm text-[#1e3a8a] hover:underline disabled:opacity-50"
              >
                Didn&apos;t receive it? Resend code
              </button>
              <p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                    setResent(false);
                  }}
                  className="text-sm text-slate-600 hover:underline"
                >
                  Use a different email
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
