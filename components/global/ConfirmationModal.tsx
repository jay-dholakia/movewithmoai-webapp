"use client";

import React from "react";

type ConfirmationVariant = "danger" | "warning" | "info";

interface ConfirmationModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const variantStyles: Record<
  ConfirmationVariant,
  { icon: React.ReactNode; iconBg: string; confirmBtn: string }
> = {
  danger: {
    iconBg: "bg-red-100",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
    icon: (
      <svg
        className="w-6 h-6 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    ),
  },
  warning: {
    iconBg: "bg-amber-100",
    confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
    icon: (
      <svg
        className="w-6 h-6 text-amber-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    ),
  },
  info: {
    iconBg: "bg-blue-100",
    confirmBtn: "bg-[#1e3a8a] hover:bg-[#1e40af] text-white",
    icon: (
      <svg
        className="w-6 h-6 text-[#1e3a8a]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
        />
      </svg>
    ),
  },
};

export function ConfirmationModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div
          className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
        >
          {styles.icon}
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
        <div className="text-sm text-slate-500 mb-6">{message}</div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${styles.confirmBtn}`}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
