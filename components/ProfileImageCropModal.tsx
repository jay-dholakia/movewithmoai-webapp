"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedProfileImageBlob } from "@/lib/crop-profile-image";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 3;

type ProfileImageCropModalProps = {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
  /** Receives a JPEG file ready to upload. */
  onConfirm: (file: File) => void | Promise<void>;
  title?: string;
};

export function ProfileImageCropModal({
  open,
  imageUrl,
  onClose,
  onConfirm,
  title = "Adjust profile photo",
}: ProfileImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && imageUrl) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, submitting]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!imageUrl || !croppedAreaPixels) return;
    setSubmitting(true);
    try {
      const blob = await getCroppedProfileImageBlob(
        imageUrl,
        croppedAreaPixels,
        512,
        0.92,
      );
      const file = new File([blob], "profile-photo.jpg", {
        type: "image/jpeg",
      });
      await onConfirm(file);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Could not process the image. Try another photo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl",
          "max-h-[90vh]",
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2
            id="profile-crop-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-4 pt-3 text-sm text-gray-600">
          Drag to reposition. Use the slider to zoom in or out.
        </p>

        <div className="relative mx-4 mt-3 h-[min(55vh,320px)] w-[calc(100%-2rem)] overflow-hidden rounded-lg bg-gray-900">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            aspect={1}
            cropShape="round"
            objectFit="cover"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-4 py-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) =>
              setZoom(
                Math.min(
                  ZOOM_MAX,
                  Math.max(ZOOM_MIN, Number(e.target.value)),
                ),
              )
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting || !croppedAreaPixels}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save photo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
