import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";

type RouteContext = { params: Promise<{ coachId: string }> };

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifyAdminRequest(request);
    if ("error" in authResult) return authResult.error;

    const { coachId } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: coach, error: coachError } = await admin
      .from("coaches")
      .select("id, user_id")
      .eq("id", coachId)
      .maybeSingle();

    if (coachError || !coach) {
      return NextResponse.json(
        { success: false, error: "Coach not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Missing file" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "Image must be 5MB or smaller" },
        { status: 400 },
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!mime.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Please upload an image file" },
        { status: 400 },
      );
    }

    const extFromName = file.name.split(".").pop();
    const ext =
      extFromName && /^[a-z0-9]+$/i.test(extFromName)
        ? extFromName.toLowerCase()
        : mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : mime === "image/gif"
              ? "gif"
              : "jpg";

    const folder = coach.user_id
      ? String(coach.user_id)
      : `pending-coach/${coachId}`;
    const filePath = `${folder}/admin-${coachId}-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("profile-pics")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: mime,
      });

    if (uploadError) {
      console.error("[admin coach profile-picture] upload:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error:
            uploadError.message ||
            "Upload failed. Check storage bucket profile-pics.",
        },
        { status: 500 },
      );
    }

    const { data: urlData } = admin.storage
      .from("profile-pics")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await admin
      .from("coaches")
      .update({ profile_image_url: publicUrl })
      .eq("id", coachId);

    if (updateError) {
      console.error("[admin coach profile-picture] db:", updateError);
      return NextResponse.json(
        { success: false, error: "Saved file but failed to update coach row" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profile_image_url: publicUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin coach profile-picture]:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
