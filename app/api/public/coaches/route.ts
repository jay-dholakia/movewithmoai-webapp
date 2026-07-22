import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type CoachRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  specializations: string[] | null;
};

export async function GET() {
  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      {
        success: true,
        items: [],
        allSpecializations: [],
        unavailable: true,
      },
      { status: 200 },
    );
  }

  const { data, error } = await admin
    .from("coaches")
    .select("id, name, first_name, profile_image_url, bio, specializations")
    .eq("is_available", true)
    .limit(24);

  if (error) {
    console.error("[public/coaches] coaches:", error);
    return NextResponse.json(
      { success: true, items: [], allSpecializations: [], unavailable: true },
      { status: 200 },
    );
  }

  const rows = (data || []) as CoachRow[];

  const items = rows
    .map((c) => {
      const name = (c.first_name || "").trim() || (c.name || "").trim().split(/\s+/)[0] || "Coach";
      return {
        id: c.id,
        name,
        imageUrl: c.profile_image_url?.trim() || null,
        bio: c.bio?.trim() || null,
        specializations: (c.specializations || []).filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        ),
      };
    })
    .filter((c) => c.bio || c.imageUrl);

  shuffleInPlace(items);

  const allSpecializations = [
    ...new Set(items.flatMap((c) => c.specializations)),
  ].sort();

  return NextResponse.json(
    {
      success: true,
      items,
      allSpecializations,
      unavailable: false,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
