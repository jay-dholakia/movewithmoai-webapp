"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CreateCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCoachModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCoachModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    is_available: false,
    max_clients: 50,
    max_moais: 10,
    bio: "",
    specializations: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { AdminService } = await import("@/lib/services/adminService");

      // Parse specializations (comma-separated)
      const specializations = formData.specializations
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const result = await AdminService.createCoach({
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        is_available: formData.is_available,
        max_clients: formData.max_clients,
        max_moais: formData.max_moais,
        bio: formData.bio.trim() || undefined,
        specializations:
          specializations.length > 0 ? specializations : undefined,
      });

      if (result.success) {
        // Reset form
        setFormData({
          email: "",
          first_name: "",
          last_name: "",
          is_available: false,
          max_clients: 50,
          max_moais: 10,
          bio: "",
          specializations: "",
        });
        onSuccess();
        onClose();
        // Show success message
        if (result.warning) {
          alert(
            `Coach account created successfully!\n\nWarning: ${result.warning}`,
          );
        } else {
          alert("Coach account created successfully! Invitation email sent.");
        }
      } else {
        setError(result.error || "Failed to create coach account");
      }
    } catch (err: any) {
      console.error("Error creating coach:", err);
      setError(err.message || "Failed to create coach account");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Coach
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="coach@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                required
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="John"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              required
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doe"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="max_clients"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max Clients
              </label>
              <input
                type="number"
                id="max_clients"
                min="1"
                value={formData.max_clients}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_clients: parseInt(e.target.value) || 50,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="max_moais"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max Moais
              </label>
              <input
                type="number"
                id="max_moais"
                min="1"
                value={formData.max_moais}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_moais: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Bio (Optional)
            </label>
            <textarea
              id="bio"
              rows={3}
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief bio about the coach..."
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="specializations"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Specializations (Optional)
            </label>
            <input
              type="text"
              id="specializations"
              value={formData.specializations}
              onChange={(e) =>
                setFormData({ ...formData, specializations: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Strength Training, Weight Loss, etc. (comma-separated)"
              disabled={loading}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) =>
                setFormData({ ...formData, is_available: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label
              htmlFor="is_available"
              className="ml-2 block text-sm text-gray-700"
            >
              Available for new clients
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Coach"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
