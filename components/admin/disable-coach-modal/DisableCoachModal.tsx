"use client";

import { useEffect, useState } from "react";
import { AdminService } from "@/lib/services/adminService";
import type { AdminCoachWithStatus } from "@/lib/types/admin";
import { AlertTriangle, X, Users, Loader2 } from "lucide-react";

interface MoaiSubscriptionPreview {
  subscription_id: string;
  moai_id: string;
  moai_name: string;
  payer_user_id: string;
  stripe_subscription_id: string;
  monthly_price: number;
  current_period_start: string;
  current_period_end: string;
  estimated_refund: number;
  days_remaining: number;
  total_days: number;
}

interface FocusMoaiPreview {
  id: string;
  name: string;
  member_count: number;
  status: string;
}

interface DisablePreview {
  subscriptions: MoaiSubscriptionPreview[];
  focus_moais: FocusMoaiPreview[];
  total_estimated_refund: number;
}

interface DisableCoachModalProps {
  coach: AdminCoachWithStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisableCoachModal({
  coach,
  onClose,
  onSuccess,
}: DisableCoachModalProps) {
  const [preview, setPreview] = useState<DisablePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    loadPreview();
  }, [coach.id]);

  const loadPreview = async () => {
    try {
      const data = await AdminService.getCoachDisablePreview(coach.id);
      setPreview(data);
    } catch (err) {
      console.error("Error loading disable preview:", err);
      setError("Failed to load coach data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (confirmText !== coach.name) return;
    setDisabling(true);
    setError(null);

    try {
      const result = await AdminService.executeCoachDisable(coach.id);
      if (result.success) {
        if (result.warnings?.length) {
          alert(
            "Coach disabled with warnings:\n" + result.warnings.join("\n"),
          );
        }
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to disable coach");
      }
    } catch {
      setError("Failed to disable coach. Please try again.");
    } finally {
      setDisabling(false);
    }
  };

  const hasActiveItems =
    preview &&
    (preview.subscriptions.length > 0 || preview.focus_moais.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Disable Coach
          </h2>
          <button
            onClick={onClose}
            disabled={disabling}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                Loading coach data…
              </span>
            </div>
          ) : error && !preview ? (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : preview ? (
            <>
              <p className="text-sm text-gray-600">
                Setting{" "}
                <span className="font-medium text-gray-900">{coach.name}</span>{" "}
                as unavailable will affect the following:
              </p>

              {/* Regular Moai Subscriptions */}
              {preview.subscriptions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Regular Moai Subscriptions ({preview.subscriptions.length})
                  </h3>
                  <div className="space-y-2">
                    {preview.subscriptions.map((sub) => (
                      <div
                        key={sub.subscription_id}
                        className="rounded-md border border-gray-200 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {sub.moai_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ${sub.monthly_price}/mo
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {sub.days_remaining} of {sub.total_days} days
                          remaining in billing cycle
                        </div>
                        <div className="mt-1 text-sm font-medium text-amber-700">
                          Est. refund: ${sub.estimated_refund.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Moais */}
              {preview.focus_moais.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Focus Moais ({preview.focus_moais.length})
                  </h3>
                  <div className="space-y-2">
                    {preview.focus_moais.map((fm) => (
                      <div
                        key={fm.id}
                        className="rounded-md border border-gray-200 p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {fm.name}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            {fm.member_count} member
                            {fm.member_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-red-600">
                          Will be deactivated
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasActiveItems && (
                <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600">
                  No active moai subscriptions or focus moais found.
                </div>
              )}

              {/* Summary */}
              {hasActiveItems && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Actions on confirm:</p>
                      <ul className="mt-1 space-y-0.5 text-amber-700">
                        {preview.subscriptions.length > 0 && (
                          <li>
                            • Cancel {preview.subscriptions.length} moai
                            subscription
                            {preview.subscriptions.length !== 1 ? "s" : ""} and
                            refund ~$
                            {preview.total_estimated_refund.toFixed(2)}
                          </li>
                        )}
                        {preview.focus_moais.length > 0 && (
                          <li>
                            • Deactivate {preview.focus_moais.length} focus moai
                            {preview.focus_moais.length !== 1 ? "s" : ""}
                          </li>
                        )}
                        <li>• System messages sent to affected moai chats</li>
                        <li>• Coach set to unavailable</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type{" "}
                  <span className="font-mono text-red-600">{coach.name}</span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={coach.name}
                  disabled={disabling}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={disabling}
            className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDisable}
            disabled={confirmText !== coach.name || disabling || !preview}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {disabling ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Disabling…
              </span>
            ) : (
              "Disable Coach"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}