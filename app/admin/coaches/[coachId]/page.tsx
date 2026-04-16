"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminService } from "@/lib/services/adminService";
import type { AdminCoachDetail } from "@/lib/types/admin";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  User,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";
import { ProfileImageCropModal } from "@/components/ProfileImageCropModal";

export default function AdminCoachDetailPage() {
  const params = useParams();
  const coachId = params.coachId as string;

  const [coach, setCoach] = useState<AdminCoachDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    first_name: "",
    last_name: "",
    bio: "",
    specializations: [] as string[],
    is_available: false,
    max_clients: 50,
    max_moais: 10,
    calendly_event_uri: "",
  });
  const [specInput, setSpecInput] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getCoachDetail(coachId);
      setCoach(data);
      if (data) {
        setFormData({
          name: data.name || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          bio: data.bio || "",
          specializations: data.specializations || [],
          is_available: data.is_available,
          max_clients: data.max_clients,
          max_moais: data.max_moais,
          calendly_event_uri: data.calendly_event_uri || "",
        });
        setPreviewImage(data.profile_image_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (coachId) load();
  }, [coachId]);

  const handleSave = async () => {
    if (!coach) return;
    setSaving(true);
    try {
      const result = await AdminService.updateCoachDetail(coachId, {
        name: formData.name,
        first_name: formData.first_name,
        last_name: formData.last_name.trim() === "" ? null : formData.last_name,
        bio: formData.bio.trim() === "" ? null : formData.bio,
        specializations: formData.specializations,
        is_available: formData.is_available,
        max_clients: formData.max_clients,
        max_moais: formData.max_moais,
        calendly_event_uri:
          formData.calendly_event_uri.trim() === ""
            ? null
            : formData.calendly_event_uri.trim(),
      });
      if (result.success && result.coach) {
        setCoach(result.coach);
        alert("Coach profile updated.");
      } else {
        alert(result.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const closeCropModal = () => {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
      setCropImageUrl(null);
    }
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(URL.createObjectURL(file));
  };

  const handleCroppedUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const result = await AdminService.uploadCoachProfilePicture(coachId, file);
      if (result.success && result.profile_image_url) {
        setPreviewImage(result.profile_image_url);
        setCoach((prev) =>
          prev ? { ...prev, profile_image_url: result.profile_image_url! } : prev,
        );
        alert("Profile picture updated.");
      } else {
        alert(result.error || "Upload failed");
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const addSpec = () => {
    const t = specInput.trim();
    if (!t || formData.specializations.includes(t)) return;
    setFormData((p) => ({
      ...p,
      specializations: [...p.specializations, t],
    }));
    setSpecInput("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-600">Coach not found.</p>
        <Link
          href="/admin/coaches"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          Back to coaches
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-12">
      <ProfileImageCropModal
        open={!!cropImageUrl}
        imageUrl={cropImageUrl}
        onClose={closeCropModal}
        onConfirm={handleCroppedUpload}
        title="Adjust coach photo"
      />
      <div className="mb-6">
        <Link
          href="/admin/coaches"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          All coaches
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Coach profile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit profile details and photo. Email is read-only; use invite flows to
          change login email if needed.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative shrink-0">
              <div className="h-28 w-28 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={formData.name || "Coach"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-14 w-14 text-gray-400" />
                )}
              </div>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold truncate">
                  {formData.name || "Coach"}
                </h2>
                {coach.signup_confirmed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Signed in
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 text-xs font-medium">
                    <Clock className="h-3 w-3" />
                    Pending signup
                  </span>
                )}
              </div>
              <p className="text-blue-100 text-sm truncate">{coach.email}</p>
              <p className="text-blue-100 text-sm mt-2">
                {coach.current_clients} / {coach.max_clients} clients ·{" "}
                {coach.current_moais} / {coach.max_moais} Moais
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? "Uploading…" : "Upload or change photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
              <p className="text-blue-100/90 text-xs mt-2">
                JPG, PNG, GIF, or WebP · max 5MB
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Basic information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (read-only)
                </label>
                <input
                  type="email"
                  value={coach.email}
                  readOnly
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, first_name: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, last_name: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData((p) => ({ ...p, bio: e.target.value }))
              }
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Coaching experience, style, credentials…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specializations
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpec();
                  }
                }}
                placeholder="e.g. Strength training"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addSpec}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-800 hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.specializations.map((spec) => (
                <span
                  key={spec}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-900"
                >
                  {spec}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        specializations: p.specializations.filter(
                          (s) => s !== spec,
                        ),
                      }))
                    }
                    className="text-blue-700 hover:text-blue-950"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Settings
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Available for new clients
                  </span>
                  <p className="text-xs text-gray-500">
                    Same flag as on the coach list
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      is_available: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max clients
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={formData.max_clients}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        max_clients: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Moais
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.max_moais}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        max_moais: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendly event URI
                </label>
                <input
                  type="url"
                  value={formData.calendly_event_uri}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      calendly_event_uri: e.target.value,
                    }))
                  }
                  placeholder="https://calendly.com/…"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
            <Link
              href="/admin/coaches"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
