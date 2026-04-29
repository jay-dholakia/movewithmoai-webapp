import { type NextRequest, NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  verifyAdminRequest,
} from "@/lib/server/supabase-admin";
import {
  isAllowedExerciseCategory,
  isAllowedExerciseLogType,
  normalizeEquipmentTagsFromClient,
} from "@/lib/exercise-catalog-options";

function resolveEquipmentList(raw: unknown):
  | { ok: true; list: string[] | null }
  | { ok: false; message: string } {
  if (raw == null || raw === "") return { ok: true, list: null };
  let tokens: string[] = [];
  if (Array.isArray(raw)) {
    tokens = raw.map((x) => String(x).trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    tokens = raw
      .split(/[\n,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    return { ok: false, message: "Equipment must be an array of tags or omit." };
  }
  if (tokens.length === 0) return { ok: true, list: null };
  const normalized = normalizeEquipmentTagsFromClient(tokens);
  if (!normalized || normalized.length === 0) {
    return {
      ok: false,
      message:
        "Equipment must use only tags from the catalog (no unknown text).",
    };
  }
  return { ok: true, list: normalized };
}

function normalizeUrl(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

const INSTRUCTIONS_MAX = 20_000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminRequest(request);
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const name =
      typeof body.name === "string" ? body.name.trim() : String(body.name ?? "");
    if (!name || name.length > 240) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required and must be at most 240 characters.",
        },
        { status: 400 },
      );
    }

    let category: string | null = null;
    if (typeof body.category === "string" && body.category.trim()) {
      const c = body.category.trim();
      if (!isAllowedExerciseCategory(c)) {
        return NextResponse.json(
          { success: false, error: "Invalid category value." },
          { status: 400 },
        );
      }
      category = c;
    }

    let log_type: string | null = null;
    if (typeof body.log_type === "string" && body.log_type.trim()) {
      const lt = body.log_type.trim();
      if (!isAllowedExerciseLogType(lt)) {
        return NextResponse.json(
          { success: false, error: "Invalid log type value." },
          { status: 400 },
        );
      }
      log_type = lt;
    }

    let instructions: string | null = null;
    if (typeof body.instructions === "string" && body.instructions.trim()) {
      const t = body.instructions.trim();
      if (t.length > INSTRUCTIONS_MAX) {
        return NextResponse.json(
          {
            success: false,
            error: `Instructions must be at most ${INSTRUCTIONS_MAX} characters.`,
          },
          { status: 400 },
        );
      }
      instructions = t;
    }

    const muscle_group =
      typeof body.muscle_group === "string" && body.muscle_group.trim()
        ? body.muscle_group.trim().slice(0, 120)
        : null;

    const equipmentRes = resolveEquipmentList(body.equipment);
    if (!equipmentRes.ok) {
      return NextResponse.json(
        { success: false, error: equipmentRes.message },
        { status: 400 },
      );
    }
    const equipmentList = equipmentRes.list;

    const form_video_url =
      body.form_video_url != null && String(body.form_video_url).trim() !== ""
        ? normalizeUrl(body.form_video_url)
        : null;

    if (
      body.form_video_url != null &&
      String(body.form_video_url).trim() !== "" &&
      !form_video_url
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Video / form URL must be a valid http(s) URL.",
        },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const baseRow: Record<string, unknown> = {
      name,
      category,
      muscle_group,
      form_video_url,
      log_type,
      instructions,
    };

    const selectCols =
      "id, name, category, muscle_group, equipment, form_video_url, log_type, instructions";

    const tryInsert = async (equipmentValue: unknown) => {
      const row = { ...baseRow };
      if (equipmentValue != null) row.equipment = equipmentValue;
      return admin.from("exercises").insert(row).select(selectCols).single();
    };

    const mergedEquipment =
      equipmentList && equipmentList.length > 0 ? equipmentList : null;

    let { data, error } = await tryInsert(
      mergedEquipment && mergedEquipment.length > 0 ? mergedEquipment : undefined,
    );

    if (
      error &&
      mergedEquipment &&
      mergedEquipment.length > 0 &&
      /equipment|array|json|type|column/i.test(error.message || "")
    ) {
      const retry = await tryInsert(mergedEquipment.join(", "));
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const code = (error as { code?: string }).code;
      const msg = error.message || "Insert failed";
      if (code === "23505") {
        return NextResponse.json(
          { success: false, error: "An exercise with this name may already exist." },
          { status: 409 },
        );
      }
      console.error("[admin/exercises POST]", error);
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true, exercise: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[admin/exercises POST]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
