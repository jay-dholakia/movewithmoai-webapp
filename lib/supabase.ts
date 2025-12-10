import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://klvosnnkhofhqkwwehev.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsdm9zbm5raG9maHFrd3dlaGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTY3MTgsImV4cCI6MjA3MjQ5MjcxOH0.C6TOPCx3sasiZj1ST3LHTnYOAnzSrcpcQSyEXfFqZlY'

// Lazy initialization to avoid SSR issues
let supabaseInstance: SupabaseClient | null = null

function createSupabaseClient(): SupabaseClient {
  // Safe check for browser environment
  const isBrowser = typeof window !== 'undefined'
  
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
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    },
  })
}

// Lazy getter - only creates client when first accessed (not at module load)
function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
  }
  return supabaseInstance
}

// Use Object.defineProperty to create a lazy getter that only initializes when accessed
// This prevents the client from being created during SSR module evaluation
export const supabase = (() => {
  // Create a proxy that lazily initializes the client
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = getSupabaseClient()
      const value = (client as any)[prop]
      // If it's a function, bind it to the client
      if (typeof value === 'function') {
        return value.bind(client)
      }
      return value
    },
  })
})()

