"use client";

import React, { useState } from "react";
import { ChevronRight, Link2, MessageCircle } from "lucide-react";

// Same host and path as the app's buildFocusMoaiShareUrl so admin-shared links match coach-shared ones.
const PUBLIC_JOIN_BASE_HOST = "https://www.withmoai.co";

function buildFocusMoaiShareUrl(joinSlug: string): string {
  return `${PUBLIC_JOIN_BASE_HOST}/focus/${encodeURIComponent(joinSlug)}`;
}

function compactInviteDisplay(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return url;
  }
}

interface ShareFocusMoaiModalProps {
  name: string;
  /** focus_moais.join_slug — the /focus/<slug> path and the typeable invite code. */
  joinSlug: string;
  onClose: () => void;
}

/** Shared by the admin Focus Moais table and the coach portal; mirrors the app's CircleInviteSheet. */
export function ShareFocusMoaiModal({ name, joinSlug, onClose }: ShareFocusMoaiModalProps) {
  const [copiedField, setCopiedField] = useState<"link" | "code" | "message" | null>(
    null,
  );

  const inviteCode = joinSlug;
  const inviteUrl = buildFocusMoaiShareUrl(inviteCode);
  const inviteDisplay = compactInviteDisplay(inviteUrl);
  const shareMessage = `Join our moai on Moai: ${inviteUrl}\n\nOr enter invite code ${inviteCode} in the Moai app.`;

  const handleCopy = async (field: "link" | "code" | "message", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      alert("Couldn't copy. Please try again.");
    }
  };

  // Native share sheet where the browser has one; desktop browsers without it get the message copied.
  const handleShareLink = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Join our moai", text: shareMessage, url: inviteUrl });
      } catch (e) {
        if ((e as DOMException)?.name !== "AbortError") {
          console.warn("[ShareFocusMoaiModal] share", e);
        }
      }
      return;
    }
    await handleCopy("message", shareMessage);
  };

  const handleInviteViaText = () => {
    window.location.href = `sms:?body=${encodeURIComponent(shareMessage)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-800">Invite People</h2>
            <p className="text-xs text-slate-500 truncate">{name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-500 mb-2">
            A moai works best with 3–8 people. Share the link to get started.
          </p>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Invite link</p>
            <div className="flex items-center gap-2">
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-0 text-sm font-semibold text-[#1e3a8a] break-all hover:underline"
              >
                {inviteDisplay}
              </a>
              <button
                type="button"
                onClick={() => handleCopy("link", inviteUrl)}
                className="shrink-0 px-3 py-1 rounded-full bg-blue-50 text-[#1e3a8a] text-sm font-semibold hover:bg-blue-100 transition-colors"
              >
                {copiedField === "link" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Or share the invite code</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 min-w-0 text-sm font-semibold text-[#1e3a8a] font-mono truncate select-all">
                {inviteCode}
              </span>
              <button
                type="button"
                onClick={() => handleCopy("code", inviteCode)}
                className="shrink-0 px-3 py-1 rounded-full bg-blue-50 text-[#1e3a8a] text-sm font-semibold hover:bg-blue-100 transition-colors"
              >
                {copiedField === "code" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              New members can enter it in the app after signing up.
            </p>
          </div>

          <button
            type="button"
            onClick={handleShareLink}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-[#1e3a8a]" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                {copiedField === "message" ? "Message copied" : "Share link"}
              </span>
              <span className="block text-xs text-slate-500">Via any app</span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>

          <button
            type="button"
            onClick={handleInviteViaText}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-[#1e3a8a]" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-slate-800">Invite via text</span>
              <span className="block text-xs text-slate-500">SMS or iMessage</span>
            </span>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
