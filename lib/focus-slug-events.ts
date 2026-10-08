import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export type FocusSlugWebEvent = "app_store_clicked" | "play_store_clicked";

/**
 * Records an anonymous click on a coach's focus moai slug (see log_focus_moai_slug_event).
 * Uses a keepalive fetch instead of the Supabase client so the request survives the page
 * navigating away to the store. Fire-and-forget; never throws.
 */
export function logFocusSlugEvent(slug: string, event: FocusSlugWebEvent): void {
  if (!slug) return;
  try {
    void fetch(`${supabaseUrl}/rest/v1/rpc/log_focus_moai_slug_event`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ p_slug: slug, p_event: event }),
    }).catch(() => {});
  } catch {
    // Tracking must never block the store redirect.
  }
}
