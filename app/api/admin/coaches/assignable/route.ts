// app/api/admin/coaches/assignable/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // 1) Auth: require a valid bearer token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin (service-role) client — server-side only, never exposed to the browser
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 2) Resolve the caller and verify they're an admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3) Query params
    const exclude = req.nextUrl.searchParams.get("exclude");
    const focusId = req.nextUrl.searchParams.get("focusId"); // optional

    let query = supabase
      .from("coaches")
      .select("id, name")
      .eq("is_available", true)
      .eq("is_deleted", false);

    if (exclude) query = query.neq("id", exclude);

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("[assignable coaches] query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[assignable coaches] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
