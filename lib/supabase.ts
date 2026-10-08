import { createClient, SupabaseClient } from "@supabase/supabase-js";

const isDev = process.env.NEXT_PUBLIC_APP_ENV === "development";

export const supabaseUrl = isDev
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_STAGING!
  : process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const supabaseAnonKey = isDev
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("NODE_ENV:", process.env.NEXT_PUBLIC_APP_ENV);
console.log("URL:", supabaseUrl);
console.log("KEY set?", !!supabaseAnonKey);

// Lazy initialization to avoid SSR issues
let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  // Safe check for browser environment
  const isBrowser = typeof window !== "undefined";

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser,
      // Only use localStorage in browser - this check prevents SSR errors
      storage: isBrowser ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        Accept: "application/json",
      },
    },
  });
}

// Lazy getter - only creates client when first accessed (not at module load)
function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// Use Object.defineProperty to create a lazy getter that only initializes when accessed
// This prevents the client from being created during SSR module evaluation
export const supabase = (() => {
  // Create a proxy that lazily initializes the client
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = getSupabaseClient();
      const value = (client as any)[prop];
      // If it's a function, bind it to the client
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  });
})();
